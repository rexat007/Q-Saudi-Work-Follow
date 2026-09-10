import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  serverTimestamp, 
  onSnapshot,
  query,
  where,
  orderBy,
  limit
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { handleFirestoreError, OperationType } from '../firebase/errors';
import { TripEntity, TripStatus } from '../types/entities';

export class TripRepository {
  private getPath(projectId: string, tripId?: string): string {
    return tripId ? `projects/${projectId}/trips/${tripId}` : `projects/${projectId}/trips`;
  }

  async findById(projectId: string, tripId: string): Promise<TripEntity | null> {
    const path = this.getPath(projectId, tripId);
    try {
      const snap = await getDoc(doc(db, 'projects', projectId, 'trips', tripId));
      if (!snap.exists()) return null;
      return snap.data() as TripEntity;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
    }
  }

  async listByProject(projectId: string, maxLimit = 100): Promise<TripEntity[]> {
    const path = this.getPath(projectId);
    try {
      const q = query(
        collection(db, 'projects', projectId, 'trips'),
        orderBy('createdAt', 'desc'),
        limit(maxLimit)
      );
      const snap = await getDocs(q);
      return snap.docs.map(d => d.data() as TripEntity);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  }

  async listByStatus(projectId: string, status: TripStatus): Promise<TripEntity[]> {
    const path = this.getPath(projectId);
    try {
      const q = query(
        collection(db, 'projects', projectId, 'trips'),
        where('status', '==', status)
      );
      const snap = await getDocs(q);
      return snap.docs.map(d => d.data() as TripEntity);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  }

  async create(trip: Omit<TripEntity, 'createdAt' | 'updatedAt'> & { createdBy: string; updatedBy: string }): Promise<void> {
    const path = this.getPath(trip.projectId, trip.tripId);
    try {
      const payload = {
        ...trip,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      await setDoc(doc(db, 'projects', trip.projectId, 'trips', trip.tripId), payload);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  }

  async update(projectId: string, tripId: string, updates: Partial<TripEntity>, updatedBy: string): Promise<void> {
    const path = this.getPath(projectId, tripId);
    try {
      const payload = {
        ...updates,
        tripId,
        projectId,
        updatedAt: serverTimestamp(),
        updatedBy,
      };
      await updateDoc(doc(db, 'projects', projectId, 'trips', tripId), payload);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  }

  subscribeByProject(projectId: string, onData: (trips: TripEntity[]) => void) {
    const path = this.getPath(projectId);
    return onSnapshot(
      collection(db, 'projects', projectId, 'trips'),
      (snapshot) => {
        onData(snapshot.docs.map(d => d.data() as TripEntity));
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, path);
      }
    );
  }
}

export const tripRepository = new TripRepository();
