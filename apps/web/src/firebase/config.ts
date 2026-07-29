import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyAsr3a6N0JM_NdYhN4YbOSKH1zTUAVSDI0',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'manejo-centro-aa.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'manejo-centro-aa',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'manejo-centro-aa.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '56404747919',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:56404747919:web:f0e8f3cc416cdbd946b2fa',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-GY9T56MZ32',
}

if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.error('[firebase] Missing config. Check apps/web/.env (copy from .env.example)')
}

export const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)