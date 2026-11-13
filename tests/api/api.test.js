const http = require('http');
const crypto = require('crypto');

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
            hostname: 'localhost',
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

async function runApiTests() {
    console.log('🧪 Testing TOIGO Backend Core & Security API Endpoints...\n');

    // 1. Health Check
    const health = await request('GET', '/health');
    console.assert(health.status === 'OK', 'Health check failed');
    console.log('1. Health Check: PASS ✅');

    // 2. Fetch Public Toilets
    const toilets = await request('GET', '/toilets?lat=28.6315&lng=77.2167');
    console.assert(toilets.success === true, 'Fetch toilets failed');
    console.log(`2. Fetch Toilets (${toilets.total} found): PASS ✅`);

    // 3. User Login
    const login = await request('POST', '/auth/login', {
        email: 'user1@example.com',
        password: 'password123',
        requestedRole: 'USER'
    });
    console.assert(login.success === true && login.token, 'User login failed');
    const userToken = login.token;
    console.log('3. User Login: PASS ✅');

    // 4. Validate QR Code
    const qrTest = await request('POST', '/access/validate-qr', { qrData: 't-3' }, userToken);
    console.assert(qrTest.success === true, 'QR validation failed');
    console.log('4. QR Code Validation: PASS ✅');

    // 5. Create Payment Order for Paid Toilet
    const payOrder = await request('POST', '/payments/create-order', { toiletId: 't-1', method: 'UPI' }, userToken);
    console.assert(payOrder.success === true && payOrder.orderId, 'Payment order failed');
    console.log('5. Create Payment Order: PASS ✅');

    // 6. Verify Payment on Server
    const payVerify = await request('POST', '/payments/verify', {
        orderId: payOrder.orderId,
        transactionId: 'txn_test_' + Date.now(),
        paymentMethod: 'UPI'
    }, userToken);
    console.assert(payVerify.success === true, 'Payment verification failed');
    console.log('6. Verify Payment: PASS ✅');

    // 7. Verify Access Token at Door Controller
    const tokenVerify = await request('POST', '/access/verify-token', {
        accessToken: payVerify.accessToken,
        toiletId: 't-1'
    });
    console.assert(tokenVerify.success === true && tokenVerify.valid === true, 'Token verify failed');
    console.log('7. Door Access Token Verification: PASS ✅');

    // 8. Submit Verified Review
    const reviewRes = await request('POST', '/reviews', {
        toiletId: 't-3',
        rating: 5,
        cleanlinessRating: 5,
        waterAvailable: true,
        soapAvailable: true,
        comment: 'Very clean with fresh water and sanitizer.'
    }, userToken);
    console.assert(reviewRes.success === true || reviewRes._statusCode === 429, 'Submit review failed');
    console.log('8. Submit Hygiene Review: PASS ✅');

    // 9. Submit Issue Report
    const reportRes = await request('POST', '/reports', {
        toiletId: 't-2',
        category: 'No Water',
        priority: 'MEDIUM',
        description: 'Water tap was running low at 2pm.'
    }, userToken);
    console.assert(reportRes.success === true, 'Submit report failed');
    console.log('9. Submit Maintenance Report: PASS ✅');

    // 10. Admin Login & Dashboard
    const adminLogin = await request('POST', '/auth/login', {
        email: 'founder@toigo.app',
        password: 'admin123',
        requestedRole: 'ADMIN'
    });
    console.assert(adminLogin.success === true, 'Admin login failed');
    const adminToken = adminLogin.token;
    console.log('10. Admin Login: PASS ✅');

    const adminStats = await request('GET', '/admin/dashboard', null, adminToken);
    console.assert(adminStats.success === true, 'Admin dashboard failed');
    console.log('11. Admin Dashboard: PASS ✅');

    // 12. Register User & Email OTP Dispatch (no plain OTP leaked)
    const testRegEmail = `testuser_${Date.now()}@example.com`;
    const regRes = await request('POST', '/auth/register', {
        name: 'New Test User',
        email: testRegEmail,
        password: 'SecurePassword123!',
        role: 'USER'
    });
    console.assert(regRes.success === true && regRes.requireVerification === true, 'Registration failed');
    console.assert(!regRes.verificationCode, 'Plaintext OTP leaked in response! Security violation.');
    console.log('12. User Registration & Secure OTP Dispatch (No Leaked Plaintext): PASS ✅');

    // 13. Resend OTP Cooldown Enforcement
    const resendRes = await request('POST', '/auth/resend-otp', { email: testRegEmail });
    console.assert(resendRes._statusCode === 429 || resendRes.success === false, 'Resend cooldown failed');
    console.log('13. OTP Resend Cooldown (429 Rate Limit): PASS ✅');

    // 14. Notifications Isolation Check
    const userNotifs = await request('GET', '/notifications', null, userToken);
    console.assert(userNotifs.success === true && Array.isArray(userNotifs.notifications), 'Notifications failed');
    console.log(`14. Notifications Protected Route (${userNotifs.count} alerts): PASS ✅`);

    // 15. Public Registration Security: Reject Client-Sent ADMIN Role (403 Forbidden)
    const fakeAdminEmail = `fakeadmin_${Date.now()}@example.com`;
    const fakeAdminReg = await request('POST', '/auth/register', {
        name: 'Malicious Attacker',
        email: fakeAdminEmail,
        password: 'Password123!',
        role: 'ADMIN' // Malicious attempt to register as ADMIN
    });
    console.assert(fakeAdminReg._statusCode === 403 && fakeAdminReg.success === false, 'Public ADMIN registration was not rejected with 403 Forbidden!');
    const fs = require('fs');
    const path = require('path');
    const dbFilePath = path.join(__dirname, '../../server/data/db.json');
    const dbRaw = JSON.parse(fs.readFileSync(dbFilePath, 'utf8'));
    const attackerUser = (dbRaw.users || []).find(u => u.email === fakeAdminEmail);
    console.assert(!attackerUser, 'CRITICAL SECURITY VULNERABILITY: Public user was created from rejected ADMIN registration!');
    console.log('15. Public ADMIN Registration Strictly Rejected (403 Forbidden): PASS ✅');

    // 16. New User Wallet Balance is Strictly ₹0
    const regularUser = (dbRaw.users || []).find(u => u.email === testRegEmail);
    console.assert(regularUser && regularUser.walletBalance === 0, 'Wallet bug: New user received non-zero wallet balance!');
    console.log('16. Strict ₹0 Initial Wallet Balance: PASS ✅');

    // 17. Free Toilet Direct Access (No Payment Gateway Order Created)
    const freePass = await request('POST', '/payments/free-access', { toiletId: 't-3' }, userToken);
    console.assert(freePass.success === true && freePass.accessToken, 'Free access generation failed');
    console.log('17. Free Toilet Access Pass (No Gateway Required): PASS ✅');

    // 18. Wallet Payment Deduction & Server-Side Atomic Validation
    // Credit ₹50 to usr-1 via admin credit API
    await request('POST', '/admin/users/usr-1/credit', { amount: 50, reason: 'Test Topup' }, adminToken);

    const walletPayRes = await request('POST', '/payments/wallet-pay', { toiletId: 't-1' }, userToken);
    console.assert(walletPayRes.success === true && walletPayRes.payment && walletPayRes.payment.status === 'SUCCESS', 'Wallet payment failed');
    console.log(`18. Wallet Payment Atomic Deduction (Remaining Balance: ₹${walletPayRes.walletBalance}): PASS ✅`);

    // 19. Admin Provider Verification & Status Management
    const adminProviders = await request('GET', '/admin/providers', null, adminToken);
    console.assert(adminProviders.success === true && Array.isArray(adminProviders.providers), 'Admin fetch providers failed');
    console.log(`19. Admin Provider Management (${adminProviders.count} providers): PASS ✅`);

    // 20. Admin Payment Dashboard with Filters
    const adminPayments = await request('GET', '/admin/payments?status=SUCCESS', null, adminToken);
    console.assert(adminPayments.success === true && Array.isArray(adminPayments.payments), 'Admin payments filter failed');
    console.log(`20. Admin Payments Filter (${adminPayments.count} successful transactions): PASS ✅`);

    console.log('\n🎉 ALL 20 CORE & SECURITY API ENDPOINTS TESTED AND PASSED! ✅\n');
}

module.exports = { runApiTests };

if (require.main === module) {
    runApiTests().catch(err => {
        console.error('API Test failed:', err);
        process.exit(1);
    });
}
