# Toigo – Public Toilet Availability & Hygiene Reporting Platform

> **Repository:** [https://github.com/vivekkumarray497-lgtm/toigo-public-toilet-platform](https://github.com/vivekkumarray497-lgtm/toigo-public-toilet-platform)  
> **Smart Sanitation Network | Real-Time Restroom Discovery, Availability & Hygiene Reporting, Door Access Passes, and Restroom Host Management**

---

## 🌟 Executive Summary

**Toigo** is a full-stack, smart sanitation management and discovery platform built to eliminate the challenge of finding clean, safe, and accessible public washrooms in urban environments. It pairs a **modern web client and Android companion app** with an enterprise-grade **Node.js REST API backend**, supporting persistent database storage, live GPS geolocation, verified hygiene rating reviews, photo-based citizen complaints, and cryptographic role-based access.

---

## 👥 Core User Roles & Permissions

The platform enforces strict role isolation across three user personas:

| Role | Interface | Capabilities & Permissions |
| :--- | :--- | :--- |
| **Normal User (Citizen)** | Citizen Discovery & Navigation | Browse home & map as guest; login with Mobile Number + OTP; live GPS tracking; view availability, hygiene ratings & photos; submit hygiene reviews; report dirty/damaged toilets with photos; track complaint progress; access digital passes. |
| **Toilet Owner (Provider / Host)** | Host Management Dashboard | Register with mobile/email & business info; add toilets with geo-coordinates, photos & amenities; update live availability (`OPEN`, `BUSY`, `UNDER_MAINTENANCE`); log hygiene checks; view citizen reports; manage listings. |
| **Platform Administrator** | Executive Admin Portal | View registered users & providers; approve or reject provider listings; review and resolve citizen hygiene complaints; moderate reviews; audit trail logs; suspend or activate accounts. |

---

## 📱 Android Application & Features

The native Android app ([MainActivity.java](file:///android/app/src/main/java/com/toigo/app/MainActivity.java)) wraps the web platform in a high-performance, hardware-accelerated WebView with full native device integrations:

* **Splash Screen & Branding**: Clean onboarding splash screen and modern visual hierarchy.
* **Home Dashboard**: Responsive discovery interface with filter chips (Free, Accessible, 24/7 Open, High Hygiene Rating).
* **Map & Nearby Search**: Integrated mapping layers (Street, Satellite, Terrain) with live distance indicators.
* **Live GPS Location Tracking**: High-accuracy `ACCESS_FINE_LOCATION` with smooth map centering.
* **Restroom Details & Photo Gallery**: Availability badge, hygiene score (out of 5), stall counts, amenities, and photos.
* **Hygiene Ratings & Verified User Reviews**: Cleanliness, water supply, and soap/sanitizer scores with verified user feedback.
* **Photo-Based Hygiene Complaint Reporting**: Submit reports with issue category (Dirty Toilet, Broken Flush, Water Shortage, etc.), priority level, description, and camera/gallery photo upload.
* **Guest Browsing Policy**: Guests can freely explore the map, search, and inspect restrooms. Mobile login is prompted only when using live GPS tracking, submitting reports, or accessing user account history.
* **Native Android Bridge (`ToigoNativeBridge`)**: Bridges native Android hardware permissions, toasts, and Firebase Phone Authentication directly to the application.

---

## 🔐 Authentication, Mobile OTP & Session Management

The platform supports a dual-mode Firebase Phone Authentication architecture:

### 1. Mobile Number Login Flow
* Accepts standard 10-digit Indian mobile numbers starting with 6, 7, 8, or 9 (`/^[6-9]\d{9}$/`).
* Automatically formats and prefixes `+91`.
* Strict 45-second rate-limiting cooldown prevents rapid duplicate OTP requests (HTTP 429).
* 10-minute cryptographic OTP expiration window with maximum 5 attempts tracking.

### 2. Development / Test OTP Mode (For College Demonstrations)
* Includes a visible toggle (`🧪 Test Mode` vs. `🚀 Production Mode`) on the login dialog.
* Predefined demonstration test accounts with instant OTP verification:
  * 👤 **Citizen Demo:** `+91 9876543210` • OTP: `123456` (Rahul Sharma)
  * 🎓 **Evaluator Test:** `+91 8888888888` • OTP: `888888` (Dr. A. K. Verma)
  * ⭐ **VIP Demo:** `+91 9999999999` • OTP: `999999` (Priya Patel)
  * 🏨 **Host Demo:** `+91 9899001122` • OTP: `123456` (Demo Provider 1)
* **Security Guard:** Arbitrary phone numbers cannot bypass authentication with hardcoded OTPs in test mode. They strictly require genuine OTP generation and verification.

### 3. Production Mode (Real Firebase Phone Auth)
* Direct integration with `com.google.firebase:firebase-auth` using the official `PhoneAuthProvider`.
* SMS OTP dispatch with automatic code detection and credential verification.

### 4. First-Time Profile Onboarding
* After successful OTP verification:
  * **Existing User:** Automatically logs in and navigates directly to the Home dashboard.
  * **New User / Incomplete Profile:** Prompts for **Full Name** (minimum 2 characters) and **Gender** (`Male`, `Female`, `Other`), then creates the persistent profile.

### 5. Session Management
* JWT tokens and user profiles are stored in `localStorage` (`TOIGO_JWT_TOKEN`, `TOIGO_CURRENT_USER`).
* Sessions automatically validate against `/api/auth/me` on startup.
* Clean logout purges stored credentials and resets the client to Guest mode.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Android Companion App** | Android SDK 34 (Android 14), Java 8/21, AndroidX, SwipeRefreshLayout, WebKit, Firebase BoM 32.8.0, Firebase Auth |
| **Frontend Web App** | HTML5, CSS3, Tailwind CSS, Vanilla JavaScript (ES6+ Modules), Leaflet.js Mapping Engine |
| **Backend REST API** | Node.js (v18+ / v20+), Express.js 5, JSON Web Tokens (JWT), Bcrypt.js, Helmet, CORS, Express-Rate-Limit |
| **Database & Storage** | Persistent JSON Database (`server/data/db.json`) + Optional MongoDB / Mongoose support |
| **Security & Auditing** | Helmet Content Security Policy, HMAC-SHA256 signature checks, XSS sanitization, Rate limiters, Admin audit logs |
| **DevOps & Cloud** | Docker (`Dockerfile`), Render Blueprint (`render.yaml`), Gradle Wrapper |

---

## 🔑 Firebase Configuration & Android Fingerprints

* **Android Package Name / Application ID:** `com.toigo.app`
* **Keystore:** `debug.keystore`
* **SHA-1 Fingerprint:** `B5:E9:67:87:BB:3C:9D:E8:8D:14:66:DE:A9:F0:26:D4:3B:81:F4:0A`
* **SHA-256 Fingerprint:** `9F:6E:09:68:3B:45:DB:08:E7:F6:76:43:74:19:88:D1:19:0F:AA:03:D1:93:B4:8D:AD:8C:FF:24:91:26:4C:CF`
* **Firebase Project ID:** `toigo-sanitation-app`
* **Firebase Config File:** Located at [android/app/google-services.json](file:///android/app/google-services.json)

---

## 📡 REST API Reference

All API routes are prefixed with `/api`.

### 1. Authentication Endpoints
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/auth/mobile-otp/send` | Request 6-digit OTP for 10-digit Indian number | No (Rate Limited) |
| `POST` | `/auth/mobile-otp/verify` | Verify OTP code or Firebase ID token; returns JWT | No |
| `POST` | `/auth/mobile-otp/complete-profile` | Complete user profile with Full Name and Gender | Bearer Token |
| `GET` | `/auth/mobile-otp/test-accounts` | Retrieve predefined test demonstration accounts | No |
| `POST` | `/auth/register` | Register provider/admin account | No |
| `POST` | `/auth/login` | Email/password or provider login | No |
| `GET` | `/auth/me` | Fetch and validate current authenticated session | Bearer Token |
| `POST` | `/auth/logout` | Terminate session | No |

### 2. Toilets & Locations Endpoints
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/toilets` | List all approved toilets with geo-distance filters | No (Public) |
| `GET` | `/toilets/:id` | Fetch detailed restroom record with reviews & photos | No (Public) |
| `POST` | `/toilets` | Add new restroom listing (starts in `PENDING` state) | Provider Token |
| `PUT` | `/toilets/:id` | Update restroom details, pricing, and amenities | Owner / Admin Token |
| `PATCH`| `/toilets/:id/status` | Toggle operational status (`OPEN`, `UNDER_MAINTENANCE`) | Owner / Admin Token |
| `DELETE`| `/toilets/:id` | Soft-delete restroom listing | Owner / Admin Token |

### 3. Hygiene Reports & Citizen Complaints
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/reports` | Submit hygiene complaint with photos, category & priority | User Token |
| `GET` | `/reports/my-reports` | Retrieve complaint history for authenticated citizen | User Token |
| `GET` | `/reports/provider` | View citizen complaints filed against owner's restrooms | Provider Token |
| `PATCH`| `/reports/:id/status` | Update complaint status (`PENDING`, `IN_PROGRESS`, `RESOLVED`) | Provider / Admin Token |

### 4. Verified Reviews & Door Access
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/reviews` | Submit verified cleanliness, water, and hygiene review | User Token |
| `GET` | `/reviews/toilet/:toiletId` | Get public reviews for a specific restroom | No (Public) |
| `POST` | `/access/validate-qr` | Validate restroom entry pass and generate unlock token | User Token |

### 5. Administration & Provider Portals
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/admin/dashboard` | Platform metrics (total users, active toilets, reports) | Admin Token |
| `GET` | `/admin/providers` | Review pending host applications and listings | Admin Token |
| `PATCH`| `/admin/providers/:id/verify` | Approve or reject provider verification status | Admin Token |
| `GET` | `/admin/audit-logs` | Review administrative action audit logs | Admin Token |
| `GET` | `/provider/dashboard` | Host earnings summary, visitor counts & restroom metrics | Provider Token |

---

## 🚀 Setup & Local Installation

### Prerequisites
* **Node.js** v18.x or v20.x
* **npm** v9+
* **Java JDK 17 or 21** (for Android build)
* **Android Studio Hedgehog / Iguana / Jellyfish** (optional, for emulator testing)

### Step 1: Clone Repository
```bash
git clone https://github.com/vivekkumarray497-lgtm/toigo-public-toilet-platform.git
cd toigo-public-toilet-platform
```

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Configure Environment Variables
Duplicate `.env.example` to `server/.env`:
```bash
cp .env.example server/.env
```
*(The default development configuration runs out of the box with persistent JSON database storage).*

### Step 4: Run the Full-Stack Server
```bash
npm start
# Server listens at http://localhost:5000
```
* **Web Application:** `http://localhost:5000`
* **Admin Portal Shortcut:** `http://localhost:5000/?admin=true`
* **API Health Check:** `http://localhost:5000/api/health`

---

## 📱 Building the Android APK

1. Ensure `JAVA_HOME` is set to JDK 17 or 21:
   ```powershell
   $env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
   ```
2. Navigate to the `android/` directory:
   ```bash
   cd android
   ```
3. Build the Debug APK (for college demonstrations & local testing):
   ```bash
   .\gradlew.bat assembleDebug
   # Output: android/app/build/outputs/apk/debug/app-debug.apk
   ```
4. Build the Release APK (for production deployment):
   ```bash
   .\gradlew.bat assembleRelease
   # Output: android/app/build/outputs/apk/release/app-release-unsigned.apk
   ```

---

## ☁️ Cloud Deployment Guide

### Deploying to Render (Recommended)
1. Fork or push this repository to GitHub.
2. Sign in to [Render](https://render.com) and click **New + → Blueprint**.
3. Select your repository: `toigo-public-toilet-platform`.
4. Render detects [render.yaml](file:///render.yaml) automatically and provisions:
   * **Runtime:** Node 20
   * **Build Command:** `npm install`
   * **Start Command:** `node server/server.js`
   * **Port:** `10000` (auto-bound by Render)
5. Set `NODE_ENV=production` and your desired `JWT_SECRET`.
6. Click **Deploy**. Your API and Web App will be live with HTTPS.

### Deploying via Docker
```bash
docker build -t toigo-platform .
docker run -p 5000:5000 -e NODE_ENV=production toigo-platform
```

---

## 🧪 Automated Testing Report

The repository includes a comprehensive 4-tier automated test suite:

```bash
# Run all test suites
npm test
```

### Verified Test Results (46 / 46 Passing):
* **1. Syntax Check (`tests/syntax-check.js`):**
  * `37 / 37` JavaScript files verified without syntax errors.
* **2. Core Backend & Security API Tests (`tests/api/api.test.js`):**
  * `20 / 20` test cases passed:
    * Health check endpoint
    * Geo-spatial toilet queries
    * User authentication & role enforcement
    * QR entry pass generation & anti-replay validation
    * Payment order creation & signature verification
    * Hygiene report creation & isolation
    * Admin executive dashboard & provider moderation
* **3. Mobile Number + OTP Test Suite (`tests/api/mobile-otp.test.js`):**
  * `9 / 9` test cases passed:
    * Predefined demo accounts listing
    * Strict 10-digit Indian mobile validation (`/^[6-9]\d{9}$/`)
    * OTP dispatch with 45s cooldown
    * Rate limiting HTTP 429 block on rapid resend
    * Incorrect OTP rejection with remaining attempt counters
    * Successful OTP verification and JWT session token generation
    * Profile completion (Name & Gender)
    * Arbitrary number security guard (hardcoded bypass forbidden)
    * Session persistence validation via `/auth/me`
* **4. Provider Integration Tests (`tests/provider/provider.test.js`):**
  * `17 / 17` test cases passed:
    * Host dual-credential verification
    * Strict listing isolation across owners
    * Add, edit, maintenance toggle & soft-deletion
    * Inspection logging & complaint tracking

---

## 📄 License
This project is licensed under the MIT License. Developed for the **Toigo Public Toilet Availability & Hygiene Reporting Platform**.
