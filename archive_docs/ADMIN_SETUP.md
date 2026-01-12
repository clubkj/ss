# Admin & Firestore Setup Guide

## Firestore Database Schema

Your bookings are saved to: `goods-5097f` Firebase project

### Collection: `bookings`

Each booking document contains:

```javascript
{
  name: "John Doe",                    // String
  phone: "9876543210",                 // String
  pickup: "Mumbai",                    // String
  drop: "Delhi",                       // String
  pickupLat: 19.0760,                  // Number (for future admin map)
  pickupLon: 72.8777,                  // Number (for future admin map)
  dropLat: 28.7041,                    // Number (for future admin map)
  dropLon: 77.1025,                    // Number (for future admin map)
  vehicle: "Mini Truck",               // String: "Mini Truck" | "Pickup" | "Tempo"
  distance: 1447.2,                    // Number (km, 2 decimals)
  estimatedPrice: 51695,               // Number (₹)
  loadingRequired: true,               // Boolean
  notes: "Fragile items",              // String
  status: "new",                       // String: "new" | "confirmed" | "completed" | "cancelled"
  createdAt: "2025-01-09T15:30:45.123Z" // ISO timestamp
}
```

---

## Why This Schema?

| Field | Purpose | Future Use |
|-------|---------|------------|
| `pickupLat/Lon` | Admin map visualization | Plot bookings on admin dashboard map |
| `distance` | Cost calculation verification | Compare estimated vs actual |
| `status` | Booking state | Filter: new/confirmed/completed |
| `createdAt` | Order timeline | Sort by date, generate reports |
| `notes` | Special instructions | Display in admin dashboard |

---

## Admin Dashboard Next Steps

File: `admin/dashboard.html` (ready for implementation)

Recommended features:
```javascript
// 1. Fetch all bookings (real-time)
db.collection("bookings").where("status", "==", "new").onSnapshot(...)

// 2. Update booking status
db.collection("bookings").doc(id).update({ status: "confirmed" })

// 3. Display on map
L.marker([doc.pickupLat, doc.pickupLon]).addTo(map)

// 4. Calculate metrics
totalRevenue = bookings.reduce((sum, b) => sum + b.estimatedPrice, 0)

// 5. Filter & search
bookings.filter(b => b.name.includes(searchTerm))
```

---

## Firebase Console Access

1. Go to: https://console.firebase.google.com/
2. Select project: **goods-5097f**
3. Navigate to: **Firestore Database**
4. Collection: **bookings**
5. View all incoming orders in real-time

---

## Testing Bookings

To verify everything works:

```bash
1. Open book.html in browser
2. Fill form with test data
3. Click "Confirm Booking"
4. Go to Firebase console → Firestore → bookings
5. New document should appear instantly
```

---

## WhatsApp Integration Setup

Current URL: `https://wa.me/91XXXXXXXXXX`

To enable WhatsApp support:
1. Replace `91XXXXXXXXXX` with your actual WhatsApp number
2. Include country code (91 for India)
3. Customers clicking button will open WhatsApp chat

Example: `https://wa.me/919876543210` for +91 98765 43210

---

## Email Notifications (Optional Future)

When a booking is created, you could:

1. **Cloud Function** (Firebase):
   ```javascript
   exports.onNewBooking = functions.firestore
     .document('bookings/{docId}')
     .onCreate(async (snap) => {
       const booking = snap.data();
       // Send email to admin
       // Send SMS to customer
     });
   ```

2. **Current workaround**: Check Firebase console regularly or set up email alerts

---

## Database Backup

Firebase Firestore automatically backs up your data. To manually export:

1. Firebase Console → Settings (gear icon)
2. Select "Firestore Database"
3. Click "Export collections"
4. Download as JSON/CSV

---

## Security Rules (Current)

⚠️ **Current rules allow anyone to read/write**

For production, update Firestore rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow read/write for authenticated admin only
    match /bookings/{document=**} {
      allow read, write: if request.auth != null && 
        request.auth.token.admin == true;
    }
  }
}
```

Set admin claims in Firebase Authentication console.

---

## Pricing Reference

Vehicle pricing formula:

```
EstimatedPrice = BasePrice + (max(Distance, MinKM) * RatePerKM)

• Mini Truck: ₹200 base, ₹25/km, 5km minimum
• Pickup: ₹250 base, ₹28/km, 5km minimum  
• Tempo: ₹300 base, ₹35/km, 5km minimum
```

To change pricing, edit `booking.js`:
```javascript
function calc() {
  let base = 200, rate = 25, minKm = 5;
  if(vehicleEl.value === "Pickup") { base = 250; rate = 28; }
  // ... update these values as needed
}
```

---

## Performance Monitoring

Monitor your Firebase usage:

1. Firebase Console → Usage tab
2. Check:
   - Reads: Geocoding requests (Nominatim is free)
   - Writes: Each booking saved
   - Storage: Approximately 1KB per booking

Estimated costs:
- 100 bookings/month: < $1
- 1000 bookings/month: < $5
- Geocoding: FREE (OpenStreetMap/Nominatim)

---

## Troubleshooting

### Bookings not saving?
1. Check Firebase console for errors
2. Open browser console (F12) → check for error messages
3. Verify Firebase credentials in `booking.js`

### Map not showing?
1. Check internet connection
2. Verify Leaflet/OpenStreetMap loading (F12 Network tab)
3. Map is non-critical - booking still works

### Geocoding returns wrong location?
1. OpenStreetMap accuracy depends on location name
2. Try more specific addresses: "Mumbai, Maharashtra, India"
3. Fallback: Allow manual coordinate entry

---

## Next Steps for Business

1. ✅ Test booking flow (complete)
2. ⏳ Set up WhatsApp business number
3. ⏳ Create admin dashboard to view orders
4. ⏳ Add email/SMS notifications for orders
5. ⏳ Implement payment integration
6. ⏳ Add customer order tracking
7. ⏳ Set up delivery team app

---

## Support

For issues:
- **Firebase**: https://firebase.google.com/support
- **Leaflet**: https://leafletjs.com/
- **OpenStreetMap Geocoding**: https://nominatim.org/
