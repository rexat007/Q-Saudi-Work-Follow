import React, { useState, useMemo } from 'react';
import { 
  ProjectSetupWizardData, 
  ProjectProvisioningResult,
  WizardMaterialItem,
  WizardCarrierItem,
  WizardPricingRuleItem,
  WizardUserAccessItem,
  WizardGoogleDriveProvisioning,
  ProjectInfoStep
} from '../../types/wizard';
import { mockTemplateData } from './mockTemplateData';
import { ProjectProvisioningValidator } from '../../validators/projectProvisioning.validator';
import { projectProvisioningService } from '../../services/projectProvisioning.service';

import { Step1ProjectInfo } from './Step1ProjectInfo';
import { Step2Materials } from './Step2Materials';
import { Step3Carriers } from './Step3Carriers';
import { Step4PricingRules } from './Step4PricingRules';
import { Step5ProjectAccess } from './Step5ProjectAccess';
import { Step6GoogleDrive } from './Step6GoogleDrive';
import { Step7Review } from './Step7Review';

import { 
  Building2, 
  Boxes, 
  Truck, 
  CircleDollarSign, 
  Users, 
  FolderSync, 
  ShieldCheck, 
  ArrowRight, 
  ArrowLeft, 
  Sparkles, 
  RotateCcw, 
  AlertTriangle,
  CheckCircle2,
  HelpCircle
} from 'lucide-react';

export const ProjectSetupWizard: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [wizardData, setWizardData] = useState<ProjectSetupWizardData>(mockTemplateData);
  const [isProvisioning, setIsProvisioning] = useState<boolean>(false);
  const [provisioningStepIndex, setProvisioningStepIndex] = useState<number>(0);
  const [provisionResult, setProvisionResult] = useState<ProjectProvisioningResult | null>(null);
  const [provisionError, setProvisionError] = useState<string | null>(null);

  // Full validation running in real-time
  const validation = useMemo(() => {
    return ProjectProvisioningValidator.validateAll(wizardData);
  }, [wizardData]);

  // Current step error list
  const currentStepErrors = useMemo(() => {
    const stepObj = validation.stepResults.find((s) => s.step === currentStep);
    return stepObj ? stepObj.errors : [];
  }, [validation, currentStep]);

  const stepsMeta = [
    { number: 1, title: 'بيانات المشروع', sub: 'Project Info', icon: Building2 },
    { number: 2, title: 'المواد والتوريد', sub: 'Materials', icon: Boxes },
    { number: 3, title: 'شركات النقل', sub: 'Carriers', icon: Truck },
    { number: 4, title: 'قواعد التسعير', sub: 'Pricing Rules', icon: CircleDollarSign },
    { number: 5, title: 'صلاحيات الوصول', sub: 'Project Access', icon: Users },
    { number: 6, title: 'تكامل Google', sub: 'Drive & Sheets', icon: FolderSync },
    { number: 7, title: 'المراجعة والإنشاء', sub: 'Review & Gate', icon: ShieldCheck },
  ];

  // Updaters for each step
  const updateProjectInfo = (info: ProjectInfoStep) => {
    setWizardData((prev) => ({ ...prev, projectInfo: info }));
  };

  const updateMaterials = (materials: WizardMaterialItem[]) => {
    setWizardData((prev) => ({ ...prev, materials }));
  };

  const updateCarriers = (carriers: WizardCarrierItem[]) => {
    setWizardData((prev) => ({ ...prev, carriers }));
  };

  const updatePricingRules = (pricingRules: WizardPricingRuleItem[]) => {
    setWizardData((prev) => ({ ...prev, pricingRules }));
  };

  const updateUserAccess = (userAccess: WizardUserAccessItem[]) => {
    setWizardData((prev) => ({ ...prev, userAccess }));
  };

  const updateGoogleDrive = (googleDrive: WizardGoogleDriveProvisioning) => {
    setWizardData((prev) => ({ ...prev, googleDrive }));
  };

  // Step navigation
  const goToNextStep = () => {
    if (currentStep < 7) {
      setCurrentStep((prev) => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const goToPrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const jumpToStep = (stepNumber: number) => {
    setCurrentStep(stepNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Reset to empty / clean state
  const handleReset = () => {
    const freshData: ProjectSetupWizardData = {
      projectInfo: {
        projectCode: `PRJ-${Date.now().toString(36).toUpperCase()}`,
        projectName: '',
        clientName: '',
        description: '',
        status: 'ACTIVE',
        startDate: new Date().toISOString().split('T')[0],
        endDate: '',
        defaultSettings: {
          currency: 'SAR',
          vatRatePercent: 15,
          zatcaTaxNumber: '300000000000003',
          requireTareOnExit: true,
          maxToleranceKg: 150,
          allowDriverSelfDispatch: false,
          addressAr: 'المملكة العربية السعودية',
          geoFenceRadiusMeters: 1000,
        },
      },
      materials: [
        {
          id: 'mat-1',
          materialId: 'MAT-SUBBASE-01',
          materialName: 'ركام طبقة أساس صلب (Sub-base Grade A)',
          materialCode: 'SB-01',
          unitOfMeasure: 'TON',
          status: 'ACTIVE',
          sortOrder: 1,
          standardDensityTonPerM3: 1.65,
        },
      ],
      carriers: [
        {
          id: 'car-1',
          carrierId: 'CAR-A',
          carrierName: 'شركة النقل المتقدم (Carrier A)',
          status: 'ACTIVE',
          commercialRegistrationNo: '1010998877',
          transportLicenseNo: 'TGA-SA-901',
          contactPersonName: 'سلطان المطيري',
          contactPhone: '+966501112233',
          contactEmail: 'logistics@carriera.sa',
        },
      ],
      pricingRules: [
        {
          id: 'pr-1',
          pricingRuleId: 'PR-CAR-A-PER-TRIP-120',
          carrierId: 'CAR-A',
          pricingType: 'PER_TRIP',
          rate: 120,
          currency: 'SAR',
          effectiveFrom: '2026-09-01',
          effectiveTo: '2027-12-31',
          materialId: 'ALL_MATERIALS',
          notes: 'اتفاقية الرد الثابت 120 ريال',
          vatApplicable: true,
        },
      ],
      userAccess: [
        {
          userId: 'USR-ADMIN-01',
          fullName: 'م. أحمد الحربي (المدير الإقليمي)',
          email: 'admin.operations@q-saudi.sa',
          role: 'PROJECT_ADMIN',
          isAssigned: true,
        },
      ],
      googleDrive: {
        enabled: true,
        rootFolderName: 'PRJ - أرشيف ومستندات المشروع اللوجستية',
        provisionSpreadsheet: true,
        spreadsheetTitle: 'سجل رحلات وموازين المشروع',
        folderStructure: ['01_Weighbridge_Tickets', '02_Delivery_Notes', '03_Settlements', '04_Permits'],
        autoSyncTickets: true,
        archiveDailyTrips: true,
      },
    };
    setWizardData(freshData);
    setProvisionResult(null);
    setProvisionError(null);
    setCurrentStep(1);
  };

  // Quick Invalidate / Test Overlap Feature
  const handleInjectConflictingRule = () => {
    // Inject a second rule for Carrier A with PER_TRIP and overlapping date to demonstrate the validator!
    const conflictRule: WizardPricingRuleItem = {
      id: `pr-conflict-${Date.now()}`,
      pricingRuleId: `PR-CONFLICT-CAR-A`,
      carrierId: 'CAR-A',
      pricingType: 'PER_TRIP',
      rate: 150,
      currency: 'SAR',
      effectiveFrom: '2026-10-01',
      effectiveTo: '2027-05-01',
      materialId: 'ALL_MATERIALS',
      notes: 'قاعدة تضارب متعمدة لاختبار منع التداخل الزمني',
      vatApplicable: true,
    };
    setWizardData((prev) => ({
      ...prev,
      pricingRules: [...prev.pricingRules, conflictRule],
    }));
    setCurrentStep(4);
  };

  // Perform Final Provisioning
  const handleProvision = async () => {
    setProvisionError(null);
    setIsProvisioning(true);
    setProvisioningStepIndex(0);

    try {
      // Simulate stepwise progress for visual craftsmanship
      for (let i = 1; i < 8; i++) {
        await new Promise((res) => setTimeout(res, 350));
        setProvisioningStepIndex(i);
      }

      const result = await projectProvisioningService.provisionProject(wizardData, {
        userId: 'USR-ADMIN-01',
        displayName: 'م. أحمد الحربي (المدير الإقليمي)',
        email: 'admin.operations@q-saudi.sa',
        role: 'PROJECT_ADMIN',
      });

      if (!result.success) {
        setProvisionError(result.messageAr || result.error || 'حدث خطأ أثناء تأسيس المشروع');
      } else {
        setProvisionResult(result);
      }
    } catch (err: any) {
      setProvisionError(err.message || 'فشلت عملية التهيئة والتأسيس');
    } finally {
      setIsProvisioning(false);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-3 sm:px-6 py-6 space-y-6">
      {/* Top Banner & Context Controls */}
      <div className="bg-stone-900 text-stone-100 rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
              Enterprise Project Setup Wizard
            </span>
            <span className="text-stone-400 text-xs font-mono">
              v1.0 • KSA Logistics Architecture
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
            معالج تأسيس وتهيئة المشاريع اللوجستية (Project Setup Wizard)
          </h1>
          <p className="text-xs text-stone-400 max-w-2xl leading-relaxed">
            معمارية متعددة الخطوات تضمن تأسيس المشاريع، المواد، الناقلين، وقواعد التسعير المنفصلة مع منع التداخل الزمني، وتهيئة Google Workspace آلياً.
          </p>
        </div>

        {/* Action Pills */}
        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
          <button
            type="button"
            onClick={() => {
              setWizardData(mockTemplateData);
              setProvisionResult(null);
            }}
            className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>استعادة نموذج نيوم التجريبي</span>
          </button>

          <button
            type="button"
            onClick={handleInjectConflictingRule}
            className="px-3 py-1.5 bg-rose-950/80 hover:bg-rose-900 text-rose-200 border border-rose-800 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
            title="إضافة قاعدة تسعير مكررة لاختبار كشف التضارب الزمني"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
            <span>تجربة فحص التضارب الزمني</span>
          </button>

          <button
            type="button"
            onClick={handleReset}
            className="p-2 bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-stone-200 border border-stone-700 rounded-lg text-xs transition-colors"
            title="إعادة تعيين المعالج"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Provision Error Banner if any */}
      {provisionError && (
        <div className="p-4 bg-rose-50 border border-rose-300 rounded-xl text-xs text-rose-900 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 font-semibold">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{provisionError}</span>
          </div>
          <button
            type="button"
            onClick={() => setProvisionError(null)}
            className="text-stone-500 hover:text-stone-700 text-xs"
          >
            إغلاق
          </button>
        </div>
      )}

      {/* Step Stepper Navigation Bar */}
      <div className="bg-white border border-stone-200 rounded-2xl p-2 sm:p-3 shadow-2xs overflow-x-auto">
        <div className="flex items-center justify-between min-w-[720px] gap-2">
          {stepsMeta.map((s, idx) => {
            const Icon = s.icon;
            const isCurrent = s.number === currentStep;
            const isPassed = s.number < currentStep;
            const stepVal = validation.stepResults.find((sr) => sr.step === s.number);
            const hasError = stepVal && !stepVal.isValid;

            return (
              <React.Fragment key={s.number}>
                <button
                  type="button"
                  id={`step-indicator-${s.number}`}
                  onClick={() => jumpToStep(s.number)}
                  className={`flex-1 flex items-center gap-2 p-2 rounded-xl text-right transition-all group ${
                    isCurrent
                      ? 'bg-amber-50 border border-amber-300 text-amber-950 font-bold shadow-2xs'
                      : isPassed
                      ? 'hover:bg-stone-50 text-stone-800'
                      : 'text-stone-400 hover:text-stone-600'
                  }`}
                >
                  {/* Step badge */}
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold font-mono transition-all ${
                      hasError && s.number !== 7
                        ? 'bg-rose-100 text-rose-800 border border-rose-300'
                        : isCurrent
                        ? 'bg-amber-600 text-white shadow-xs'
                        : isPassed
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : 'bg-stone-100 text-stone-500 border border-stone-200'
                    }`}
                  >
                    {hasError && s.number !== 7 ? '!' : isPassed ? '✓' : s.number}
                  </div>

                  {/* Step Titles */}
                  <div className="leading-tight truncate">
                    <span className={`block text-xs truncate ${isCurrent ? 'font-black text-stone-900' : 'font-semibold'}`}>
                      {s.title}
                    </span>
                    <span className="text-[10px] text-stone-400 font-mono block truncate">
                      {s.sub}
                    </span>
                  </div>
                </button>

                {idx < stepsMeta.length - 1 && (
                  <div className="w-3 h-0.5 bg-stone-200 shrink-0" />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Step Content Container */}
      <div className="bg-white border border-stone-200 rounded-2xl p-5 sm:p-7 shadow-xs">
        {currentStep === 1 && (
          <Step1ProjectInfo
            data={wizardData.projectInfo}
            onChange={updateProjectInfo}
            errors={currentStepErrors}
          />
        )}

        {currentStep === 2 && (
          <Step2Materials
            materials={wizardData.materials}
            onChange={updateMaterials}
            errors={currentStepErrors}
          />
        )}

        {currentStep === 3 && (
          <Step3Carriers
            carriers={wizardData.carriers}
            onChange={updateCarriers}
            errors={currentStepErrors}
          />
        )}

        {currentStep === 4 && (
          <Step4PricingRules
            pricingRules={wizardData.pricingRules}
            carriers={wizardData.carriers}
            materials={wizardData.materials}
            onChange={updatePricingRules}
            errors={currentStepErrors}
          />
        )}

        {currentStep === 5 && (
          <Step5ProjectAccess
            userAccess={wizardData.userAccess}
            onChange={updateUserAccess}
            errors={currentStepErrors}
          />
        )}

        {currentStep === 6 && (
          <Step6GoogleDrive
            data={wizardData.googleDrive}
            projectCode={wizardData.projectInfo.projectCode}
            projectName={wizardData.projectInfo.projectName}
            onChange={updateGoogleDrive}
            errors={currentStepErrors}
          />
        )}

        {currentStep === 7 && (
          <Step7Review
            data={wizardData}
            validation={validation}
            isProvisioning={isProvisioning}
            provisioningStepIndex={provisioningStepIndex}
            provisionResult={provisionResult}
            onJumpToStep={jumpToStep}
            onProvision={handleProvision}
            onReset={handleReset}
          />
        )}

        {/* Global Footer Buttons for Steps 1 through 6 */}
        {currentStep < 7 && (
          <div className="mt-8 pt-5 border-t border-stone-200 flex items-center justify-between gap-4">
            <button
              type="button"
              id="btn-wizard-prev"
              disabled={currentStep === 1}
              onClick={goToPrevStep}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                currentStep === 1
                  ? 'text-stone-300 bg-stone-50 border border-stone-200 cursor-not-allowed'
                  : 'text-stone-700 bg-stone-100 hover:bg-stone-200 border border-stone-300'
              }`}
            >
              <ArrowRight className="w-4 h-4" />
              <span>السابق</span>
            </button>

            <div className="flex items-center gap-2 text-xs text-stone-500 font-mono">
              الخطوة {currentStep} من 7
            </div>

            <button
              type="button"
              id="btn-wizard-next"
              onClick={goToNextStep}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 shadow-xs transition-colors"
            >
              <span>التالي: {stepsMeta[currentStep]?.title || 'المراجعة'}</span>
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
