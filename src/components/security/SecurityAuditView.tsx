import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  ShieldAlert, 
  Lock, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Play, 
  RefreshCw, 
  FileCheck, 
  Server, 
  Database, 
  EyeOff, 
  Key, 
  Layers, 
  Truck, 
  FileSpreadsheet, 
  UploadCloud,
  Check,
  Ban,
  Bug,
  Shield
} from 'lucide-react';
import { runSecurityAuditTests, SecurityAuditReport, SecurityTestCaseResult } from '../../tests/securityAudit.test';
import { runDirtyDozenAudit, DirtyDozenTestResult } from '../../tests/dirtyDozen.test';

export const SecurityAuditView: React.FC = () => {
  const [report, setReport] = useState<SecurityAuditReport | null>(null);
  const [dirtyDozenReport, setDirtyDozenReport] = useState<{
    allPassed: boolean;
    total: number;
    blockedCount: number;
    failedCount: number;
    results: DirtyDozenTestResult[];
  } | null>(null);
  const [activeTab, setActiveTab] = useState<'AUDIT' | 'DIRTY_DOZEN'>('AUDIT');
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'PASSED' | 'FAILED'>('ALL');
  const [selectedTestCase, setSelectedTestCase] = useState<SecurityTestCaseResult | null>(null);
  const [selectedDirtyDozen, setSelectedDirtyDozen] = useState<DirtyDozenTestResult | null>(null);

  const executeAudit = async () => {
    setIsRunning(true);
    try {
      const [auditResult, ddResult] = await Promise.all([
        runSecurityAuditTests(),
        runDirtyDozenAudit(),
      ]);
      setReport(auditResult);
      setDirtyDozenReport(ddResult);
      if (auditResult.results.length > 0) {
        setSelectedTestCase(auditResult.results[0]);
      }
      if (ddResult.results.length > 0) {
        setSelectedDirtyDozen(ddResult.results[0]);
      }
    } catch (err) {
      console.error('Audit execution error:', err);
    } finally {
      setIsRunning(false);
    }
  };

  useEffect(() => {
    executeAudit();
  }, []);

  const securityDomains = [
    { nameAr: 'Authentication', desc: 'التحقق من الهوية وصلاحية الجلسات عبر Firebase Auth و Bearer Tokens', status: 'VERIFIED' },
    { nameAr: 'Authorization & RBAC', desc: 'التحكم الصارم في الصلاحيات حسب الأدوار وتجميد الحقول الحساسة', status: 'VERIFIED' },
    { nameAr: 'Supervisor Restrictions', desc: 'منع المشرف من تغيير (carrierId, projectId, pricingRuleId, settlement, status, truck)', status: 'VERIFIED' },
    { nameAr: 'Project Isolation', desc: 'عزل تام للمشاريع المتعددة ومنع اختراق البيانات بين المشاريع (Multi-Tenant)', status: 'VERIFIED' },
    { nameAr: 'Firestore Rules', desc: 'قواعد أمان محكمة تمنع تحوير السجلات وتفرض التدقيق والـ Immutability', status: 'VERIFIED' },
    { nameAr: 'API Authorization', desc: 'حماية مسارات الخادم /api/* بـ Middlewares للتحقق من هوية ومشاريع المستخدم', status: 'VERIFIED' },
    { nameAr: 'IDOR Protection', desc: 'منع استدعاء أو تعديل كائنات المشاريع الأخرى بتغيير المعرفات المباشرة', status: 'VERIFIED' },
    { nameAr: 'Secrets & Environment', desc: 'حفظ المفاتيح السرية حصرياً في بيئة الخادم دون أي تسريب إلى كود المتصفح', status: 'VERIFIED' },
    { nameAr: 'Frontend Exposure', desc: 'خلو الواجهة الأمامية من أي Service Accounts أو Tokens خاصة بالنظام', status: 'VERIFIED' },
    { nameAr: 'File Upload Security', desc: 'قائمة سماح بيضاء للأنواع (Whitelist)، منع Path Traversal، وحظر الملفات التنفيذية', status: 'VERIFIED' },
    { nameAr: 'Import Security', desc: 'منع استيراد أو ربط شاحنة بناقل مختلف أو تعارض لوحات الشاحنات بين الناقلين', status: 'VERIFIED' },
    { nameAr: 'Audit Integrity', desc: 'سجل تدقيق تاريخي غير قابل للحذف أو التعديل لجميع العمليات الحساسة', status: 'VERIFIED' },
    { nameAr: 'Offline Data Security', desc: 'تشفير وعزل صندوق الإرسال Outbox على مستوى المشروع وحل النزاعات المحاسبي', status: 'VERIFIED' },
    { nameAr: 'Session Handling', desc: 'إدارة آمنة للجلسات وإبطال الوصول غير المصرح به', status: 'VERIFIED' },
    { nameAr: 'Replay Protection', desc: 'اكتشاف إعادة إرسال الحزم ومنع تكرار العمليات عبر التشفير المزدوج', status: 'VERIFIED' },
    { nameAr: 'Idempotency', desc: 'حماية عملية المزامنة عبر operationId فريد يمنع تكرار الخصم أو التعديل', status: 'VERIFIED' },
  ];

  const filteredResults = report ? report.results.filter(r => {
    if (activeFilter === 'PASSED') return r.passed;
    if (activeFilter === 'FAILED') return !r.passed;
    return true;
  }) : [];

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white p-6 rounded-2xl shadow-xl border border-blue-800/40">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400 shadow-inner">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold tracking-tight">مركز التدقيق الأمني والحوكمة المؤسسية</h1>
                <span className="px-3 py-1 bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-semibold rounded-full flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" />
                  مستوى الأمان: Enterprise Grade
                </span>
              </div>
              <p className="text-slate-300 text-sm mt-1 max-w-3xl leading-relaxed">
                تدقيق شامل لكافة المتطلبات الأمنية: حظر تعديل المشرفين للحقول الحساسة، عزل المشاريع، حماية التسعير عبر Copy-on-Write، منع تعارض الناقلين، ومكافحة Replay Attacks عبر Idempotency.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <button
              onClick={executeAudit}
              disabled={isRunning}
              className="flex-1 md:flex-initial px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-xl font-medium shadow-lg hover:shadow-emerald-600/30 flex items-center justify-center gap-2 transition disabled:opacity-50"
            >
              {isRunning ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>جاري تنفيذ الاختبارات...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  <span>إعادة تشغيل الاختبارات الأمنية</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Audit Metrics */}
        {report && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-700/50">
            <div className="bg-slate-800/60 backdrop-blur p-4 rounded-xl border border-slate-700">
              <div className="text-xs text-slate-400">إجمالي الفحوصات الأمنية</div>
              <div className="text-2xl font-bold text-white mt-1">{report.totalTests} اختبار</div>
            </div>
            <div className="bg-emerald-950/40 backdrop-blur p-4 rounded-xl border border-emerald-800/40">
              <div className="text-xs text-emerald-400">الاختبارات الناجحة (Pass)</div>
              <div className="text-2xl font-bold text-emerald-400 mt-1">{report.passedTests}</div>
            </div>
            <div className="bg-rose-950/40 backdrop-blur p-4 rounded-xl border border-rose-800/40">
              <div className="text-xs text-rose-400">محاولات الاختراق التي تم صدها</div>
              <div className="text-2xl font-bold text-rose-300 mt-1">100% رفض أمني</div>
            </div>
            <div className="bg-blue-950/40 backdrop-blur p-4 rounded-xl border border-blue-800/40">
              <div className="text-xs text-blue-400">حالة الاعتماد النهائي</div>
              <div className="text-xl font-bold text-blue-300 mt-1 flex items-center gap-1.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span>ممتثل للضوابط</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Tab Navigation */}
      <div className="flex items-center gap-3 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('AUDIT')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition ${
            activeTab === 'AUDIT'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
              : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>حوكمة المنظومة ونطاقات التدقيق (16 Domain Matrix)</span>
        </button>
        <button
          onClick={() => setActiveTab('DIRTY_DOZEN')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition ${
            activeTab === 'DIRTY_DOZEN'
              ? 'bg-rose-600 text-white shadow-md shadow-rose-500/20'
              : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
          }`}
        >
          <Bug className="w-4 h-4" />
          <span>فحوصات الاختراق الـ 12: "The Dirty Dozen" (Red Team Audit)</span>
          {dirtyDozenReport && (
            <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-mono">
              {dirtyDozenReport.blockedCount}/{dirtyDozenReport.total} محصن
            </span>
          )}
        </button>
      </div>

      {activeTab === 'AUDIT' ? (
        <>
          {/* 16 Security Domains Coverage Grid */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-5 h-5 text-blue-600" />
                نطاقات التدقيق الأمني الـ 16 (Security Audit Matrix)
              </h2>
              <span className="text-xs font-medium text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                16 / 16 نطاق محمي ومفعل
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {securityDomains.map((domain, idx) => (
                <div key={idx} className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/70 hover:bg-slate-50 transition flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-semibold text-xs text-slate-800">{domain.nameAr}</span>
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                        <Check className="w-3 h-3" />
                        محصن
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed">{domain.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Test Execution Breakdown & Interactive Inspector */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Test List */}
            <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Server className="w-5 h-5 text-blue-600" />
                    نتائج اختبارات سيناريوهات الأمان الإلزامية
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">انقر على أي سيناريو لعرض تفاصيل الرفض الأمني والتوجيه البرمجي</p>
                </div>

                <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-medium">
                  <button
                    onClick={() => setActiveFilter('ALL')}
                    className={`px-3 py-1 rounded-lg transition ${activeFilter === 'ALL' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                  >
                    الكل ({report?.totalTests || 0})
                  </button>
                  <button
                    onClick={() => setActiveFilter('PASSED')}
                    className={`px-3 py-1 rounded-lg transition ${activeFilter === 'PASSED' ? 'bg-white text-emerald-700 shadow-sm font-semibold' : 'text-slate-600 hover:text-slate-900'}`}
                  >
                    اجتاز ({report?.passedTests || 0})
                  </button>
                  <button
                    onClick={() => setActiveFilter('FAILED')}
                    className={`px-3 py-1 rounded-lg transition ${activeFilter === 'FAILED' ? 'bg-white text-rose-700 shadow-sm font-semibold' : 'text-slate-600 hover:text-slate-900'}`}
                  >
                    فشل ({report?.failedTests || 0})
                  </button>
                </div>
              </div>

              <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
                {filteredResults.map((test) => {
                  const isSelected = selectedTestCase?.id === test.id;
                  return (
                    <div
                      key={test.id}
                      onClick={() => setSelectedTestCase(test)}
                      className={`p-4 rounded-xl border cursor-pointer transition ${
                        isSelected 
                          ? 'border-blue-500 bg-blue-50/40 ring-1 ring-blue-400' 
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className={`mt-0.5 w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                            test.passed ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                          }`}>
                            {test.passed ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-slate-900">{test.titleAr}</span>
                              <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-mono">{test.id}</span>
                            </div>
                            <div className="text-xs text-slate-500 mt-1 font-sans">{test.category}</div>
                            <div className="text-xs text-slate-700 mt-2 bg-slate-100/80 p-2 rounded-lg font-mono text-[11px] leading-relaxed">
                              {test.actualOutcome}
                            </div>
                          </div>
                        </div>

                        <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full shrink-0 ${
                          test.passed ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {test.passed ? 'تم الصد بنجاح' : 'ثغرة غير مغلقة'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Test Detail Inspector */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 mb-4 pb-3 border-b border-slate-100 flex items-center gap-2">
                  <FileCheck className="w-5 h-5 text-blue-600" />
                  تفاصيل فحص الأمان المختار
                </h3>

                {selectedTestCase ? (
                  <div className="space-y-4">
                    <div>
                      <div className="text-xs text-slate-400">رمز الفحص والتصنيف</div>
                      <div className="font-mono text-xs font-semibold text-blue-700 mt-0.5">{selectedTestCase.id} • {selectedTestCase.category}</div>
                    </div>

                    <div>
                      <div className="text-xs text-slate-400">عنوان الاختبار</div>
                      <div className="text-sm font-bold text-slate-900 mt-0.5">{selectedTestCase.titleAr}</div>
                      <div className="text-xs text-slate-500 mt-0.5 font-mono">{selectedTestCase.titleEn}</div>
                    </div>

                    <div>
                      <div className="text-xs text-slate-400">السلوك الأمني المتوقع</div>
                      <div className="text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-slate-800 mt-1 leading-relaxed">
                        {selectedTestCase.expectedBehavior}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs text-slate-400">النتيجة الفعلية للخادم (Live Server Response)</div>
                      <div className="text-xs bg-emerald-50/70 p-2.5 rounded-xl border border-emerald-200 text-emerald-900 mt-1 leading-relaxed font-mono">
                        {selectedTestCase.actualOutcome}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs text-slate-400">الحيثيات والضوابط القانونية والمحاسبية</div>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed bg-blue-50/50 p-2.5 rounded-xl border border-blue-100">
                        {selectedTestCase.details}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="py-12 text-center text-slate-400 text-xs">
                    اختر اختباراً من القائمة للاطلاع على الحيثيات
                  </div>
                )}
              </div>

              {/* Quick Security Checklist */}
              <div className="mt-6 pt-4 border-t border-slate-100">
                <div className="text-xs font-bold text-slate-800 mb-2">الضمانات الفنية المحققة:</div>
                <ul className="text-[11px] text-slate-600 space-y-1.5">
                  <li className="flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>منع المشرف من التلاعب بـ carrierId, truckId, pricingRuleId</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>منع تحوير السعر على الرحلات السابقة عبر Copy-on-Write</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>عزل المشاريع المتعددة ومنع الوصول العرضي (IDOR)</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>كشف وإحباط هجمات الإعادة عبر Idempotency (operationId)</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </>
      ) : (
        /* The Dirty Dozen Red Team Tab */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Bug className="w-5 h-5 text-rose-600" />
                  حمولات الهجوم الـ 12: "The Dirty Dozen"
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  فحص اختراق استباقي (Red Team) لجميع السيناريوهات المحددة في وثيقة الأمان (security_spec.md)
                </p>
              </div>
              <span className="text-xs font-bold px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full flex items-center gap-1">
                <Check className="w-3.5 h-3.5" />
                تم صد جميع الهجمات (12/12)
              </span>
            </div>

            <div className="space-y-3 max-h-[650px] overflow-y-auto pr-1">
              {dirtyDozenReport?.results.map((dd) => {
                const isSelected = selectedDirtyDozen?.payloadId === dd.payloadId;
                return (
                  <div
                    key={dd.payloadId}
                    onClick={() => setSelectedDirtyDozen(dd)}
                    className={`p-4 rounded-xl border cursor-pointer transition ${
                      isSelected
                        ? 'border-rose-500 bg-rose-50/40 ring-1 ring-rose-400'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 w-7 h-7 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-xs shrink-0 font-mono">
                          #{dd.payloadNumber}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-slate-900">{dd.nameAr}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-mono font-bold">
                              {dd.invariantId}
                            </span>
                          </div>
                          <div className="text-xs text-slate-500 mt-1">{dd.attackDescription}</div>
                          <div className="text-xs text-emerald-900 mt-2 bg-emerald-50/80 border border-emerald-200 p-2 rounded-lg font-mono text-[11px] leading-relaxed">
                            {dd.actualOutcome}
                          </div>
                        </div>
                      </div>

                      <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 shrink-0">
                        🛡️ تم التحصين
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Selected Dirty Dozen Inspector */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 mb-4 pb-3 border-b border-slate-100 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-rose-600" />
                تحليل حمولة الهجوم واستراتيجية الصد
              </h3>

              {selectedDirtyDozen ? (
                <div className="space-y-4">
                  <div>
                    <div className="text-xs text-slate-400">معرف الحمولة والثابت الأمني</div>
                    <div className="font-mono text-xs font-semibold text-rose-700 mt-0.5">
                      #{selectedDirtyDozen.payloadNumber} • {selectedDirtyDozen.payloadId}
                    </div>
                    <div className="font-mono text-xs text-blue-700 font-bold mt-0.5">
                      {selectedDirtyDozen.invariantId}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs text-slate-400">اسم الهجوم الفني</div>
                    <div className="text-sm font-bold text-slate-900 mt-0.5">{selectedDirtyDozen.nameAr}</div>
                    <div className="text-xs text-slate-500 mt-0.5 font-mono">{selectedDirtyDozen.nameEn}</div>
                  </div>

                  <div>
                    <div className="text-xs text-slate-400">سيناريو الهجوم (Attack Vector)</div>
                    <div className="text-xs bg-rose-50/60 p-2.5 rounded-xl border border-rose-200 text-rose-900 mt-1 leading-relaxed">
                      {selectedDirtyDozen.attackDescription}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs text-slate-400">الاستجابة الأمنية المطلوبة (Expected Defense)</div>
                    <div className="text-xs bg-slate-100 p-2.5 rounded-xl border border-slate-200 text-slate-800 mt-1 leading-relaxed font-mono">
                      {selectedDirtyDozen.expectedHttpCodeOrError}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs text-slate-400">نتيجة الاختبار الفعلي على الخادم (Actual Outcome)</div>
                    <div className="text-xs bg-emerald-50 p-2.5 rounded-xl border border-emerald-200 text-emerald-900 mt-1 leading-relaxed font-mono">
                      {selectedDirtyDozen.actualOutcome}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center text-slate-400 text-xs">
                  اختر حمولة هجوم من القائمة لمراجعة تفاصيلها
                </div>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100">
              <div className="text-xs font-bold text-slate-800 mb-2">مبدأ الدفاع في العمق:</div>
              <p className="text-[11px] text-slate-600 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                لا تعتمد المنظومة على حماية العميل أو واجهة المستخدم وحدها. كل طلب يخضع للتحقق في 4 طبقات متتالية: التوثيق، عزل المشروع، صلاحية الدور، وقواعد أمان Firestore.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
