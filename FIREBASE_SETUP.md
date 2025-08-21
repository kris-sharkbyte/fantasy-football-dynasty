# Firebase Setup Guide

## 🔥 Firebase Project Configuration

### 1. Get Your Firebase Configuration

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (or create a new one)
3. Click on the gear icon (⚙️) next to "Project Overview"
4. Select "Project settings"
5. Scroll down to "Your apps" section
6. Click on the web app icon (</>)
7. Copy the configuration object

### 2. Update Environment Files

Replace the placeholder values in these files with your actual Firebase configuration:

**`apps/web/src/environments/environment.ts`** (Development)

```typescript
export const environment = {
  production: false,
  firebase: {
    apiKey: 'your-actual-api-key',
    authDomain: 'your-project.firebaseapp.com',
    projectId: 'your-project-id',
    storageBucket: 'your-project.appspot.com',
    messagingSenderId: 'your-sender-id',
    appId: 'your-app-id',
  },
};
```

**`apps/web/src/environments/environment.prod.ts`** (Production)

```typescript
export const environment = {
  production: true,
  firebase: {
    apiKey: 'your-actual-api-key',
    authDomain: 'your-project.firebaseapp.com',
    projectId: 'your-project-id',
    storageBucket: 'your-project.appspot.com',
    messagingSenderId: 'your-sender-id',
    appId: 'your-app-id',
  },
};
```

### 3. Enable Authentication Providers

1. In Firebase Console, go to "Authentication" → "Sign-in method"
2. Enable "Email/Password" provider
3. Optionally enable other providers (Google, Facebook, etc.)

### 4. Set Up Firestore Database

1. Go to "Firestore Database" in Firebase Console
2. Click "Create database"
3. Choose "Start in test mode" for development
4. Select a location close to your users

### 5. Security Rules (Basic Setup)

For development, you can use these basic rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow read/write access to authenticated users
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

**⚠️ Important:** These rules allow any authenticated user to read/write any document. For production, you'll want more restrictive rules.

### 6. Test the Setup

1. Start the development server: `npx nx serve web`
2. Navigate to `/auth/register` to create a test account
3. Try logging in at `/auth/login`
4. Check the browser console for any Firebase errors

### 7. Environment Variables (Optional)

For better security, you can use environment variables:

1. Create a `.env` file in the project root
2. Add your Firebase config:

```env
FIREBASE_API_KEY=your-api-key
FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_STORAGE_BUCKET=your-project.appspot.com
FIREBASE_MESSAGING_SENDER_ID=your-sender-id
FIREBASE_APP_ID=your-app-id
```

3. Update the environment files to use these variables

### 8. Next Steps

After Firebase is configured:

1. ✅ Authentication system will be working
2. 🔄 Create user profiles in Firestore
3. 🔄 Implement role-based access control
4. 🔄 Set up league and team data structures
5. 🔄 Configure proper security rules

### 🚨 Security Notes

- Never commit your Firebase config to version control
- Use environment variables for sensitive data
- Set up proper Firestore security rules before production
- Enable Firebase App Check for additional security
- Monitor authentication attempts in Firebase Console

### 📚 Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [Angular Fire Guide](https://github.com/angular/angularfire)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
