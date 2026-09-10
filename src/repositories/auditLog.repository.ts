import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  serverTimestamp, 
  onSnapshot,
  query,
  orderBy,
  limit 
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { handleFirestoreError, OperationType } from '../firebase/errors';
import { AuditLogEntity } from '../types/entities';

export class AuditLogRepository {
  private readonly collectionName = 'audit_logs';

  async listRecent(maxLimit = 50): Promise<AuditLogEntity[]> {
    try {
      const q = query(
        collection(db, this.collectionName),
        orderBy('createdAt', 'desc'),
        limit(maxLimit)
      );
      const snap = await getDocs(q);
      return snap.docs.map(d => d.data() as AuditLogEntity);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, this.collectionName);
    }
  }

  async create(log: Omit<AuditLogEntity, 'createdAt' | 'updatedAt'> & { createdBy: string; updatedBy: string }): Promise<void> {
    const path = `${this.collectionName}/${log.auditLogId}`;
    try {
      const payload = {
        ...log,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      await setDoc(doc(db, this.collectionName, log.auditLogId), payload);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  }

  subscribeRecent(maxLimit = 50, onData: (logs: AuditLogEntity[]) => void) {
    const q = query(
      collection(db, this.collectionName),
      orderBy('createdAt', 'desc'),
      limit(maxLimit)
    );
    return onSnapshot(
      q,
      (snapshot) => {
        onData(snapshot.docs.map(d => d.data() as AuditLogEntity));
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, this.collectionName);
      }
    );
  }
}

export const auditLogRepository = new AuditLogRepository();
