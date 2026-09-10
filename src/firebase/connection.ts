import { doc, getDocFromServer } from 'firebase/firestore';
import { db } from './config';

export interface ConnectionStatus {
  connected: boolean;
  checkedAt: string;
  errorMessage?: string;
}

export async function testFirestoreConnection(): Promise<ConnectionStatus> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return {
      connected: true,
      checkedAt: new Date().toISOString(),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('the client is offline')) {
      console.warn('Firebase connection test: client is currently offline or connecting.');
    }
    // Note: if the document 'test/connection' does not exist, getDocFromServer still succeeds in connecting to server, but may throw not-found or return snapshot.exists() === false.
    // If it's a permission denied on test/connection due to zero-trust rules, that actually proves the server connection is reachable.
    const isReachable = !message.includes('unavailable') && !message.includes('offline');
    return {
      connected: isReachable,
      checkedAt: new Date().toISOString(),
      errorMessage: isReachable ? undefined : message,
    };
  }
}
