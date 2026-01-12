# ADMIN DASHBOARD QUICK START

## What's New ✨

Your admin dashboard now has:
1. ✅ **Live Booking Table** - Real-time updates from Firestore
2. ✅ **Interactive Map** - Visualize pickup/drop locations
3. ✅ **Status Management** - Confirm, complete, or cancel bookings with one click
4. ✅ **Statistics** - Total bookings, revenue, order counts
5. ✅ **Search & Filter** - Find bookings instantly by name, phone, location
6. ✅ **Booking Details** - Full customer info in a modal popup
7. ✅ **CSV Export** - Download all booking data for reports
8. ✅ **SMS Notifications** - Automatically notify customers when status changes (with Cloud Functions)

---

## How to Use

### 1. Access the Dashboard
- **Local**: `file:///C:/Users/AMARP/3D Objects/goods vehicel/admin/dashboard.html` (in browser)
- **Live**: `https://goods-5097f.web.app/admin/dashboard.html` (after deployment)

### 2. View Real-Time Data
- Dashboard loads automatically and **updates in real-time** as customers book
- Statistics cards show:
  - Total bookings
  - New orders (unprocessed)
  - Confirmed bookings
  - Completed deliveries
  - Total revenue

### 3. Filter Bookings
- Click buttons: **All**, **New**, **Confirmed**, **Completed**, **Cancelled**
- Use search box to find by:
  - Customer name: "Raj"
  - Phone: "9876543210"
  - Location: "Mumbai"

### 4. Update Booking Status

**For NEW bookings:**
1. Find the booking in the table
2. Click **"✓ Confirm"** button
3. Customer receives SMS: "Your booking is confirmed!"

**For CONFIRMED bookings:**
1. Once delivery starts, click **"✓ Complete"** button
2. Customer receives SMS: "Delivery completed!"

**To CANCEL:**
1. Click **"✗ Cancel"** button
2. No SMS sent (user must be contacted separately)

### 5. View Full Details
1. Click **"ℹ️ Details"** button in any row
2. Modal opens showing:
   - Booking ID
   - Customer name & phone
   - Pickup/drop locations with coordinates
   - Vehicle type, distance, price
   - Loading requirements
   - Special notes
   - Current status
   - Creation date

### 6. Use the Map
- **Blue circles (🔵)** = Pickup locations
- **Red circles (🔴)** = Drop locations
- **Dashed lines** = Route from pickup to drop
- **Click markers** to see customer phone and location

### 7. Export Data
- Click **"📥 Export CSV"** button
- Downloads file: `bookings-2026-01-09.csv`
- Open in Excel for analysis, reporting, accounting

### 8. Refresh Data
- Click **"🔄 Refresh"** button to manually refresh
- (Data updates automatically anyway)

---

## Status Workflow

```
Customer Books (Status: "new")
         ↓
  Admin Confirms (Status: "confirmed")
  [Customer gets SMS]
         ↓
  Delivery Complete (Status: "completed")
  [Customer gets SMS]
         ↓
      Done! ✅
```

---

## SMS Notifications Setup

**By default**, the dashboard is ready to send SMS automatically!

### What You Need To Do:

1. **Sign up for Twilio** (free trial):
   - Go to https://www.twilio.com
   - Get `ACCOUNT_SID`, `AUTH_TOKEN`, `TWILIO_PHONE`

2. **Deploy Cloud Functions** (one-time setup):
   ```bash
   firebase init functions
   # Copy code from DEPLOYMENT.md → Part 2
   firebase deploy --only functions
   ```

3. **That's it!** SMS will automatically send when you click Confirm/Complete

### Without Twilio (SMS disabled):
- Dashboard still works 100%
- Just no automatic SMS notifications
- You can call customers manually instead

---

## Tips & Best Practices

✅ **Do:**
- Check dashboard regularly for new bookings
- Confirm bookings within 1 hour
- Update status in real-time as vehicles move
- Export weekly for accounting/reports
- Use search to quickly find repeat customers

❌ **Don't:**
- Leave new bookings unconfirmed for >2 hours
- Update status multiple times (system records timestamps)
- Close dashboard tab (data won't update)
- Share admin dashboard link (no auth yet - see DEPLOYMENT.md for auth setup)

---

## Troubleshooting

### "Loading forever" / No data showing
1. Press F12 → Console tab
2. Look for red error messages
3. Check: Is Firestore security rules allowing reads?
4. Refresh the page

### Search not working
- Check spelling
- Try searching by phone number instead of name
- Make sure data was actually saved in Firestore

### Map showing only blank
- Zoom out (scroll wheel or `-` button)
- Check browser console for Leaflet errors
- Ensure location has valid coordinates

### SMS not sending after status change
1. Did you deploy Cloud Functions? (See DEPLOYMENT.md)
2. Check: `firebase functions:log` for errors
3. Verify: Twilio credentials are correct
4. Check: Phone number format (must start with +91)

### Buttons not working
1. Check browser console (F12)
2. Make sure you're logged in (if authentication enabled)
3. Verify Firestore security rules allow updates

---

## Files Reference

| File | Purpose |
|------|---------|
| [admin/dashboard.html](admin/dashboard.html) | UI with map, tables, stats |
| [js/admin.js](js/admin.js) | Logic: data loading, filtering, status updates |
| [DEPLOYMENT.md](DEPLOYMENT.md) | Deployment & SMS setup guide |
| [.github/copilot-instructions.md](.github/copilot-instructions.md) | For AI agents/developers |

---

## Next Steps

1. ✅ Test with sample bookings (submit a few from book.html)
2. ✅ Verify all bookings appear on dashboard
3. ✅ Try filtering, searching, exporting
4. ✅ Test status updates (confirm → complete)
5. 🚀 Deploy to Firebase Hosting (see DEPLOYMENT.md)
6. 🔔 Set up Twilio SMS (optional, see DEPLOYMENT.md)
7. 🔒 Add authentication for admin (see DEPLOYMENT.md)

---

## Support

- Check browser console (F12) for errors
- Review [DEPLOYMENT.md](DEPLOYMENT.md) for setup issues
- Test Firebase connection: Open book.html, press F12 console, type `testFirebase()`

Happy booking management! 🚛
