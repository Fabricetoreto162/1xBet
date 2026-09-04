import { initializeApp } from 'firebase/app';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { getAnalytics, isSupported } from 'firebase/analytics';
import { environment } from '../../../environments/environment';

const app = initializeApp(environment.firebase);

export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});

// Firebase Analytics
export let analytics: ReturnType<typeof getAnalytics> | undefined;

isSupported().then((supported) => {
  if (supported) {
    analytics = getAnalytics(app);
  }
});

