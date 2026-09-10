import React, { useState } from 'react';
import { 
  Building2, 
  Truck, 
  Calculator, 
  Layers, 
  UserCheck, 
  Navigation, 
  Clock, 
  AlertTriangle, 
  FileText, 
  RefreshCw, 
  Database, 
  ShieldCheck, 
  WifiOff, 
  Code, 
  CheckCircle2, 
  ChevronLeft, 
  ChevronRight,
  ExternalLink,
  BookOpen,
  Boxes,
  Share2,
  Lock,
  ShieldAlert,
  FileSpreadsheet
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { ENTITY_RELATIONS, MANDATORY_PRINCIPLES, EntityRelationInfo } from './entityRelations';
import { ARCHITECTURE_DOCS, DocItem } from './docsData';
import FirestoreArchitectureView from './components/FirestoreArchitectureView';
import { ProjectSetupWizard } from './components/wizard/ProjectSetupWizard';
import { PricingEngineView } from './components/pricing/PricingEngineView';
import { MasterDataView } from './components/masterData/MasterDataView';
import { DataQualityView } from './components/dataQuality/DataQualityView';
import { ImportCenterView } from './components/importCenter/ImportCenterView';
import { TripEngineView } from './components/TripEngineView';
import { AuthButton } from './components/auth/AuthButton';

export default function App() {
  const [activeTab, setActiveTab] = useState<'TRIP_ENGINE' | 'IMPORT_CENTER' | 'DATA_QUALITY' | 'MASTER_DATA' | 'PRICING_ENGINE' | 'WIZARD' | 'FIRESTORE_ARCH' | 'RELATIONS' | 'PRINCIPLES' | 'DOCS'>('TRIP_ENGINE');
  const [selectedEntityId, setSelectedEntityId] = useState<string>('Trip');
  const [selectedDocId, setSelectedDocId] = useState<string>('architecture');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const selectedEntity = ENTITY_RELATIONS.find(e => e.id === selectedEntityId) || ENTITY_RELATIONS[6]; // Trip by default
  const selectedDoc = ARCHITECTURE_DOCS.find(d => d.id === selectedDocId) || ARCHITECTURE_DOCS[0];

  const getEntityIcon = (id: string) => {
    switch (id) {
      case 'Project': return <Building2 className="w-5 h-5 text-indigo-600" />;
      case 'Carrier': return <Building2 className="w-5 h-5 text-amber-600" />;
      case 'Pricing Rule': return <Calculator className="w-5 h-5 text-emerald-600" />;
      case 'Material': return <Layers className="w-5 h-5 text-orange-600" />;
      case 'Truck': return <Truck className="w-5 h-5 text-cyan-600" />;
      case 'Driver': return <UserCheck className="w-5 h-5 text-blue-600" />;
      case 'Trip': return <Navigation className="w-5 h-5 text-red-600" />;
      case 'Trip Event': return <Clock className="w-5 h-5 text-violet-600" />;
      case 'Exception': return <AlertTriangle className="w-5 h-5 text-rose-600" />;
      case 'Audit Log': return <FileText className="w-5 h-5 text-slate-700" />;
      case 'Sync Operation': return <RefreshCw className="w-5 h-5 text-teal-600" />;
      default: return <Boxes className="w-5 h-5 text-gray-600" />;
    }
  };

  const getDocIcon = (iconName: string) => {
    switch (iconName) {
      case 'Layers': return <Layers className="w-4 h-4 text-indigo-500" />;
      case 'Database': return <Database className="w-4 h-4 text-blue-500" />;
      case 'Code': return <Code className="w-4 h-4 text-emerald-500" />;
      case 'ShieldCheck': return <ShieldCheck className="w-4 h-4 text-amber-500" />;
      case 'WifiOff': return <WifiOff className="w-4 h-4 text-rose-500" />;
      case 'Calculator': return <Calculator className="w-4 h-4 text-teal-500" />;
      case 'CheckCircle2': return <CheckCircle2 className="w-4 h-4 text-purple-500" />;
      default: return <FileText className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 font-sans flex flex-col antialiased" dir="rtl">
      {/* Top Professional Header */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-stone-900 text-amber-400 flex items-center justify-center font-black text-xl shadow-xs">
              Q
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight text-stone-900">
                  Q Saudi Work Follow
                </h1>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800">
                  Enterprise Architecture
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
                  KSA Logistics
                </span>
              </div>
              <p className="text-xs text-stone-500 font-medium">
                المعمارية الهندسية الصارمة لمنظومة النقل الثقيل والمشاريع متعددة الأطراف (Multi-Project)
              </p>
            </div>
          </div>

          {/* Navigation Mode Switcher & Auth Button */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <nav className="flex items-center bg-stone-100 p-1 rounded-xl border border-stone-200/80 gap-1 overflow-x-auto">
              <button
                id="tab-trip-engine"
                onClick={() => setActiveTab('TRIP_ENGINE')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                  activeTab === 'TRIP_ENGINE' 
                    ? 'bg-amber-600 text-white shadow-xs' 
                    : 'text-stone-700 hover:text-stone-900 hover:bg-stone-200/50'
                }`}
              >
                <Truck className="w-3.5 h-3.5" />
                <span>محرك الرحلات (Trip Engine)</span>
                <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                  activeTab === 'TRIP_ENGINE' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800'
                }`}>
                  6 قواعد
                </span>
              </button>

              <button
                id="tab-import-center"
                onClick={() => setActiveTab('IMPORT_CENTER')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                  activeTab === 'IMPORT_CENTER' 
                    ? 'bg-amber-600 text-white shadow-xs' 
                    : 'text-stone-700 hover:text-stone-900 hover:bg-stone-200/50'
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>مركز الاستيراد (Import Center)</span>
                <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                  activeTab === 'IMPORT_CENTER' ? 'bg-white/20 text-white' : 'bg-rose-100 text-rose-800'
                }`}>
                  12 مرحلة
                </span>
              </button>

              <button
                id="tab-data-quality"
                onClick={() => setActiveTab('DATA_QUALITY')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                  activeTab === 'DATA_QUALITY' 
                    ? 'bg-amber-600 text-white shadow-xs' 
                    : 'text-stone-700 hover:text-stone-900 hover:bg-stone-200/50'
                }`}
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>محرك جودة البيانات (Quality Engine)</span>
                <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                  activeTab === 'DATA_QUALITY' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800'
                }`}>
                  8 مراحل
                </span>
              </button>

              <button
                id="tab-master-data"
                onClick={() => setActiveTab('MASTER_DATA')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                  activeTab === 'MASTER_DATA' 
                    ? 'bg-amber-600 text-white shadow-xs' 
                    : 'text-stone-700 hover:text-stone-900 hover:bg-stone-200/50'
                }`}
              >
                <Boxes className="w-3.5 h-3.5" />
                <span>البيانات الرئيسية (Master Data)</span>
                <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                  activeTab === 'MASTER_DATA' ? 'bg-white/20 text-white' : 'bg-amber-200 text-amber-900'
                }`}>
                  4 وحدات
                </span>
              </button>

              <button
                id="tab-pricing-engine"
                onClick={() => setActiveTab('PRICING_ENGINE')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                  activeTab === 'PRICING_ENGINE' 
                    ? 'bg-amber-600 text-white shadow-xs' 
                    : 'text-stone-700 hover:text-stone-900 hover:bg-stone-200/50'
                }`}
              >
                <Calculator className="w-3.5 h-3.5" />
                <span>محرك التسعير (Pricing Engine)</span>
                <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                  activeTab === 'PRICING_ENGINE' ? 'bg-white/20 text-white' : 'bg-emerald-200 text-emerald-900'
                }`}>
                  9 اختبارات
                </span>
              </button>

              <button
                id="tab-wizard"
                onClick={() => setActiveTab('WIZARD')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                  activeTab === 'WIZARD' 
                    ? 'bg-amber-600 text-white shadow-xs' 
                    : 'text-stone-700 hover:text-stone-900 hover:bg-stone-200/50'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>معالج تهيئة المشاريع (Project Wizard)</span>
                <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                  activeTab === 'WIZARD' ? 'bg-white/20 text-white' : 'bg-amber-200 text-amber-900'
                }`}>
                  7 خطوات
                </span>
              </button>

              <button
                id="tab-firestore"
                onClick={() => setActiveTab('FIRESTORE_ARCH')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                  activeTab === 'FIRESTORE_ARCH' 
                    ? 'bg-white text-stone-900 shadow-xs border border-stone-200/50' 
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <Database className="w-3.5 h-3.5 text-amber-600" />
                <span>معمارية Firestore (الـ 13 نطاقاً)</span>
              </button>

              <button
                id="tab-relations"
                onClick={() => setActiveTab('RELATIONS')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                  activeTab === 'RELATIONS' 
                    ? 'bg-white text-stone-900 shadow-xs border border-stone-200/50' 
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <Share2 className="w-3.5 h-3.5 text-indigo-600" />
                <span>شبكة العلاقات (11 كياناً)</span>
              </button>

              <button
                id="tab-principles"
                onClick={() => setActiveTab('PRINCIPLES')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                  activeTab === 'PRINCIPLES' 
                    ? 'bg-white text-stone-900 shadow-xs border border-stone-200/50' 
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>المبادئ الـ 12 الإلزامية</span>
              </button>

              <button
                id="tab-docs"
                onClick={() => setActiveTab('DOCS')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                  activeTab === 'DOCS' 
                    ? 'bg-white text-stone-900 shadow-xs border border-stone-200/50' 
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5 text-amber-600" />
                <span>المستندات المعمارية (7 ملفات)</span>
              </button>
            </nav>

            <AuthButton />
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* ================= TAB: TRIP ENGINE (6 RULES & SERVER SETTLEMENT) ================= */}
        {activeTab === 'TRIP_ENGINE' && (
          <TripEngineView />
        )}

        {/* ================= TAB: IMPORT CENTER (12-STAGE PIPELINE) ================= */}
        {activeTab === 'IMPORT_CENTER' && (
          <ImportCenterView />
        )}

        {/* ================= TAB: DATA QUALITY ENGINE (8-STAGE PIPELINE) ================= */}
        {activeTab === 'DATA_QUALITY' && (
          <DataQualityView />
        )}

        {/* ================= TAB: MASTER DATA MODULES ================= */}
        {activeTab === 'MASTER_DATA' && (
          <MasterDataView />
        )}

        {/* ================= TAB: PRICING ENGINE & AUTOMATED TESTS ================= */}
        {activeTab === 'PRICING_ENGINE' && (
          <PricingEngineView />
        )}

        {/* ================= TAB: PROJECT SETUP WIZARD (7 STEPS) ================= */}
        {activeTab === 'WIZARD' && (
          <ProjectSetupWizard />
        )}

        {/* ================= TAB 0: FIRESTORE ARCHITECTURE & DOMAIN LAYERS ================= */}
        {activeTab === 'FIRESTORE_ARCH' && (
          <FirestoreArchitectureView />
        )}

        {/* ================= TAB 1: RELATIONSHIPS EXPLORER ================= */}
        {activeTab === 'RELATIONS' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
                    <Boxes className="w-5 h-5 text-indigo-600" />
                    <span>مخطط العلاقات التفاعلي بين كيانات النطاق التشغيلي</span>
                  </h2>
                  <p className="text-xs text-stone-500 mt-1">
                    اختر أي كيان لاستعراض ارتباطاته الدقيقة، درجة التعددية (Cardinality)، وواجبات التحقق الخادومية الصارمة.
                  </p>
                </div>
                <div className="text-xs font-medium text-stone-400 bg-stone-50 px-3 py-1.5 rounded-lg border border-stone-200/60">
                  النظام التشغيلي: <strong className="text-stone-700">Multi-Project Logistics FSM</strong>
                </div>
              </div>

              {/* Entity Pills Carousel/Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 pt-2 border-t border-stone-100">
                {ENTITY_RELATIONS.map(entity => {
                  const isSelected = entity.id === selectedEntityId;
                  return (
                    <button
                      key={entity.id}
                      id={`entity-btn-${entity.id}`}
                      onClick={() => setSelectedEntityId(entity.id)}
                      className={`flex items-center gap-2.5 p-2.5 rounded-xl text-right transition-all border ${
                        isSelected 
                          ? 'bg-stone-900 text-white border-stone-900 shadow-xs' 
                          : 'bg-stone-50/70 hover:bg-stone-100/80 text-stone-700 border-stone-200/70'
                      }`}
                    >
                      <div className={`p-1.5 rounded-lg shrink-0 ${isSelected ? 'bg-stone-800' : 'bg-white shadow-xs'}`}>
                        {getEntityIcon(entity.id)}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold truncate">{entity.nameEn}</div>
                        <div className={`text-[10px] truncate ${isSelected ? 'text-stone-300' : 'text-stone-500'}`}>
                          {entity.nameAr.split(' ')[0]}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selected Entity Deep-Dive Card */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column: Entity Definition & Rules */}
              <div className="lg:col-span-1 bg-white rounded-2xl border border-stone-200 p-6 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between border-b border-stone-100 pb-4 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-stone-100 rounded-xl">
                        {getEntityIcon(selectedEntity.id)}
                      </div>
                      <div>
                        <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-stone-100 text-stone-600">
                          {selectedEntity.category}
                        </span>
                        <h3 className="text-lg font-bold text-stone-900 mt-1">
                          {selectedEntity.nameAr}
                        </h3>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs leading-relaxed text-stone-600 mb-4 bg-stone-50 p-3 rounded-xl border border-stone-200/60">
                    {selectedEntity.shortDescAr}
                  </p>

                  <div className="space-y-4">
                    <div>
                      <h4 className="text-xs font-bold text-stone-900 mb-1.5 flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        <span>الدور والمسؤولية في النظام:</span>
                      </h4>
                      <p className="text-xs text-stone-600 leading-normal">
                        {selectedEntity.roleInSystemAr}
                      </p>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold text-stone-900 mb-1.5 flex items-center gap-1.5">
                        <Database className="w-3.5 h-3.5 text-blue-600" />
                        <span>الخصائص والحقول الأساسية (Key Attributes):</span>
                      </h4>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedEntity.keyAttributes.map((attr, idx) => (
                          <span key={idx} className="font-mono text-[11px] px-2 py-0.5 bg-stone-100 text-stone-700 rounded-md border border-stone-200/60">
                            {attr}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-stone-100">
                  <h4 className="text-xs font-bold text-stone-900 mb-2 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-amber-600" />
                    <span>الضوابط والمبادئ المرتبطة:</span>
                  </h4>
                  <ul className="space-y-1.5">
                    {selectedEntity.rulesEnforcedAr.map((rule, idx) => (
                      <li key={idx} className="text-xs text-stone-600 flex items-start gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                        <span>{rule}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Right Column: Direct Domain Connections */}
              <div className="lg:col-span-2 bg-white rounded-2xl border border-stone-200 p-6 shadow-xs">
                <div className="flex items-center justify-between pb-4 mb-4 border-b border-stone-100">
                  <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                    <Share2 className="w-4 h-4 text-indigo-600" />
                    <span>الارتباطات المباشرة مع الكيانات الأخرى في النظام ({selectedEntity.relationships.length})</span>
                  </h3>
                  <span className="text-xs text-stone-400">
                    انقر على أي كيان مرتبط للانتقال إليه
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {selectedEntity.relationships.map((rel, idx) => {
                    const targetEntity = ENTITY_RELATIONS.find(e => e.id === rel.target);
                    return (
                      <div 
                        key={idx}
                        onClick={() => setSelectedEntityId(rel.target)}
                        className="group p-3.5 rounded-xl border border-stone-200/80 bg-stone-50/40 hover:bg-stone-50 hover:border-indigo-300 transition-all cursor-pointer flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className="p-1 rounded bg-white border border-stone-200">
                                {getEntityIcon(rel.target)}
                              </div>
                              <span className="text-xs font-bold text-stone-900 group-hover:text-indigo-600 transition-colors">
                                {targetEntity ? targetEntity.nameAr : rel.target}
                              </span>
                            </div>
                            <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100">
                              {rel.type}
                            </span>
                          </div>
                          <p className="text-xs text-stone-600 leading-relaxed">
                            {rel.descAr}
                          </p>
                        </div>
                        <div className="mt-3 pt-2 border-t border-stone-200/40 flex items-center justify-end text-[10px] font-bold text-stone-400 group-hover:text-indigo-600 gap-1 transition-colors">
                          <span>استعراض كيان {rel.target}</span>
                          <ChevronLeft className="w-3 h-3" />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Architecture Context Banner */}
                <div className="mt-6 p-4 rounded-xl bg-stone-900 text-stone-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-bold text-amber-400 mb-0.5">
                      ضمانة مصدر الحقيقة وسيادة الخادم
                    </div>
                    <div className="text-xs text-stone-300">
                      كل ارتباط بين كيانين يتم التحقق منه خادومياً داخل الـ Transactions في Firestore ولا يُترك القرار للواجهة الأمامية مطلقاً.
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setActiveTab('DOCS');
                      setSelectedDocId('architecture');
                    }}
                    className="shrink-0 px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-medium border border-stone-700 flex items-center gap-1.5 transition-colors"
                  >
                    <span>عرض كود المعمارية</span>
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 2: THE 12 INVARIANT PRINCIPLES ================= */}
        {activeTab === 'PRINCIPLES' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs">
              <div className="max-w-3xl">
                <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  <span>المبادئ المعمارية الإلزامية الصارمة (The 12 Invariants)</span>
                </h2>
                <p className="text-xs text-stone-600 mt-1 leading-relaxed">
                  هذه المبادئ الـ 12 هي السقف الهندسي الحاكم لكامل المنظومة. لا يُسمح بأي استثناء أو خرق لأي مبدأ في أي مرحلة تطويرية أو كود تنفيذي.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {MANDATORY_PRINCIPLES.map(principle => (
                <div 
                  key={principle.num}
                  className="bg-white rounded-xl border border-stone-200 p-5 shadow-xs flex flex-col justify-between hover:border-stone-300 transition-all"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="w-7 h-7 rounded-lg bg-stone-900 text-amber-400 font-mono text-xs font-bold flex items-center justify-center">
                        #{principle.num}
                      </span>
                      <span className="text-[10px] font-bold text-stone-400 bg-stone-100 px-2 py-0.5 rounded">
                        INVARIANT RULE
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-stone-900 mb-2">
                      {principle.title}
                    </h3>
                    <p className="text-xs text-stone-600 leading-relaxed">
                      {principle.desc}
                    </p>
                  </div>
                  
                  <div className="mt-4 pt-3 border-t border-stone-100 flex items-center gap-1.5 text-[11px] font-medium text-emerald-700">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>مطبق ومحمي في الكود المعماري</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================= TAB 3: SPECIFICATION DOCUMENTS VIEWER ================= */}
        {activeTab === 'DOCS' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Sidebar Documents List */}
            <div className="lg:col-span-1 space-y-2">
              <div className="bg-white rounded-xl border border-stone-200 p-3 shadow-xs">
                <div className="text-xs font-bold text-stone-900 px-2 py-1 mb-1">
                  المستندات المعمارية المعتمدة (docs/)
                </div>
                <div className="space-y-1">
                  {ARCHITECTURE_DOCS.map(doc => {
                    const isSelected = doc.id === selectedDocId;
                    return (
                      <button
                        key={doc.id}
                        id={`doc-nav-${doc.id}`}
                        onClick={() => setSelectedDocId(doc.id)}
                        className={`w-full text-right px-3 py-2.5 rounded-lg text-xs font-medium transition-all flex items-center justify-between ${
                          isSelected 
                            ? 'bg-stone-900 text-white shadow-xs' 
                            : 'text-stone-700 hover:bg-stone-100'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {getDocIcon(doc.iconName)}
                          <span className="truncate">{doc.titleAr}</span>
                        </div>
                        <span className={`font-mono text-[10px] shrink-0 ${isSelected ? 'text-stone-400' : 'text-stone-400'}`}>
                          .md
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Document Summary Pill */}
              <div className="bg-stone-50 rounded-xl border border-stone-200 p-4 text-xs text-stone-600">
                <div className="font-bold text-stone-900 mb-1 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-stone-500" />
                  <span>ملخص المستند:</span>
                </div>
                <p className="leading-relaxed">
                  {selectedDoc.summaryAr}
                </p>
                <div className="mt-3 pt-2 border-t border-stone-200/60 font-mono text-[11px] text-stone-500">
                  المسار: {selectedDoc.filename}
                </div>
              </div>
            </div>

            {/* Document Reader Main Panel */}
            <div className="lg:col-span-3 bg-white rounded-2xl border border-stone-200 p-6 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-6 border-b border-stone-100 gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs px-2 py-0.5 rounded bg-stone-100 text-stone-700 border border-stone-200">
                      {selectedDoc.filename}
                    </span>
                    <span className="text-xs text-stone-400">•</span>
                    <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                      Production Ready Spec
                    </span>
                  </div>
                  <h2 className="text-lg font-bold text-stone-900">
                    {selectedDoc.titleAr} ({selectedDoc.titleEn})
                  </h2>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <span className="text-stone-500">
                    لا يحتوي على بيانات وهمية (Mock Data) أو واجهات مؤقتة
                  </span>
                </div>
              </div>

              {/* Markdown Display */}
              <div className="prose prose-stone max-w-none prose-headings:font-bold prose-h1:text-xl prose-h2:text-base prose-h3:text-sm prose-p:text-xs prose-p:leading-relaxed prose-li:text-xs prose-code:font-mono prose-code:text-xs prose-code:bg-stone-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-pre:bg-stone-900 prose-pre:text-stone-100 prose-pre:p-4 prose-pre:rounded-xl">
                <ReactMarkdown>
                  {selectedDoc.content}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* Clean Technical Footer */}
      <footer className="bg-white border-t border-stone-200 mt-auto py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-stone-500 gap-2">
          <div className="flex items-center gap-2">
            <span className="font-bold text-stone-800">Q Saudi Work Follow</span>
            <span>•</span>
            <span>هندسة معمارية للمشاريع الكبرى وسلاسل الإمداد الميدانية بالمملكة</span>
          </div>
          <div className="flex items-center gap-3">
            <span>Firestore SSOT</span>
            <span>•</span>
            <span>Google Sheets Projection</span>
            <span>•</span>
            <span>Offline-First (IndexedDB)</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
