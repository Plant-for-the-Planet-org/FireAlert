import {cert, getApps, initializeApp} from 'firebase-admin/app';
import {getMessaging, type Messaging} from 'firebase-admin/messaging';
import {env} from '../env.mjs';

// Named app so we never clash with a default app initialized elsewhere.
const FIREBASE_APP_NAME = 'firealert';

export function isFirebaseConfigured(): boolean {
  return (
    !!env.FIREBASE_PROJECT_ID &&
    !!env.FIREBASE_CLIENT_EMAIL &&
    !!env.FIREBASE_PRIVATE_KEY
  );
}

/**
 * Returns the Firebase Messaging client, or null when FCM is not configured.
 * The app is created lazily once per server instance.
 */
export function getFirebaseMessaging(): Messaging | null {
  if (!isFirebaseConfigured()) {
    return null;
  }

  const existingApp = getApps().find(app => app.name === FIREBASE_APP_NAME);
  const app =
    existingApp ??
    initializeApp(
      {
        credential: cert({
          projectId: env.FIREBASE_PROJECT_ID,
          clientEmail: env.FIREBASE_CLIENT_EMAIL,
          // Env files store the key on one line with literal "\n".
          privateKey: env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, '\n'),
        }),
      },
      FIREBASE_APP_NAME,
    );

  return getMessaging(app);
}
