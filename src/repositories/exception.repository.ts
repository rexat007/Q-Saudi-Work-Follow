import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  serverTimestamp, 
  onSnapshot 
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { handleFirestoreError, OperationType } from '../firebase/errors';
import { TripExceptionEntity } from '../types/entities';

export class ExceptionRepository {
  private getPath(projectId: string, tripId: string, exceptionId?: string): string {
    return exceptionId 
      ? `projects/${projectId}/trips/${tripId}/exceptions/${exceptionId}` 
      : `projects/${projectId}/trips/${tripId}/exceptions`;
  }

  async listByTrip(projectId: string, tripId: string): Promise<TripExceptionEntity[]> {
    const path = this.getPath(projectId, tripId);
    try {
      const snap = await getDocs(collection(db, 'projects', projectId, 'trips', tripId, 'exceptions'));
      return snap.docs.map(d => d.data() as TripExceptionEntity);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  }

  async create(exception: Omit<TripExceptionEntity, 'createdAt' | 'updatedAt'> & { createdBy: string; updatedBy: string }): Promise<void> {
    const path = this.getPath(exception.projectId, exception.tripId, exception.exceptionId);
    try {
      const payload = {
        ...exception,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      await setDoc(doc(db, 'projects', exception.projectId, 'trips', exception.tripId, 'exceptions', exception.exceptionId), payload);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  }

  async update(projectId: string, tripId: string, exceptionId: string, updates: Partial<TripExceptionEntity>, updatedBy: string): Promise<void> {
    const path = this.getPath(projectId, tripId, exceptionId);
    try {
      const payload = {
        ...updates,
        exceptionId,
        tripId,
        projectId,
        updatedAt: serverTimestamp(),
        updatedBy,
      };
      await updateDoc(doc(db, 'projects', projectId, 'trips', tripId, 'exceptions', exceptionId), payload);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  }

  subscribeByTrip(projectId: string, tripId: string, onData: (exceptions: TripExceptionEntity[]) => void) {
    const path = this.getPath(projectId, tripId);
    return onSnapshot(
      collection(db, 'projects', projectId, 'trips', tripId, 'exceptions'),
      (snapshot) => {
        onData(snapshot.docs.map(d => d.data() as TripExceptionEntity));
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, path);
      }
    );
  }
}

export const exceptionRepository = new ExceptionRepository();
