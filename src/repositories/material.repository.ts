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
import { MaterialEntity } from '../types/entities';

export class MaterialRepository {
  private getPath(projectId: string, materialId?: string): string {
    return materialId ? `projects/${projectId}/materials/${materialId}` : `projects/${projectId}/materials`;
  }

  async findById(projectId: string, materialId: string): Promise<MaterialEntity | null> {
    const path = this.getPath(projectId, materialId);
    if (!auth.currentUser) {
      return null;
    }
    try {
      const snap = await getDoc(doc(db, 'projects', projectId, 'materials', materialId));
      if (!snap.exists()) return null;
      return snap.data() as MaterialEntity;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
    }
  }

  async listByProject(projectId: string): Promise<MaterialEntity[]> {
    const path = this.getPath(projectId);
    if (!auth.currentUser) {
      return [];
    }
    try {
      const snap = await getDocs(collection(db, 'projects', projectId, 'materials'));
      return snap.docs.map(d => d.data() as MaterialEntity);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  }

  async create(material: Omit<MaterialEntity, 'createdAt' | 'updatedAt'> & { createdBy: string; updatedBy: string }): Promise<void> {
    const path = this.getPath(material.projectId, material.materialId);
    if (!auth.currentUser) {
      console.warn(`[MaterialRepository] User unauthenticated. Skipping live Firestore create for ${path}`);
      return;
    }
    try {
      const payload = {
        ...material,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      await setDoc(doc(db, 'projects', material.projectId, 'materials', material.materialId), payload);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  }

  async update(projectId: string, materialId: string, updates: Partial<MaterialEntity>, updatedBy: string): Promise<void> {
    const path = this.getPath(projectId, materialId);
    if (!auth.currentUser) {
      console.warn(`[MaterialRepository] User unauthenticated. Skipping live Firestore update for ${path}`);
      return;
    }
    try {
      const payload = {
        ...updates,
        materialId,
        projectId,
        updatedAt: serverTimestamp(),
        updatedBy,
      };
      await updateDoc(doc(db, 'projects', projectId, 'materials', materialId), payload);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  }

  subscribeByProject(projectId: string, onData: (materials: MaterialEntity[]) => void) {
    if (!auth.currentUser) {
      return () => {};
    }
    const path = this.getPath(projectId);
    return onSnapshot(
      collection(db, 'projects', projectId, 'materials'),
      (snapshot) => {
        onData(snapshot.docs.map(d => d.data() as MaterialEntity));
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, path);
      }
    );
  }
}

export const materialRepository = new MaterialRepository();
