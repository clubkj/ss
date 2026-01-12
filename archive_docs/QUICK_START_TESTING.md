# QUICK START GUIDE - Goods Vehicle Booking System

**🎯 LIVE AT**: https://goods-5097f.web.app

---

## STEP-BY-STEP TESTING (5 Minutes)

### **Phase 1: Customer Booking (2 min)**

1. **Open Site**:
   - Go to https://goods-5097f.web.app

2. **Sign Up as Customer**:
   - Click "Book Vehicle Now"
   - Tab: "Sign Up"
   - Fill:
     - Name: `John Doe`
     - Phone: `9876543210`
     - Email: `john@example.com`
     - Password: `password123`
   - Click "Create Account"
   - ✅ Should redirect to booking form

3. **Create Booking**:
   - **Pickup**: Type `Mumbai` → Click outside box
   - **Drop**: Type `Pune` → Click outside box
   - **Pickup Date**: Select today
   - **Pickup Time**: Select `2:30 PM`
   - **Vehicle**: Select `Pickup`
   - ✅ You should see distance (~150 km) and price (₹250 + 150×₹28 = ₹4,450)
   - **Check "Loading Help"**: Yes
   - **Notes**: `Fragile items`
   - Click "Confirm Booking"
   - ✅ Should see booking in "My Orders"

---

### **Phase 2: Admin Confirms (1 min)**

1. **Access Admin Dashboard**:
   - Open new tab
   - Go to https://goods-5097f.web.app/admin/dashboard.html

2. **Find Booking**:
   - ✅ Should see your booking in "New Orders" (count = 1)
   - ✅ Should see on map: Blue circle (pickup) + Red circle (drop)
   - ✅ Should see booking in "Recent Bookings" table with status = "new"

3. **Confirm Booking**:
   - Click "✓ Confirm" button
   - ✅ Status changes to "confirmed"
   - ✅ Real-time update

4. **Check Customer Side**:
   - Go back to first tab (My Orders)
   - ✅ Status should change from "Pending" to "Confirmed" (auto-update)

---

### **Phase 3: Driver Accepts (1.5 min)**

1. **Driver Login**:
   - Open new tab
   - Go to https://goods-5097f.web.app/driver.html
   - Tab: "Sign Up"
   - Fill:
     - Name: `Raj Kumar`
     - Phone: `9999999999`
     - Email: `driver@example.com`
     - Vehicle: `Pickup`
     - Password: `driver123`
   - Click "Create Account"
   - ✅ Should redirect to driver dashboard

2. **View Available Bookings**:
   - ✅ Should see 1 booking (your Mumbai → Pune booking)
   - Shows: Pickup, Drop, Distance, Price, Vehicle, Loading, Notes

3. **Accept Booking**:
   - Click "✓ Accept"
   - ✅ Booking disappears from "Available"
   - ✅ Appears in "My Accepted Rides" with status = "confirmed"

4. **Check Customer Side**:
   - Go back to first tab
   - Click on your booking
   - ✅ Should see "Driver Assigned" section
   - Shows: Driver name (`Raj Kumar`), phone, WhatsApp link, map

---

### **Phase 4: Driver Starts & Completes (0.5 min)**

1. **Start Ride** (Driver Dashboard):
   - Click "▶ Start Ride"
   - ✅ Ride status changes to `in_transit`
   - ✅ Button changes to "✓ Complete"

2. **Complete Ride**:
   - Click "✓ Complete"
   - ✅ Ride status changes to `completed`
   - ✅ Removed from "My Accepted Rides"

3. **Check Customer**:
   - Go back to "My Orders"
   - ✅ Your booking now shows status = "Completed"
   - ✅ Timeline shows all steps: Pending → Confirmed → On Way → Completed

---

## ADMIN FEATURES DEMO (Optional)

### **Search & Filter** (Admin Dashboard)
- Filter by Status: Try "Confirmed", "Completed", "New"
- Search: Type "John Doe" or "9876543210"
- ✅ Results filter in real-time

### **CSV Export**
- Click "📥 Export CSV"
- ✅ Downloads `bookings-2026-01-XX.csv`
- Open in Excel/Google Sheets

### **Details Modal**
- Click "ℹ️ Details" on any booking
- ✅ Popup shows: Booking ID, coordinates, notes, status
- Click outside or × to close

### **Map Features**
- Click blue/red markers
- ✅ Popup shows location and customer details

---

## COMMON ISSUES & FIXES

| Issue | Fix |
|-------|-----|
| "Location not found" | Use real Indian city names (Mumbai, Delhi, Bangalore, etc.) |
| Booking form won't submit | Make sure to blur pickup AND drop fields to trigger geocoding |
| Admin page blank | Ensure you visited customer booking first (needs data in Firestore) |
| Driver doesn't see bookings | Admin must first confirm the booking (status = "confirmed") |
| Real-time updates not working | Check browser console (F12) for Firebase errors |
| Can't log in | Verify email is same as signup email, password is correct |

---

## BROWSER CONSOLE DEBUG

Open **F12 → Console** to see:
- ✅ Firebase initialization messages
- ✅ Real-time listener updates
- ✅ Booking submission logs
- ✅ Geocoding results

```javascript
// Test Firebase connection (paste in console)
testFirebase()
```

---

## KEY PAGES

| Role | URL | Purpose |
|------|-----|---------|
| **Customer** | https://goods-5097f.web.app | Landing page |
| | https://goods-5097f.web.app/customer-login.html | Sign up / Sign in |
| | https://goods-5097f.web.app/book.html | Booking form |
| | https://goods-5097f.web.app/my-orders.html | Order tracker |
| **Driver** | https://goods-5097f.web.app/driver.html | Sign up / Sign in |
| | https://goods-5097f.web.app/driver/dashboard.html | Available & accepted rides |
| **Admin** | https://goods-5097f.web.app/admin/dashboard.html | All bookings, map, stats |

---

## PRICING REFERENCE

| Vehicle | Base Price | Per KM | Min Distance |
|---------|-----------|--------|--------------|
| **Mini Truck** | ₹200 | ₹25/km | 5 km |
| **Pickup** | ₹250 | ₹28/km | 5 km |
| **Tempo** | ₹300 | ₹35/km | 5 km |

**Example**: Mumbai → Pune (150 km, Pickup vehicle)
- Price = ₹250 + (150 × ₹28) = ₹4,450

---

## STATUS PROGRESSION

```
Customer Books
    ↓
Status = "new"
    ↓ (Admin clicks "Confirm")
Status = "confirmed"
    ↓ (Driver clicks "Accept")
Status = "confirmed" + driverPhone set
    ↓ (Driver clicks "Start Ride")
Status = "in_transit"
    ↓ (Driver clicks "Complete")
Status = "completed"
```

**Customer sees**: Pending → Confirmed → On the Way → Completed
**Driver sees**: Available → Accepted Ride → In Transit → Completed

---

## REAL-TIME FEATURES

- **My Orders**: Updates instantly when admin changes status
- **Admin Dashboard**: Shows new bookings as they arrive
- **Driver Dashboard**: Shows available bookings real-time
- **Stats**: Update live (total, new, confirmed, completed, revenue)
- **Map**: Updates with each new booking

---

## TESTING WITH MULTIPLE PEOPLE

1. **Customer 1** opens site, signs up as "Alice", books Mumbai → Bangalore
2. **Customer 2** opens site (different browser/device), signs up as "Bob", books Delhi → Mumbai
3. **Admin** opens dashboard, sees both bookings
4. **Driver 1** logs in, accepts Alice's booking
5. **Driver 2** logs in, accepts Bob's booking
6. Each person sees updates in real-time

---

## RESET DATA (If Needed)

Go to [Firebase Console](https://console.firebase.google.com/project/goods-5097f/firestore/data):
1. Navigate to `bookings` collection
2. Delete documents to clear
3. Refresh site

---

## SUPPORT

- **Console Logs**: Press F12, check Console tab for errors
- **Firebase Logs**: Go to Firebase Console > Firestore > check data
- **Live URL**: https://goods-5097f.web.app
- **Project**: goods-5097f

---

**Ready to test?** Go to https://goods-5097f.web.app and follow the steps above! ✅
