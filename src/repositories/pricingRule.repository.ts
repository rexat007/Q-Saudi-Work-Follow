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
import { PricingRuleEntity } from '../types/entities';

export class PricingRuleRepository {
  private getPath(projectId: string, pricingRuleId?: string): string {
    return pricingRuleId ? `projects/${projectId}/pricing_rules/${pricingRuleId}` : `projects/${projectId}/pricing_rules`;
  }

  async findById(projectId: string, pricingRuleId: string): Promise<PricingRuleEntity | null> {
    const path = this.getPath(projectId, pricingRuleId);
    try {
      const snap = await getDoc(doc(db, 'projects', projectId, 'pricing_rules', pricingRuleId));
      if (!snap.exists()) return null;
      return snap.data() as PricingRuleEntity;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
    }
  }

  async listByProject(projectId: string): Promise<PricingRuleEntity[]> {
    const path = this.getPath(projectId);
    try {
      const snap = await getDocs(collection(db, 'projects', projectId, 'pricing_rules'));
      return snap.docs.map(d => d.data() as PricingRuleEntity);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  }

  async create(rule: Omit<PricingRuleEntity, 'createdAt' | 'updatedAt'> & { createdBy: string; updatedBy: string }): Promise<void> {
    const path = this.getPath(rule.projectId, rule.pricingRuleId);
    try {
      const payload = {
        ...rule,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      await setDoc(doc(db, 'projects', rule.projectId, 'pricing_rules', rule.pricingRuleId), payload);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  }

  async update(projectId: string, pricingRuleId: string, updates: Partial<PricingRuleEntity>, updatedBy: string): Promise<void> {
    const path = this.getPath(projectId, pricingRuleId);
    try {
      const payload = {
        ...updates,
        pricingRuleId,
        projectId,
        updatedAt: serverTimestamp(),
        updatedBy,
      };
      await updateDoc(doc(db, 'projects', projectId, 'pricing_rules', pricingRuleId), payload);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  }

  subscribeByProject(projectId: string, onData: (rules: PricingRuleEntity[]) => void) {
    const path = this.getPath(projectId);
    return onSnapshot(
      collection(db, 'projects', projectId, 'pricing_rules'),
      (snapshot) => {
        onData(snapshot.docs.map(d => d.data() as PricingRuleEntity));
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, path);
      }
    );
  }
}

export const pricingRuleRepository = new PricingRuleRepository();
