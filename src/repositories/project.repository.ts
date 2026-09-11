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
  where
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

  async listAll(assignedProjectIds?: string[], isSuperAdmin?: boolean): Promise<ProjectEntity[]> {
    try {
      // If user is not super admin and assignedProjectIds is provided, restrict to assigned projects
      if (!isSuperAdmin && assignedProjectIds !== undefined) {
        if (assignedProjectIds.length === 0) {
          return [];
        }
        const q = query(
          collection(db, this.collectionName),
          where('projectId', 'in', assignedProjectIds.slice(0, 30))
        );
        const snap = await getDocs(q);
        return snap.docs.map(d => d.data() as ProjectEntity);
      }

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

  subscribeToProjects(
    onData: (projects: ProjectEntity[]) => void, 
    onError?: (err: Error) => void,
    assignedProjectIds?: string[],
    isSuperAdmin?: boolean
  ) {
    if (!isSuperAdmin && assignedProjectIds !== undefined && assignedProjectIds.length === 0) {
      onData([]);
      return () => {};
    }

    const q = (!isSuperAdmin && assignedProjectIds && assignedProjectIds.length > 0)
      ? query(collection(db, this.collectionName), where('projectId', 'in', assignedProjectIds.slice(0, 30)))
      : collection(db, this.collectionName);

    return onSnapshot(
      q,
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
