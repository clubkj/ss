# Deployment Guide - Goods Vehicle Booking System

## Overview
This guide covers deploying the booking system using Firebase Hosting and Cloud Functions for notifications.

---

## Part 1: Firebase Hosting Setup (Frontend Deployment)

### Prerequisites
- Firebase CLI installed: `npm install -g firebase-tools`
- Google account with Firebase project access

### Steps

1. **Initialize Firebase Hosting**
   ```bash
   firebase login
   firebase init hosting
   ```
   - Select project: **goods-5097f**
   - Public directory: **.** (current directory with HTML files)
   - Configure as SPA: **Yes** (redirects 404 to index.html)

2. **Deploy to Firebase Hosting**
   ```bash
   firebase deploy --only hosting
   ```
   
   Your site will be live at: `https://goods-5097f.web.app`

3. **Update WhatsApp Link**
   - Edit `book.html` and `index.html`
   - Replace `91XXXXXXXXXX` with your actual WhatsApp business number

---

## Part 2: Cloud Functions for SMS Notifications (Optional)

### Why Cloud Functions?
- **Secure**: Phone numbers not exposed to frontend
- **Automatic**: Notifications sent when admin changes booking status
- **Scalable**: Handles thousands of notifications

### Setup SMS with Twilio

1. **Sign up for Twilio** (free trial available)
   - Go to https://www.twilio.com/console
   - Get your: `ACCOUNT_SID`, `AUTH_TOKEN`, `TWILIO_PHONE`

2. **Initialize Firebase Cloud Functions**
   ```bash
   firebase init functions
   ```
   - Choose: **JavaScript**
   - Install dependencies: **Yes**

3. **Create functions/index.js**
   ```javascript
   const functions = require("firebase-functions");
   const admin = require("firebase-admin");
   const twilio = require("twilio");
   
   admin.initializeApp();
   const db = admin.firestore();
   
   const accountSid = process.env.TWILIO_ACCOUNT_SID;
   const authToken = process.env.TWILIO_AUTH_TOKEN;
   const twilioPhone = process.env.TWILIO_PHONE;
   const client = twilio(accountSid, authToken);
   
   // Send SMS on booking status change
   exports.sendSmsNotification = functions.firestore
     .document("notifications/{notificationId}")
     .onCreate(async (snap, context) => {
       const notification = snap.data();
       
       const messages = {
         confirmed: `Your booking is confirmed! We'll be there soon. Booking ID: ${notification.bookingId}`,
         completed: `Delivery completed! Thank you for using our service. Booking ID: ${notification.bookingId}`,
         cancelled: `Your booking has been cancelled. Contact us for more info.`
       };
       
       try {
         await client.messages.create({
           body: messages[notification.status] || "Status updated",
           from: twilioPhone,
           to: `+91${notification.phone}`
         });
         
         console.log(`✓ SMS sent to ${notification.phone}`);
         
         // Mark notification as sent
         await db.collection("notifications").doc(context.params.notificationId).update({
           sent: true,
           sentAt: new Date()
         });
       } catch (error) {
         console.error("✗ SMS error:", error);
         throw error;
       }
     });
   ```

4. **Set Environment Variables**
   ```bash
   firebase functions:config:set twilio.account_sid="YOUR_ACCOUNT_SID"
   firebase functions:config:set twilio.auth_token="YOUR_AUTH_TOKEN"
   firebase functions:config:set twilio.phone="YOUR_TWILIO_PHONE"
   ```

5. **Deploy Cloud Functions**
   ```bash
   firebase deploy --only functions
   ```

---

## Part 3: Firestore Security Rules (Production)

Update your Firestore rules for production:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Bookings: Users can create, admins can read/update
    match /bookings/{document=**} {
      allow create;  // Anyone can book
      allow read: if request.auth != null;  // Authenticated users only
      allow update: if request.auth != null;  // Only authenticated admins
      allow delete: if false;  // Never allow deletes
    }
    
    // Notifications: Internal only
    match /notifications/{document=**} {
      allow create: if request.auth != null;
      allow read, update: if request.auth != null;
    }
  }
}
```

To enable authentication:
1. Go to Firebase Console → Authentication
2. Enable **Email/Password** provider
3. Create an admin account for your staff

---

## Part 4: Custom Domain Setup (Optional)

1. **In Firebase Console:**
   - Hosting → Domain Management
   - Click "Add custom domain"
   - Add your domain (e.g., `booking.yourdomain.com`)

2. **Update DNS Records:**
   - Add Firebase's provided DNS A records to your domain registrar
   - Verify domain ownership

3. **SSL Certificate:**
   - Firebase automatically provisions SSL (HTTPS)

---

## Part 5: Environment-Specific Configurations

### Development (Local Testing)
```bash
firebase emulators:start
```
This runs Firestore, Functions, and Hosting locally.

### Staging (Pre-Production)
```bash
firebase deploy --only hosting:staging
```

### Production (Live)
```bash
firebase deploy
```

---

## Part 6: Monitoring & Debugging

### View Logs
```bash
# Hosting logs
firebase hosting:channel:deploy preview

# Function logs
firebase functions:log

# Firestore activity
# Go to Firebase Console → Firestore → Logs
```

### Performance Monitoring
```bash
firebase init perfmon
```

---

## Part 7: Backup & Recovery

### Backup Firestore Data
```bash
gcloud firestore export gs://your-bucket-name/backup-$(date +%Y%m%d)
```

### Restore from Backup
```bash
gcloud firestore import gs://your-bucket-name/backup-20260109
```

---

## Checklist

- [ ] Firebase CLI installed
- [ ] Firebase project initialized (`firebase init`)
- [ ] WhatsApp number updated in HTML
- [ ] Firestore rules updated (from development to production)
- [ ] Firebase Hosting deployed (`firebase deploy --only hosting`)
- [ ] Domain configured (optional)
- [ ] Admin account created for dashboard
- [ ] Twilio account set up (for SMS, optional)
- [ ] Cloud Functions deployed (for notifications, optional)
- [ ] Tested booking flow on live site
- [ ] Monitored logs for errors

---

## Troubleshooting

### "Hosting already initialized"
```bash
rm .firebaserc
firebase init hosting
```

### "Permission denied" errors
- Check Firestore security rules
- Ensure authentication is set up for admin dashboard

### "SMS not sending"
- Verify Twilio credentials in Cloud Functions
- Check `functions:log` for errors
- Ensure phone number format: +91XXXXXXXXXX

### "Map not loading"
- Check Leaflet CDN link in HTML
- Ensure OpenStreetMap is accessible in your region

---

## Support

For issues, check:
1. Browser console (F12) for JavaScript errors
2. Firebase Console → Logs for backend errors
3. Network tab for API calls
4. Cloud Functions logs: `firebase functions:log`

