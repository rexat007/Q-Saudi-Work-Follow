import React, { useState } from 'react';
import {
  Layers,
  CheckCircle2,
  AlertCircle,
  Play,
  RotateCcw,
  ShieldCheck,
  Lock,
  FileCheck,
  Share2,
  Workflow,
  Sparkles,
  Database,
  Search,
} from 'lucide-react';
import {
  UNIFIED_IMPORT_PIPELINE_STAGES,
  UnifiedImportPipelineStage,
} from '../../types/unifiedImport';
import { VALID_OPERATION_SOURCE_TYPES } from '../../validators/operationSource.validator';
import {
  runUnifiedImportArchitectureTests,
  UnifiedImportTestCaseResult,
} from '../../tests/unifiedImportArchitecture.test';

export function UnifiedImportArchitectureSection() {
  const [testResults, setTestResults] = useState<{
    ran: boolean;
    allPassed: boolean;
    passed: number;
    failed: number;
    results: UnifiedImportTestCaseResult[];
  } | null>(null);

  const [isRunningTests, setIsRunningTests] = useState(false);
  const [selectedStage, setSelectedStage] = useState<UnifiedImportPipelineStage>('REVIEW');

  const runTests = async () => {
    setIsRunningTests(true);
    try {
      const res = await runUnifiedImportArchitectureTests();
      setTestResults({
        ran: true,
        allPassed: res.allPassed,
        passed: res.passed,
        failed: res.failed,
        results: res.results,
      });
    } catch (e: any) {
      console.error('Error running unified import tests', e);
    } finally {
      setIsRunningTests(false);
    }
  };

  const stageDescriptions: Record<
    UnifiedImportPipelineStage,
    { titleAr: string; descAr: string; invariantAr: string; contract: string }
  > = {
    SOURCE: {
      titleAr: 'تحديد المصدر (Source Ingestion)',
      descAr: 'استقبال وتغليف مصدر الاستيراد وفق نموذج Operation Source Model (BLOCK 29) مع البيانات الوصفية الكاملة للملف.',
      invariantAr: 'إلزامية تسجيل sourceType ومعرف الدفعة وعزل المشروع.',
      contract: 'ImportSource & OperationSourceType',
    },
    PARSE: {
      titleAr: 'التحليل واستخراج البيانات الخام (Raw Parsing)',
      descAr: 'تحويل المصدر إلى سجلات خام دون تنفيذ أي قواعد عمل (Business Logic) داخل الـ Parser.',
      invariantAr: 'فصل تام بين استخراج الحقول الخام وقواعد التحقق.',
      contract: 'IImportParser<TInput, TRawOutput>',
    },
    NORMALIZE: {
      titleAr: 'المعايرة والتوحيد القياسي (Normalization)',
      descAr: 'تحويل الحقول النصية والرقمية والتواريخ إلى الصيغة المعيارية Canonical Representation وتجريد المسافات.',
      invariantAr: 'لا يمر أي حقل بدون تحويل قياسي قبل الفحص.',
      contract: 'IImportNormalizer<TRaw, TCanonical>',
    },
    MAP: {
      titleAr: 'مطابقة الحقول القياسية (Field Mapping)',
      descAr: 'إسقاط الحقول المعيارية على خصائص نموذج الدومين المستهدف (الناقل، الشاحنة، السائق، الأوزان).',
      invariantAr: 'عزل أسماء أعمدة الملف الأصلي عن هيكلية الدومين.',
      contract: 'IImportMapper<TCanonical, TMapped>',
    },
    ENTITY_RESOLUTION: {
      titleAr: 'مطابقة الكيانات المرجعية (Entity Resolution)',
      descAr: 'الربط المرجعي مع سجلات الماستر داتا (Master Data) المعتمدة للمشروع للتحقق من وجود الكيانات وصلاحيتها.',
      invariantAr: 'ربط مستقل لا يعطل تمديد المعمارية لمصادر جديدة.',
      contract: 'IImportEntityResolver',
    },
    VALIDATE: {
      titleAr: 'التحقق الصارم وقواعد الصحة (Validation)',
      descAr: 'فحص الحقول وإصدار مشكلات موحدة محددة بالرمز، السطر، الحقل، والخطورة (BLOCKING أو WARNING).',
      invariantAr: 'الأخطاء المانعة تمنع الاعتماد حتمياً (blocking: true).',
      contract: 'IImportValidator & ImportIssue',
    },
    DUPLICATE_CHECK: {
      titleAr: 'فحص التكرار (Duplicate Check Contract)',
      descAr: 'التحقق من عدم تكرار التذاكر أو الشحنات داخلياً داخل نفس الدفعة أو خارجياً مع قاعدة البيانات.',
      invariantAr: 'عقد مستقل وقابل للاستبدال بخوارزميات متقدمة لاحقاً.',
      contract: 'IImportDuplicateChecker',
    },
    REVIEW: {
      titleAr: 'بوابة المراجعة البشرية (Review Gate)',
      descAr: 'تصنيف الصفوف إلى: accepted, warning, error, requires_review. التوقف الإلزامي قبل أي كتابة.',
      invariantAr: 'ممنوع الكتابة في Firestore قبل اجتياز المراجعة الصريحة.',
      contract: 'IImportReviewHandler & ImportReviewStatus',
    },
    COMMIT: {
      titleAr: 'الاعتماد والتسجيل الفعلي (Transactional Commit)',
      descAr: 'الكتابة الفعلية للبيانات المعتمدة فقط، مع منع الازدواجية والتأكد من عدم وجود أخطاء مانعة وتأكيد التحذيرات.',
      invariantAr: 'دعم Idempotency عبر operationId وفرض عزل المشاريع.',
      contract: 'IImportCommitter & ImportResult',
    },
    AUDIT: {
      titleAr: 'التدقيق الشامل (System Audit)',
      descAr: 'تسجيل الدفعة والعملية والمستخدم وسجل التحولات في AuditLogService لضمان المسؤولية القانونية.',
      invariantAr: 'توثيق كامل غير قابل للإلغاء أو التعديل.',
      contract: 'IImportAuditor & AuditLogEntity',
    },
  };

  return (
    <div className="space-y-6">
      {/* Overview Banner */}
      <div className="bg-stone-900 text-white rounded-2xl p-6 shadow-sm border border-stone-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30">
                BLOCK 30 Architectural Invariants
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-400/20 text-emerald-300 border border-emerald-400/30">
                Source-Agnostic Core
              </span>
            </div>
            <h3 className="text-xl font-black text-white">
              معمارية مركز الاستيراد الموحد (Unified Import Center Architecture)
            </h3>
            <p className="text-xs text-stone-300 max-w-3xl leading-relaxed">
              معمارية قياسية موحدة وقابلة للتوسع تفصل بين استقبال المصادر ومراحل التحليل والتحقق والاعتماد.
              تضمن سيادة الخادم، عزل المشاريع، حظر الكتابة قبل بوابة المراجعة، ومطابقة معيارية لـ 8 مصادر توريد.
            </p>
          </div>

          <button
            onClick={runTests}
            disabled={isRunningTests}
            className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs flex items-center gap-2 transition-all shrink-0 cursor-pointer shadow-sm disabled:opacity-50"
          >
            {isRunningTests ? (
              <>
                <RotateCcw className="w-4 h-4 animate-spin" />
                <span>جاري تشغيل الاختبارات...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                <span>تشغيل حزمة الاختبارات الآلية (12 اختبار)</span>
              </>
            )}
          </button>
        </div>

        {/* 10 Pipeline Stages Horizontal Flow */}
        <div className="mt-6 pt-5 border-t border-stone-800">
          <div className="text-xs font-bold text-stone-300 mb-3 flex items-center justify-between">
            <span>تسلسل مراحل المعمارية العشر (The 10 Decoupled Pipeline Stages):</span>
            <span className="text-[11px] text-amber-400">انقر على أي مرحلة لاستعراض عقدها الهندسي</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-2">
            {UNIFIED_IMPORT_PIPELINE_STAGES.map((stage, idx) => {
              const isSelected = selectedStage === stage;
              return (
                <button
                  key={stage}
                  onClick={() => setSelectedStage(stage)}
                  className={`p-2.5 rounded-xl text-center transition-all border cursor-pointer ${
                    isSelected
                      ? 'bg-amber-400 text-stone-950 border-amber-300 font-bold shadow-sm'
                      : 'bg-stone-800/80 hover:bg-stone-800 text-stone-300 border-stone-700/60'
                  }`}
                >
                  <div className="text-[10px] font-mono opacity-60">{idx + 1}</div>
                  <div className="text-[11px] font-black truncate">{stage}</div>
                </button>
              );
            })}
          </div>

          {/* Selected Stage Details Card */}
          <div className="mt-4 p-4 rounded-xl bg-stone-800/90 border border-stone-700 text-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-stone-700/80 mb-2">
              <div className="font-bold text-amber-300 flex items-center gap-2">
                <Workflow className="w-4 h-4" />
                <span>المرحلة {UNIFIED_IMPORT_PIPELINE_STAGES.indexOf(selectedStage) + 1}: {selectedStage} — {stageDescriptions[selectedStage].titleAr}</span>
              </div>
              <div className="font-mono text-[11px] text-stone-400 bg-stone-900 px-2 py-0.5 rounded">
                العقد الهندسي: {stageDescriptions[selectedStage].contract}
              </div>
            </div>
            <p className="text-stone-300 mb-2">{stageDescriptions[selectedStage].descAr}</p>
            <div className="text-[11px] text-amber-200/90 bg-amber-950/40 p-2 rounded-lg border border-amber-900/40">
              <strong>الشرط الحاكم (Invariant):</strong> {stageDescriptions[selectedStage].invariantAr}
            </div>
          </div>
        </div>
      </div>

      {/* 8 Supported Source Types Grid (Operation Source Model) */}
      <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="text-sm font-bold text-stone-900 flex items-center gap-2">
              <Database className="w-4 h-4 text-amber-600" />
              <span>أنواع المصادر الثمانية المعتمدة في المعمارية (Operation Source Types)</span>
            </h4>
            <p className="text-xs text-stone-500 mt-0.5">
              مبنية بالكامل فوق نموذج BLOCK 29 مع دعم شامل للبيانات الوصفية (sourceFileId, sourceFileName, sourceSheetName, sourceRowId, sourceMimeType).
            </p>
          </div>
          <span className="text-xs font-mono font-bold bg-stone-100 text-stone-700 px-2.5 py-1 rounded-lg border border-stone-200">
            8 Sources Unified
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {VALID_OPERATION_SOURCE_TYPES.map((source) => (
            <div
              key={source}
              className="p-3 rounded-xl border border-stone-200/80 bg-stone-50/60 hover:bg-stone-50 transition-colors"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono text-xs font-bold text-stone-900">{source}</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              </div>
              <p className="text-[11px] text-stone-500">
                {source === 'MANUAL' && 'إدخال يدوي من المشغل'}
                {source === 'WEIGHBRIDGE' && 'ميزان آلي وبوابات التوزين'}
                {source === 'EXCEL' && 'جداول إكسل (.xlsx, .xls)'}
                {source === 'CSV' && 'ملفات نصوص مفصولة (.csv)'}
                {source === 'GOOGLE_SHEETS' && 'جداول سحابية Google Sheets'}
                {source === 'GOOGLE_DRIVE' && 'مجلدات سحابية Google Drive'}
                {source === 'API' && 'تكامل برمجي خارجي آمن'}
                {source === 'MIGRATION' && 'ترحيل وتصفية بيانات سابقة'}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Test Runner Results Panel */}
      {testResults && (
        <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-stone-100">
            <div className="flex items-center gap-2.5">
              {testResults.allPassed ? (
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              ) : (
                <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
                  <AlertCircle className="w-5 h-5" />
                </div>
              )}
              <div>
                <h4 className="text-sm font-bold text-stone-900">
                  نتائج فحص المعمارية والعقود ({testResults.passed} من أصل {testResults.results.length} اجتازت)
                </h4>
                <p className="text-xs text-stone-500">
                  تم اختبار كامل بنود BLOCK 30 الاثني عشر بما فيها التحقق المانع، التكرار، Idempotency، وعزل المشاريع.
                </p>
              </div>
            </div>

            <span
              className={`px-3 py-1 rounded-full text-xs font-black ${
                testResults.allPassed
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  : 'bg-rose-100 text-rose-800 border border-rose-200'
              }`}
            >
              {testResults.allPassed ? 'ALL TESTS PASSED (100%)' : 'SOME TESTS FAILED'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {testResults.results.map((t) => (
              <div
                key={t.id}
                className={`p-3.5 rounded-xl border text-xs transition-colors ${
                  t.passed
                    ? 'border-emerald-200/80 bg-emerald-50/30'
                    : 'border-rose-200 bg-rose-50/50'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <span className="font-bold text-stone-900">{t.name}</span>
                  <span
                    className={`font-mono text-[10px] font-black px-2 py-0.5 rounded ${
                      t.passed
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {t.passed ? 'PASSED' : 'FAILED'}
                  </span>
                </div>
                <div className="font-mono text-[11px] text-stone-400 mb-1">{t.id}</div>
                <p className="text-stone-600 text-[11px]">{t.notes}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
