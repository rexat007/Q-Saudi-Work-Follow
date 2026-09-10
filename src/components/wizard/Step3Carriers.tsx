import React, { useState } from 'react';
import { WizardCarrierItem, EntityStatus } from '../../types/wizard';
import { 
  Truck, 
  Plus, 
  Edit2, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  Check, 
  X, 
  Phone, 
  User 
} from 'lucide-react';

interface Step3Props {
  carriers: WizardCarrierItem[];
  onChange: (updated: WizardCarrierItem[]) => void;
  errors?: string[];
}

export const Step3Carriers: React.FC<Step3Props> = ({ carriers, onChange, errors = [] }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState<boolean>(false);

  // Form state
  const [carrierId, setCarrierId] = useState('');
  const [carrierName, setCarrierName] = useState('');
  const [status, setStatus] = useState<EntityStatus>('ACTIVE');
  const [crNo, setCrNo] = useState('');
  const [tgaLicense, setTgaLicense] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const resetForm = () => {
    setCarrierId('');
    setCarrierName('');
    setStatus('ACTIVE');
    setCrNo('');
    setTgaLicense('');
    setContactName('');
    setContactPhone('');
    setContactEmail('');
    setFormError(null);
    setEditingId(null);
    setShowAddForm(false);
  };

  const startEdit = (c: WizardCarrierItem) => {
    setEditingId(c.id);
    setCarrierId(c.carrierId);
    setCarrierName(c.carrierName);
    setStatus(c.status);
    setCrNo(c.commercialRegistrationNo || '');
    setTgaLicense(c.transportLicenseNo || '');
    setContactName(c.contactPersonName || '');
    setContactPhone(c.contactPhone || '');
    setContactEmail(c.contactEmail || '');
    setFormError(null);
    setShowAddForm(true);
  };

  const handleSave = () => {
    if (!carrierId.trim() || carrierId.trim().length < 2) {
      setFormError('معرف الناقل (carrierId) مطلوب');
      return;
    }
    if (!carrierName.trim() || carrierName.trim().length < 3) {
      setFormError('اسم شركة النقل (carrierName) مطلوب ولا يقل عن 3 أحرف');
      return;
    }

    const cleanId = carrierId.trim().toUpperCase();

    // Check duplicate ID
    const isDuplicate = carriers.some(
      (c) => c.carrierId.toUpperCase() === cleanId && c.id !== editingId
    );
    if (isDuplicate) {
      setFormError(`معرف الناقل (${cleanId}) مسجل مسبقاً في المشروع.`);
      return;
    }

    if (crNo.trim() !== '' && !/^\d{10}$/.test(crNo.trim())) {
      setFormError('رقم السجل التجاري يجب أن يتكون من 10 أرقام');
      return;
    }

    if (editingId) {
      const updated = carriers.map((c) => {
        if (c.id === editingId) {
          return {
            ...c,
            carrierId: cleanId,
            carrierName: carrierName.trim(),
            status,
            commercialRegistrationNo: crNo.trim(),
            transportLicenseNo: tgaLicense.trim(),
            contactPersonName: contactName.trim(),
            contactPhone: contactPhone.trim(),
            contactEmail: contactEmail.trim(),
          };
        }
        return c;
      });
      onChange(updated);
    } else {
      const newItem: WizardCarrierItem = {
        id: `car-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        carrierId: cleanId,
        carrierName: carrierName.trim(),
        status,
        commercialRegistrationNo: crNo.trim(),
        transportLicenseNo: tgaLicense.trim() || `TGA-${cleanId}`,
        contactPersonName: contactName.trim() || 'مسؤول العمليات',
        contactPhone: contactPhone.trim() || '+966500000000',
        contactEmail: contactEmail.trim() || 'carrier@logistics.sa',
      };
      onChange([...carriers, newItem]);
    }

    resetForm();
  };

  const handleDelete = (id: string) => {
    onChange(carriers.filter((c) => c.id !== id));
  };

  const handleToggleStatus = (id: string) => {
    const updated = carriers.map((c) => {
      if (c.id === id) {
        const nextStatus: EntityStatus = c.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';
        return { ...c, status: nextStatus };
      }
      return c;
    });
    onChange(updated);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-stone-200 gap-3">
        <div>
          <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
            <Truck className="w-5 h-5 text-amber-600" />
            الخطوة 3: شركات النقل والناقلين المعتمدين (Carriers)
          </h2>
          <p className="text-xs text-stone-500 mt-1">
            حدد الناقلين المصرح لهم بنقل وتوريد المواد في هذا المشروع (مثل Carrier A، Carrier B، Carrier C).
          </p>
        </div>
        {!showAddForm && (
          <button
            type="button"
            id="btn-add-carrier"
            onClick={() => {
              resetForm();
              setShowAddForm(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة ناقل جديد</span>
          </button>
        )}
      </div>

      {errors.length > 0 && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 space-y-1">
          <p className="font-semibold">تنبيهات بيانات الناقلين:</p>
          <ul className="list-disc list-inside space-y-0.5">
            {errors.map((err, idx) => (
              <li key={idx}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Add / Edit Form */}
      {showAddForm && (
        <div className="p-4 bg-amber-50/50 border border-amber-200 rounded-xl space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-amber-200/60">
            <h3 className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
              <Truck className="w-4 h-4 text-amber-700" />
              {editingId ? 'تعديل بيانات الناقل' : 'تسجيل ناقل جديد في المشروع'}
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

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="block font-bold text-stone-700 mb-1">
                معرف الناقل (carrierId) <span className="text-rose-500">*</span>
              </label>
              <input
                id="input-carrier-id"
                type="text"
                value={carrierId}
                onChange={(e) => setCarrierId(e.target.value.toUpperCase())}
                placeholder="e.g. CAR-A أو CAR-ALRASHID-01"
                className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-xs font-mono uppercase focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
              />
              <p className="text-[10px] text-stone-400 mt-0.5">معرف وحيد للربط مع الشاحنات وقواعد التسعير</p>
            </div>

            <div className="sm:col-span-2">
              <label className="block font-bold text-stone-700 mb-1">
                اسم شركة أو مؤسسة النقل (carrierName) <span className="text-rose-500">*</span>
              </label>
              <input
                id="input-carrier-name"
                type="text"
                value={carrierName}
                onChange={(e) => setCarrierName(e.target.value)}
                placeholder="e.g. شركة الرشيد للخدمات اللوجستية والنقل"
                className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-xs focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-bold text-stone-700 mb-1">
                الحالة التشغيلية (status)
              </label>
              <select
                id="select-carrier-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as EntityStatus)}
                className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-xs focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
              >
                <option value="ACTIVE">نشط (ACTIVE)</option>
                <option value="DISABLED">معطّل (DISABLED)</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-stone-700 mb-1">
                رقم السجل التجاري (CR 10 أرقام)
              </label>
              <input
                type="text"
                maxLength={10}
                value={crNo}
                onChange={(e) => setCrNo(e.target.value)}
                placeholder="1010123456"
                className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-bold text-stone-700 mb-1">
                ترخيص هيئة النقل العامة (TGA)
              </label>
              <input
                type="text"
                value={tgaLicense}
                onChange={(e) => setTgaLicense(e.target.value)}
                placeholder="TGA-LOG-12345"
                className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-bold text-stone-700 mb-1">
                اسم مسؤول العمليات
              </label>
              <input
                type="text"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="فهد الرشيد"
                className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-xs focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-bold text-stone-700 mb-1">
                رقم جوال التواصل
              </label>
              <input
                type="text"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="+966551234567"
                className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-bold text-stone-700 mb-1">
                البريد الإلكتروني
              </label>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="contact@carrier.sa"
                className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-xs focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
              />
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
              id="btn-save-carrier"
              onClick={handleSave}
              className="flex items-center gap-1 px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-xs"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{editingId ? 'حفظ التعديلات' : 'تسجيل الناقل'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Carriers List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {carriers.map((car) => {
          const isActive = car.status === 'ACTIVE';
          return (
            <div
              key={car.id}
              id={`carrier-card-${car.id}`}
              className={`p-4 rounded-xl border transition-all ${
                isActive
                  ? 'bg-white border-stone-200 shadow-2xs hover:border-amber-300'
                  : 'bg-stone-50/70 border-stone-200/80 opacity-75'
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-amber-50 text-amber-800 border border-amber-200/60">
                    <Truck className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-stone-900 line-clamp-1">{car.carrierName}</h4>
                    <span className="font-mono text-[11px] font-bold text-stone-500">{car.carrierId}</span>
                  </div>
                </div>

                {/* Status Badge Toggle */}
                <button
                  type="button"
                  id={`toggle-carrier-${car.id}`}
                  onClick={() => handleToggleStatus(car.id)}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border transition-all ${
                    isActive
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                      : 'bg-stone-200/80 text-stone-600 border-stone-300 hover:bg-stone-300'
                  }`}
                  title="تغيير الحالة (نشط / معطّل)"
                >
                  {isActive ? (
                    <>
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      <span>نشط</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-3 h-3 text-stone-500" />
                      <span>معطّل</span>
                    </>
                  )}
                </button>
              </div>

              {/* Extra Details */}
              <div className="space-y-1 my-3 text-[11px] text-stone-600 border-t border-b border-stone-100 py-2">
                {car.commercialRegistrationNo && (
                  <p className="flex items-center justify-between">
                    <span className="text-stone-400">السجل التجاري:</span>
                    <span className="font-mono font-medium">{car.commercialRegistrationNo}</span>
                  </p>
                )}
                {car.contactPersonName && (
                  <p className="flex items-center justify-between">
                    <span className="text-stone-400 flex items-center gap-1">
                      <User className="w-3 h-3 text-stone-400" />
                      المسؤول:
                    </span>
                    <span className="font-medium">{car.contactPersonName}</span>
                  </p>
                )}
                {car.contactPhone && (
                  <p className="flex items-center justify-between">
                    <span className="text-stone-400 flex items-center gap-1">
                      <Phone className="w-3 h-3 text-stone-400" />
                      الجوال:
                    </span>
                    <span className="font-mono">{car.contactPhone}</span>
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-1.5 pt-1">
                <button
                  type="button"
                  id={`btn-edit-car-${car.id}`}
                  onClick={() => startEdit(car)}
                  className="px-2.5 py-1 text-stone-600 hover:text-amber-800 hover:bg-amber-50 rounded text-xs font-semibold flex items-center gap-1 transition-colors"
                >
                  <Edit2 className="w-3 h-3" />
                  <span>تعديل</span>
                </button>
                <button
                  type="button"
                  id={`btn-del-car-${car.id}`}
                  onClick={() => handleDelete(car.id)}
                  className="px-2.5 py-1 text-stone-400 hover:text-rose-700 hover:bg-rose-50 rounded text-xs font-semibold flex items-center gap-1 transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>حذف</span>
                </button>
              </div>
            </div>
          );
        })}

        {carriers.length === 0 && (
          <div className="col-span-full p-8 text-center bg-white border border-stone-200 rounded-xl">
            <Truck className="w-8 h-8 text-stone-300 mx-auto mb-2" />
            <p className="text-xs text-stone-500">لا يوجد ناقلون مسجلون في المشروع حتى الآن.</p>
            <button
              type="button"
              onClick={() => setShowAddForm(true)}
              className="mt-3 inline-flex items-center gap-1 px-3 py-1.5 text-xs text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg font-semibold transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              أضف أول ناقل الآن
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
