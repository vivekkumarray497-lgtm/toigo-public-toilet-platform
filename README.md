# TOIGO — Find, Use and Pay
> **India's Smart Public & Private Toilet Network | Verified Hygiene, Safe Access & Pay-Per-Use**

Built with modern web standards (HTML5, Vanilla CSS Design System, ES6+ JavaScript, Leaflet GPS Mapping, and LocalStorage Realtime Persistence).

---

## 🌟 Key Application Features

### 1. 🚻 Option 1: "Use Toilet" (Citizen & Traveler Mode)
- **Interactive Live Map**: Powered by Leaflet & OpenStreetMap, displaying nearby toilet pins with custom badges (Indian Pan 🇮🇳, Western Commode 🚽, Both ✨, Free 💧, Wheelchair Ramp ♿).
- **Live GPS Detection**: 1-Tap "My GPS" to detect browser geolocation and auto-seed nearby toilets around you.
- **Search & Multi-Filters**: Filter by distance, commode type (Indian / Western), price (Free / Paid), rating (4.5+ stars), and amenities.
- **Toilet Details View**: High-resolution photos, hourly cleanliness rating (e.g. 98% hygiene score), available amenities (Soap, Jet spray, Tissue, Sanitary pad dispenser, AC, Mirror, Wheelchair ramp), and Google Maps direct navigation.
- **"Use & Pay" Workflow**:
  - **Door QR Scanner**: Live animated camera viewfinder simulation to scan the physical toilet entrance door QR code.
  - **Active Session Timer**: Live digital timer tracking washroom usage with ventilation indicator and secure latch lock.
  - **Instant Payment Checkout**: Pay via UPI QR code (GPay, PhonePe, Paytm, BHIM), TOIGO Wallet, or Cash at counter.
  - **Cleanliness Feedback**: 5-Star rating system with hygiene reviews to reward good hosts.
- **🚨 1-Click SOS Emergency Button**: Instantly locates the nearest open, accessible toilet within walking distance and provides a direct route line on the map.

---

### 2. 🏢 Option 2: "Provide Toilet" (Host & Provider Mode)
- **Host Dashboard**: Real-time revenue metrics, gross footfall count, and available wallet balance.
- **Add New Toilet Listing Wizard**:
  - Interactive Leaflet GPS map picker to pin the exact entrance location.
  - Toilet Commode type selector (English/Western, Indian squat pan, Both, Urinal).
  - Price per use customization (e.g. ₹5, ₹10, ₹15, ₹20 or Free).
  - Gender compatibility (Unisex, Separate Men/Women, Women Only).
  - Amenities checklist (Sanitary pads, Jet spray, Hand soap, Air conditioning, Wheelchair access).
  - Preset photo gallery selector.
  - Host UPI ID setup for receiving payments.
- **Manage Listings**: Instant toggle between **Open**, **Closed**, and **Cleaning** status.
- **🖨️ Printable Door QR Poster**: Auto-generates a print-ready, branded TOIGO door sign with the host's UPI QR code and entry pricing for customers to scan and unlock.
- **💸 Payout Withdrawals**: Request instant fund transfers from the host wallet to any UPI ID or bank account.

---

### 3. 👑 Founder & Super Admin Control Center (Full Master Authority)
The app includes a dedicated Super Admin & Founder portal giving you **100% complete control**:
- **Executive Platform Analytics**:
  - Gross Merchandise Value (GMV)
  - Founder Platform Commission Revenue (10% platform cut per paid visit)
  - Total Registered Users & Hosts
  - Total Live Toilets on Map
- **Full Control over Toilet Listings**:
  - Review all registered public and private washrooms.
  - 1-Click **"Approve / Reject"**, **"Toggle TOIGO Verified Badge"**, or **"Permanently Delete"**.
- **Full Control over Users**:
  - View all citizen profiles, phone numbers, emails, and wallet balances.
  - Grant promotional wallet bonus credits (e.g. +₹50 promo).
- **Full Control over Toilet Providers**:
  - View host KYC verification statuses, earnings, and contact details.
  - Approve & disburse pending UPI payout requests.
- **Global App Rules & Settings**:
  - Dynamically configure Platform Commission Percentage (%).
  - Set Emergency SOS Helpline numbers.
  - Broadcast live platform announcements to all connected citizens and hosts.
  - 1-Click Reset to Factory Seed Data.

---

## 🚀 How to Run the App Locally

### Option A: Local Dev Server (Recommended)
```bash
# In the project directory:
npm start
# or:
npx serve . -l 3000
```
Then open your browser at **`http://localhost:3000`**

### Option B: Direct File Open
Simply double-click `index.html` in your file explorer to open it in any web browser (Chrome, Edge, Firefox, Safari).

---

## 📁 Project Directory Structure
```
PUBLIC TOILET/
│
├── index.html            # Master single-page app HTML with all views & modals
├── package.json          # Node scripts & dependencies
├── README.md             # Complete project guide & documentation
│
├── css/
│   └── styles.css        # Custom design system, glassmorphism & animations
│
└── js/
    ├── data.js           # DB storage layer, seed toilets, users, hosts & transactions
    ├── auth.js           # Role authentication (Citizen, Host, Founder) & OTP simulation
    ├── map.js            # Leaflet GPS map engine, custom pins & route lines
    ├── user-flow.js      # Find, search, filter, session timer, checkout & rating
    ├── provider-flow.js  # Host dashboard, add toilet wizard, QR poster & payouts
    ├── admin-flow.js     # Founder / Super Admin master control terminal
    └── app.js            # Master view router, SOS emergency engine & toast alerts
```
