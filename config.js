// ─────────────────────────────────────────────────────────────────────────────
// Kairos configuration.
// These values are NOT secret (Firebase web keys and OAuth client IDs are public
// by design); access is protected by Firestore Rules and Google sign-in.
// ─────────────────────────────────────────────────────────────────────────────
window.KAIROS_CONFIG = {
  appName: 'Kairos',

  // Firebase project: kairos-f21ca
  firebase: {
    apiKey: 'AIzaSyAl3BH3v4OOKNrCTsT1MgUz700TMckqEB4',
    authDomain: 'kairos-f21ca.firebaseapp.com',
    projectId: 'kairos-f21ca',
    storageBucket: 'kairos-f21ca.firebasestorage.app',
    messagingSenderId: '457276919677',
    appId: '1:457276919677:web:4e7300bebd60bfa7878614',
  },

  // Google Cloud console › Google Auth Platform › Clients › Web application › Client ID
  googleClientId: '891716718196-uom1lqm3ht41k455u0nm99lrkdjc2bm5.apps.googleusercontent.com',
};
