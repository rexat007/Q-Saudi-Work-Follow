import React, { useState } from 'react';
import { WizardUserAccessItem, UserRole } from '../../types/wizard';
import { 
  Users, 
  ShieldCheck, 
  Plus, 
  Check, 
  X, 
  Mail, 
  KeyRound, 
  UserCheck 
} from 'lucide-react';

interface Step5Props {
  userAccess: WizardUserAccessItem[];
  onChange: (updated: WizardUserAccessItem[]) => void;
  errors?: string[];
}

export const Step5ProjectAccess: React.FC<Step5Props> = ({ userAccess, onChange, errors = [] }) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newFullName, setNewFullName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('DISPATCHER');
  const [formError, setFormError] = useState<string | null>(null);

  const toggleUserAssignment = (userId: string) => {
    const updated = userAccess.map((u) => {
      if (u.userId === userId) {
        return { ...u, isAssigned: !u.isAssigned };
      }
      return u;
    });
    onChange(updated);
  };

  const updateUserRole = (userId: string, role: UserRole) => {
    const updated = userAccess.map((u) => {
      if (u.userId === userId) {
        return { ...u, role };
      }
      return u;
    });
    onChange(updated);
  };

  const handleAddUser = () => {
    if (!newFullName.trim() || newFullName.trim().length < 3) {
      setFormError('اسم المستخدم الكامل مطلوب (3 أحرف على الأقل)');
      return;
    }
    if (!newEmail.trim() || !newEmail.includes('@')) {
      setFormError('يرجى إدخال بريد إلكتروني صالح');
      return;
    }

    const newId = `USR-${Date.now().toString(36).toUpperCase()}`;
    const newUser: WizardUserAccessItem = {
      userId: newId,
      fullName: newFullName.trim(),
      email: newEmail.trim().toLowerCase(),
      role: newRole,
      isAssigned: true,
    };

    onChange([...userAccess, newUser]);
    setNewFullName('');
    setNewEmail('');
    setNewRole('DISPATCHER');
    setFormError(null);
    setShowAddForm(false);
  };

  const assignedCount = userAccess.filter((u) => u.isAssigned).length;
  const adminCount = userAccess.filter((u) => u.isAssigned && u.role === 'PROJECT_ADMIN').length;

  return (
    <div className="space-y-6">
      {/* Step Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-stone-200 gap-3">
        <div>
          <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-amber-600" />
            الخطوة 5: إدارة صلاحيات المستخدمين والوصول للمشروع (Project Access)
          </h2>
          <p className="text-xs text-stone-500 mt-1">
            حدد المستخدمين المصرح لهم بالدخول إلى المشروع، مع تعيين الأدوار التشغيلية (مدير، مأمور حركة، مدقق مالي).
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة مستخدم جديد</span>
        </button>
      </div>

      {errors.length > 0 && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 space-y-1">
          <p className="font-semibold">تنبيهات الصلاحيات:</p>
          <ul className="list-disc list-inside space-y-0.5">
            {errors.map((err, idx) => (
              <li key={idx}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Summary Chips */}
      <div className="flex items-center gap-3 text-xs">
        <div className="px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-1.5 font-semibold">
          <UserCheck className="w-4 h-4 text-emerald-600" />
          <span>المستخدمون المعينون: {assignedCount}</span>
        </div>
        <div className={`px-3 py-1.5 rounded-lg border flex items-center gap-1.5 font-semibold ${
          adminCount > 0 
            ? 'bg-amber-50 border-amber-200 text-amber-800' 
            : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          <ShieldCheck className="w-4 h-4" />
          <span>مديرو المشروع (Admin): {adminCount} {adminCount === 0 && '(مطلوب واحد على الأقل!)'}</span>
        </div>
      </div>

      {/* Add User Form */}
      {showAddForm && (
        <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-xl space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-amber-200/80">
            <h3 className="text-xs font-bold text-amber-900 flex items-center gap-1">
              <Plus className="w-4 h-4 text-amber-700" />
              دعوة مستخدم جديد وتعيين صلاحياته في المشروع
            </h3>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="text-stone-400 hover:text-stone-600 text-xs flex items-center gap-1"
            >
              <X className="w-4 h-4" />
              إلغاء
            </button>
          </div>

          {formError && (
            <div className="p-2 bg-rose-100 text-rose-800 text-xs rounded-md">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="block font-bold text-stone-700 mb-1">
                الاسم الكامل للمستخدم <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={newFullName}
                onChange={(e) => setNewFullName(e.target.value)}
                placeholder="e.g. م. عبد الله الشهري"
                className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-xs focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-bold text-stone-700 mb-1">
                البريد الإلكتروني <span className="text-rose-500">*</span>
              </label>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="abdullah@q-saudi.sa"
                className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-xs focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-bold text-stone-700 mb-1">
                الدور التشغيلي (Role)
              </label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as UserRole)}
                className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-xs focus:ring-2 focus:ring-amber-500 focus:outline-hidden font-semibold"
              >
                <option value="PROJECT_ADMIN">مدير المشروع (PROJECT_ADMIN)</option>
                <option value="DISPATCHER">مأمور حركة وميزان (DISPATCHER)</option>
                <option value="FINANCE_AUDITOR">مدقق مالي (FINANCE_AUDITOR)</option>
                <option value="VIEWER">مراقب عام (VIEWER)</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-3 py-1.5 bg-white border border-stone-300 hover:bg-stone-50 text-stone-700 rounded-lg text-xs font-semibold"
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={handleAddUser}
              className="flex items-center gap-1 px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-xs"
            >
              <Check className="w-3.5 h-3.5" />
              <span>إضافة وتعيين الصلاحية</span>
            </button>
          </div>
        </div>
      )}

      {/* Users List */}
      <div className="bg-white border border-stone-200 rounded-xl overflow-hidden shadow-2xs">
        <div className="px-4 py-3 bg-stone-50 border-b border-stone-200 flex items-center justify-between text-xs">
          <span className="font-semibold text-stone-700">قائمة المستخدمين والتحكم في الوصول</span>
          <span className="text-[11px] text-stone-500">
            حدد مربع الاختيار لضم المستخدم إلى هذا المشروع وتحديد دوره
          </span>
        </div>

        <div className="divide-y divide-stone-100">
          {userAccess.map((u) => {
            const isAssigned = u.isAssigned;
            return (
              <div
                key={u.userId}
                className={`p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                  isAssigned ? 'bg-white' : 'bg-stone-50/40 text-stone-400'
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id={`user-check-${u.userId}`}
                    checked={isAssigned}
                    onChange={() => toggleUserAssignment(u.userId)}
                    className="w-4 h-4 text-amber-600 rounded border-stone-300 focus:ring-amber-500 cursor-pointer"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold ${isAssigned ? 'text-stone-900' : 'text-stone-500'}`}>
                        {u.fullName}
                      </span>
                      <span className="font-mono text-[10px] text-stone-400 bg-stone-100 px-1.5 py-0.5 rounded">
                        {u.userId}
                      </span>
                    </div>
                    <div className="text-[11px] text-stone-500 flex items-center gap-1 mt-0.5">
                      <Mail className="w-3 h-3 text-stone-400" />
                      <span>{u.email}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-auto">
                  <div className="flex items-center gap-2">
                    <KeyRound className="w-3.5 h-3.5 text-stone-400" />
                    <select
                      value={u.role}
                      disabled={!isAssigned}
                      onChange={(e) => updateUserRole(u.userId, e.target.value as UserRole)}
                      className={`text-xs px-2.5 py-1 rounded-lg border focus:ring-1 focus:ring-amber-500 focus:outline-hidden font-semibold transition-all ${
                        !isAssigned
                          ? 'bg-stone-100 border-stone-200 text-stone-400 cursor-not-allowed'
                          : u.role === 'PROJECT_ADMIN'
                          ? 'bg-amber-50 border-amber-300 text-amber-900'
                          : u.role === 'DISPATCHER'
                          ? 'bg-indigo-50 border-indigo-300 text-indigo-900'
                          : u.role === 'FINANCE_AUDITOR'
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                          : 'bg-stone-50 border-stone-300 text-stone-700'
                      }`}
                    >
                      <option value="PROJECT_ADMIN">مدير المشروع (PROJECT_ADMIN)</option>
                      <option value="DISPATCHER">مأمور حركة وميزان (DISPATCHER)</option>
                      <option value="FINANCE_AUDITOR">مدقق مالي (FINANCE_AUDITOR)</option>
                      <option value="VIEWER">مراقب عام (VIEWER)</option>
                    </select>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
