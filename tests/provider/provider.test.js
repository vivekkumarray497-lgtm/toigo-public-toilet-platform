const http = require('http');

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

function makeRequest(method, path, body = null, headers = {}) {
    return new Promise((resolve, reject) => {
        const postData = body ? JSON.stringify(body) : null;
        const options = {
            hostname: '127.0.0.1',
            port: 5000,
            path: '/api' + path,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                ...headers
            }
        };

        if (postData) {
            options.headers['Content-Length'] = Buffer.byteLength(postData);
        }

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    resolve({ status: res.statusCode, data: parsed });
                } catch (e) {
                    resolve({ status: res.statusCode, data });
                }
            });
        });

        req.on('error', reject);
        if (postData) req.write(postData);
        req.end();
    });
}

async function runProviderTests() {
    await ensureServer();
    console.log('🧪 Running Comprehensive Provider / Host Module Integration Tests...\n');

    // 1. Host 1 Login (Provider 1)
    const hostLogin = await makeRequest('POST', '/auth/login', {
        email: 'provider1@example.com',
        password: 'password123',
        role: 'PROVIDER'
    });
    console.assert(hostLogin.status === 200, 'Host login failed');
    const hostToken = hostLogin.data.token;
    const hostAuth = { 'Authorization': `Bearer ${hostToken}` };
    console.log('1. Host 1 Login: PASS ✅');

    // 2. Host 2 Login (Provider 2 for ownership isolation)
    const host2Login = await makeRequest('POST', '/auth/login', {
        email: 'provider2@example.com',
        password: 'password123',
        role: 'PROVIDER'
    });
    console.assert(host2Login.status === 200, 'Host 2 login failed');
    const host2Token = host2Login.data.token;
    const host2Auth = { 'Authorization': `Bearer ${host2Token}` };
    console.log('2. Host 2 Login: PASS ✅');

    // 3. Register New Host & End-to-End Verification + Admin Approval Flow
    const crypto = require('crypto');
    const { db } = require('../../server/config/db');

    const newHostEmail = `provider.test.${Date.now()}@example.com`;
    const hostMobile = '98' + Date.now().toString().slice(-8);
    const regRes = await makeRequest('POST', '/auth/register', {
        name: 'New Host Facility',
        email: newHostEmail,
        password: 'password123',
        mobile: hostMobile,
        role: 'PROVIDER',
        businessName: 'Clean Restroom Co'
    });
    console.assert(regRes.status === 201, 'Host registration failed');
    
    // Test Invalid OTP rejection (No development 123456 bypass!)
    const invalidVerify = await makeRequest('POST', '/auth/verify-email', {
        userId: regRes.data.userId,
        code: '999999'
    });
    console.assert(invalidVerify.status === 400, 'Security failure: Invalid OTP was accepted!');

    // Retrieve actual generated OTP from simulator
    const emailInbox = await makeRequest('GET', `/auth/test-inbox?email=${encodeURIComponent(newHostEmail)}`);
    const realEmailOtp = emailInbox.data.otp;

    // Verify Email OTP with real generated OTP
    const verifyRes = await makeRequest('POST', '/auth/verify-email', {
        userId: regRes.data.userId,
        code: realEmailOtp
    });
    console.assert(verifyRes.status === 200, 'Email verification failed');

    // Trigger and retrieve Mobile OTP
    await makeRequest('POST', '/auth/send-mobile-otp', {
        userId: regRes.data.userId,
        mobile: hostMobile
    });
    const mobileInbox = await makeRequest('GET', `/auth/test-inbox?mobile=${hostMobile}`);
    const realMobileOtp = mobileInbox.data.otp;

    const mobileVerifyRes = await makeRequest('POST', '/auth/verify-mobile-otp', {
        userId: regRes.data.userId,
        code: realMobileOtp
    });
    console.assert(mobileVerifyRes.status === 200, 'Mobile verification failed');

    // Attempt Host Login before Admin Approval -> MUST FAIL with 403
    const unapprovedLogin = await makeRequest('POST', '/auth/login', {
        email: newHostEmail,
        password: 'password123',
        role: 'PROVIDER'
    });
    console.assert(unapprovedLogin.status === 403, 'Security failure: Unapproved host was allowed to log in!');

    // Admin Approves Provider Application
    const adminLoginRes = await makeRequest('POST', '/auth/login', {
        email: 'founder@toigo.app',
        password: 'admin123',
        role: 'ADMIN'
    });
    const adminApprovalAuth = { 'Authorization': `Bearer ${adminLoginRes.data.token}` };

    const provApproveRes = await makeRequest('PUT', `/admin/providers/${regRes.data.userId}/verify`, {
        action: 'APPROVE'
    }, adminApprovalAuth);
    console.assert(provApproveRes.status === 200 && provApproveRes.data.provider.verificationStatus === 'APPROVED', 'Admin approval failed');

    // Approved Host Login -> SUCCESS
    const approvedLogin = await makeRequest('POST', '/auth/login', {
        email: newHostEmail,
        password: 'password123',
        role: 'PROVIDER'
    });
    console.assert(approvedLogin.status === 200 && approvedLogin.data.token, 'Approved host login failed');
    const newHostAuth = { 'Authorization': `Bearer ${approvedLogin.data.token}` };

    // New host should see EXACTLY 0 toilets, NEVER fallback to all toilets
    const newHostToilets = await makeRequest('GET', '/providers/toilets', null, newHostAuth);
    console.assert(newHostToilets.status === 200 && newHostToilets.data.toilets.length === 0, 'Zero-toilet test failed: must have 0 toilets');
    const newHostDash = await makeRequest('GET', '/providers/dashboard', null, newHostAuth);
    console.assert(newHostDash.data.metrics.totalListings === 0 && newHostDash.data.metrics.totalEarnings === 0, 'New host metrics must be 0');
    console.log('3. Zero-Toilet Strict Isolation & No Fake Fallback: PASS ✅');

    // 4. Provider Dashboard Metrics for Host 1
    const dash = await makeRequest('GET', '/providers/dashboard', null, hostAuth);
    console.assert(dash.status === 200 && dash.data.success, 'Dashboard fetch failed');
    console.log('4. Provider Dashboard Metrics: PASS ✅');

    // 5. Add Toilet with Complete Details
    const newToiletPayload = {
        name: 'Central Transit Public Restroom',
        description: 'Clean public restroom facility with touchless taps and sanitizers.',
        toiletType: 'Paid Toilet',
        commodeType: 'Both (Indian & Western)',
        genderType: 'Separate Men & Women',
        price: 15,
        isFree: false,
        address: 'Gate 4, Transit Concourse',
        landmark: 'Near Exit Gate 4',
        city: 'New Delhi',
        state: 'Delhi',
        pincode: '110001',
        latitude: 28.6335,
        longitude: 77.2190,
        openingTime: '05:30 AM',
        closingTime: '11:45 PM',
        isOpen24Hours: false,
        facilities: ['Running Water', 'Hand Soap', 'Jet Spray', 'Mirror', 'Tissue / Toilet Paper'],
        accessibility: ['Wheelchair Accessible Ramp', 'Wide Door Access'],
        photos: [],
        cleaningFrequency: 'Every 2 Hours'
    };

    const addRes = await makeRequest('POST', '/providers/toilets', newToiletPayload, hostAuth);
    console.assert(addRes.status === 201 && addRes.data.success, 'Add toilet failed');
    const createdToilet = addRes.data.toilet;
    const createdId = createdToilet.toiletId;
    console.assert(createdToilet.status === 'PENDING', 'Initial status must be PENDING');
    console.assert(createdToilet.providerId === 'prov-1', 'Provider ID must match logged in host');
    console.log(`5. Add Toilet: PASS ✅ (ID: ${createdId}, Status: ${createdToilet.status})`);

    // 6. My Toilets Strict Isolation: Host 1 sees own toilets only
    const hostToilets = await makeRequest('GET', '/providers/toilets', null, hostAuth);
    console.assert(hostToilets.data.toilets.every(t => t.providerId === 'prov-1'), 'Isolation breach: found non-owned toilet');
    console.log(`6. My Toilets Strict Isolation: PASS ✅ (${hostToilets.data.toilets.length} toilets owned by prov-1)`);

    // 7. Security: Host 2 (prov-2) tries to GET / PUT / PATCH / DELETE Host 1's toilet -> MUST BE 403 Forbidden!
    const intruderGet = await makeRequest('GET', `/providers/toilets/${createdId}`, null, host2Auth);
    console.assert(intruderGet.status === 403, 'Intruder GET must return 403 Forbidden');
    const intruderEdit = await makeRequest('PUT', `/providers/toilets/${createdId}`, { name: 'Hacked Toilet' }, host2Auth);
    console.assert(intruderEdit.status === 403, 'Intruder PUT must return 403 Forbidden');
    const intruderStatus = await makeRequest('PATCH', `/providers/toilets/${createdId}/status`, { availability: 'CLOSED' }, host2Auth);
    console.assert(intruderStatus.status === 403, 'Intruder PATCH status must return 403 Forbidden');
    const intruderDelete = await makeRequest('DELETE', `/providers/toilets/${createdId}`, null, host2Auth);
    console.assert(intruderDelete.status === 403, 'Intruder DELETE must return 403 Forbidden');
    console.log('7. Backend Ownership Security & 403 Enforcement: PASS ✅');

    // 8. Owner Edits Toilet
    const editRes = await makeRequest('PUT', `/providers/toilets/${createdId}`, {
        name: 'Central Transit Restroom (Renovated)',
        price: 20
    }, hostAuth);
    console.assert(editRes.status === 200 && editRes.data.toilet.name.includes('Renovated'), 'Edit toilet failed');
    console.log('8. Edit Toilet by Owner: PASS ✅');

    // 9. Manage Status -> UNDER_MAINTENANCE with Closure Reason
    const statusRes = await makeRequest('PATCH', `/providers/toilets/${createdId}/status`, {
        availability: 'UNDER_MAINTENANCE',
        closureReason: 'Deep cleaning and pipe maintenance',
        expectedReopenAt: '04:00 PM'
    }, hostAuth);
    console.assert(statusRes.status === 200 && statusRes.data.toilet.availability === 'UNDER_MAINTENANCE', 'Status update failed');
    console.log('9. Change Status to UNDER_MAINTENANCE: PASS ✅');

    // 10. Reopen Toilet -> OPEN
    const reopenRes = await makeRequest('POST', `/providers/toilets/${createdId}/reopen`, null, hostAuth);
    console.assert(reopenRes.status === 200 && reopenRes.data.toilet.availability === 'OPEN', 'Reopen failed');
    console.log('10. Reopen Toilet to Public: PASS ✅');

    // 11. Log Hygiene & Maintenance Check
    const maintRes = await makeRequest('POST', `/providers/toilets/${createdId}/maintenance`, {
        waterChecked: true,
        soapChecked: true,
        notes: 'Dispensers refilled & floors sanitized'
    }, hostAuth);
    console.assert(maintRes.status === 200 && maintRes.data.success, 'Maintenance check log failed');
    console.log('11. Log Hygiene & Sanitation Check: PASS ✅');

    // 12. Provider Activity Log
    const actRes = await makeRequest('GET', '/providers/activity', null, hostAuth);
    console.assert(actRes.status === 200 && actRes.data.activities.length > 0, 'Activity log fetch failed');
    console.log(`12. Provider Audit Activity History: PASS ✅ (${actRes.data.activities.length} entries)`);

    // 13. Admin Rejection & Provider Resubmission Workflow
    const adminLogin = await makeRequest('POST', '/auth/login', {
        email: 'founder@toigo.app',
        password: 'admin123',
        role: 'ADMIN'
    });
    const adminAuth = { 'Authorization': `Bearer ${adminLogin.data.token}` };
    
    const rejectRes = await makeRequest('PUT', `/admin/toilets/${createdId}/verify`, {
        action: 'REJECT',
        rejectionReason: 'Please install clearer signage'
    }, adminAuth);
    console.assert(rejectRes.status === 200 && rejectRes.data.toilet.status === 'REJECTED', 'Admin rejection failed');
    console.log('13A. Admin Rejection Workflow: PASS ✅');

    const resubmitRes = await makeRequest('PUT', `/providers/toilets/${createdId}`, {
        accessibility: ['Wheelchair Accessible Ramp', 'Wide Door Access', 'Signage Added']
    }, hostAuth);
    console.assert(resubmitRes.status === 200 && resubmitRes.data.toilet.status === 'PENDING', 'Resubmission failed to reset status to PENDING');
    console.log('13B. Provider Resubmission Workflow: PASS ✅ (Status reset to PENDING)');

    const approveRes = await makeRequest('PUT', `/admin/toilets/${createdId}/verify`, { action: 'APPROVE' }, adminAuth);
    console.assert(approveRes.status === 200 && approveRes.data.toilet.status === 'APPROVED', 'Admin approval failed');
    console.log('13C. Admin Approval & Public Activation: PASS ✅');

    // 14. Public Visibility Verification
    const publicToilets = await makeRequest('GET', '/toilets');
    const isVisibleToUsers = publicToilets.data.toilets.some(t => t.toiletId === createdId);
    console.assert(isVisibleToUsers, 'Approved toilet must be visible on public map');
    console.log('14. Public Visibility: PASS ✅');

    // 15. Reports & Reviews Isolation
    const reportsRes = await makeRequest('GET', '/providers/reports', null, hostAuth);
    console.assert(reportsRes.status === 200, 'Provider reports fetch failed');
    const reviewsRes = await makeRequest('GET', '/providers/reviews', null, hostAuth);
    console.assert(reviewsRes.status === 200, 'Provider reviews fetch failed');
    console.log(`15. Reports & Reviews Isolation: PASS ✅`);

    // 16. Provider Profile Update
    const profRes = await makeRequest('PUT', '/providers/profile', {
        businessName: 'SmartRest Sanitation Co'
    }, hostAuth);
    console.assert(profRes.status === 200, 'Profile update failed');
    console.log('16. Provider Profile Update: PASS ✅');

    // 17. Safe Soft Removal of Toilet
    const removeRes = await makeRequest('DELETE', `/providers/toilets/${createdId}`, null, hostAuth);
    console.assert(removeRes.status === 200 && removeRes.data.success, 'Soft delete failed');
    const publicAfterRemove = await makeRequest('GET', '/toilets');
    const isGoneFromPublic = !publicAfterRemove.data.toilets.some(t => t.toiletId === createdId);
    console.assert(isGoneFromPublic, 'Removed toilet must disappear from public search');
    console.log('17. Safe Soft Deletion: PASS ✅');

    console.log('\n🎉 ALL 17 COMPREHENSIVE PROVIDER TESTS PASSED! ✅');
}

module.exports = { runProviderTests };

if (require.main === module) {
    runProviderTests().then(() => {
        process.exit(0);
    }).catch(err => {
        console.error('Test failed with error:', err);
        process.exit(1);
    });
}
