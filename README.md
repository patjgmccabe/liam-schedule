# Liam's Schedule

A scheduling website where participants can sign up for time slots.

## Features

- **Calendar date picker** — click to pick a date, day of week auto-fills
- **Easy time entry** — dropdowns for hour, minute, and AM/PM
- **Auto-calculated hours** — computed from start and end time
- **Claim system** — participants select their name from a dropdown to claim open slots
- **Past date protection** — slots for past dates are locked and show "Date Passed"
- **Weekly summary page** — total hours per person per week with grand totals

## Participants

Brendan, Caleigh, Shannon, Kelly, Aidan

---

## Firebase Setup (Required for Multi-User Access)

The site works locally with `localStorage` out of the box, but for multiple users to share the same data you need to connect it to a free Firebase Realtime Database.

### Step-by-step

1. Go to [https://console.firebase.google.com](https://console.firebase.google.com) and sign in with a Google account.

2. Click **Add project**, give it a name (e.g. `liam-schedule`), and click through the steps (you can disable Google Analytics).

3. Once the project is created, click the **</>** (Web) icon to register a web app. Give it a nickname and click **Register app**.

4. You will see a `firebaseConfig` object. Copy those values.

5. Open **`app.js`** and **`summary.js`** in this project. Replace the placeholder config at the top of each file with your values:

   ```js
   const firebaseConfig = {
     apiKey: "AIza...",
     authDomain: "liam-schedule-xxxxx.firebaseapp.com",
     databaseURL: "https://liam-schedule-xxxxx-default-rtdb.firebaseio.com",
     projectId: "liam-schedule-xxxxx",
     storageBucket: "liam-schedule-xxxxx.appspot.com",
     messagingSenderId: "123456789",
     appId: "1:123456789:web:abc123"
   };
   ```

6. In the Firebase console, go to **Build > Realtime Database** and click **Create Database**.
   - Choose a location close to you.
   - Select **Start in test mode** (allows read/write for 30 days — you can update the rules later).

7. Commit and push your changes. The site will now use Firebase for shared data.

### Securing the Database (Optional)

After setup, update the Realtime Database rules to be more restrictive:

```json
{
  "rules": {
    "entries": {
      ".read": true,
      ".write": true
    }
  }
}
```

## Deployment

This site is deployed on GitHub Pages. Any push to the `main` branch will update the live site automatically.
