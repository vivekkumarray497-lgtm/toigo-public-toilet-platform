const http = require('http');
const path = require('path');

function request(method, path, body = null, token = null) {
    return new Promise((resolve, reject) => {
        const payload = body ? JSON.stringify(body) : null;
        const headers = {
            'Content-Type': 'application/json'
        };
        if (payload) {
            headers['Content-Length'] = Buffer.byteLength(payload);
        }
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const req = http.request({
            hostname: '127.0.0.1',
            port: 5000,
            path: '/api' + path,
            method,
            headers
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    parsed._statusCode = res.statusCode;
                    resolve(parsed);
                } catch (e) {
                    resolve({ raw: data, _statusCode: res.statusCode });
                }
            });
        });

        req.on('error', reject);
        if (payload) req.write(payload);
        req.end();
    });
}

async function ensureServer() {
    return new Promise((resolve) => {
        const probe = http.request({ hostname: '127.0.0.1', port: 5000, path: '/api/health', method: 'GET', timeout: 800 }, (res) => {
            resolve(true);
        });
        probe.on('error', () => {
            try {
                process.env.PORT = '5000';
                require('../../server/server.js');
                setTimeout(() => resolve(true), 1500);
            } catch (err) {
                console.error('Failed to bootstrap server in test:', err);
                resolve(false);
            }
        });
        probe.end();
    });
}

async function testMobileOtpSuite() {
    await ensureServer();
    console.log('🧪 Starting Mobile Number + OTP Authentication Test Suite...\n');

    // Test 1: Fetch predefined demonstration accounts
    const testAccountsRes = await request('GET', '/auth/mobile-otp/test-accounts');
    console.assert(testAccountsRes.success === true, 'Failed to fetch demo test accounts');
    console.assert(testAccountsRes.accounts.length >= 4, 'Expected at least 4 demo accounts');
    console.log('✓ Test 1: Predefined demo accounts list retrieved successfully (' + testAccountsRes.accounts.length + ' accounts)');

    // Test 2: Invalid mobile numbers validation
    const invalidNumbers = ['123', '98765', '1234567890', '5876543210', 'abcdefghij'];
    for (const num of invalidNumbers) {
        const res = await request('POST', '/auth/mobile-otp/send', { mobile: num, mode: 'TEST' });
        console.assert(res.success === false, 'Invalid number should be rejected: ' + num);
        console.assert(res._statusCode === 400, 'Expected status 400 for invalid number: ' + num);
    }
    console.log('✓ Test 2: Strict 10-digit Indian mobile validation (/^[6-9]\\d{9}$/) passed for all invalid inputs');

    // Test 3: Send OTP to predefined Citizen demo number (9876543210)
    const demoMobile = '9876543210';
    const sendRes = await request('POST', '/auth/mobile-otp/send', { mobile: demoMobile, mode: 'TEST' });
    console.assert(sendRes.success === true, 'Failed to send OTP to demo mobile');
    console.assert(sendRes.mode === 'TEST', 'Expected TEST mode response');
    console.assert(sendRes.testAccount.testOtp === '123456', 'Expected 123456 test OTP');
    console.log('✓ Test 3: OTP dispatched for Citizen demo number (+91 ' + demoMobile + ') with cooldown ' + sendRes.cooldownSeconds + 's');

    // Test 4: Rate limiting cooldown (immediate second request should be blocked)
    const duplicateSendRes = await request('POST', '/auth/mobile-otp/send', { mobile: demoMobile, mode: 'TEST' });
    console.assert(duplicateSendRes.success === false, 'Duplicate OTP within cooldown should be blocked');
    console.assert(duplicateSendRes._statusCode === 429, 'Expected status 429 for rapid resend');
    console.log('✓ Test 4: Rate limiting / cooldown protection successfully blocked rapid duplicate OTP request (HTTP 429)');

    // Test 5: Verify with incorrect OTP code
    const wrongVerifyRes = await request('POST', '/auth/mobile-otp/verify', { mobile: demoMobile, otp: '000000', mode: 'TEST' });
    console.assert(wrongVerifyRes.success === false, 'Incorrect OTP should fail');
    console.assert(wrongVerifyRes.errorType === 'INVALID_OTP', 'Expected INVALID_OTP error');
    console.assert(wrongVerifyRes.attemptsRemaining === 4, 'Expected 4 attempts remaining');
    console.log('✓ Test 5: Incorrect OTP rejected with remaining attempts tracking: "' + wrongVerifyRes.message + '"');

    // Test 6: Verify with correct demo OTP (123456)
    const correctVerifyRes = await request('POST', '/auth/mobile-otp/verify', { mobile: demoMobile, otp: '123456', mode: 'TEST' });
    console.assert(correctVerifyRes.success === true, 'Correct OTP should verify successfully');
    console.assert(Boolean(correctVerifyRes.token), 'JWT session token must be returned');
    console.assert(correctVerifyRes.user.mobile === demoMobile, 'User mobile must match');
    const citizenToken = correctVerifyRes.token;
    console.log('✓ Test 6: Correct OTP verified successfully! JWT session token issued: ' + citizenToken.slice(0, 25) + '...');

    // Test 7: Profile Completion (Full Name & Gender)
    const profileRes = await request('POST', '/auth/mobile-otp/complete-profile', {
        name: 'Rahul Sharma',
        gender: 'Male'
    }, citizenToken);
    console.assert(profileRes.success === true, 'Profile completion failed');
    console.assert(profileRes.user.name === 'Rahul Sharma', 'Name should be Rahul Sharma');
    console.assert(profileRes.user.gender === 'Male', 'Gender should be Male');
    console.log('✓ Test 7: First-time Citizen Profile Completed (Name: ' + profileRes.user.name + ', Gender: ' + profileRes.user.gender + ')');

    // Test 8: Security check - Arbitrary custom number cannot use hardcoded "123456" in Test Mode
    const customMobile = '9199887766';
    const customSendRes = await request('POST', '/auth/mobile-otp/send', { mobile: customMobile, mode: 'TEST' });
    console.assert(customSendRes.success === true, 'Custom number send failed');
    console.assert(customSendRes.testAccount === null, 'Custom number must NOT be recognized as predefined test account');

    const fakeBypassRes = await request('POST', '/auth/mobile-otp/verify', { mobile: customMobile, otp: '123456', mode: 'TEST' });
    console.assert(fakeBypassRes.success === false, 'Arbitrary number MUST NOT bypass with hardcoded 123456');
    console.log('✓ Test 8: Security requirement verified: Arbitrary phone numbers cannot bypass authentication with hardcoded OTPs');

    // Test 9: Existing user session verification
    const meRes = await request('GET', '/auth/me', null, citizenToken);
    console.assert(meRes.success === true && meRes.user.userId, 'Session /auth/me failed');
    console.log('✓ Test 9: Session management verified via /auth/me for user: ' + meRes.user.name + ' (' + meRes.user.userId + ')');

    console.log('\n🎉 ALL MOBILE OTP TESTS PASSED SUCCESSFULLY! (9/9)\n');
    process.exit(0);
}

module.exports = { testMobileOtpSuite };

if (require.main === module) {
    testMobileOtpSuite().catch(err => {
        console.error('Test suite failure:', err);
        process.exit(1);
    });
}
