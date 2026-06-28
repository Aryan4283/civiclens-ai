const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { getStorage } = require('firebase-admin/storage');

const projectId = process.env.FIREBASE_PROJECT_ID;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

if (projectId && privateKey && clientEmail) {
  initializeApp({
    credential: cert({
      projectId,
      privateKey,
      clientEmail,
    }),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || `${projectId}.appspot.com`
  });
} else {
  // Fallback to Application Default Credentials for Cloud Run
  initializeApp({
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || `${process.env.GOOGLE_CLOUD_PROJECT || 'civiclens-ca27d'}.appspot.com`
  });
}

const db = getFirestore();
const bucket = getStorage().bucket();

module.exports = { db, bucket, FieldValue };

