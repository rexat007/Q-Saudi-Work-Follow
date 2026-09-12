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
import { PricingRuleEntity } from '../types/entities';

export class PricingRuleRepository {
  private getPath(projectId: string, pricingRuleId?: string): string {
    return pricingRuleId ? `projects/${projectId}/pricing_rules/${pricingRuleId}` : `projects/${projectId}/pricing_rules`;
  }

  private getStorageKey(projectId: string): string {
    return `Q_SAUDI_PRICING_RULES_${projectId}`;
  }

  private getLocalCache(projectId: string): PricingRuleEntity[] {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = window.localStorage.getItem(this.getStorageKey(projectId));
        if (raw) return JSON.parse(raw);
      }
    } catch {}
    return [];
  }

  private saveLocalCache(projectId: string, rules: PricingRuleEntity[]): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(this.getStorageKey(projectId), JSON.stringify(rules));
      }
    } catch {}
  }

  async findById(projectId: string, pricingRuleId: string): Promise<PricingRuleEntity | null> {
    const path = this.getPath(projectId, pricingRuleId);
    try {
      const snap = await getDoc(doc(db, 'projects', projectId, 'pricing_rules', pricingRuleId));
      if (!snap.exists()) {
        const local = this.getLocalCache(projectId).find(r => r.pricingRuleId === pricingRuleId);
        return local || null;
      }
      return snap.data() as PricingRuleEntity;
    } catch (error) {
      const local = this.getLocalCache(projectId).find(r => r.pricingRuleId === pricingRuleId);
      if (local) return local;
      handleFirestoreError(error, OperationType.GET, path);
    }
  }

  async listByProject(projectId: string): Promise<PricingRuleEntity[]> {
    const cached = this.getLocalCache(projectId);
    if (!auth.currentUser) {
      return cached;
    }
    const path = this.getPath(projectId);
    try {
      const snap = await getDocs(collection(db, 'projects', projectId, 'pricing_rules'));
      const rules = snap.docs.map(d => d.data() as PricingRuleEntity);
      if (rules.length > 0) {
        this.saveLocalCache(projectId, rules);
        return rules;
      }
      return cached.length > 0 ? cached : rules;
    } catch (error) {
      if (cached.length > 0) return cached;
      handleFirestoreError(error, OperationType.LIST, path);
    }
  }

  async create(rule: Omit<PricingRuleEntity, 'createdAt' | 'updatedAt'> & { createdBy: string; updatedBy: string }): Promise<void> {
    const path = this.getPath(rule.projectId, rule.pricingRuleId);
    // Update local cache immediately for instant UI and reload persistence
    const current = this.getLocalCache(rule.projectId);
    const updated = [...current.filter(r => r.pricingRuleId !== rule.pricingRuleId), rule as PricingRuleEntity];
    this.saveLocalCache(rule.projectId, updated);

    if (!auth.currentUser) {
      return;
    }

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
    // Update local cache
    const current = this.getLocalCache(projectId);
    const updated = current.map(r => r.pricingRuleId === pricingRuleId ? { ...r, ...updates, updatedBy } : r);
    this.saveLocalCache(projectId, updated);

    if (!auth.currentUser) {
      return;
    }

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
    if (!auth.currentUser) {
      onData(this.getLocalCache(projectId));
      return () => {};
    }
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
