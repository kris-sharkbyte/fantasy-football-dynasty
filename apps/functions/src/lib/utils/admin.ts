// apps/functions/src/lib/utils/admin.ts
import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

// Lazily initialize Firebase Admin
function getAdminApp() {
  if (!getApps().length) {
    initializeApp();
  }
}

export function admin() {
  getAdminApp();
  return {
    db: getFirestore(),
    auth: getAuth(),
  };
}


