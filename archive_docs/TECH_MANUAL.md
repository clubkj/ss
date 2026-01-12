**TECHNICAL MANUAL — Goods Vehicle Booking (Full Stack, Static + Firebase)**

Purpose
- Provide a concise, practical manual for the tech team: how to run, deploy, maintain, extend, and debug the site.

1) Quick Overview
- Tech: Static HTML/CSS/Vanilla JS with Firebase (Auth, Firestore, Hosting). Mapping: Leaflet + OpenStreetMap (Nominatim for geocoding).
- Live URL: https://goods-5097f.web.app
- Project root contains HTML pages, `css/`, `js/`, `admin/`. Docs moved to `archive_docs/`.

2) Key Pages & Responsibilities
- `index.html` — Landing/home page (links to booking, login, driver portal).
- `user.html` — Customer signup/login (email/password currently).
- `book.html` — Customer booking UI: pickup/drop inputs, map picker, vehicle selector, price/distance calculation, confirm booking.
- `my-orders.html` — Customer orders view (real-time listener + fallbacks for legacy records).
- `driver.html` — Driver login page.
- `dashboard.html` — Driver interface: map, available bookings, accepted bookings, controls to accept/start/complete.
- `success.html` — Booking confirmation (displays booking code).
- `css/style.css` — Main styles.
- `js/booking.js` — Booking logic, map initialization, geocoding, price calculation, Firestore writes.
- `js/admin.js` / `js/*.js` — other logic (driver actions, auth helpers).

3) Local Development
- No build tools required. Run locally by serving files with simple static server.
- Recommended: use `npx http-server` or VS Code Live Server.

Commands (PowerShell/example):
```powershell
# from project root
npx http-server -p 8080
# then open http://localhost:8080
```

Or use Firebase local emulators (if installed):
```bash
firebase emulators:start --only hosting,firestore,auth
```

4) Firebase Setup (important)
- Project: `goods-5097f` (config snippets are embedded in HTML pages).
- Required services: Authentication (Email/Password; optional Phone/OTP), Firestore, Hosting.
- Steps to prepare Firebase console:
  1. Go to Firebase Console → Project `goods-5097f`.
  2. Authentication → Sign-in method: enable Email/Password. (If OTP needed: enable Phone provider and configure reCAPTCHA domain.)
  3. Firestore: Create a database in production or test mode. Create required composite indexes if Firestore warns.
  4. Hosting: connect project and deploy (see Deploy section).
- Security: Update Firestore rules before production. For MVP, rules may be permissive; harden them before real traffic.

5) Firestore Schema (collections & important fields)
- `bookings` (documents created on booking):
  - name (string)
  - phone (string)
  - pickup (string address)
  - drop (string address)
  - pickupLat (number), pickupLon (number)
  - dropLat (number), dropLon (number)
  - vehicle (string)
  - distance (number, km)
  - estimatedPrice (number)
  - loadingRequired (boolean)
  - notes (string)
  - status (string) — values: `new`, `confirmed`, `transit`, `completed`, `rejected`
  - bookingCode (string) — 6-char code
  - createdAt (timestamp or ISO string)
  - customerId (string) — uid when user created via email/password
  - driverUid (string) — set when driver accepts
  - driverPhone, driverName (strings)

- `drivers` collection: driver profiles (uid, name, phone, vehicleType, active)
- `customers` (optional): profile records for repeat customers

Indexes:
- Query patterns: bookings where `status == 'new'` and ordering by `createdAt` or `distance`. If Firestore shows index errors, create indexes from the console using the suggested index link.

6) How features work (flow)
- Customer booking:
  1. User opens `book.html`, fills details or uses map picker.
  2. Booking code is generated (`generateBookingCode()` in `js/booking.js`).
  3. Haversine formula is used to compute distance; price is computed by vehicle type.
  4. On Confirm, JS validates fields and writes a booking doc to `bookings` with status = `new`.
  5. Success redirect to `success.html` with booking code shown.

- Driver flow:
  1. Driver signs into `driver.html` (email/password).
  2. `dashboard.html` listens to `bookings` and shows: available (status=`new`), accepted (driver’s bookings), and all bookings.
  3. Accept action updates booking: adds `driverUid`, `driverPhone`, `driverName`, sets `status='confirmed'`.
  4. Driver can start transit (`status='transit'`) and complete (`status='completed'`).

- Real-time behavior: front-end uses Firestore `onSnapshot` listeners to reflect live updates.

7) OTP (Phone) verification — notes & next steps
- Currently NOT implemented (we removed `otp-verify.html`). To add OTP:
  1. In Firebase Console: enable Phone provider.
  2. Add reCAPTCHA: Firebase web phone auth requires reCAPTCHA v3/invisible on web. Add container `<div id="recaptcha-container"></div>` and configure `window.recaptchaVerifier = new firebase.auth.RecaptchaVerifier('recaptcha-container', { 'size': 'invisible' });`
  3. Send code: `firebase.auth().signInWithPhoneNumber(phoneNumber, window.recaptchaVerifier)` → returns `confirmationResult`.
  4. Confirm code: `confirmationResult.confirm(code)` → returns user credential; attach or create profile.
- I can implement the UI + JS for this flow if you want — must enable Phone sign-in and add domains in Firebase console.

8) Deployment
- Make sure Firebase CLI is installed and logged in (`firebase login`).
- From project root:
```bash
firebase deploy --only hosting --force
```
- Hosting files are the raw HTML/CSS/JS in the project root — no build step.
- After deploy, confirm site at the Hosting URL.

9) Testing & Verification (quick steps)
- Use `VERIFICATION_CHECKLIST.md` file previously in docs (now in `archive_docs/VERIFICATION_CHECKLIST.md`) as a test script. Key checks:
  - Booking creation flow (map picker → confirm → Firestore document)
  - Driver accepts booking and sees driver-only accepted bookings
  - Price/distance calculations correct on vehicle/location change
  - No console errors on page load

10) Troubleshooting (common issues & fixes)
- Map tiles not loading: ensure leaflet CSS/JS loaded and browser not blocked from loading `https://{s}.tile.openstreetmap.org`.
- Firestore permission errors: check Firestore security rules and client initialization; ensure `firebase.initializeApp()` uses correct config.
- Realtime listeners throwing index error: open Firestore console and create the suggested composite index.
- `auth.currentUser` undefined after login: ensure auth.onAuthStateChanged is used and page waits for this event.

11) Maintenance and Best Practices
- Move secret keys out (for hosted static sites the config is public; restrict Firestore rules).
- Add Firestore security rules before production.
- Rate-limit geocoding (Nominatim usage policy) or add paid geocoding if heavy use.
- Add server-side logging or Cloud Functions to manage booking workflow (optional future improvement).

12) How to extend (short ideas)
- Add Phone OTP sign-in (see Section 7)
- Add payments (integrate payment gateway at confirm step)
- Add driver location tracking (periodic updates to driver doc)
- Add admin dashboard for reporting (Cloud Functions + scheduled exports)

13) Files to keep in repo (minimum to run site)
- `index.html`, `book.html`, `user.html`, `driver.html`, `dashboard.html`, `my-orders.html`, `success.html` (plus other relevant HTML)
- `css/` folder
- `js/` folder (all JS files)
- `firebase.json`, `.firebaserc` (if present)

14) Useful commands summary
```bash
# Serve locally
npx http-server -p 8080
# Deploy to Firebase Hosting
firebase deploy --only hosting --force
# Start Firebase emulators (recommended for dev)
firebase emulators:start --only hosting,firestore,auth
```

15) Contact / Handoff notes
- Archive of docs: `archive_docs/` contains all prior `.md` files (verification checklists, deployment notes) — keep for reference.
- If you want, I can convert `TECH_MANUAL.md` into `README.md` and add short quick-start lines to the top of the project.

---
End of manual — file created in project root as `TECH_MANUAL.md`.
