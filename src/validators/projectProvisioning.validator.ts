import {
  ProjectSetupWizardData,
  WizardPricingRuleItem,
  PricingOverlapConflict,
  WizardFullValidation,
  StepValidationResult,
} from '../types/wizard';

export class ProjectProvisioningValidator {
  /**
   * Evaluates if two date ranges [from1, to1] and [from2, to2] overlap.
   * Empty 'to' represents an indefinite/open future date (infinity).
   */
  static dateRangesOverlap(from1: string, to1: string, from2: string, to2: string): boolean {
    const start1 = from1 || '1970-01-01';
    const end1 = to1 && to1.trim() !== '' ? to1 : '9999-12-31';

    const start2 = from2 || '1970-01-01';
    const end2 = to2 && to2.trim() !== '' ? to2 : '9999-12-31';

    return start1 <= end2 && start2 <= end1;
  }

  /**
   * Detects all overlapping pricing rules for the same:
   * project + carrier + pricingType + material + date range
   */
  static detectPricingOverlaps(
    rules: WizardPricingRuleItem[],
    carrierNameMap: Record<string, string> = {},
    materialNameMap: Record<string, string> = {}
  ): PricingOverlapConflict[] {
    const conflicts: PricingOverlapConflict[] = [];

    for (let i = 0; i < rules.length; i++) {
      const r1 = rules[i];
      for (let j = i + 1; j < rules.length; j++) {
        const r2 = rules[j];

        // 1. Same carrier or one applies to ALL
        const sameCarrier =
          r1.carrierId === r2.carrierId ||
          r1.carrierId === 'ALL' ||
          r2.carrierId === 'ALL';

        if (!sameCarrier) continue;

        // 2. Same pricing type (PER_TRIP vs PER_TON)
        if (r1.pricingType !== r2.pricingType) continue;

        // 3. Same material or wildcard ALL_MATERIALS
        const mat1 = r1.materialId || 'ALL_MATERIALS';
        const mat2 = r2.materialId || 'ALL_MATERIALS';
        const sameMaterial =
          mat1 === mat2 || mat1 === 'ALL_MATERIALS' || mat2 === 'ALL_MATERIALS';

        if (!sameMaterial) continue;

        // 4. Overlapping date range
        const overlaps = this.dateRangesOverlap(
          r1.effectiveFrom,
          r1.effectiveTo,
          r2.effectiveFrom,
          r2.effectiveTo
        );

        if (overlaps) {
          const carrierDisplay =
            r1.carrierId === 'ALL'
              ? 'جميع الناقلين'
              : carrierNameMap[r1.carrierId] || r1.carrierId;

          const materialDisplay =
            mat1 === 'ALL_MATERIALS' && mat2 === 'ALL_MATERIALS'
              ? 'كافة المواد'
              : materialNameMap[mat1] || materialNameMap[mat2] || 'مادة محددة';

          const pricingTypeLabel =
            r1.pricingType === 'PER_TRIP' ? 'بالرد (PER_TRIP)' : 'بالطن (PER_TON)';

          const period1Str = `${r1.effectiveFrom || 'البداية'} إلى ${r1.effectiveTo || 'مفتوح'}`;
          const period2Str = `${r2.effectiveFrom || 'البداية'} إلى ${r2.effectiveTo || 'مفتوح'}`;

          conflicts.push({
            rule1Id: r1.id || r1.pricingRuleId,
            rule2Id: r2.id || r2.pricingRuleId,
            carrierId: r1.carrierId,
            carrierName: carrierDisplay,
            pricingType: r1.pricingType,
            materialId: mat1,
            materialName: materialDisplay,
            period1: { from: r1.effectiveFrom, to: r1.effectiveTo },
            period2: { from: r2.effectiveFrom, to: r2.effectiveTo },
            messageAr: `تضارب تسعير: الناقل (${carrierDisplay}) لديه قاعدتا تسعير متطابقتان بنموذج (${pricingTypeLabel}) لمادة (${materialDisplay}) في فترتين زمنيتين متداخلتين: [${period1Str}] و [${period2Str}].`,
            messageEn: `Pricing conflict: Carrier (${carrierDisplay}) has overlapping pricing rules for (${pricingTypeLabel}) on material (${materialDisplay}) across periods [${period1Str}] and [${period2Str}].`,
          });
        }
      }
    }

    return conflicts;
  }

  /**
   * Validates all steps of the wizard and compiles a unified report.
   */
  static validateAll(data: ProjectSetupWizardData): WizardFullValidation {
    const stepResults: StepValidationResult[] = [];

    // --- STEP 1: Project Information ---
    const s1Errors: string[] = [];
    const info = data.projectInfo;

    if (!info.projectCode || !info.projectCode.trim()) {
      s1Errors.push('رمز المشروع (projectCode) مطلوب');
    } else if (!/^[A-Za-z0-9_-]+$/.test(info.projectCode.trim())) {
      s1Errors.push('رمز المشروع يجب أن يحتوي على أحرف وأرقام وشرطات فقط بدون مسافات');
    }

    if (!info.projectName || info.projectName.trim().length < 3) {
      s1Errors.push('اسم المشروع (projectName) مطلوب ويجب ألا يقل عن 3 أحرف');
    }

    if (!info.status) {
      s1Errors.push('حالة المشروع مطلوبة');
    }

    if (!info.startDate) {
      s1Errors.push('تاريخ بدء المشروع (startDate) مطلوب');
    }

    if (info.startDate && info.endDate && info.endDate.trim() !== '') {
      if (info.endDate < info.startDate) {
        s1Errors.push('تاريخ انتهاء المشروع لا يمكن أن يسبق تاريخ البدء');
      }
    }

    if (info.defaultSettings?.zatcaTaxNumber && info.defaultSettings.zatcaTaxNumber.trim() !== '') {
      if (!/^\d{15}$/.test(info.defaultSettings.zatcaTaxNumber.trim())) {
        s1Errors.push('الرقم الضريبي لـ ZATCA يجب أن يتألف من 15 رقمًا');
      }
    }

    if (info.defaultSettings?.vatRatePercent !== undefined) {
      if (info.defaultSettings.vatRatePercent < 0 || info.defaultSettings.vatRatePercent > 100) {
        s1Errors.push('نسبة ضريبة القيمة المضافة يجب أن تكون بين 0% و 100%');
      }
    }

    stepResults.push({
      step: 1,
      stepKey: 'info',
      titleAr: 'بيانات المشروع الأساسية',
      isValid: s1Errors.length === 0,
      errors: s1Errors,
    });

    // --- STEP 2: Materials ---
    const s2Errors: string[] = [];
    const materials = data.materials || [];

    if (materials.length === 0) {
      s2Errors.push('يجب إضافة مادة واحدة على الأقل للمشروع');
    } else {
      const activeCount = materials.filter((m) => m.status === 'ACTIVE').length;
      if (activeCount === 0) {
        s2Errors.push('يجب أن تكون هناك مادة واحدة مفعلة (ACTIVE) على الأقل');
      }

      // Check unique material codes
      const codeSet = new Set<string>();
      for (const m of materials) {
        if (!m.materialName || m.materialName.trim().length < 2) {
          s2Errors.push(`اسم المادة (${m.materialCode || 'بدون رمز'}) غير صالح`);
        }
        if (!m.materialCode || m.materialCode.trim().length < 2) {
          s2Errors.push(`رمز المادة (${m.materialName || 'بدون اسم'}) مطلوب`);
        } else {
          const upperCode = m.materialCode.trim().toUpperCase();
          if (codeSet.has(upperCode)) {
            s2Errors.push(`رمز المادة (${upperCode}) مكرر في المشروع، يجب أن يكون فريداً`);
          }
          codeSet.add(upperCode);
        }
      }
    }

    stepResults.push({
      step: 2,
      stepKey: 'materials',
      titleAr: 'إدارة المواد ونطاق التوريد',
      isValid: s2Errors.length === 0,
      errors: s2Errors,
    });

    // --- STEP 3: Carriers ---
    const s3Errors: string[] = [];
    const carriers = data.carriers || [];

    if (carriers.length === 0) {
      s3Errors.push('يجب إضافة ناقل واحد على الأقل للمشروع');
    } else {
      const activeCount = carriers.filter((c) => c.status === 'ACTIVE').length;
      if (activeCount === 0) {
        s3Errors.push('يجب أن يكون هناك ناقل واحد مفعل (ACTIVE) على الأقل');
      }

      const carrierIdSet = new Set<string>();
      for (const c of carriers) {
        if (!c.carrierId || c.carrierId.trim().length < 2) {
          s3Errors.push(`معرف الناقل (${c.carrierName || 'بدون اسم'}) مطلوب`);
        } else {
          const upperId = c.carrierId.trim().toUpperCase();
          if (carrierIdSet.has(upperId)) {
            s3Errors.push(`معرف الناقل (${upperId}) مكرر، يجب أن يكون فريداً`);
          }
          carrierIdSet.add(upperId);
        }

        if (!c.carrierName || c.carrierName.trim().length < 3) {
          s3Errors.push(`اسم شركة الناقل (${c.carrierId}) يجب ألا يقل عن 3 أحرف`);
        }

        if (c.commercialRegistrationNo && c.commercialRegistrationNo.trim() !== '') {
          if (!/^\d{10}$/.test(c.commercialRegistrationNo.trim())) {
            s3Errors.push(`السجل التجاري للناقل (${c.carrierName}) يجب أن يتكون من 10 أرقام`);
          }
        }
      }
    }

    stepResults.push({
      step: 3,
      stepKey: 'carriers',
      titleAr: 'شركات النقل والناقلين المعتمدين',
      isValid: s3Errors.length === 0,
      errors: s3Errors,
    });

    // --- STEP 4: Pricing Rules & Overlap Check ---
    const s4Errors: string[] = [];
    const pricingRules = data.pricingRules || [];

    // Map carrier names and material names for clear error reporting
    const carrierNameMap: Record<string, string> = {};
    carriers.forEach((c) => {
      carrierNameMap[c.carrierId] = c.carrierName;
    });

    const materialNameMap: Record<string, string> = {};
    materials.forEach((m) => {
      materialNameMap[m.materialId] = m.materialName;
    });

    if (pricingRules.length === 0) {
      s4Errors.push('يجب إضافة قاعدة تسعير واحدة على الأقل في المشروع');
    } else {
      for (let idx = 0; idx < pricingRules.length; idx++) {
        const pr = pricingRules[idx];
        const ruleLabel = `القاعدة #${idx + 1}`;

        if (!pr.carrierId) {
          s4Errors.push(`${ruleLabel}: يجب تحديد الناقل`);
        }

        if (!pr.pricingType || !['PER_TRIP', 'PER_TON'].includes(pr.pricingType)) {
          s4Errors.push(`${ruleLabel}: نوع التسعير يجب أن يكون بالرد (PER_TRIP) أو بالطن (PER_TON)`);
        }

        if (typeof pr.rate !== 'number' || isNaN(pr.rate) || pr.rate <= 0) {
          s4Errors.push(`${ruleLabel}: سعر الخدمة يجب أن يكون قيمة رقمية أكبر من صفر`);
        }

        if (!pr.effectiveFrom) {
          s4Errors.push(`${ruleLabel}: تاريخ بدء سريان التسعير (effectiveFrom) مطلوب`);
        }

        if (pr.effectiveFrom && pr.effectiveTo && pr.effectiveTo.trim() !== '') {
          if (pr.effectiveTo < pr.effectiveFrom) {
            s4Errors.push(`${ruleLabel}: تاريخ نهاية السريان لا يمكن أن يسبق تاريخ البدء`);
          }
        }
      }

      // RUN STRICT OVERLAP DETECTION
      const conflicts = this.detectPricingOverlaps(pricingRules, carrierNameMap, materialNameMap);
      for (const conflict of conflicts) {
        s4Errors.push(conflict.messageAr);
      }
    }

    const pricingConflicts = this.detectPricingOverlaps(pricingRules, carrierNameMap, materialNameMap);

    stepResults.push({
      step: 4,
      stepKey: 'pricing',
      titleAr: 'قواعد التسعير والتعرفة التعاقدية',
      isValid: s4Errors.length === 0,
      errors: s4Errors,
    });

    // --- STEP 5: Project Access ---
    const s5Errors: string[] = [];
    const users = data.userAccess || [];
    const assignedUsers = users.filter((u) => u.isAssigned);

    if (assignedUsers.length === 0) {
      s5Errors.push('يجب تعيين مستخدم مصرح له واحد على الأقل للمشروع');
    } else {
      const hasAdmin = assignedUsers.some((u) => u.role === 'PROJECT_ADMIN');
      if (!hasAdmin) {
        s5Errors.push('يجب تعيين مستخدم واحد على الأقل بدور مدير مشروع (PROJECT_ADMIN)');
      }
    }

    stepResults.push({
      step: 5,
      stepKey: 'access',
      titleAr: 'صلاحيات الوصول والمستخدمين',
      isValid: s5Errors.length === 0,
      errors: s5Errors,
    });

    // --- STEP 6: Google Drive/Sheets ---
    const s6Errors: string[] = [];
    const google = data.googleDrive;

    if (google.enabled) {
      if (!google.rootFolderName || !google.rootFolderName.trim()) {
        s6Errors.push('اسم مجلد Google Drive مطلوب عند تفعيل التكامل');
      }
      if (google.provisionSpreadsheet && (!google.spreadsheetTitle || !google.spreadsheetTitle.trim())) {
        s6Errors.push('عنوان جدول Google Sheets مطلوب عند تفعيل الجداول');
      }
    }

    stepResults.push({
      step: 6,
      stepKey: 'google',
      titleAr: 'تكامل Google Drive وجداول Sheets',
      isValid: s6Errors.length === 0,
      errors: s6Errors,
    });

    // Calculate overall status
    const totalErrors = stepResults.reduce((acc, step) => acc + step.errors.length, 0);

    return {
      isValid: totalErrors === 0,
      stepResults,
      pricingConflicts,
      totalErrors,
    };
  }
}
