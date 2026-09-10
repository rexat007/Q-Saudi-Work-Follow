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
import { ProjectEntity } from '../types/entities';

export class ProjectRepository {
  private readonly collectionName = 'projects';

  async findById(projectId: string): Promise<ProjectEntity | null> {
    const path = `${this.collectionName}/${projectId}`;
    try {
      const snap = await getDoc(doc(db, this.collectionName, projectId));
      if (!snap.exists()) return null;
      return snap.data() as ProjectEntity;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
    }
  }

  async listAll(): Promise<ProjectEntity[]> {
    try {
      const snap = await getDocs(collection(db, this.collectionName));
      return snap.docs.map(d => d.data() as ProjectEntity);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, this.collectionName);
    }
  }

  async create(project: Omit<ProjectEntity, 'createdAt' | 'updatedAt'> & { createdBy: string; updatedBy: string }): Promise<void> {
    const path = `${this.collectionName}/${project.projectId}`;
    try {
      const payload = {
        ...project,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      await setDoc(doc(db, this.collectionName, project.projectId), payload);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  }

  async update(projectId: string, updates: Partial<ProjectEntity>, updatedBy: string): Promise<void> {
    const path = `${this.collectionName}/${projectId}`;
    try {
      const payload = {
        ...updates,
        projectId, // immutable ID invariant
        updatedAt: serverTimestamp(),
        updatedBy,
      };
      await updateDoc(doc(db, this.collectionName, projectId), payload);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  }

  subscribeToProjects(onData: (projects: ProjectEntity[]) => void, onError?: (err: Error) => void) {
    return onSnapshot(
      collection(db, this.collectionName),
      (snapshot) => {
        const list = snapshot.docs.map(d => d.data() as ProjectEntity);
        onData(list);
      },
      (error) => {
        if (onError) onError(error);
        handleFirestoreError(error, OperationType.LIST, this.collectionName);
      }
    );
  }
}

export const projectRepository = new ProjectRepository();
