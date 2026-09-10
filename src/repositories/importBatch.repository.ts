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
import { ImportBatchEntity } from '../types/entities';

export class ImportBatchRepository {
  private getPath(projectId: string, batchId?: string): string {
    return batchId 
      ? `projects/${projectId}/import_batches/${batchId}` 
      : `projects/${projectId}/import_batches`;
  }

  async findById(projectId: string, batchId: string): Promise<ImportBatchEntity | null> {
    const path = this.getPath(projectId, batchId);
    try {
      const snap = await getDoc(doc(db, 'projects', projectId, 'import_batches', batchId));
      if (!snap.exists()) return null;
      return snap.data() as ImportBatchEntity;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
    }
  }

  async listByProject(projectId: string): Promise<ImportBatchEntity[]> {
    const path = this.getPath(projectId);
    try {
      const snap = await getDocs(collection(db, 'projects', projectId, 'import_batches'));
      return snap.docs.map(d => d.data() as ImportBatchEntity);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  }

  async create(batch: Omit<ImportBatchEntity, 'createdAt' | 'updatedAt'> & { createdBy: string; updatedBy: string }): Promise<void> {
    const path = this.getPath(batch.projectId, batch.batchId);
    try {
      const payload = {
        ...batch,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      await setDoc(doc(db, 'projects', batch.projectId, 'import_batches', batch.batchId), payload);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  }

  async update(projectId: string, batchId: string, updates: Partial<ImportBatchEntity>, updatedBy: string): Promise<void> {
    const path = this.getPath(projectId, batchId);
    try {
      const payload = {
        ...updates,
        batchId,
        projectId,
        updatedAt: serverTimestamp(),
        updatedBy,
      };
      await updateDoc(doc(db, 'projects', projectId, 'import_batches', batchId), payload);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  }

  subscribeByProject(projectId: string, onData: (batches: ImportBatchEntity[]) => void) {
    const path = this.getPath(projectId);
    return onSnapshot(
      collection(db, 'projects', projectId, 'import_batches'),
      (snapshot) => {
        onData(snapshot.docs.map(d => d.data() as ImportBatchEntity));
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, path);
      }
    );
  }
}

export const importBatchRepository = new ImportBatchRepository();
