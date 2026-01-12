# 🚛 Driver Email Notifications Setup Guide

## Overview
When a new booking is created, **all available drivers** (matching the vehicle type and online status) receive an email notification with:
- ✅ Full booking details (customer name, phone, pickup, drop, distance, price)
- ✅ Accept/Reject action buttons with direct links
- ✅ One-click accept or reject without signing in
- ✅ Link to driver dashboard for details

---

## Setup Instructions

### Step 1: Set Up Gmail Account
1. **Enable 2-Factor Authentication (2FA)**
   - Go to: https://myaccount.google.com/security
   - Enable "2-Step Verification"

2. **Create App Password**
   - Go to: https://myaccount.google.com/apppasswords
   - Select **Mail** and **Windows Computer** (or your device)
   - Click "Generate"
   - Copy the 16-character password (e.g., `abcd efgh ijkl mnop`)

### Step 2: Set Firebase Environment Variables
Run these commands in your terminal (from the project root):

```bash
firebase functions:config:set email.user="your_gmail@gmail.com" email.password="abcd efgh ijkl mnop"
```

Replace:
- `your_gmail@gmail.com` with your actual Gmail address
- `abcd efgh ijkl mnop` with the app password you generated

**Verify the config was set:**
```bash
firebase functions:config:get
```

You should see:
```json
{
  "email": {
    "user": "your_gmail@gmail.com",
    "password": "abcd efgh ijkl mnop"
  }
}
```

### Step 3: Deploy Cloud Functions
```bash
firebase deploy --only functions
```

Wait for deployment to complete. You'll see:
```
✓ functions deployed successfully
```

### Step 4: Test Email Sending
1. Sign in to **driver/dashboard.html** with a driver account
2. Make sure your driver is marked as **online** (toggle switch)
3. Create a test booking from **book.html**
4. Check the driver's email inbox in a few seconds
5. You should see an email with the booking details and action buttons

---

## How It Works

### Customer Creates Booking
```
book.html form → Firestore "bookings" collection
```

### Cloud Function Triggers
```
Firestore onCreate() trigger on "bookings" collection
→ sendDriverEmailNotification() Cloud Function executes
```

### Email Query & Send
1. **Queries drivers** matching:
   - `vehicle` = booking vehicle type (Mini Truck, Pickup, Tempo)
   - `status` = "online"

2. **Sends emails** with:
   - Booking details (customer, location, distance, price)
   - Accept button → `/driver/dashboard.html?action=accept&bookingId=XXX`
   - Reject button → `/driver/dashboard.html?action=reject&bookingId=XXX`

3. **Logs results** to `notifications` collection:
   ```javascript
   {
     type: "driver_email",
     bookingId: "...",
     driversNotified: 5,
     emailsSent: 5,
     results: [...],
     createdAt: "2026-01-09T..."
   }
   ```

### Driver Action
- **Click Accept** → Driver dashboard accepts booking automatically
- **Click Reject** → Driver dashboard rejects booking automatically
- **Or sign in** → Full driver dashboard with all bookings

---

## Troubleshooting

### Email Not Being Sent

**Check 1: Is Cloud Function deployed?**
```bash
firebase functions:list
```
Look for `sendDriverEmailNotification`. If not there, run:
```bash
firebase deploy --only functions
```

**Check 2: Are environment variables set?**
```bash
firebase functions:config:get
```
If you see `{}` or no email config, run:
```bash
firebase functions:config:set email.user="your@gmail.com" email.password="app_password"
```

**Check 3: View Cloud Function logs**
```bash
firebase functions:log
```
Look for:
- ✓ "Email sent to..." = Success
- ✗ "Email failed..." = Error details
- ⚠ "Email service not configured" = Setup needed

### Gmail App Password Issues

**Error: "Invalid login credentials"**
- Make sure you used the 16-character **App Password**, not your Gmail password
- The App Password should have spaces: `abcd efgh ijkl mnop`
- When entering via CLI, use the password with spaces exactly as shown

**Error: "Less secure apps blocked"**
- You created an App Password correctly ✓
- But used a regular password ✗
- Delete the config and redo with the correct app password:
```bash
firebase functions:config:unset email
firebase functions:config:set email.user="..." email.password="app_password"
firebase deploy --only functions
```

### Drivers Not Receiving Email

**Check 1: Is driver account marked as online?**
- Go to `/driver/dashboard.html`
- Toggle the "Online" switch to ON
- Only online drivers receive emails

**Check 2: Does driver have an email address?**
- Check Firestore → drivers collection
- Click driver document → verify `email` field exists and is valid
- If missing, driver needs to update profile

**Check 3: Is vehicle type matching?**
- Booking vehicle type (Mini Truck, Pickup, Tempo) must match driver vehicle type
- Example: If booking is "Pickup", only drivers with vehicle="Pickup" get email

**Check 4: Are there any available drivers?**
- If 0 drivers match the criteria, no emails sent
- Check Firestore console → drivers collection
- Verify drivers exist with matching vehicle type and status="online"

---

## Advanced Options

### Using SendGrid Instead of Gmail
If you prefer SendGrid:

1. **Create SendGrid account** and get API key from https://sendgrid.com
2. **Install SendGrid for Node.js**
3. **Update functions/index.js** to use SendGrid transporter

Example:
```javascript
const sgTransport = require("nodemailer-sendgrid-transport");

transporter = nodemailer.createTransport(sgTransport({
  auth: { api_key: process.env.SENDGRID_API_KEY }
}));
```

4. **Set environment variable:**
```bash
firebase functions:config:set sendgrid.api_key="SG...."
```

---

## Production Notes

### Email Volume Limits
- **Gmail**: ~500 emails/day from a standard account
- **SendGrid**: 100+ emails/day (free tier)
- For high volume, consider dedicated email service

### Security Best Practices
1. **Never hardcode credentials** in code
2. **Use environment variables** for sensitive data
3. **Rotate app passwords** periodically
4. **Limit email access** to your project only

### Testing Checklist
- [ ] Email config set via `firebase functions:config:get`
- [ ] Cloud Function deployed via `firebase deploy --only functions`
- [ ] Test driver created with `status="online"`
- [ ] Test booking created
- [ ] Email arrives in driver inbox within 30 seconds
- [ ] Accept/Reject links work without sign-in
- [ ] Booking status updates correctly in driver dashboard

---

## Quick Reference Commands

```bash
# Set email credentials
firebase functions:config:set email.user="..." email.password="..."

# View configuration
firebase functions:config:get

# Deploy Cloud Functions
firebase deploy --only functions

# Watch function logs
firebase functions:log

# Delete email config (to reset)
firebase functions:config:unset email

# Test locally (requires Firebase Emulator)
firebase emulators:start --only functions
```

---

## Email Content Details

Each driver receives an email like this:

```
Subject: 🚛 New Booking: Mumbai → Bangalore

Hi Driver,

A new booking matching your vehicle type (Pickup) is available!

📋 Booking Details
Customer: Raj Kumar
Phone: +91-9876543210
Pickup: 123 MG Road, Mumbai
Drop: IT Park, Bangalore
Distance: 450 km
Estimated Price: ₹12,500
Date & Time: 2026-01-09 at 10:00 AM
Notes: Handle with care, fragile items

Action Required:
[✓ Accept Booking] [✗ Reject Booking]

Or sign in: Driver Dashboard
```

---

## Next Steps

After setting up emails:

1. **Driver Email Notifications are now LIVE** ✅
2. **Remaining feature: OTP Verification** (Phase C)
   - Generate 6-digit OTP on booking confirmation
   - Send OTP to customer email
   - Verify before ride starts

For support, check Firebase console → Functions → Logs
