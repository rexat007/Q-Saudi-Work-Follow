import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  serverTimestamp, 
  onSnapshot,
  query,
  orderBy 
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { handleFirestoreError, OperationType } from '../firebase/errors';
import { TripEventEntity } from '../types/entities';

export class TripEventRepository {
  private getPath(projectId: string, tripId: string, eventId?: string): string {
    return eventId 
      ? `projects/${projectId}/trips/${tripId}/events/${eventId}` 
      : `projects/${projectId}/trips/${tripId}/events`;
  }

  async listByTrip(projectId: string, tripId: string): Promise<TripEventEntity[]> {
    const path = this.getPath(projectId, tripId);
    try {
      const q = query(
        collection(db, 'projects', projectId, 'trips', tripId, 'events'),
        orderBy('serverTimestamp', 'asc')
      );
      const snap = await getDocs(q);
      return snap.docs.map(d => d.data() as TripEventEntity);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  }

  async create(event: Omit<TripEventEntity, 'createdAt' | 'updatedAt' | 'serverTimestamp'> & { createdBy: string; updatedBy: string }): Promise<void> {
    const path = this.getPath(event.projectId, event.tripId, event.eventId);
    try {
      const payload = {
        ...event,
        serverTimestamp: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      await setDoc(doc(db, 'projects', event.projectId, 'trips', event.tripId, 'events', event.eventId), payload);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  }

  subscribeByTrip(projectId: string, tripId: string, onData: (events: TripEventEntity[]) => void) {
    const path = this.getPath(projectId, tripId);
    const q = query(
      collection(db, 'projects', projectId, 'trips', tripId, 'events'),
      orderBy('serverTimestamp', 'asc')
    );
    return onSnapshot(
      q,
      (snapshot) => {
        onData(snapshot.docs.map(d => d.data() as TripEventEntity));
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, path);
      }
    );
  }
}

export const tripEventRepository = new TripEventRepository();
