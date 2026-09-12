import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  serverTimestamp, 
  onSnapshot 
} from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import { handleFirestoreError, OperationType } from '../firebase/errors';
import { TruckEntity } from '../types/entities';

export class TruckRepository {
  private getPath(projectId: string, truckId?: string): string {
    return truckId ? `projects/${projectId}/trucks/${truckId}` : `projects/${projectId}/trucks`;
  }

  async findById(projectId: string, truckId: string): Promise<TruckEntity | null> {
    const path = this.getPath(projectId, truckId);
    if (!auth.currentUser) {
      return null;
    }
    try {
      const snap = await getDoc(doc(db, 'projects', projectId, 'trucks', truckId));
      if (!snap.exists()) return null;
      return snap.data() as TruckEntity;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
    }
  }

  async listByProject(projectId: string): Promise<TruckEntity[]> {
    const path = this.getPath(projectId);
    if (!auth.currentUser) {
      return [];
    }
    try {
      const snap = await getDocs(collection(db, 'projects', projectId, 'trucks'));
      return snap.docs.map(d => d.data() as TruckEntity);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  }

  async create(truck: Omit<TruckEntity, 'createdAt' | 'updatedAt'> & { createdBy: string; updatedBy: string }): Promise<void> {
    const path = this.getPath(truck.projectId, truck.truckId);
    if (!auth.currentUser) {
      console.warn(`[TruckRepository] User unauthenticated. Skipping live Firestore create for ${path}`);
      return;
    }
    try {
      const payload = {
        ...truck,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      await setDoc(doc(db, 'projects', truck.projectId, 'trucks', truck.truckId), payload);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  }

  async update(projectId: string, truckId: string, updates: Partial<TruckEntity>, updatedBy: string): Promise<void> {
    const path = this.getPath(projectId, truckId);
    if (!auth.currentUser) {
      console.warn(`[TruckRepository] User unauthenticated. Skipping live Firestore update for ${path}`);
      return;
    }
    try {
      const payload = {
        ...updates,
        truckId,
        projectId,
        updatedAt: serverTimestamp(),
        updatedBy,
      };
      await updateDoc(doc(db, 'projects', projectId, 'trucks', truckId), payload);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  }

  subscribeByProject(projectId: string, onData: (trucks: TruckEntity[]) => void) {
    if (!auth.currentUser) {
      return () => {};
    }
    const path = this.getPath(projectId);
    return onSnapshot(
      collection(db, 'projects', projectId, 'trucks'),
      (snapshot) => {
        onData(snapshot.docs.map(d => d.data() as TruckEntity));
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, path);
      }
    );
  }
}

export const truckRepository = new TruckRepository();
