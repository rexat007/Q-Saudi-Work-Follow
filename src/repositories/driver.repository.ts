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
import { DriverEntity } from '../types/entities';

export class DriverRepository {
  private getPath(projectId: string, driverId?: string): string {
    return driverId ? `projects/${projectId}/drivers/${driverId}` : `projects/${projectId}/drivers`;
  }

  async findById(projectId: string, driverId: string): Promise<DriverEntity | null> {
    const path = this.getPath(projectId, driverId);
    try {
      const snap = await getDoc(doc(db, 'projects', projectId, 'drivers', driverId));
      if (!snap.exists()) return null;
      return snap.data() as DriverEntity;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
    }
  }

  async listByProject(projectId: string): Promise<DriverEntity[]> {
    const path = this.getPath(projectId);
    try {
      const snap = await getDocs(collection(db, 'projects', projectId, 'drivers'));
      return snap.docs.map(d => d.data() as DriverEntity);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  }

  async create(driver: Omit<DriverEntity, 'createdAt' | 'updatedAt'> & { createdBy: string; updatedBy: string }): Promise<void> {
    const path = this.getPath(driver.projectId, driver.driverId);
    try {
      const payload = {
        ...driver,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      await setDoc(doc(db, 'projects', driver.projectId, 'drivers', driver.driverId), payload);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  }

  async update(projectId: string, driverId: string, updates: Partial<DriverEntity>, updatedBy: string): Promise<void> {
    const path = this.getPath(projectId, driverId);
    try {
      const payload = {
        ...updates,
        driverId,
        projectId,
        updatedAt: serverTimestamp(),
        updatedBy,
      };
      await updateDoc(doc(db, 'projects', projectId, 'drivers', driverId), payload);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  }

  subscribeByProject(projectId: string, onData: (drivers: DriverEntity[]) => void) {
    const path = this.getPath(projectId);
    return onSnapshot(
      collection(db, 'projects', projectId, 'drivers'),
      (snapshot) => {
        onData(snapshot.docs.map(d => d.data() as DriverEntity));
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, path);
      }
    );
  }
}

export const driverRepository = new DriverRepository();
