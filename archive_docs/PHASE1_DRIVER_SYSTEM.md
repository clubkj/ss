# Phase 1: Driver App System - Setup & Usage Guide

## What Was Built

### 1. **Driver Login/Signup** (`driver.html`)
- Email/password authentication for drivers
- Signup includes: Name, Phone, Email, Password, Vehicle Type
- Drivers are stored in `drivers` Firestore collection
- Automatic redirect to driver dashboard after signup/login

### 2. **Driver Dashboard** (`driver/dashboard.html`)
- **Real-time available bookings** — shows all pending (`new` status) bookings
- **Accept/Reject** — drivers accept bookings → status changes to `confirmed` + driver info stored
- **Active Rides** — shows driver's accepted bookings
- **Start/Complete Ride** — drivers can mark ride status
- **Online/Offline Toggle** — drivers can go online/offline
- **Stats** — shows available, accepted, completed counts + rating

### 3. **Firestore Schema Updates**

#### `drivers` Collection (NEW)
```javascript
{
  uid: "firebase-uid",
  name: "Driver Name",
  phone: "9876543210",
  email: "driver@example.com",
  vehicle: "mini-truck" | "pickup" | "tempo",
  status: "online" | "offline",
  rating: 5.0,
  totalRides: 0,
  createdAt: "2026-01-09T12:00:00Z",
  lastStatusChange: "2026-01-09T12:00:00Z"
}
```

#### `bookings` Collection (UPDATED)
Added fields:
```javascript
{
  // ... existing fields (name, phone, pickup, drop, etc.)
  
  // NEW: Driver assignment
  driverPhone: "9876543210",
  driverName: "Driver Name",
  status: "new" | "confirmed" | "in_transit" | "completed" | "cancelled",
  acceptedAt: "2026-01-09T12:00:00Z",
  startedAt: "2026-01-09T12:00:00Z",
  completedAt: "2026-01-09T12:00:00Z",
  rejectedByDrivers: ["9876543210", "9876543211"]  // Array of drivers who rejected
}
```

#### `notifications` Collection (UPDATED)
Added new notification type:
```javascript
{
  type: "driver_accepted",
  bookingId: "booking-id",
  phone: "9876543210",
  name: "Customer Name",
  driverName: "Driver Name",
  driverPhone: "9876543210",
  createdAt: "2026-01-09T12:00:00Z",
  sent: false
}
```

---

## How to Test Phase 1

### Step 1: Create a Driver Account
- Open: http://localhost:5500/driver.html (or your Live Server URL)
- Click **Sign Up**
- Fill in:
  - Name: `Test Driver`
  - Phone: `9876543210`
  - Email: `driver@test.com`
  - Password: `123456`
  - Vehicle: `Mini Truck`
- Click **Create Account** → redirects to driver dashboard

### Step 2: Customer Books a Ride
- Open: http://localhost:5500/book.html
- Fill in booking form (pickup, drop, etc.)
- Click **Confirm Booking**
- Check Firestore: new document in `bookings` collection with `status: "new"`

### Step 3: Driver Accepts Booking
- Go back to driver dashboard
- Should see the new booking in "Available Bookings"
- Click **✓ Accept**
- Status changes to `confirmed`, driver info appears
- A notification is queued in `notifications` collection

### Step 4: Customer Sees Driver Assigned
- Customer receives notification (via SMS/email if configured)
- Next phase: customer sees driver location in real-time

### Step 5: Driver Completes Ride
- In driver dashboard, booking moves to "Your Active Rides"
- Driver clicks **▶ Start Ride** → status becomes `in_transit`
- Driver clicks **✓ Complete** → status becomes `completed`

---

## Next Steps (Phase 2 & 3)

### Phase 2: Customer Tracking
- Create `tracking.html` — customers see real-time driver location
- Driver app sends GPS coords every 5 seconds
- Map shows driver's current position + route

### Phase 3: OTP Verification
- Generate 6-digit OTP when driver arrives
- Send via email
- Customer enters OTP before ride starts
- Driver sees OTP confirmation on their app

---

## File Summary

| File | Purpose |
|------|---------|
| `driver.html` | Driver login/signup page |
| `driver/dashboard.html` | Driver main dashboard (bookings, status) |
| `js/driver.js` | (Optional) Driver-specific logic (can move code here later) |
| `book.html` | Customer booking form (will be updated for Phase 2) |
| `admin/dashboard.html` | Admin can see all bookings + driver info |

---

## Key Features Implemented

✓ Driver authentication (signup/login)
✓ Real-time available bookings display
✓ Accept/reject bookings
✓ Driver status (online/offline)
✓ Active rides management
✓ Start/complete ride workflow
✓ Real-time Firestore listeners
✓ Driver-to-booking assignment
✓ Stats tracking (pending, accepted, completed)

---

## Testing Checklist

- [ ] Driver signup works
- [ ] Driver can sign in
- [ ] Available bookings appear in real-time
- [ ] Accept booking updates Firestore
- [ ] Driver name/phone saved in booking
- [ ] Active rides show after acceptance
- [ ] Start ride changes status to `in_transit`
- [ ] Complete ride changes status to `completed`
- [ ] Online/offline toggle works
- [ ] Notifications created when booking accepted

---

## Troubleshooting

**Issue: "No bookings available" in driver dashboard**
- Create a booking from `book.html` first
- Ensure booking has `status: "new"`
- Check Firestore console → `bookings` collection

**Issue: Accept button doesn't work**
- Ensure you're signed in (check console for auth user)
- Check browser console for Firebase errors
- Verify Firestore rules allow writes (see DEPLOYMENT.md)

**Issue: Active rides not showing**
- After accepting, driver might need to refresh
- Check Firestore → booking should have `driverPhone` field
- Query in Firestore console: `where driverPhone == "phone"` and `where status in [confirmed, in_transit]`

---

## Ready for Phase 2?

To implement customer tracking:
1. I'll create `tracking.html` with a map
2. Add GPS tracking from driver dashboard
3. Customer sees driver's live location
4. Route visualization between driver and destination

Let me know when you want to proceed!
