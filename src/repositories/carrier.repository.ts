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
import { db } from '../firebase/config';
import { handleFirestoreError, OperationType } from '../firebase/errors';
import { CarrierEntity } from '../types/entities';

export class CarrierRepository {
  private getPath(projectId: string, carrierId?: string): string {
    return carrierId ? `projects/${projectId}/carriers/${carrierId}` : `projects/${projectId}/carriers`;
  }

  async findById(projectId: string, carrierId: string): Promise<CarrierEntity | null> {
    const path = this.getPath(projectId, carrierId);
    try {
      const snap = await getDoc(doc(db, 'projects', projectId, 'carriers', carrierId));
      if (!snap.exists()) return null;
      return snap.data() as CarrierEntity;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
    }
  }

  async listByProject(projectId: string): Promise<CarrierEntity[]> {
    const path = this.getPath(projectId);
    try {
      const snap = await getDocs(collection(db, 'projects', projectId, 'carriers'));
      return snap.docs.map(d => d.data() as CarrierEntity);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  }

  async create(carrier: Omit<CarrierEntity, 'createdAt' | 'updatedAt'> & { createdBy: string; updatedBy: string }): Promise<void> {
    const path = this.getPath(carrier.projectId, carrier.carrierId);
    try {
      const payload = {
        ...carrier,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      await setDoc(doc(db, 'projects', carrier.projectId, 'carriers', carrier.carrierId), payload);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  }

  async update(projectId: string, carrierId: string, updates: Partial<CarrierEntity>, updatedBy: string): Promise<void> {
    const path = this.getPath(projectId, carrierId);
    try {
      const payload = {
        ...updates,
        carrierId,
        projectId,
        updatedAt: serverTimestamp(),
        updatedBy,
      };
      await updateDoc(doc(db, 'projects', projectId, 'carriers', carrierId), payload);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  }

  subscribeByProject(projectId: string, onData: (carriers: CarrierEntity[]) => void) {
    const path = this.getPath(projectId);
    return onSnapshot(
      collection(db, 'projects', projectId, 'carriers'),
      (snapshot) => {
        onData(snapshot.docs.map(d => d.data() as CarrierEntity));
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, path);
      }
    );
  }
}

export const carrierRepository = new CarrierRepository();
