import React, { useState } from 'react';
import { WizardMaterialItem, UnitOfMeasure, EntityStatus } from '../../types/wizard';
import { 
  Boxes, 
  Plus, 
  ArrowUp, 
  ArrowDown, 
  Edit2, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  Check, 
  X 
} from 'lucide-react';

interface Step2Props {
  materials: WizardMaterialItem[];
  onChange: (updated: WizardMaterialItem[]) => void;
  errors?: string[];
}

export const Step2Materials: React.FC<Step2Props> = ({ materials, onChange, errors = [] }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState<boolean>(false);

  // Form state for adding/editing
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formUom, setFormUom] = useState<UnitOfMeasure>('TON');
  const [formStatus, setFormStatus] = useState<EntityStatus>('ACTIVE');
  const [formDensity, setFormDensity] = useState<number>(1.6);
  const [formError, setFormError] = useState<string | null>(null);

  const resetForm = () => {
    setFormName('');
    setFormCode('');
    setFormUom('TON');
    setFormStatus('ACTIVE');
    setFormDensity(1.6);
    setFormError(null);
    setEditingId(null);
    setShowAddForm(false);
  };

  const startEdit = (mat: WizardMaterialItem) => {
    setEditingId(mat.id);
    setFormName(mat.materialName);
    setFormCode(mat.materialCode);
    setFormUom(mat.unitOfMeasure);
    setFormStatus(mat.status);
    setFormDensity(mat.standardDensityTonPerM3 || 1.6);
    setFormError(null);
    setShowAddForm(true);
  };

  const handleSave = () => {
    if (!formName.trim() || formName.trim().length < 2) {
      setFormError('اسم المادة مطلوب ولا يقل عن حرفين');
      return;
    }
    if (!formCode.trim() || formCode.trim().length < 2) {
      setFormError('رمز المادة مطلوب ولا يقل عن حرفين');
      return;
    }

    const cleanCode = formCode.trim().toUpperCase();

    // Check duplicate code
    const isDuplicate = materials.some(
      (m) => m.materialCode.toUpperCase() === cleanCode && m.id !== editingId
    );
    if (isDuplicate) {
      setFormError(`رمز المادة (${cleanCode}) مستخدم بالفعل في هذا المشروع.`);
      return;
    }

    if (editingId) {
      // Update existing
      const updated = materials.map((m) => {
        if (m.id === editingId) {
          return {
            ...m,
            materialName: formName.trim(),
            materialCode: cleanCode,
            unitOfMeasure: formUom,
            status: formStatus,
            standardDensityTonPerM3: formDensity,
          };
        }
        return m;
      });
      onChange(updated);
    } else {
      // Add new
      const newItem: WizardMaterialItem = {
        id: `mat-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        materialId: `MAT-${cleanCode}`,
        materialName: formName.trim(),
        materialCode: cleanCode,
        unitOfMeasure: formUom,
        status: formStatus,
        sortOrder: materials.length + 1,
        standardDensityTonPerM3: formDensity,
      };
      onChange([...materials, newItem]);
    }

    resetForm();
  };

  const handleDelete = (id: string) => {
    const updated = materials.filter((m) => m.id !== id).map((m, idx) => ({ ...m, sortOrder: idx + 1 }));
    onChange(updated);
  };

  const handleToggleStatus = (id: string) => {
    const updated = materials.map((m) => {
      if (m.id === id) {
        const nextStatus: EntityStatus = m.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';
        return { ...m, status: nextStatus };
      }
      return m;
    });
    onChange(updated);
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const items = [...materials];
    const temp = items[index - 1];
    items[index - 1] = items[index];
    items[index] = temp;
    // update sortOrder
    const reordered = items.map((item, idx) => ({ ...item, sortOrder: idx + 1 }));
    onChange(reordered);
  };

  const handleMoveDown = (index: number) => {
    if (index === materials.length - 1) return;
    const items = [...materials];
    const temp = items[index + 1];
    items[index + 1] = items[index];
    items[index] = temp;
    // update sortOrder
    const reordered = items.map((item, idx) => ({ ...item, sortOrder: idx + 1 }));
    onChange(reordered);
  };

  return (
    <div className="space-y-6">
      {/* Step Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-stone-200 gap-3">
        <div>
          <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
            <Boxes className="w-5 h-5 text-amber-600" />
            الخطوة 2: إدارة المواد ونطاق التوريد (Materials)
          </h2>
          <p className="text-xs text-stone-500 mt-1">
            أضف المواد المعتمدة للمشروع مع تحديد الرموز، وحدات القياس، والترتيب التشغيلي.
          </p>
        </div>
        {!showAddForm && (
          <button
            type="button"
            id="btn-add-material"
            onClick={() => {
              resetForm();
              setShowAddForm(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة مادة جديدة</span>
          </button>
        )}
      </div>

      {errors.length > 0 && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 space-y-1">
          <p className="font-semibold">تنبيهات إدارة المواد:</p>
          <ul className="list-disc list-inside space-y-0.5">
            {errors.map((err, idx) => (
              <li key={idx}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Add / Edit Form Panel */}
      {showAddForm && (
        <div className="p-4 bg-amber-50/50 border border-amber-200 rounded-xl space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-amber-200/60">
            <h3 className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
              <Boxes className="w-4 h-4 text-amber-700" />
              {editingId ? 'تعديل بيانات المادة' : 'إضافة مادة جديدة إلى المشروع'}
            </h3>
            <button
              type="button"
              onClick={resetForm}
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

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="block font-bold text-stone-700 mb-1">
                اسم المادة (materialName) <span className="text-rose-500">*</span>
              </label>
              <input
                id="input-material-name"
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. ركام طبقة أساس Sub-base"
                className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-xs focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-bold text-stone-700 mb-1">
                رمز المادة (materialCode) <span className="text-rose-500">*</span>
              </label>
              <input
                id="input-material-code"
                type="text"
                value={formCode}
                onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                placeholder="e.g. SB-01"
                className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-xs font-mono uppercase focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-bold text-stone-700 mb-1">
                وحدة القياس المعتمدة
              </label>
              <select
                id="select-material-uom"
                value={formUom}
                onChange={(e) => setFormUom(e.target.value as UnitOfMeasure)}
                className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-xs focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
              >
                <option value="TON">طن (TON) - الوزن الصافي</option>
                <option value="M3">متر مكعب (M3) - حجمي</option>
                <option value="TRIP">رد كامل (TRIP) - مقطوع</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-stone-700 mb-1">
                الحالة التشغيلية (status)
              </label>
              <select
                id="select-material-status"
                value={formStatus}
                onChange={(e) => setFormStatus(e.target.value as EntityStatus)}
                className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-xs focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
              >
                <option value="ACTIVE">نشط (ACTIVE)</option>
                <option value="DISABLED">معطّل (DISABLED)</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={resetForm}
              className="px-3 py-1.5 bg-white border border-stone-300 hover:bg-stone-50 text-stone-700 rounded-lg text-xs font-semibold"
            >
              إلغاء
            </button>
            <button
              type="button"
              id="btn-save-material"
              onClick={handleSave}
              className="flex items-center gap-1 px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-xs"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{editingId ? 'حفظ التعديلات' : 'إضافة المادة'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Materials Table */}
      <div className="bg-white border border-stone-200 rounded-xl overflow-hidden shadow-2xs">
        <div className="px-4 py-2.5 bg-stone-50 border-b border-stone-200 flex items-center justify-between text-xs">
          <span className="font-semibold text-stone-700">
            قائمة المواد المعتمدة ({materials.length})
          </span>
          <span className="text-[11px] text-stone-500">
            يمكنك استخدام الأسهم ⬆️⬇️ لتغيير الترتيب المعتمد في السندات
          </span>
        </div>

        {materials.length === 0 ? (
          <div className="p-8 text-center">
            <Boxes className="w-8 h-8 text-stone-300 mx-auto mb-2" />
            <p className="text-xs text-stone-500">لم تتم إضافة أي مواد للمشروع بعد.</p>
            <button
              type="button"
              onClick={() => setShowAddForm(true)}
              className="mt-3 inline-flex items-center gap-1 px-3 py-1.5 text-xs text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg font-semibold transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              أضف أول مادة الآن
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-stone-50/60 border-b border-stone-200 text-stone-600 font-semibold">
                <tr>
                  <th className="px-3 py-2 w-16 text-center">الترتيب</th>
                  <th className="px-3 py-2">رمز المادة (Code)</th>
                  <th className="px-3 py-2">اسم المادة (Material Name)</th>
                  <th className="px-3 py-2">الوحدة</th>
                  <th className="px-3 py-2">الحالة (Status)</th>
                  <th className="px-3 py-2 text-center w-40">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {materials.map((m, index) => {
                  const isActive = m.status === 'ACTIVE';
                  return (
                    <tr
                      key={m.id}
                      id={`row-material-${m.id}`}
                      className={`hover:bg-stone-50/60 transition-colors ${!isActive ? 'bg-stone-50/40 text-stone-400' : ''}`}
                    >
                      {/* Reorder Buttons */}
                      <td className="px-3 py-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            title="تحريك لأعلى"
                            disabled={index === 0}
                            onClick={() => handleMoveUp(index)}
                            className="p-1 text-stone-400 hover:text-stone-700 disabled:opacity-20 disabled:hover:text-stone-400"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <span className="font-mono text-stone-500 font-bold">{index + 1}</span>
                          <button
                            type="button"
                            title="تحريك لأسفل"
                            disabled={index === materials.length - 1}
                            onClick={() => handleMoveDown(index)}
                            className="p-1 text-stone-400 hover:text-stone-700 disabled:opacity-20 disabled:hover:text-stone-400"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>

                      {/* Code */}
                      <td className="px-3 py-2">
                        <span className="font-mono font-bold text-stone-900 bg-stone-100 px-2 py-0.5 rounded text-[11px] border border-stone-200">
                          {m.materialCode}
                        </span>
                      </td>

                      {/* Name */}
                      <td className="px-3 py-2 font-medium text-stone-800">
                        {m.materialName}
                      </td>

                      {/* UOM */}
                      <td className="px-3 py-2 text-stone-600">
                        {m.unitOfMeasure === 'TON' ? 'طن (TON)' : m.unitOfMeasure === 'M3' ? 'متر مكعب (M3)' : 'رد (TRIP)'}
                      </td>

                      {/* Status & Toggle (Disable/Active) */}
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          id={`toggle-mat-${m.id}`}
                          onClick={() => handleToggleStatus(m.id)}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold border transition-all ${
                            isActive
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                              : 'bg-stone-100 text-stone-500 border-stone-200 hover:bg-stone-200'
                          }`}
                          title="اضغط للتبديل بين التفعيل والتعطيل"
                        >
                          {isActive ? (
                            <>
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>نشط (ACTIVE)</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3 h-3 text-stone-400" />
                              <span>معطّل (DISABLED)</span>
                            </>
                          )}
                        </button>
                      </td>

                      {/* Actions: Edit, Delete */}
                      <td className="px-3 py-2 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            id={`btn-edit-mat-${m.id}`}
                            onClick={() => startEdit(m)}
                            className="p-1.5 text-stone-500 hover:text-amber-700 hover:bg-amber-50 rounded-md transition-colors"
                            title="تعديل بيانات المادة"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            id={`btn-del-mat-${m.id}`}
                            onClick={() => handleDelete(m.id)}
                            className="p-1.5 text-stone-400 hover:text-rose-700 hover:bg-rose-50 rounded-md transition-colors"
                            title="حذف المادة"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
