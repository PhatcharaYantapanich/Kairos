// ─────────────────────────────────────────────────────────────────────────────
// Kairos configuration — fill in once, then upload with the rest of the app.
// These values are NOT secret (Firebase web keys and OAuth client IDs are public
// by design); access is protected by Firestore Rules and Google sign-in.
// Leave them empty to use the app on one device only, or paste them in-app via
// Settings › ตั้งค่า Cloud / Google.
// ─────────────────────────────────────────────────────────────────────────────
window.KAIROS_CONFIG = {
  appName: 'Kairos',

  // Firebase console › Project settings › Your apps › Web app › firebaseConfig
  firebase: {
    apiKey: '',
    authDomain: '',
    projectId: '',
    storageBucket: '',
    messagingSenderId: '',
    appId: '',
  },

  // Google Cloud console › Google Auth Platform › Clients › Web application › Client ID
  googleClientId: '',
};
