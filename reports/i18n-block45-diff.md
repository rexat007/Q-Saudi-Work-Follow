# BLOCK 45 — Controlled i18n Migration: Transformation Diff Report

**Generated At:** 2026-09-12T10:09:47.008Z
**Execution Mode:** SAFE Batch Applied
**Files Modified:** 1
**Total Safe Candidates Applied:** 46

---

## File: `src/App.tsx`

- **Pre-Migration Hash:** `eb5cca2f5e834157`
- **Post-Migration Hash:** `570cd9b1fcdb3e9b`
- **Transformations Applied:** 46
- **Keys Inserted (46):**
  - `navigation.labels.txt_276201`
  - `navigation.labels.txt_3a0110`
  - `navigation.labels.txt_72b405`
  - `navigation.labels.txt_8cf69f`
  - `navigation.labels.txt_c37ba7`
  - `navigation.labels.txt_17c5e1`
  - `navigation.labels.txt_4c8195`
  - `navigation.labels.view`
  - `navigation.labels.txt_791f1b`
  - `navigation.labels.txt_6dd618`
  - `navigation.labels.txt_5dc573`
  - `navigation.labels.txt_4ada99`
  - `navigation.labels.txt_41e146`
  - `navigation.labels.txt_777008`
  - `navigation.labels.txt_46b695`
  - `navigation.labels.txt_23bdd6`
  - `navigation.labels.txt_4df8c5`
  - `navigation.labels.txt_10324c`
  - `navigation.status.txt_4c0b8d`
  - `navigation.labels.txt_13cd84`
  - `navigation.labels.txt_4452c7`
  - `navigation.labels.txt_198d0f`
  - `navigation.labels.txt_1b8b59`
  - `navigation.labels.txt_11ed5e`
  - `navigation.labels.projects_2`
  - `navigation.labels.pricing`
  - `navigation.labels.txt_50c969`
  - `navigation.labels.txt_70f585`
  - `navigation.labels.txt_2439c4`
  - `navigation.labels.txt_1a75fa`
  - `navigation.labels.txt_3711ef`
  - `navigation.labels.import`
  - `navigation.labels.txt_7265aa`
  - `navigation.labels.txt_45b282`
  - `navigation.labels.trips`
  - `navigation.labels.txt_185076`
  - `navigation.labels.reports`
  - `navigation.labels.txt_b4b841`
  - `navigation.labels.txt_61c13d`
  - `navigation.labels.txt_6c2131`
  - `navigation.labels.txt_152452`
  - `navigation.labels.txt_601c17`
  - `navigation.labels.txt_230d9e`
  - `navigation.labels.txt_9a0a23`
  - `navigation.labels.txt_3fe43d`
  - `navigation.labels.projects`

### Unified Diff / Patch

```diff
@@ -59,1 +59,1 @@ src/App.tsx
-   const { direction } = useI18n();
+   const { direction, t } = useI18n();
@@ -146,1 +146,1 @@ src/App.tsx
-                 المعمارية الهندسية الصارمة لمنظومة النقل الثقيل والمشاريع متعددة الأطراف (Multi-Project)
+                 {t("navigation.labels.projects")}</p>
@@ -147,1 +147,1 @@ src/App.tsx
-               </p>
+             </div>
@@ -148,1 +148,1 @@ src/App.tsx
-             </div>
+           </div>
@@ -149,1 +149,1 @@ src/App.tsx
-           </div>
+ 
@@ -150,1 +150,1 @@ src/App.tsx
- 
+           {/* Navigation Mode Switcher & Auth Button */}
@@ -151,1 +151,1 @@ src/App.tsx
-           {/* Navigation Mode Switcher & Auth Button */}
+           <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
@@ -152,1 +152,1 @@ src/App.tsx
-           <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
+             <nav className="flex items-center bg-stone-100 p-1 rounded-xl border border-stone-200/80 gap-1 overflow-x-auto">
@@ -153,1 +153,1 @@ src/App.tsx
-             <nav className="flex items-center bg-stone-100 p-1 rounded-xl border border-stone-200/80 gap-1 overflow-x-auto">
+               <button
@@ -154,1 +154,1 @@ src/App.tsx
-               <button
+                 id="tab-security-audit"
@@ -155,1 +155,1 @@ src/App.tsx
-                 id="tab-security-audit"
+                 onClick={() => setActiveTab('SECURITY_AUDIT')}
@@ -156,1 +156,1 @@ src/App.tsx
-                 onClick={() => setActiveTab('SECURITY_AUDIT')}
+                 className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
@@ -157,1 +157,1 @@ src/App.tsx
-                 className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
+                   activeTab === 'SECURITY_AUDIT' 
@@ -158,1 +158,1 @@ src/App.tsx
-                   activeTab === 'SECURITY_AUDIT' 
+                     ? 'bg-blue-600 text-white shadow-xs' 
@@ -159,1 +159,1 @@ src/App.tsx
-                     ? 'bg-blue-600 text-white shadow-xs' 
+                     : 'text-stone-700 hover:text-stone-900 hover:bg-stone-200/50'
@@ -160,1 +160,1 @@ src/App.tsx
-                     : 'text-stone-700 hover:text-stone-900 hover:bg-stone-200/50'
+                 }`}
@@ -161,1 +161,1 @@ src/App.tsx
-                 }`}
+               >
@@ -162,1 +162,1 @@ src/App.tsx
-               >
+                 <ShieldCheck className="w-3.5 h-3.5 text-blue-300" />
@@ -163,1 +163,1 @@ src/App.tsx
-                 <ShieldCheck className="w-3.5 h-3.5 text-blue-300" />
+                 <span>{t("navigation.labels.txt_3fe43d")}</span>
@@ -164,1 +164,1 @@ src/App.tsx
-                 <span>التدقيق الأمني والحوكمة (Security Audit)</span>
+                 <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
@@ -165,1 +165,1 @@ src/App.tsx
-                 <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
+                   activeTab === 'SECURITY_AUDIT' ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-900'
@@ -166,1 +166,1 @@ src/App.tsx
-                   activeTab === 'SECURITY_AUDIT' ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-900'
+                 }`}>
@@ -167,1 +167,1 @@ src/App.tsx
-                 }`}>
+                   {t("navigation.labels.txt_9a0a23")}</span>
@@ -168,1 +168,1 @@ src/App.tsx
-                   16 نطاقاً
+               </button>
@@ -169,1 +169,1 @@ src/App.tsx
-                 </span>
+ 
@@ -170,1 +170,1 @@ src/App.tsx
-               </button>
+               <button
@@ -171,1 +171,1 @@ src/App.tsx
- 
+                 id="tab-legacy-migration"
@@ -172,1 +172,1 @@ src/App.tsx
-               <button
+                 onClick={() => setActiveTab('LEGACY_MIGRATION')}
@@ -173,1 +173,1 @@ src/App.tsx
-                 id="tab-legacy-migration"
+                 className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
@@ -174,1 +174,1 @@ src/App.tsx
-                 onClick={() => setActiveTab('LEGACY_MIGRATION')}
+                   activeTab === 'LEGACY_MIGRATION' 
@@ -175,1 +175,1 @@ src/App.tsx
-                 className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
+                     ? 'bg-amber-600 text-white shadow-xs' 
@@ -176,1 +176,1 @@ src/App.tsx
-                   activeTab === 'LEGACY_MIGRATION' 
+                     : 'text-stone-700 hover:text-stone-900 hover:bg-stone-200/50'
@@ -177,1 +177,1 @@ src/App.tsx
-                     ? 'bg-amber-600 text-white shadow-xs' 
+                 }`}
@@ -178,1 +178,1 @@ src/App.tsx
-                     : 'text-stone-700 hover:text-stone-900 hover:bg-stone-200/50'
+               >
@@ -179,1 +179,1 @@ src/App.tsx
-                 }`}
+                 <FileSpreadsheet className="w-3.5 h-3.5" />
@@ -180,1 +180,1 @@ src/App.tsx
-               >
+                 <span>{t("navigation.labels.txt_230d9e")}</span>
@@ -181,1 +181,1 @@ src/App.tsx
-                 <FileSpreadsheet className="w-3.5 h-3.5" />
+                 <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
@@ -182,1 +182,1 @@ src/App.tsx
-                 <span>ترحيل الشيت القديم (Legacy Migration)</span>
+                   activeTab === 'LEGACY_MIGRATION' ? 'bg-white/20 text-white' : 'bg-emerald-200 text-emerald-950'
@@ -183,1 +183,1 @@ src/App.tsx
-                 <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
+                 }`}>
@@ -184,1 +184,1 @@ src/App.tsx
-                   activeTab === 'LEGACY_MIGRATION' ? 'bg-white/20 text-white' : 'bg-emerald-200 text-emerald-950'
+                   {t("navigation.labels.txt_601c17")}</span>
@@ -185,1 +185,1 @@ src/App.tsx
-                 }`}>
+               </button>
@@ -186,1 +186,1 @@ src/App.tsx
-                   20 عموداً
+ 
@@ -187,1 +187,1 @@ src/App.tsx
-                 </span>
+               <button
@@ -188,1 +188,1 @@ src/App.tsx
-               </button>
+                 id="tab-admin-console"
@@ -189,1 +189,1 @@ src/App.tsx
- 
+                 onClick={() => setActiveTab('ADMIN_CONSOLE')}
@@ -190,1 +190,1 @@ src/App.tsx
-               <button
+                 className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
@@ -191,1 +191,1 @@ src/App.tsx
-                 id="tab-admin-console"
+                   activeTab === 'ADMIN_CONSOLE' 
@@ -192,1 +192,1 @@ src/App.tsx
-                 onClick={() => setActiveTab('ADMIN_CONSOLE')}
+                     ? 'bg-amber-600 text-white shadow-xs' 
@@ -193,1 +193,1 @@ src/App.tsx
-                 className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
+                     : 'text-stone-700 hover:text-stone-900 hover:bg-stone-200/50'
@@ -194,1 +194,1 @@ src/App.tsx
-                   activeTab === 'ADMIN_CONSOLE' 
+                 }`}
@@ -195,1 +195,1 @@ src/App.tsx
-                     ? 'bg-amber-600 text-white shadow-xs' 
+               >
@@ -196,1 +196,1 @@ src/App.tsx
-                     : 'text-stone-700 hover:text-stone-900 hover:bg-stone-200/50'
+                 <ShieldCheck className="w-3.5 h-3.5" />
@@ -197,1 +197,1 @@ src/App.tsx
-                 }`}
+                 <span>{t("navigation.labels.txt_152452")}</span>
@@ -198,1 +198,1 @@ src/App.tsx
-               >
+                 <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
@@ -199,1 +199,1 @@ src/App.tsx
-                 <ShieldCheck className="w-3.5 h-3.5" />
+                   activeTab === 'ADMIN_CONSOLE' ? 'bg-white/20 text-white' : 'bg-amber-200 text-amber-900'
@@ -200,1 +200,1 @@ src/App.tsx
-                 <span>لوحة الإدارة (Admin Console)</span>
+                 }`}>
@@ -201,1 +201,1 @@ src/App.tsx
-                 <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
+                   {t("navigation.labels.txt_6c2131")}</span>
@@ -202,1 +202,1 @@ src/App.tsx
-                   activeTab === 'ADMIN_CONSOLE' ? 'bg-white/20 text-white' : 'bg-amber-200 text-amber-900'
+               </button>
@@ -203,1 +203,1 @@ src/App.tsx
-                 }`}>
+ 
@@ -204,1 +204,1 @@ src/App.tsx
-                   11 قسماً
+               <button
@@ -205,1 +205,1 @@ src/App.tsx
-                 </span>
+                 id="tab-operations-dashboard"
@@ -206,1 +206,1 @@ src/App.tsx
-               </button>
+                 onClick={() => setActiveTab('OPERATIONS_DASHBOARD')}
@@ -207,1 +207,1 @@ src/App.tsx
- 
+                 className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
@@ -208,1 +208,1 @@ src/App.tsx
-               <button
+                   activeTab === 'OPERATIONS_DASHBOARD' 
@@ -209,1 +209,1 @@ src/App.tsx
-                 id="tab-operations-dashboard"
+                     ? 'bg-stone-900 text-white shadow-xs' 
@@ -210,1 +210,1 @@ src/App.tsx
-                 onClick={() => setActiveTab('OPERATIONS_DASHBOARD')}
+                     : 'text-stone-700 hover:text-stone-900 hover:bg-stone-200/50'
@@ -211,1 +211,1 @@ src/App.tsx
-                 className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
+                 }`}
@@ -212,1 +212,1 @@ src/App.tsx
-                   activeTab === 'OPERATIONS_DASHBOARD' 
+               >
@@ -213,1 +213,1 @@ src/App.tsx
-                     ? 'bg-stone-900 text-white shadow-xs' 
+                 <LayoutDashboard className="w-3.5 h-3.5 text-amber-400" />
@@ -214,1 +214,1 @@ src/App.tsx
-                     : 'text-stone-700 hover:text-stone-900 hover:bg-stone-200/50'
+                 <span>{t("navigation.labels.txt_61c13d")}</span>
@@ -215,1 +215,1 @@ src/App.tsx
-                 }`}
+                 <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
@@ -216,1 +216,1 @@ src/App.tsx
-               >
+                   activeTab === 'OPERATIONS_DASHBOARD' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800'
@@ -217,1 +217,1 @@ src/App.tsx
-                 <LayoutDashboard className="w-3.5 h-3.5 text-amber-400" />
+                 }`}>
@@ -218,1 +218,1 @@ src/App.tsx
-                 <span>لوحة العمليات (Dashboard)</span>
+                   {t("navigation.labels.txt_b4b841")}</span>
@@ -219,1 +219,1 @@ src/App.tsx
-                 <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
+               </button>
@@ -220,1 +220,1 @@ src/App.tsx
-                   activeTab === 'OPERATIONS_DASHBOARD' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800'
+ 
@@ -221,1 +221,1 @@ src/App.tsx
-                 }`}>
+               <button
@@ -222,1 +222,1 @@ src/App.tsx
-                   مباشر ومحمي
+                 id="tab-reports-engine"
@@ -223,1 +223,1 @@ src/App.tsx
-                 </span>
+                 onClick={() => setActiveTab('REPORTS_ENGINE')}
@@ -224,1 +224,1 @@ src/App.tsx
-               </button>
+                 className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
@@ -225,1 +225,1 @@ src/App.tsx
- 
+                   activeTab === 'REPORTS_ENGINE' 
@@ -226,1 +226,1 @@ src/App.tsx
-               <button
+                     ? 'bg-amber-600 text-white shadow-xs' 
@@ -227,1 +227,1 @@ src/App.tsx
-                 id="tab-reports-engine"
+                     : 'text-stone-700 hover:text-stone-900 hover:bg-stone-200/50'
@@ -228,1 +228,1 @@ src/App.tsx
-                 onClick={() => setActiveTab('REPORTS_ENGINE')}
+                 }`}
@@ -229,1 +229,1 @@ src/App.tsx
-                 className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
+               >
@@ -230,1 +230,1 @@ src/App.tsx
-                   activeTab === 'REPORTS_ENGINE' 
+                 <FileText className="w-3.5 h-3.5" />
@@ -231,1 +231,1 @@ src/App.tsx
-                     ? 'bg-amber-600 text-white shadow-xs' 
+                 <span>{t("navigation.labels.reports")}</span>
@@ -232,1 +232,1 @@ src/App.tsx
-                     : 'text-stone-700 hover:text-stone-900 hover:bg-stone-200/50'
+                 <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
@@ -233,1 +233,1 @@ src/App.tsx
-                 }`}
+                   activeTab === 'REPORTS_ENGINE' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800'
@@ -234,1 +234,1 @@ src/App.tsx
-               >
+                 }`}>
@@ -235,1 +235,1 @@ src/App.tsx
-                 <FileText className="w-3.5 h-3.5" />
+                   {t("navigation.labels.txt_185076")}</span>
@@ -236,1 +236,1 @@ src/App.tsx
-                 <span>محرك التقارير (Reports Engine)</span>
+               </button>
@@ -237,1 +237,1 @@ src/App.tsx
-                 <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
+ 
@@ -238,1 +238,1 @@ src/App.tsx
-                   activeTab === 'REPORTS_ENGINE' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800'
+               <button
@@ -239,1 +239,1 @@ src/App.tsx
-                 }`}>
+                 id="tab-trip-engine"
@@ -240,1 +240,1 @@ src/App.tsx
-                   15 تقريراً و PDF
+                 onClick={() => setActiveTab('TRIP_ENGINE')}
@@ -241,1 +241,1 @@ src/App.tsx
-                 </span>
+                 className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
@@ -242,1 +242,1 @@ src/App.tsx
-               </button>
+                   activeTab === 'TRIP_ENGINE' 
@@ -243,1 +243,1 @@ src/App.tsx
- 
+                     ? 'bg-amber-600 text-white shadow-xs' 
@@ -244,1 +244,1 @@ src/App.tsx
-               <button
+                     : 'text-stone-700 hover:text-stone-900 hover:bg-stone-200/50'
@@ -245,1 +245,1 @@ src/App.tsx
-                 id="tab-trip-engine"
+                 }`}
@@ -246,1 +246,1 @@ src/App.tsx
-                 onClick={() => setActiveTab('TRIP_ENGINE')}
+               >
@@ -247,1 +247,1 @@ src/App.tsx
-                 className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
+                 <Truck className="w-3.5 h-3.5" />
@@ -248,1 +248,1 @@ src/App.tsx
-                   activeTab === 'TRIP_ENGINE' 
+                 <span>{t("navigation.labels.trips")}</span>
@@ -249,1 +249,1 @@ src/App.tsx
-                     ? 'bg-amber-600 text-white shadow-xs' 
+                 <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
@@ -250,1 +250,1 @@ src/App.tsx
-                     : 'text-stone-700 hover:text-stone-900 hover:bg-stone-200/50'
+                   activeTab === 'TRIP_ENGINE' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800'
@@ -251,1 +251,1 @@ src/App.tsx
-                 }`}
+                 }`}>
@@ -252,1 +252,1 @@ src/App.tsx
-               >
+                   {t("navigation.labels.txt_45b282")}</span>
@@ -253,1 +253,1 @@ src/App.tsx
-                 <Truck className="w-3.5 h-3.5" />
+               </button>
@@ -254,1 +254,1 @@ src/App.tsx
-                 <span>محرك الرحلات (Trip Engine)</span>
+ 
@@ -255,1 +255,1 @@ src/App.tsx
-                 <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
+               <button
@@ -256,1 +256,1 @@ src/App.tsx
-                   activeTab === 'TRIP_ENGINE' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800'
+                 id="tab-workspace-integration"
@@ -257,1 +257,1 @@ src/App.tsx
-                 }`}>
+                 onClick={() => setActiveTab('WORKSPACE_INTEGRATION')}
@@ -258,1 +258,1 @@ src/App.tsx
-                   6 قواعد
+                 className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
@@ -259,1 +259,1 @@ src/App.tsx
-                 </span>
+                   activeTab === 'WORKSPACE_INTEGRATION' 
@@ -260,1 +260,1 @@ src/App.tsx
-               </button>
+                     ? 'bg-emerald-700 text-white shadow-xs' 
@@ -261,1 +261,1 @@ src/App.tsx
- 
+                     : 'text-stone-700 hover:text-stone-900 hover:bg-stone-200/50'
@@ -262,1 +262,1 @@ src/App.tsx
-               <button
+                 }`}
@@ -263,1 +263,1 @@ src/App.tsx
-                 id="tab-workspace-integration"
+               >
@@ -264,1 +264,1 @@ src/App.tsx
-                 onClick={() => setActiveTab('WORKSPACE_INTEGRATION')}
+                 <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
@@ -265,1 +265,1 @@ src/App.tsx
-                 className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
+                 <span>تكامل Google Workspace</span>
@@ -266,1 +266,1 @@ src/App.tsx
-                   activeTab === 'WORKSPACE_INTEGRATION' 
+                 <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
@@ -267,1 +267,1 @@ src/App.tsx
-                     ? 'bg-emerald-700 text-white shadow-xs' 
+                   activeTab === 'WORKSPACE_INTEGRATION' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800'
@@ -268,1 +268,1 @@ src/App.tsx
-                     : 'text-stone-700 hover:text-stone-900 hover:bg-stone-200/50'
+                 }`}>
@@ -269,1 +269,1 @@ src/App.tsx
-                 }`}
+                   Sheets & Drive
@@ -270,1 +270,1 @@ src/App.tsx
-               >
+                 </span>
@@ -271,1 +271,1 @@ src/App.tsx
-                 <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
+               </button>
@@ -272,1 +272,1 @@ src/App.tsx
-                 <span>تكامل Google Workspace</span>
+ 
@@ -273,1 +273,1 @@ src/App.tsx
-                 <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
+               <button
@@ -274,1 +274,1 @@ src/App.tsx
-                   activeTab === 'WORKSPACE_INTEGRATION' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800'
+                 id="tab-exception-engine"
@@ -275,1 +275,1 @@ src/App.tsx
-                 }`}>
+                 onClick={() => setActiveTab('EXCEPTION_ENGINE')}
@@ -276,1 +276,1 @@ src/App.tsx
-                   Sheets & Drive
+                 className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
@@ -277,1 +277,1 @@ src/App.tsx
-                 </span>
+                   activeTab === 'EXCEPTION_ENGINE' 
@@ -278,1 +278,1 @@ src/App.tsx
-               </button>
+                     ? 'bg-rose-700 text-white shadow-xs' 
@@ -279,1 +279,1 @@ src/App.tsx
- 
+                     : 'text-stone-700 hover:text-stone-900 hover:bg-stone-200/50'
@@ -280,1 +280,1 @@ src/App.tsx
-               <button
+                 }`}
@@ -281,1 +281,1 @@ src/App.tsx
-                 id="tab-exception-engine"
+               >
@@ -282,1 +282,1 @@ src/App.tsx
-                 onClick={() => setActiveTab('EXCEPTION_ENGINE')}
+                 <AlertOctagon className="w-3.5 h-3.5" />
@@ -283,1 +283,1 @@ src/App.tsx
-                 className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
+                 <span>محرك الاستثناءات (Exception Engine)</span>
@@ -284,1 +284,1 @@ src/App.tsx
-                   activeTab === 'EXCEPTION_ENGINE' 
+                 <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
@@ -285,1 +285,1 @@ src/App.tsx
-                     ? 'bg-rose-700 text-white shadow-xs' 
+                   activeTab === 'EXCEPTION_ENGINE' ? 'bg-white/20 text-white' : 'bg-rose-100 text-rose-800'
@@ -286,1 +286,1 @@ src/App.tsx
-                     : 'text-stone-700 hover:text-stone-900 hover:bg-stone-200/50'
+                 }`}>
@@ -287,1 +287,1 @@ src/App.tsx
-                 }`}
+                   {t("navigation.labels.txt_7265aa")}</span>
@@ -288,1 +288,1 @@ src/App.tsx
-               >
+               </button>
@@ -289,1 +289,1 @@ src/App.tsx
-                 <AlertOctagon className="w-3.5 h-3.5" />
+ 
@@ -290,1 +290,1 @@ src/App.tsx
-                 <span>محرك الاستثناءات (Exception Engine)</span>
+               <button
@@ -291,1 +291,1 @@ src/App.tsx
-                 <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
+                 id="tab-import-center"
@@ -292,1 +292,1 @@ src/App.tsx
-                   activeTab === 'EXCEPTION_ENGINE' ? 'bg-white/20 text-white' : 'bg-rose-100 text-rose-800'
+                 onClick={() => setActiveTab('IMPORT_CENTER')}
@@ -293,1 +293,1 @@ src/App.tsx
-                 }`}>
+                 className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
@@ -294,1 +294,1 @@ src/App.tsx
-                   12 نوعاً و Audit
+                   activeTab === 'IMPORT_CENTER' 
@@ -295,1 +295,1 @@ src/App.tsx
-                 </span>
+                     ? 'bg-amber-600 text-white shadow-xs' 
@@ -296,1 +296,1 @@ src/App.tsx
-               </button>
+                     : 'text-stone-700 hover:text-stone-900 hover:bg-stone-200/50'
@@ -297,1 +297,1 @@ src/App.tsx
- 
+                 }`}
@@ -298,1 +298,1 @@ src/App.tsx
-               <button
+               >
@@ -299,1 +299,1 @@ src/App.tsx
-                 id="tab-import-center"
+                 <FileSpreadsheet className="w-3.5 h-3.5" />
@@ -300,1 +300,1 @@ src/App.tsx
-                 onClick={() => setActiveTab('IMPORT_CENTER')}
+                 <span>{t("navigation.labels.import")}</span>
@@ -301,1 +301,1 @@ src/App.tsx
-                 className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
+                 <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
@@ -302,1 +302,1 @@ src/App.tsx
-                   activeTab === 'IMPORT_CENTER' 
+                   activeTab === 'IMPORT_CENTER' ? 'bg-white/20 text-white' : 'bg-rose-100 text-rose-800'
@@ -303,1 +303,1 @@ src/App.tsx
-                     ? 'bg-amber-600 text-white shadow-xs' 
+                 }`}>
@@ -304,1 +304,1 @@ src/App.tsx
-                     : 'text-stone-700 hover:text-stone-900 hover:bg-stone-200/50'
+                   {t("navigation.labels.txt_3711ef")}</span>
@@ -305,1 +305,1 @@ src/App.tsx
-                 }`}
+               </button>
@@ -306,1 +306,1 @@ src/App.tsx
-               >
+ 
@@ -307,1 +307,1 @@ src/App.tsx
-                 <FileSpreadsheet className="w-3.5 h-3.5" />
+               <button
@@ -308,1 +308,1 @@ src/App.tsx
-                 <span>مركز الاستيراد (Import Center)</span>
+                 id="tab-data-quality"
@@ -309,1 +309,1 @@ src/App.tsx
-                 <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
+                 onClick={() => setActiveTab('DATA_QUALITY')}
@@ -310,1 +310,1 @@ src/App.tsx
-                   activeTab === 'IMPORT_CENTER' ? 'bg-white/20 text-white' : 'bg-rose-100 text-rose-800'
+                 className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
@@ -311,1 +311,1 @@ src/App.tsx
-                 }`}>
+                   activeTab === 'DATA_QUALITY' 
@@ -312,1 +312,1 @@ src/App.tsx
-                   12 مرحلة
+                     ? 'bg-amber-600 text-white shadow-xs' 
@@ -313,1 +313,1 @@ src/App.tsx
-                 </span>
+                     : 'text-stone-700 hover:text-stone-900 hover:bg-stone-200/50'
@@ -314,1 +314,1 @@ src/App.tsx
-               </button>
+                 }`}
@@ -315,1 +315,1 @@ src/App.tsx
- 
+               >
@@ -316,1 +316,1 @@ src/App.tsx
-               <button
+                 <ShieldAlert className="w-3.5 h-3.5" />
@@ -317,1 +317,1 @@ src/App.tsx
-                 id="tab-data-quality"
+                 <span>{t("navigation.labels.txt_1a75fa")}</span>
@@ -318,1 +318,1 @@ src/App.tsx
-                 onClick={() => setActiveTab('DATA_QUALITY')}
+                 <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
@@ -319,1 +319,1 @@ src/App.tsx
-                 className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
+                   activeTab === 'DATA_QUALITY' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800'
@@ -320,1 +320,1 @@ src/App.tsx
-                   activeTab === 'DATA_QUALITY' 
+                 }`}>
@@ -321,1 +321,1 @@ src/App.tsx
-                     ? 'bg-amber-600 text-white shadow-xs' 
+                   {t("navigation.labels.txt_2439c4")}</span>
@@ -322,1 +322,1 @@ src/App.tsx
-                     : 'text-stone-700 hover:text-stone-900 hover:bg-stone-200/50'
+               </button>
@@ -323,1 +323,1 @@ src/App.tsx
-                 }`}
+ 
@@ -324,1 +324,1 @@ src/App.tsx
-               >
+               <button
@@ -325,1 +325,1 @@ src/App.tsx
-                 <ShieldAlert className="w-3.5 h-3.5" />
+                 id="tab-master-data"
@@ -326,1 +326,1 @@ src/App.tsx
-                 <span>محرك جودة البيانات (Quality Engine)</span>
+                 onClick={() => setActiveTab('MASTER_DATA')}
@@ -327,1 +327,1 @@ src/App.tsx
-                 <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
+                 className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
@@ -328,1 +328,1 @@ src/App.tsx
-                   activeTab === 'DATA_QUALITY' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800'
+                   activeTab === 'MASTER_DATA' 
@@ -329,1 +329,1 @@ src/App.tsx
-                 }`}>
+                     ? 'bg-amber-600 text-white shadow-xs' 
@@ -330,1 +330,1 @@ src/App.tsx
-                   8 مراحل
+                     : 'text-stone-700 hover:text-stone-900 hover:bg-stone-200/50'
@@ -331,1 +331,1 @@ src/App.tsx
-                 </span>
+                 }`}
@@ -332,1 +332,1 @@ src/App.tsx
-               </button>
+               >
@@ -333,1 +333,1 @@ src/App.tsx
- 
+                 <Boxes className="w-3.5 h-3.5" />
@@ -334,1 +334,1 @@ src/App.tsx
-               <button
+                 <span>{t("navigation.labels.txt_70f585")}</span>
@@ -335,1 +335,1 @@ src/App.tsx
-                 id="tab-master-data"
+                 <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
@@ -336,1 +336,1 @@ src/App.tsx
-                 onClick={() => setActiveTab('MASTER_DATA')}
+                   activeTab === 'MASTER_DATA' ? 'bg-white/20 text-white' : 'bg-amber-200 text-amber-900'
@@ -337,1 +337,1 @@ src/App.tsx
-                 className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
+                 }`}>
@@ -338,1 +338,1 @@ src/App.tsx
-                   activeTab === 'MASTER_DATA' 
+                   {t("navigation.labels.txt_50c969")}</span>
@@ -339,1 +339,1 @@ src/App.tsx
-                     ? 'bg-amber-600 text-white shadow-xs' 
+               </button>
@@ -340,1 +340,1 @@ src/App.tsx
-                     : 'text-stone-700 hover:text-stone-900 hover:bg-stone-200/50'
+ 
@@ -341,1 +341,1 @@ src/App.tsx
-                 }`}
+               <button
@@ -342,1 +342,1 @@ src/App.tsx
-               >
+                 id="tab-pricing-engine"
@@ -343,1 +343,1 @@ src/App.tsx
-                 <Boxes className="w-3.5 h-3.5" />
+                 onClick={() => setActiveTab('PRICING_ENGINE')}
@@ -344,1 +344,1 @@ src/App.tsx
-                 <span>البيانات الرئيسية (Master Data)</span>
+                 className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
@@ -345,1 +345,1 @@ src/App.tsx
-                 <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
+                   activeTab === 'PRICING_ENGINE' 
@@ -346,1 +346,1 @@ src/App.tsx
-                   activeTab === 'MASTER_DATA' ? 'bg-white/20 text-white' : 'bg-amber-200 text-amber-900'
+                     ? 'bg-amber-600 text-white shadow-xs' 
@@ -347,1 +347,1 @@ src/App.tsx
-                 }`}>
+                     : 'text-stone-700 hover:text-stone-900 hover:bg-stone-200/50'
@@ -348,1 +348,1 @@ src/App.tsx
-                   4 وحدات
+                 }`}
@@ -349,1 +349,1 @@ src/App.tsx
-                 </span>
+               >
@@ -350,1 +350,1 @@ src/App.tsx
-               </button>
+                 <Calculator className="w-3.5 h-3.5" />
@@ -351,1 +351,1 @@ src/App.tsx
- 
+                 <span>{t("navigation.labels.pricing")}</span>
@@ -352,1 +352,1 @@ src/App.tsx
-               <button
+                 <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
@@ -353,1 +353,1 @@ src/App.tsx
-                 id="tab-pricing-engine"
+                   activeTab === 'PRICING_ENGINE' ? 'bg-white/20 text-white' : 'bg-emerald-200 text-emerald-900'
@@ -354,1 +354,1 @@ src/App.tsx
-                 onClick={() => setActiveTab('PRICING_ENGINE')}
+                 }`}>
@@ -355,1 +355,1 @@ src/App.tsx
-                 className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
+                   9 اختبارات
@@ -356,1 +356,1 @@ src/App.tsx
-                   activeTab === 'PRICING_ENGINE' 
+                 </span>
@@ -357,1 +357,1 @@ src/App.tsx
-                     ? 'bg-amber-600 text-white shadow-xs' 
+               </button>
@@ -358,1 +358,1 @@ src/App.tsx
-                     : 'text-stone-700 hover:text-stone-900 hover:bg-stone-200/50'
+ 
@@ -359,1 +359,1 @@ src/App.tsx
-                 }`}
+               <button
@@ -360,1 +360,1 @@ src/App.tsx
-               >
+                 id="tab-wizard"
@@ -361,1 +361,1 @@ src/App.tsx
-                 <Calculator className="w-3.5 h-3.5" />
+                 onClick={() => setActiveTab('WIZARD')}
@@ -362,1 +362,1 @@ src/App.tsx
-                 <span>محرك التسعير (Pricing Engine)</span>
+                 className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
@@ -363,1 +363,1 @@ src/App.tsx
-                 <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
+                   activeTab === 'WIZARD' 
@@ -364,1 +364,1 @@ src/App.tsx
-                   activeTab === 'PRICING_ENGINE' ? 'bg-white/20 text-white' : 'bg-emerald-200 text-emerald-900'
+                     ? 'bg-amber-600 text-white shadow-xs' 
@@ -365,1 +365,1 @@ src/App.tsx
-                 }`}>
+                     : 'text-stone-700 hover:text-stone-900 hover:bg-stone-200/50'
@@ -366,1 +366,1 @@ src/App.tsx
-                   9 اختبارات
+                 }`}
@@ -367,1 +367,1 @@ src/App.tsx
-                 </span>
+               >
@@ -368,1 +368,1 @@ src/App.tsx
-               </button>
+                 <Building2 className="w-3.5 h-3.5" />
@@ -369,1 +369,1 @@ src/App.tsx
- 
+                 <span>{t("navigation.labels.projects_2")}</span>
@@ -370,1 +370,1 @@ src/App.tsx
-               <button
+                 <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
@@ -371,1 +371,1 @@ src/App.tsx
-                 id="tab-wizard"
+                   activeTab === 'WIZARD' ? 'bg-white/20 text-white' : 'bg-amber-200 text-amber-900'
@@ -372,1 +372,1 @@ src/App.tsx
-                 onClick={() => setActiveTab('WIZARD')}
+                 }`}>
@@ -373,1 +373,1 @@ src/App.tsx
-                 className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
+                   {t("navigation.labels.txt_11ed5e")}</span>
@@ -374,1 +374,1 @@ src/App.tsx
-                   activeTab === 'WIZARD' 
+               </button>
@@ -375,1 +375,1 @@ src/App.tsx
-                     ? 'bg-amber-600 text-white shadow-xs' 
+ 
@@ -376,1 +376,1 @@ src/App.tsx
-                     : 'text-stone-700 hover:text-stone-900 hover:bg-stone-200/50'
+               <button
@@ -377,1 +377,1 @@ src/App.tsx
-                 }`}
+                 id="tab-firestore"
@@ -378,1 +378,1 @@ src/App.tsx
-               >
+                 onClick={() => setActiveTab('FIRESTORE_ARCH')}
@@ -379,1 +379,1 @@ src/App.tsx
-                 <Building2 className="w-3.5 h-3.5" />
+                 className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
@@ -380,1 +380,1 @@ src/App.tsx
-                 <span>معالج تهيئة المشاريع (Project Wizard)</span>
+                   activeTab === 'FIRESTORE_ARCH' 
@@ -381,1 +381,1 @@ src/App.tsx
-                 <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
+                     ? 'bg-white text-stone-900 shadow-xs border border-stone-200/50' 
@@ -382,1 +382,1 @@ src/App.tsx
-                   activeTab === 'WIZARD' ? 'bg-white/20 text-white' : 'bg-amber-200 text-amber-900'
+                     : 'text-stone-600 hover:text-stone-900'
@@ -383,1 +383,1 @@ src/App.tsx
-                 }`}>
+                 }`}
@@ -384,1 +384,1 @@ src/App.tsx
-                   7 خطوات
+               >
@@ -385,1 +385,1 @@ src/App.tsx
-                 </span>
+                 <Database className="w-3.5 h-3.5 text-amber-600" />
@@ -386,1 +386,1 @@ src/App.tsx
-               </button>
+                 <span>{t("navigation.labels.txt_1b8b59")}</span>
@@ -387,1 +387,1 @@ src/App.tsx
- 
+               </button>
@@ -388,1 +388,1 @@ src/App.tsx
-               <button
+ 
@@ -389,1 +389,1 @@ src/App.tsx
-                 id="tab-firestore"
+               <button
@@ -390,1 +390,1 @@ src/App.tsx
-                 onClick={() => setActiveTab('FIRESTORE_ARCH')}
+                 id="tab-relations"
@@ -391,1 +391,1 @@ src/App.tsx
-                 className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
+                 onClick={() => setActiveTab('RELATIONS')}
@@ -392,1 +392,1 @@ src/App.tsx
-                   activeTab === 'FIRESTORE_ARCH' 
+                 className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
@@ -393,1 +393,1 @@ src/App.tsx
-                     ? 'bg-white text-stone-900 shadow-xs border border-stone-200/50' 
+                   activeTab === 'RELATIONS' 
@@ -394,1 +394,1 @@ src/App.tsx
-                     : 'text-stone-600 hover:text-stone-900'
+                     ? 'bg-white text-stone-900 shadow-xs border border-stone-200/50' 
@@ -395,1 +395,1 @@ src/App.tsx
-                 }`}
+                     : 'text-stone-600 hover:text-stone-900'
@@ -396,1 +396,1 @@ src/App.tsx
-               >
+                 }`}
@@ -397,1 +397,1 @@ src/App.tsx
-                 <Database className="w-3.5 h-3.5 text-amber-600" />
+               >
@@ -398,1 +398,1 @@ src/App.tsx
-                 <span>معمارية Firestore (الـ 13 نطاقاً)</span>
+                 <Share2 className="w-3.5 h-3.5 text-indigo-600" />
@@ -399,1 +399,1 @@ src/App.tsx
-               </button>
+                 <span>{t("navigation.labels.txt_198d0f")}</span>
@@ -400,1 +400,1 @@ src/App.tsx
- 
+               </button>
@@ -401,1 +401,1 @@ src/App.tsx
-               <button
+ 
@@ -402,1 +402,1 @@ src/App.tsx
-                 id="tab-relations"
+               <button
@@ -403,1 +403,1 @@ src/App.tsx
-                 onClick={() => setActiveTab('RELATIONS')}
+                 id="tab-principles"
@@ -404,1 +404,1 @@ src/App.tsx
-                 className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
+                 onClick={() => setActiveTab('PRINCIPLES')}
@@ -405,1 +405,1 @@ src/App.tsx
-                   activeTab === 'RELATIONS' 
+                 className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
@@ -406,1 +406,1 @@ src/App.tsx
-                     ? 'bg-white text-stone-900 shadow-xs border border-stone-200/50' 
+                   activeTab === 'PRINCIPLES' 
@@ -407,1 +407,1 @@ src/App.tsx
-                     : 'text-stone-600 hover:text-stone-900'
+                     ? 'bg-white text-stone-900 shadow-xs border border-stone-200/50' 
@@ -408,1 +408,1 @@ src/App.tsx
-                 }`}
+                     : 'text-stone-600 hover:text-stone-900'
@@ -409,1 +409,1 @@ src/App.tsx
-               >
+                 }`}
@@ -410,1 +410,1 @@ src/App.tsx
-                 <Share2 className="w-3.5 h-3.5 text-indigo-600" />
+               >
@@ -411,1 +411,1 @@ src/App.tsx
-                 <span>شبكة العلاقات (11 كياناً)</span>
+                 <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
@@ -412,1 +412,1 @@ src/App.tsx
-               </button>
+                 <span>{t("navigation.labels.txt_4452c7")}</span>
@@ -413,1 +413,1 @@ src/App.tsx
- 
+               </button>
@@ -414,1 +414,1 @@ src/App.tsx
-               <button
+ 
@@ -415,1 +415,1 @@ src/App.tsx
-                 id="tab-principles"
+               <button
@@ -416,1 +416,1 @@ src/App.tsx
-                 onClick={() => setActiveTab('PRINCIPLES')}
+                 id="tab-docs"
@@ -417,1 +417,1 @@ src/App.tsx
-                 className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
+                 onClick={() => setActiveTab('DOCS')}
@@ -418,1 +418,1 @@ src/App.tsx
-                   activeTab === 'PRINCIPLES' 
+                 className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
@@ -419,1 +419,1 @@ src/App.tsx
-                     ? 'bg-white text-stone-900 shadow-xs border border-stone-200/50' 
+                   activeTab === 'DOCS' 
@@ -420,1 +420,1 @@ src/App.tsx
-                     : 'text-stone-600 hover:text-stone-900'
+                     ? 'bg-white text-stone-900 shadow-xs border border-stone-200/50' 
@@ -421,1 +421,1 @@ src/App.tsx
-                 }`}
+                     : 'text-stone-600 hover:text-stone-900'
@@ -422,1 +422,1 @@ src/App.tsx
-               >
+                 }`}
@@ -423,1 +423,1 @@ src/App.tsx
-                 <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
+               >
@@ -424,1 +424,1 @@ src/App.tsx
-                 <span>المبادئ الـ 12 الإلزامية</span>
+                 <BookOpen className="w-3.5 h-3.5 text-amber-600" />
@@ -425,1 +425,1 @@ src/App.tsx
-               </button>
+                 <span>{t("navigation.labels.txt_13cd84")}</span>
@@ -426,1 +426,1 @@ src/App.tsx
- 
+               </button>
@@ -427,1 +427,1 @@ src/App.tsx
-               <button
+             </nav>
@@ -428,1 +428,1 @@ src/App.tsx
-                 id="tab-docs"
+ 
@@ -429,1 +429,1 @@ src/App.tsx
-                 onClick={() => setActiveTab('DOCS')}
+             {/* Outbox & Network Status Pill */}
@@ -430,1 +430,1 @@ src/App.tsx
-                 className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
+             <button
@@ -431,1 +431,1 @@ src/App.tsx
-                   activeTab === 'DOCS' 
+               id="header-outbox-btn"
@@ -432,1 +432,1 @@ src/App.tsx
-                     ? 'bg-white text-stone-900 shadow-xs border border-stone-200/50' 
+               onClick={() => setIsOutboxOpen(true)}
@@ -433,1 +433,1 @@ src/App.tsx
-                     : 'text-stone-600 hover:text-stone-900'
+               className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border shadow-2xs ${
@@ -434,1 +434,1 @@ src/App.tsx
-                 }`}
+                 isOnline 
@@ -435,1 +435,1 @@ src/App.tsx
-               >
+                   ? 'bg-emerald-50 hover:bg-emerald-100 border-emerald-300 text-emerald-900' 
@@ -436,1 +436,1 @@ src/App.tsx
-                 <BookOpen className="w-3.5 h-3.5 text-amber-600" />
+                   : 'bg-amber-50 hover:bg-amber-100 border-amber-300 text-amber-950 animate-pulse'
@@ -437,1 +437,1 @@ src/App.tsx
-                 <span>المستندات المعمارية (7 ملفات)</span>
+               }`}
@@ -438,1 +438,1 @@ src/App.tsx
-               </button>
+               title={t("navigation.status.txt_4c0b8d")}
@@ -439,1 +439,1 @@ src/App.tsx
-             </nav>
+             >
@@ -440,1 +440,1 @@ src/App.tsx
- 
+               {isOnline ? <Wifi className="w-3.5 h-3.5 text-emerald-600" /> : <WifiOff className="w-3.5 h-3.5 text-amber-700" />}
@@ -441,1 +441,1 @@ src/App.tsx
-             {/* Outbox & Network Status Pill */}
+               <span>{isOnline ? 'Online' : 'Offline'}</span>
@@ -442,1 +442,1 @@ src/App.tsx
-             <button
+               <Inbox className="w-3 h-3 text-stone-500 mr-0.5" />
@@ -443,1 +443,1 @@ src/App.tsx
-               id="header-outbox-btn"
+               <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
@@ -444,1 +444,1 @@ src/App.tsx
-               onClick={() => setIsOutboxOpen(true)}
+                 pendingCount > 0 ? 'bg-amber-500 text-white font-bold' : 'bg-stone-200 text-stone-700'
@@ -445,1 +445,1 @@ src/App.tsx
-               className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border shadow-2xs ${
+               }`}>
@@ -446,1 +446,1 @@ src/App.tsx
-                 isOnline 
+                 {pendingCount}
@@ -447,1 +447,1 @@ src/App.tsx
-                   ? 'bg-emerald-50 hover:bg-emerald-100 border-emerald-300 text-emerald-900' 
+               </span>
@@ -448,1 +448,1 @@ src/App.tsx
-                   : 'bg-amber-50 hover:bg-amber-100 border-amber-300 text-amber-950 animate-pulse'
+             </button>
@@ -449,1 +449,1 @@ src/App.tsx
-               }`}
+ 
@@ -450,1 +450,1 @@ src/App.tsx
-               title="فتح صندوق العمليات المعلقة (Outbox) وإعدادات عدم الاتصال ومحاكاة الشبكة"
+             {/* Conflict Alert Pill */}
@@ -451,1 +451,1 @@ src/App.tsx
-             >
+             {conflictCount > 0 && (
@@ -452,1 +452,1 @@ src/App.tsx
-               {isOnline ? <Wifi className="w-3.5 h-3.5 text-emerald-600" /> : <WifiOff className="w-3.5 h-3.5 text-amber-700" />}
+               <button
@@ -453,1 +453,1 @@ src/App.tsx
-               <span>{isOnline ? 'Online' : 'Offline'}</span>
+                 id="header-conflicts-btn"
@@ -454,1 +454,1 @@ src/App.tsx
-               <Inbox className="w-3 h-3 text-stone-500 mr-0.5" />
+                 onClick={() => setIsOutboxOpen(true)}
@@ -455,1 +455,1 @@ src/App.tsx
-               <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
+                 className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-purple-100 hover:bg-purple-200 border border-purple-400 text-purple-950 shadow-2xs animate-pulse transition-all"
@@ -456,1 +456,1 @@ src/App.tsx
-                 pendingCount > 0 ? 'bg-amber-500 text-white font-bold' : 'bg-stone-200 text-stone-700'
+                 title={t("navigation.labels.txt_10324c")}
@@ -457,1 +457,1 @@ src/App.tsx
-               }`}>
+               >
@@ -458,1 +458,1 @@ src/App.tsx
-                 {pendingCount}
+                 <ShieldAlert className="w-3.5 h-3.5 text-purple-700" />
@@ -459,1 +459,1 @@ src/App.tsx
-               </span>
+                 <span>{conflictCount} تعارض تشغيلي</span>
@@ -460,1 +460,1 @@ src/App.tsx
-             </button>
+               </button>
@@ -461,1 +461,1 @@ src/App.tsx
- 
+             )}
@@ -462,1 +462,1 @@ src/App.tsx
-             {/* Conflict Alert Pill */}
+ 
@@ -463,1 +463,1 @@ src/App.tsx
-             {conflictCount > 0 && (
+             {/* Language Switcher */}
@@ -464,1 +464,1 @@ src/App.tsx
-               <button
+             <LanguageSwitcher />
@@ -465,1 +465,1 @@ src/App.tsx
-                 id="header-conflicts-btn"
+ 
@@ -466,1 +466,1 @@ src/App.tsx
-                 onClick={() => setIsOutboxOpen(true)}
+             {/* PWA Install Button */}
@@ -467,1 +467,1 @@ src/App.tsx
-                 className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-purple-100 hover:bg-purple-200 border border-purple-400 text-purple-950 shadow-2xs animate-pulse transition-all"
+             <PWAInstallButton />
@@ -468,1 +468,1 @@ src/App.tsx
-                 title="تنبيه: يوجد تعارضات تشغيلية تتطلب حلاً صريحاً (Anti-LWW)"
+ 
@@ -469,1 +469,1 @@ src/App.tsx
-               >
+             <AuthButton />
@@ -470,1 +470,1 @@ src/App.tsx
-                 <ShieldAlert className="w-3.5 h-3.5 text-purple-700" />
+           </div>
@@ -471,1 +471,1 @@ src/App.tsx
-                 <span>{conflictCount} تعارض تشغيلي</span>
+         </div>
@@ -472,1 +472,1 @@ src/App.tsx
-               </button>
+       </header>
@@ -473,1 +473,1 @@ src/App.tsx
-             )}
+ 
@@ -474,1 +474,1 @@ src/App.tsx
- 
+       {/* Main Content Area */}
@@ -475,1 +475,1 @@ src/App.tsx
-             {/* Language Switcher */}
+       <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
@@ -476,1 +476,1 @@ src/App.tsx
-             <LanguageSwitcher />
+         
@@ -477,1 +477,1 @@ src/App.tsx
- 
+         {/* ================= TAB: SECURITY AUDIT & COMPLIANCE (16 DOMAINS & EXHAUSTIVE RBAC) ================= */}
@@ -478,1 +478,1 @@ src/App.tsx
-             {/* PWA Install Button */}
+         {activeTab === 'SECURITY_AUDIT' && (
@@ -479,1 +479,1 @@ src/App.tsx
-             <PWAInstallButton />
+           <SecurityAuditView />
@@ -480,1 +480,1 @@ src/App.tsx
- 
+         )}
@@ -481,1 +481,1 @@ src/App.tsx
-             <AuthButton />
+ 
@@ -482,1 +482,1 @@ src/App.tsx
-           </div>
+         {/* ================= TAB: LEGACY MIGRATION (20 COLS, PREVIEW-FIRST, MASTER MATCHING, ADMIN COMMIT) ================= */}
@@ -483,1 +483,1 @@ src/App.tsx
-         </div>
+         {activeTab === 'LEGACY_MIGRATION' && (
@@ -484,1 +484,1 @@ src/App.tsx
-       </header>
+           <LegacyMigrationView />
@@ -485,1 +485,1 @@ src/App.tsx
- 
+         )}
@@ -486,1 +486,1 @@ src/App.tsx
-       {/* Main Content Area */}
+ 
@@ -487,1 +487,1 @@ src/App.tsx
-       <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
+         {/* ================= TAB: ADMIN CONSOLE (11 SECTIONS & VERSIONED PRICING RULES) ================= */}
@@ -488,1 +488,1 @@ src/App.tsx
-         
+         {activeTab === 'ADMIN_CONSOLE' && (
@@ -489,1 +489,1 @@ src/App.tsx
-         {/* ================= TAB: SECURITY AUDIT & COMPLIANCE (16 DOMAINS & EXHAUSTIVE RBAC) ================= */}
+           <AdminConsoleView />
@@ -490,1 +490,1 @@ src/App.tsx
-         {activeTab === 'SECURITY_AUDIT' && (
+         )}
@@ -491,1 +491,1 @@ src/App.tsx
-           <SecurityAuditView />
+ 
@@ -492,1 +492,1 @@ src/App.tsx
-         )}
+         {/* ================= TAB: OPERATIONS DASHBOARD (STRICT AUTHORIZATION, 11 CARDS & 4 WIDGETS) ================= */}
@@ -493,1 +493,1 @@ src/App.tsx
- 
+         {activeTab === 'OPERATIONS_DASHBOARD' && (
@@ -494,1 +494,1 @@ src/App.tsx
-         {/* ================= TAB: LEGACY MIGRATION (20 COLS, PREVIEW-FIRST, MASTER MATCHING, ADMIN COMMIT) ================= */}
+           <OperationsDashboardView />
@@ -495,1 +495,1 @@ src/App.tsx
-         {activeTab === 'LEGACY_MIGRATION' && (
+         )}
@@ -496,1 +496,1 @@ src/App.tsx
-           <LegacyMigrationView />
+ 
@@ -497,1 +497,1 @@ src/App.tsx
-         )}
+         {/* ================= TAB: REPORTS ENGINE (15 REPORTS, 9 FILTERS, PDF/XLSX/CSV) ================= */}
@@ -498,1 +498,1 @@ src/App.tsx
- 
+         {activeTab === 'REPORTS_ENGINE' && (
@@ -499,1 +499,1 @@ src/App.tsx
-         {/* ================= TAB: ADMIN CONSOLE (11 SECTIONS & VERSIONED PRICING RULES) ================= */}
+           <ReportsEngineView />
@@ -500,1 +500,1 @@ src/App.tsx
-         {activeTab === 'ADMIN_CONSOLE' && (
+         )}
@@ -501,1 +501,1 @@ src/App.tsx
-           <AdminConsoleView />
+ 
@@ -502,1 +502,1 @@ src/App.tsx
-         )}
+         {/* ================= TAB: TRIP ENGINE (6 RULES & SERVER SETTLEMENT) ================= */}
@@ -503,1 +503,1 @@ src/App.tsx
- 
+         {activeTab === 'TRIP_ENGINE' && (
@@ -504,1 +504,1 @@ src/App.tsx
-         {/* ================= TAB: OPERATIONS DASHBOARD (STRICT AUTHORIZATION, 11 CARDS & 4 WIDGETS) ================= */}
+           <TripEngineView />
@@ -505,1 +505,1 @@ src/App.tsx
-         {activeTab === 'OPERATIONS_DASHBOARD' && (
+         )}
@@ -506,1 +506,1 @@ src/App.tsx
-           <OperationsDashboardView />
+ 
@@ -507,1 +507,1 @@ src/App.tsx
-         )}
+         {/* ================= TAB: GOOGLE WORKSPACE (SHEETS & DRIVE PROJECTION) ================= */}
@@ -508,1 +508,1 @@ src/App.tsx
- 
+         {activeTab === 'WORKSPACE_INTEGRATION' && (
@@ -509,1 +509,1 @@ src/App.tsx
-         {/* ================= TAB: REPORTS ENGINE (15 REPORTS, 9 FILTERS, PDF/XLSX/CSV) ================= */}
+           <WorkspaceIntegrationView />
@@ -510,1 +510,1 @@ src/App.tsx
-         {activeTab === 'REPORTS_ENGINE' && (
+         )}
@@ -511,1 +511,1 @@ src/App.tsx
-           <ReportsEngineView />
+ 
@@ -512,1 +512,1 @@ src/App.tsx
-         )}
+         {/* ================= TAB: EXCEPTION ENGINE (12 TYPES, 4 STATUSES, & AUDIT TRAIL) ================= */}
@@ -513,1 +513,1 @@ src/App.tsx
- 
+         {activeTab === 'EXCEPTION_ENGINE' && (
@@ -514,1 +514,1 @@ src/App.tsx
-         {/* ================= TAB: TRIP ENGINE (6 RULES & SERVER SETTLEMENT) ================= */}
+           <ExceptionEngineView />
@@ -515,1 +515,1 @@ src/App.tsx
-         {activeTab === 'TRIP_ENGINE' && (
+         )}
@@ -516,1 +516,1 @@ src/App.tsx
-           <TripEngineView />
+ 
@@ -517,1 +517,1 @@ src/App.tsx
-         )}
+         {/* ================= TAB: IMPORT CENTER (12-STAGE PIPELINE) ================= */}
@@ -518,1 +518,1 @@ src/App.tsx
- 
+         {activeTab === 'IMPORT_CENTER' && (
@@ -519,1 +519,1 @@ src/App.tsx
-         {/* ================= TAB: GOOGLE WORKSPACE (SHEETS & DRIVE PROJECTION) ================= */}
+           <ImportCenterView />
@@ -520,1 +520,1 @@ src/App.tsx
-         {activeTab === 'WORKSPACE_INTEGRATION' && (
+         )}
@@ -521,1 +521,1 @@ src/App.tsx
-           <WorkspaceIntegrationView />
+ 
@@ -522,1 +522,1 @@ src/App.tsx
-         )}
+         {/* ================= TAB: DATA QUALITY ENGINE (8-STAGE PIPELINE) ================= */}
@@ -523,1 +523,1 @@ src/App.tsx
- 
+         {activeTab === 'DATA_QUALITY' && (
@@ -524,1 +524,1 @@ src/App.tsx
-         {/* ================= TAB: EXCEPTION ENGINE (12 TYPES, 4 STATUSES, & AUDIT TRAIL) ================= */}
+           <DataQualityView />
@@ -525,1 +525,1 @@ src/App.tsx
-         {activeTab === 'EXCEPTION_ENGINE' && (
+         )}
@@ -526,1 +526,1 @@ src/App.tsx
-           <ExceptionEngineView />
+ 
@@ -527,1 +527,1 @@ src/App.tsx
-         )}
+         {/* ================= TAB: MASTER DATA MODULES ================= */}
@@ -528,1 +528,1 @@ src/App.tsx
- 
+         {activeTab === 'MASTER_DATA' && (
@@ -529,1 +529,1 @@ src/App.tsx
-         {/* ================= TAB: IMPORT CENTER (12-STAGE PIPELINE) ================= */}
+           <MasterDataView />
@@ -530,1 +530,1 @@ src/App.tsx
-         {activeTab === 'IMPORT_CENTER' && (
+         )}
@@ -531,1 +531,1 @@ src/App.tsx
-           <ImportCenterView />
+ 
@@ -532,1 +532,1 @@ src/App.tsx
-         )}
+         {/* ================= TAB: PRICING ENGINE & AUTOMATED TESTS ================= */}
@@ -533,1 +533,1 @@ src/App.tsx
- 
+         {activeTab === 'PRICING_ENGINE' && (
@@ -534,1 +534,1 @@ src/App.tsx
-         {/* ================= TAB: DATA QUALITY ENGINE (8-STAGE PIPELINE) ================= */}
+           <PricingEngineView />
@@ -535,1 +535,1 @@ src/App.tsx
-         {activeTab === 'DATA_QUALITY' && (
+         )}
@@ -536,1 +536,1 @@ src/App.tsx
-           <DataQualityView />
+ 
@@ -537,1 +537,1 @@ src/App.tsx
-         )}
+         {/* ================= TAB: PROJECT SETUP WIZARD (7 STEPS) ================= */}
@@ -538,1 +538,1 @@ src/App.tsx
- 
+         {activeTab === 'WIZARD' && (
@@ -539,1 +539,1 @@ src/App.tsx
-         {/* ================= TAB: MASTER DATA MODULES ================= */}
+           <ProjectSetupWizard />
@@ -540,1 +540,1 @@ src/App.tsx
-         {activeTab === 'MASTER_DATA' && (
+         )}
@@ -541,1 +541,1 @@ src/App.tsx
-           <MasterDataView />
+ 
@@ -542,1 +542,1 @@ src/App.tsx
-         )}
+         {/* ================= TAB 0: FIRESTORE ARCHITECTURE & DOMAIN LAYERS ================= */}
@@ -543,1 +543,1 @@ src/App.tsx
- 
+         {activeTab === 'FIRESTORE_ARCH' && (
@@ -544,1 +544,1 @@ src/App.tsx
-         {/* ================= TAB: PRICING ENGINE & AUTOMATED TESTS ================= */}
+           <FirestoreArchitectureView />
@@ -545,1 +545,1 @@ src/App.tsx
-         {activeTab === 'PRICING_ENGINE' && (
+         )}
@@ -546,1 +546,1 @@ src/App.tsx
-           <PricingEngineView />
+ 
@@ -547,1 +547,1 @@ src/App.tsx
-         )}
+         {/* ================= TAB 1: RELATIONSHIPS EXPLORER ================= */}
@@ -548,1 +548,1 @@ src/App.tsx
- 
+         {activeTab === 'RELATIONS' && (
@@ -549,1 +549,1 @@ src/App.tsx
-         {/* ================= TAB: PROJECT SETUP WIZARD (7 STEPS) ================= */}
+           <div className="space-y-6">
@@ -550,1 +550,1 @@ src/App.tsx
-         {activeTab === 'WIZARD' && (
+             <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs">
@@ -551,1 +551,1 @@ src/App.tsx
-           <ProjectSetupWizard />
+               <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
@@ -552,1 +552,1 @@ src/App.tsx
-         )}
+                 <div>
@@ -553,1 +553,1 @@ src/App.tsx
- 
+                   <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
@@ -554,1 +554,1 @@ src/App.tsx
-         {/* ================= TAB 0: FIRESTORE ARCHITECTURE & DOMAIN LAYERS ================= */}
+                     <Boxes className="w-5 h-5 text-indigo-600" />
@@ -555,1 +555,1 @@ src/App.tsx
-         {activeTab === 'FIRESTORE_ARCH' && (
+                     <span>{t("navigation.labels.txt_4df8c5")}</span>
@@ -556,1 +556,1 @@ src/App.tsx
-           <FirestoreArchitectureView />
+                   </h2>
@@ -557,1 +557,1 @@ src/App.tsx
-         )}
+                   <p className="text-xs text-stone-500 mt-1">
@@ -558,1 +558,1 @@ src/App.tsx
- 
+                     {t("navigation.labels.txt_23bdd6")}</p>
@@ -559,1 +559,1 @@ src/App.tsx
-         {/* ================= TAB 1: RELATIONSHIPS EXPLORER ================= */}
+                 </div>
@@ -560,1 +560,1 @@ src/App.tsx
-         {activeTab === 'RELATIONS' && (
+                 <div className="text-xs font-medium text-stone-400 bg-stone-50 px-3 py-1.5 rounded-lg border border-stone-200/60">
@@ -561,1 +561,1 @@ src/App.tsx
-           <div className="space-y-6">
+                   {t("navigation.labels.txt_46b695")}<strong className="text-stone-700">Multi-Project Logistics FSM</strong>
@@ -562,1 +562,1 @@ src/App.tsx
-             <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs">
+                 </div>
@@ -563,1 +563,1 @@ src/App.tsx
-               <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
+               </div>
@@ -564,1 +564,1 @@ src/App.tsx
-                 <div>
+ 
@@ -565,1 +565,1 @@ src/App.tsx
-                   <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
+               {/* Entity Pills Carousel/Grid */}
@@ -566,1 +566,1 @@ src/App.tsx
-                     <Boxes className="w-5 h-5 text-indigo-600" />
+               <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 pt-2 border-t border-stone-100">
@@ -567,1 +567,1 @@ src/App.tsx
-                     <span>مخطط العلاقات التفاعلي بين كيانات النطاق التشغيلي</span>
+                 {ENTITY_RELATIONS.map(entity => {
@@ -568,1 +568,1 @@ src/App.tsx
-                   </h2>
+                   const isSelected = entity.id === selectedEntityId;
@@ -569,1 +569,1 @@ src/App.tsx
-                   <p className="text-xs text-stone-500 mt-1">
+                   return (
@@ -570,1 +570,1 @@ src/App.tsx
-                     اختر أي كيان لاستعراض ارتباطاته الدقيقة، درجة التعددية (Cardinality)، وواجبات التحقق الخادومية الصارمة.
+                     <button
@@ -571,1 +571,1 @@ src/App.tsx
-                   </p>
+                       key={entity.id}
@@ -572,1 +572,1 @@ src/App.tsx
-                 </div>
+                       id={`entity-btn-${entity.id}`}
@@ -573,1 +573,1 @@ src/App.tsx
-                 <div className="text-xs font-medium text-stone-400 bg-stone-50 px-3 py-1.5 rounded-lg border border-stone-200/60">
+                       onClick={() => setSelectedEntityId(entity.id)}
@@ -574,1 +574,1 @@ src/App.tsx
-                   النظام التشغيلي: <strong className="text-stone-700">Multi-Project Logistics FSM</strong>
+                       className={`flex items-center gap-2.5 p-2.5 rounded-xl text-right transition-all border ${
@@ -575,1 +575,1 @@ src/App.tsx
-                 </div>
+                         isSelected 
@@ -576,1 +576,1 @@ src/App.tsx
-               </div>
+                           ? 'bg-stone-900 text-white border-stone-900 shadow-xs' 
@@ -577,1 +577,1 @@ src/App.tsx
- 
+                           : 'bg-stone-50/70 hover:bg-stone-100/80 text-stone-700 border-stone-200/70'
@@ -578,1 +578,1 @@ src/App.tsx
-               {/* Entity Pills Carousel/Grid */}
+                       }`}
@@ -579,1 +579,1 @@ src/App.tsx
-               <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 pt-2 border-t border-stone-100">
+                     >
@@ -580,1 +580,1 @@ src/App.tsx
-                 {ENTITY_RELATIONS.map(entity => {
+                       <div className={`p-1.5 rounded-lg shrink-0 ${isSelected ? 'bg-stone-800' : 'bg-white shadow-xs'}`}>
@@ -581,1 +581,1 @@ src/App.tsx
-                   const isSelected = entity.id === selectedEntityId;
+                         {getEntityIcon(entity.id)}
@@ -582,1 +582,1 @@ src/App.tsx
-                   return (
+                       </div>
@@ -583,1 +583,1 @@ src/App.tsx
-                     <button
+                       <div className="min-w-0">
@@ -584,1 +584,1 @@ src/App.tsx
-                       key={entity.id}
+                         <div className="text-xs font-bold truncate">{entity.nameEn}</div>
@@ -585,1 +585,1 @@ src/App.tsx
-                       id={`entity-btn-${entity.id}`}
+                         <div className={`text-[10px] truncate ${isSelected ? 'text-stone-300' : 'text-stone-500'}`}>
@@ -586,1 +586,1 @@ src/App.tsx
-                       onClick={() => setSelectedEntityId(entity.id)}
+                           {entity.nameAr.split(' ')[0]}
@@ -587,1 +587,1 @@ src/App.tsx
-                       className={`flex items-center gap-2.5 p-2.5 rounded-xl text-right transition-all border ${
+                         </div>
@@ -588,1 +588,1 @@ src/App.tsx
-                         isSelected 
+                       </div>
@@ -589,1 +589,1 @@ src/App.tsx
-                           ? 'bg-stone-900 text-white border-stone-900 shadow-xs' 
+                     </button>
@@ -590,1 +590,1 @@ src/App.tsx
-                           : 'bg-stone-50/70 hover:bg-stone-100/80 text-stone-700 border-stone-200/70'
+                   );
@@ -591,1 +591,1 @@ src/App.tsx
-                       }`}
+                 })}
@@ -592,1 +592,1 @@ src/App.tsx
-                     >
+               </div>
@@ -593,1 +593,1 @@ src/App.tsx
-                       <div className={`p-1.5 rounded-lg shrink-0 ${isSelected ? 'bg-stone-800' : 'bg-white shadow-xs'}`}>
+             </div>
@@ -594,1 +594,1 @@ src/App.tsx
-                         {getEntityIcon(entity.id)}
+ 
@@ -595,1 +595,1 @@ src/App.tsx
-                       </div>
+             {/* Selected Entity Deep-Dive Card */}
@@ -596,1 +596,1 @@ src/App.tsx
-                       <div className="min-w-0">
+             <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
@@ -597,1 +597,1 @@ src/App.tsx
-                         <div className="text-xs font-bold truncate">{entity.nameEn}</div>
+               {/* Left Column: Entity Definition & Rules */}
@@ -598,1 +598,1 @@ src/App.tsx
-                         <div className={`text-[10px] truncate ${isSelected ? 'text-stone-300' : 'text-stone-500'}`}>
+               <div className="lg:col-span-1 bg-white rounded-2xl border border-stone-200 p-6 shadow-xs flex flex-col justify-between">
@@ -599,1 +599,1 @@ src/App.tsx
-                           {entity.nameAr.split(' ')[0]}
+                 <div>
@@ -600,1 +600,1 @@ src/App.tsx
-                         </div>
+                   <div className="flex items-center justify-between border-b border-stone-100 pb-4 mb-4">
@@ -601,1 +601,1 @@ src/App.tsx
-                       </div>
+                     <div className="flex items-center gap-3">
@@ -602,1 +602,1 @@ src/App.tsx
-                     </button>
+                       <div className="p-2.5 bg-stone-100 rounded-xl">
@@ -603,1 +603,1 @@ src/App.tsx
-                   );
+                         {getEntityIcon(selectedEntity.id)}
@@ -604,1 +604,1 @@ src/App.tsx
-                 })}
+                       </div>
@@ -605,1 +605,1 @@ src/App.tsx
-               </div>
+                       <div>
@@ -606,1 +606,1 @@ src/App.tsx
-             </div>
+                         <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-stone-100 text-stone-600">
@@ -607,1 +607,1 @@ src/App.tsx
- 
+                           {selectedEntity.category}
@@ -608,1 +608,1 @@ src/App.tsx
-             {/* Selected Entity Deep-Dive Card */}
+                         </span>
@@ -609,1 +609,1 @@ src/App.tsx
-             <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
+                         <h3 className="text-lg font-bold text-stone-900 mt-1">
@@ -610,1 +610,1 @@ src/App.tsx
-               {/* Left Column: Entity Definition & Rules */}
+                           {selectedEntity.nameAr}
@@ -611,1 +611,1 @@ src/App.tsx
-               <div className="lg:col-span-1 bg-white rounded-2xl border border-stone-200 p-6 shadow-xs flex flex-col justify-between">
+                         </h3>
@@ -612,1 +612,1 @@ src/App.tsx
-                 <div>
+                       </div>
@@ -613,1 +613,1 @@ src/App.tsx
-                   <div className="flex items-center justify-between border-b border-stone-100 pb-4 mb-4">
+                     </div>
@@ -614,1 +614,1 @@ src/App.tsx
-                     <div className="flex items-center gap-3">
+                   </div>
@@ -615,1 +615,1 @@ src/App.tsx
-                       <div className="p-2.5 bg-stone-100 rounded-xl">
+ 
@@ -616,1 +616,1 @@ src/App.tsx
-                         {getEntityIcon(selectedEntity.id)}
+                   <p className="text-xs leading-relaxed text-stone-600 mb-4 bg-stone-50 p-3 rounded-xl border border-stone-200/60">
@@ -617,1 +617,1 @@ src/App.tsx
-                       </div>
+                     {selectedEntity.shortDescAr}
@@ -618,1 +618,1 @@ src/App.tsx
-                       <div>
+                   </p>
@@ -619,1 +619,1 @@ src/App.tsx
-                         <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-stone-100 text-stone-600">
+ 
@@ -620,1 +620,1 @@ src/App.tsx
-                           {selectedEntity.category}
+                   <div className="space-y-4">
@@ -621,1 +621,1 @@ src/App.tsx
-                         </span>
+                     <div>
@@ -622,1 +622,1 @@ src/App.tsx
-                         <h3 className="text-lg font-bold text-stone-900 mt-1">
+                       <h4 className="text-xs font-bold text-stone-900 mb-1.5 flex items-center gap-1.5">
@@ -623,1 +623,1 @@ src/App.tsx
-                           {selectedEntity.nameAr}
+                         <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
@@ -624,1 +624,1 @@ src/App.tsx
-                         </h3>
+                         <span>{t("navigation.labels.txt_777008")}</span>
@@ -625,1 +625,1 @@ src/App.tsx
-                       </div>
+                       </h4>
@@ -626,1 +626,1 @@ src/App.tsx
-                     </div>
+                       <p className="text-xs text-stone-600 leading-normal">
@@ -627,1 +627,1 @@ src/App.tsx
-                   </div>
+                         {selectedEntity.roleInSystemAr}
@@ -628,1 +628,1 @@ src/App.tsx
- 
+                       </p>
@@ -629,1 +629,1 @@ src/App.tsx
-                   <p className="text-xs leading-relaxed text-stone-600 mb-4 bg-stone-50 p-3 rounded-xl border border-stone-200/60">
+                     </div>
@@ -630,1 +630,1 @@ src/App.tsx
-                     {selectedEntity.shortDescAr}
+ 
@@ -631,1 +631,1 @@ src/App.tsx
-                   </p>
+                     <div>
@@ -632,1 +632,1 @@ src/App.tsx
- 
+                       <h4 className="text-xs font-bold text-stone-900 mb-1.5 flex items-center gap-1.5">
@@ -633,1 +633,1 @@ src/App.tsx
-                   <div className="space-y-4">
+                         <Database className="w-3.5 h-3.5 text-blue-600" />
@@ -634,1 +634,1 @@ src/App.tsx
-                     <div>
+                         <span>{t("navigation.labels.txt_41e146")}</span>
@@ -635,1 +635,1 @@ src/App.tsx
-                       <h4 className="text-xs font-bold text-stone-900 mb-1.5 flex items-center gap-1.5">
+                       </h4>
@@ -636,1 +636,1 @@ src/App.tsx
-                         <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
+                       <div className="flex flex-wrap gap-1.5">
@@ -637,1 +637,1 @@ src/App.tsx
-                         <span>الدور والمسؤولية في النظام:</span>
+                         {selectedEntity.keyAttributes.map((attr, idx) => (
@@ -638,1 +638,1 @@ src/App.tsx
-                       </h4>
+                           <span key={idx} className="font-mono text-[11px] px-2 py-0.5 bg-stone-100 text-stone-700 rounded-md border border-stone-200/60">
@@ -639,1 +639,1 @@ src/App.tsx
-                       <p className="text-xs text-stone-600 leading-normal">
+                             {attr}
@@ -640,1 +640,1 @@ src/App.tsx
-                         {selectedEntity.roleInSystemAr}
+                           </span>
@@ -641,1 +641,1 @@ src/App.tsx
-                       </p>
+                         ))}
@@ -642,1 +642,1 @@ src/App.tsx
-                     </div>
+                       </div>
@@ -643,1 +643,1 @@ src/App.tsx
- 
+                     </div>
@@ -644,1 +644,1 @@ src/App.tsx
-                     <div>
+                   </div>
@@ -645,1 +645,1 @@ src/App.tsx
-                       <h4 className="text-xs font-bold text-stone-900 mb-1.5 flex items-center gap-1.5">
+                 </div>
@@ -646,1 +646,1 @@ src/App.tsx
-                         <Database className="w-3.5 h-3.5 text-blue-600" />
+ 
@@ -647,1 +647,1 @@ src/App.tsx
-                         <span>الخصائص والحقول الأساسية (Key Attributes):</span>
+                 <div className="mt-6 pt-4 border-t border-stone-100">
@@ -648,1 +648,1 @@ src/App.tsx
-                       </h4>
+                   <h4 className="text-xs font-bold text-stone-900 mb-2 flex items-center gap-1.5">
@@ -649,1 +649,1 @@ src/App.tsx
-                       <div className="flex flex-wrap gap-1.5">
+                     <Lock className="w-3.5 h-3.5 text-amber-600" />
@@ -650,1 +650,1 @@ src/App.tsx
-                         {selectedEntity.keyAttributes.map((attr, idx) => (
+                     <span>{t("navigation.labels.txt_4ada99")}</span>
@@ -651,1 +651,1 @@ src/App.tsx
-                           <span key={idx} className="font-mono text-[11px] px-2 py-0.5 bg-stone-100 text-stone-700 rounded-md border border-stone-200/60">
+                   </h4>
@@ -652,1 +652,1 @@ src/App.tsx
-                             {attr}
+                   <ul className="space-y-1.5">
@@ -653,1 +653,1 @@ src/App.tsx
-                           </span>
+                     {selectedEntity.rulesEnforcedAr.map((rule, idx) => (
@@ -654,1 +654,1 @@ src/App.tsx
-                         ))}
+                       <li key={idx} className="text-xs text-stone-600 flex items-start gap-1.5">
@@ -655,1 +655,1 @@ src/App.tsx
-                       </div>
+                         <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
@@ -656,1 +656,1 @@ src/App.tsx
-                     </div>
+                         <span>{rule}</span>
@@ -657,1 +657,1 @@ src/App.tsx
-                   </div>
+                       </li>
@@ -658,1 +658,1 @@ src/App.tsx
-                 </div>
+                     ))}
@@ -659,1 +659,1 @@ src/App.tsx
- 
+                   </ul>
@@ -660,1 +660,1 @@ src/App.tsx
-                 <div className="mt-6 pt-4 border-t border-stone-100">
+                 </div>
@@ -661,1 +661,1 @@ src/App.tsx
-                   <h4 className="text-xs font-bold text-stone-900 mb-2 flex items-center gap-1.5">
+               </div>
@@ -662,1 +662,1 @@ src/App.tsx
-                     <Lock className="w-3.5 h-3.5 text-amber-600" />
+ 
@@ -663,1 +663,1 @@ src/App.tsx
-                     <span>الضوابط والمبادئ المرتبطة:</span>
+               {/* Right Column: Direct Domain Connections */}
@@ -664,1 +664,1 @@ src/App.tsx
-                   </h4>
+               <div className="lg:col-span-2 bg-white rounded-2xl border border-stone-200 p-6 shadow-xs">
@@ -665,1 +665,1 @@ src/App.tsx
-                   <ul className="space-y-1.5">
+                 <div className="flex items-center justify-between pb-4 mb-4 border-b border-stone-100">
@@ -666,1 +666,1 @@ src/App.tsx
-                     {selectedEntity.rulesEnforcedAr.map((rule, idx) => (
+                   <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
@@ -667,1 +667,1 @@ src/App.tsx
-                       <li key={idx} className="text-xs text-stone-600 flex items-start gap-1.5">
+                     <Share2 className="w-4 h-4 text-indigo-600" />
@@ -668,1 +668,1 @@ src/App.tsx
-                         <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
+                     <span>الارتباطات المباشرة مع الكيانات الأخرى في النظام ({selectedEntity.relationships.length})</span>
@@ -669,1 +669,1 @@ src/App.tsx
-                         <span>{rule}</span>
+                   </h3>
@@ -670,1 +670,1 @@ src/App.tsx
-                       </li>
+                   <span className="text-xs text-stone-400">
@@ -671,1 +671,1 @@ src/App.tsx
-                     ))}
+                     {t("navigation.labels.txt_5dc573")}</span>
@@ -672,1 +672,1 @@ src/App.tsx
-                   </ul>
+                 </div>
@@ -673,1 +673,1 @@ src/App.tsx
-                 </div>
+ 
@@ -674,1 +674,1 @@ src/App.tsx
-               </div>
+                 <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
@@ -675,1 +675,1 @@ src/App.tsx
- 
+                   {selectedEntity.relationships.map((rel, idx) => {
@@ -676,1 +676,1 @@ src/App.tsx
-               {/* Right Column: Direct Domain Connections */}
+                     const targetEntity = ENTITY_RELATIONS.find(e => e.id === rel.target);
@@ -677,1 +677,1 @@ src/App.tsx
-               <div className="lg:col-span-2 bg-white rounded-2xl border border-stone-200 p-6 shadow-xs">
+                     return (
@@ -678,1 +678,1 @@ src/App.tsx
-                 <div className="flex items-center justify-between pb-4 mb-4 border-b border-stone-100">
+                       <div 
@@ -679,1 +679,1 @@ src/App.tsx
-                   <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
+                         key={idx}
@@ -680,1 +680,1 @@ src/App.tsx
-                     <Share2 className="w-4 h-4 text-indigo-600" />
+                         onClick={() => setSelectedEntityId(rel.target)}
@@ -681,1 +681,1 @@ src/App.tsx
-                     <span>الارتباطات المباشرة مع الكيانات الأخرى في النظام ({selectedEntity.relationships.length})</span>
+                         className="group p-3.5 rounded-xl border border-stone-200/80 bg-stone-50/40 hover:bg-stone-50 hover:border-indigo-300 transition-all cursor-pointer flex flex-col justify-between"
@@ -682,1 +682,1 @@ src/App.tsx
-                   </h3>
+                       >
@@ -683,1 +683,1 @@ src/App.tsx
-                   <span className="text-xs text-stone-400">
+                         <div>
@@ -684,1 +684,1 @@ src/App.tsx
-                     انقر على أي كيان مرتبط للانتقال إليه
+                           <div className="flex items-center justify-between mb-2">
@@ -685,1 +685,1 @@ src/App.tsx
-                   </span>
+                             <div className="flex items-center gap-2">
@@ -686,1 +686,1 @@ src/App.tsx
-                 </div>
+                               <div className="p-1 rounded bg-white border border-stone-200">
@@ -687,1 +687,1 @@ src/App.tsx
- 
+                                 {getEntityIcon(rel.target)}
@@ -688,1 +688,1 @@ src/App.tsx
-                 <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
+                               </div>
@@ -689,1 +689,1 @@ src/App.tsx
-                   {selectedEntity.relationships.map((rel, idx) => {
+                               <span className="text-xs font-bold text-stone-900 group-hover:text-indigo-600 transition-colors">
@@ -690,1 +690,1 @@ src/App.tsx
-                     const targetEntity = ENTITY_RELATIONS.find(e => e.id === rel.target);
+                                 {targetEntity ? targetEntity.nameAr : rel.target}
@@ -691,1 +691,1 @@ src/App.tsx
-                     return (
+                               </span>
@@ -692,1 +692,1 @@ src/App.tsx
-                       <div 
+                             </div>
@@ -693,1 +693,1 @@ src/App.tsx
-                         key={idx}
+                             <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100">
@@ -694,1 +694,1 @@ src/App.tsx
-                         onClick={() => setSelectedEntityId(rel.target)}
+                               {rel.type}
@@ -695,1 +695,1 @@ src/App.tsx
-                         className="group p-3.5 rounded-xl border border-stone-200/80 bg-stone-50/40 hover:bg-stone-50 hover:border-indigo-300 transition-all cursor-pointer flex flex-col justify-between"
+                             </span>
@@ -696,1 +696,1 @@ src/App.tsx
-                       >
+                           </div>
@@ -697,1 +697,1 @@ src/App.tsx
-                         <div>
+                           <p className="text-xs text-stone-600 leading-relaxed">
@@ -698,1 +698,1 @@ src/App.tsx
-                           <div className="flex items-center justify-between mb-2">
+                             {rel.descAr}
@@ -699,1 +699,1 @@ src/App.tsx
-                             <div className="flex items-center gap-2">
+                           </p>
@@ -700,1 +700,1 @@ src/App.tsx
-                               <div className="p-1 rounded bg-white border border-stone-200">
+                         </div>
@@ -701,1 +701,1 @@ src/App.tsx
-                                 {getEntityIcon(rel.target)}
+                         <div className="mt-3 pt-2 border-t border-stone-200/40 flex items-center justify-end text-[10px] font-bold text-stone-400 group-hover:text-indigo-600 gap-1 transition-colors">
@@ -702,1 +702,1 @@ src/App.tsx
-                               </div>
+                           <span>استعراض كيان {rel.target}</span>
@@ -703,1 +703,1 @@ src/App.tsx
-                               <span className="text-xs font-bold text-stone-900 group-hover:text-indigo-600 transition-colors">
+                           <ChevronLeft className="w-3 h-3" />
@@ -704,1 +704,1 @@ src/App.tsx
-                                 {targetEntity ? targetEntity.nameAr : rel.target}
+                         </div>
@@ -705,1 +705,1 @@ src/App.tsx
-                               </span>
+                       </div>
@@ -706,1 +706,1 @@ src/App.tsx
-                             </div>
+                     );
@@ -707,1 +707,1 @@ src/App.tsx
-                             <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100">
+                   })}
@@ -708,1 +708,1 @@ src/App.tsx
-                               {rel.type}
+                 </div>
@@ -709,1 +709,1 @@ src/App.tsx
-                             </span>
+ 
@@ -710,1 +710,1 @@ src/App.tsx
-                           </div>
+                 {/* Architecture Context Banner */}
@@ -711,1 +711,1 @@ src/App.tsx
-                           <p className="text-xs text-stone-600 leading-relaxed">
+                 <div className="mt-6 p-4 rounded-xl bg-stone-900 text-stone-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
@@ -712,1 +712,1 @@ src/App.tsx
-                             {rel.descAr}
+                   <div>
@@ -713,1 +713,1 @@ src/App.tsx
-                           </p>
+                     <div className="text-xs font-bold text-amber-400 mb-0.5">
@@ -714,1 +714,1 @@ src/App.tsx
-                         </div>
+                       {t("navigation.labels.txt_6dd618")}</div>
@@ -715,1 +715,1 @@ src/App.tsx
-                         <div className="mt-3 pt-2 border-t border-stone-200/40 flex items-center justify-end text-[10px] font-bold text-stone-400 group-hover:text-indigo-600 gap-1 transition-colors">
+                     <div className="text-xs text-stone-300">
@@ -716,1 +716,1 @@ src/App.tsx
-                           <span>استعراض كيان {rel.target}</span>
+                       {t("navigation.labels.txt_791f1b")}</div>
@@ -717,1 +717,1 @@ src/App.tsx
-                           <ChevronLeft className="w-3 h-3" />
+                   </div>
@@ -718,1 +718,1 @@ src/App.tsx
-                         </div>
+                   <button
@@ -719,1 +719,1 @@ src/App.tsx
-                       </div>
+                     onClick={() => {
@@ -720,1 +720,1 @@ src/App.tsx
-                     );
+                       setActiveTab('DOCS');
@@ -721,1 +721,1 @@ src/App.tsx
-                   })}
+                       setSelectedDocId('architecture');
@@ -722,1 +722,1 @@ src/App.tsx
-                 </div>
+                     }}
@@ -723,1 +723,1 @@ src/App.tsx
- 
+                     className="shrink-0 px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-medium border border-stone-700 flex items-center gap-1.5 transition-colors"
@@ -724,1 +724,1 @@ src/App.tsx
-                 {/* Architecture Context Banner */}
+                   >
@@ -725,1 +725,1 @@ src/App.tsx
-                 <div className="mt-6 p-4 rounded-xl bg-stone-900 text-stone-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
+                     <span>{t("navigation.labels.view")}</span>
@@ -726,1 +726,1 @@ src/App.tsx
-                   <div>
+                     <ChevronLeft className="w-3.5 h-3.5" />
@@ -727,1 +727,1 @@ src/App.tsx
-                     <div className="text-xs font-bold text-amber-400 mb-0.5">
+                   </button>
@@ -728,1 +728,1 @@ src/App.tsx
-                       ضمانة مصدر الحقيقة وسيادة الخادم
+                 </div>
@@ -729,1 +729,1 @@ src/App.tsx
-                     </div>
+               </div>
@@ -730,1 +730,1 @@ src/App.tsx
-                     <div className="text-xs text-stone-300">
+             </div>
@@ -731,1 +731,1 @@ src/App.tsx
-                       كل ارتباط بين كيانين يتم التحقق منه خادومياً داخل الـ Transactions في Firestore ولا يُترك القرار للواجهة الأمامية مطلقاً.
+           </div>
@@ -732,1 +732,1 @@ src/App.tsx
-                     </div>
+         )}
@@ -733,1 +733,1 @@ src/App.tsx
-                   </div>
+ 
@@ -734,1 +734,1 @@ src/App.tsx
-                   <button
+         {/* ================= TAB 2: THE 12 INVARIANT PRINCIPLES ================= */}
@@ -735,1 +735,1 @@ src/App.tsx
-                     onClick={() => {
+         {activeTab === 'PRINCIPLES' && (
@@ -736,1 +736,1 @@ src/App.tsx
-                       setActiveTab('DOCS');
+           <div className="space-y-6">
@@ -737,1 +737,1 @@ src/App.tsx
-                       setSelectedDocId('architecture');
+             <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs">
@@ -738,1 +738,1 @@ src/App.tsx
-                     }}
+               <div className="max-w-3xl">
@@ -739,1 +739,1 @@ src/App.tsx
-                     className="shrink-0 px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-medium border border-stone-700 flex items-center gap-1.5 transition-colors"
+                 <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2">
@@ -740,1 +740,1 @@ src/App.tsx
-                   >
+                   <ShieldCheck className="w-5 h-5 text-emerald-600" />
@@ -741,1 +741,1 @@ src/App.tsx
-                     <span>عرض كود المعمارية</span>
+                   <span>{t("navigation.labels.txt_4c8195")}</span>
@@ -742,1 +742,1 @@ src/App.tsx
-                     <ChevronLeft className="w-3.5 h-3.5" />
+                 </h2>
@@ -743,1 +743,1 @@ src/App.tsx
-                   </button>
+                 <p className="text-xs text-stone-600 mt-1 leading-relaxed">
@@ -744,1 +744,1 @@ src/App.tsx
-                 </div>
+                   {t("navigation.labels.txt_17c5e1")}</p>
@@ -747,1 +747,1 @@ src/App.tsx
-           </div>
+ 
@@ -748,1 +748,1 @@ src/App.tsx
-         )}
+             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
@@ -749,1 +749,1 @@ src/App.tsx
- 
+               {MANDATORY_PRINCIPLES.map(principle => (
@@ -750,1 +750,1 @@ src/App.tsx
-         {/* ================= TAB 2: THE 12 INVARIANT PRINCIPLES ================= */}
+                 <div 
@@ -751,1 +751,1 @@ src/App.tsx
-         {activeTab === 'PRINCIPLES' && (
+                   key={principle.num}
@@ -752,1 +752,1 @@ src/App.tsx
-           <div className="space-y-6">
+                   className="bg-white rounded-xl border border-stone-200 p-5 shadow-xs flex flex-col justify-between hover:border-stone-300 transition-all"
@@ -753,1 +753,1 @@ src/App.tsx
-             <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs">
+                 >
@@ -754,1 +754,1 @@ src/App.tsx
-               <div className="max-w-3xl">
+                   <div>
@@ -755,1 +755,1 @@ src/App.tsx
-                 <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2">
+                     <div className="flex items-center justify-between mb-3">
@@ -756,1 +756,1 @@ src/App.tsx
-                   <ShieldCheck className="w-5 h-5 text-emerald-600" />
+                       <span className="w-7 h-7 rounded-lg bg-stone-900 text-amber-400 font-mono text-xs font-bold flex items-center justify-center">
@@ -757,1 +757,1 @@ src/App.tsx
-                   <span>المبادئ المعمارية الإلزامية الصارمة (The 12 Invariants)</span>
+                         #{principle.num}
@@ -758,1 +758,1 @@ src/App.tsx
-                 </h2>
+                       </span>
@@ -759,1 +759,1 @@ src/App.tsx
-                 <p className="text-xs text-stone-600 mt-1 leading-relaxed">
+                       <span className="text-[10px] font-bold text-stone-400 bg-stone-100 px-2 py-0.5 rounded">
@@ -760,1 +760,1 @@ src/App.tsx
-                   هذه المبادئ الـ 12 هي السقف الهندسي الحاكم لكامل المنظومة. لا يُسمح بأي استثناء أو خرق لأي مبدأ في أي مرحلة تطويرية أو كود تنفيذي.
+                         INVARIANT RULE
@@ -761,1 +761,1 @@ src/App.tsx
-                 </p>
+                       </span>
@@ -762,1 +762,1 @@ src/App.tsx
-               </div>
+                     </div>
@@ -763,1 +763,1 @@ src/App.tsx
-             </div>
+                     <h3 className="text-sm font-bold text-stone-900 mb-2">
@@ -764,1 +764,1 @@ src/App.tsx
- 
+                       {principle.title}
@@ -765,1 +765,1 @@ src/App.tsx
-             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
+                     </h3>
@@ -766,1 +766,1 @@ src/App.tsx
-               {MANDATORY_PRINCIPLES.map(principle => (
+                     <p className="text-xs text-stone-600 leading-relaxed">
@@ -767,1 +767,1 @@ src/App.tsx
-                 <div 
+                       {principle.desc}
@@ -768,1 +768,1 @@ src/App.tsx
-                   key={principle.num}
+                     </p>
@@ -769,1 +769,1 @@ src/App.tsx
-                   className="bg-white rounded-xl border border-stone-200 p-5 shadow-xs flex flex-col justify-between hover:border-stone-300 transition-all"
+                   </div>
@@ -770,1 +770,1 @@ src/App.tsx
-                 >
+                   
@@ -771,1 +771,1 @@ src/App.tsx
-                   <div>
+                   <div className="mt-4 pt-3 border-t border-stone-100 flex items-center gap-1.5 text-[11px] font-medium text-emerald-700">
@@ -772,1 +772,1 @@ src/App.tsx
-                     <div className="flex items-center justify-between mb-3">
+                     <CheckCircle2 className="w-3.5 h-3.5" />
@@ -773,1 +773,1 @@ src/App.tsx
-                       <span className="w-7 h-7 rounded-lg bg-stone-900 text-amber-400 font-mono text-xs font-bold flex items-center justify-center">
+                     <span>{t("navigation.labels.txt_c37ba7")}</span>
@@ -774,1 +774,1 @@ src/App.tsx
-                         #{principle.num}
+                   </div>
@@ -775,1 +775,1 @@ src/App.tsx
-                       </span>
+                 </div>
@@ -776,1 +776,1 @@ src/App.tsx
-                       <span className="text-[10px] font-bold text-stone-400 bg-stone-100 px-2 py-0.5 rounded">
+               ))}
@@ -777,1 +777,1 @@ src/App.tsx
-                         INVARIANT RULE
+             </div>
@@ -778,1 +778,1 @@ src/App.tsx
-                       </span>
+           </div>
@@ -779,1 +779,1 @@ src/App.tsx
-                     </div>
+         )}
@@ -780,1 +780,1 @@ src/App.tsx
-                     <h3 className="text-sm font-bold text-stone-900 mb-2">
+ 
@@ -781,1 +781,1 @@ src/App.tsx
-                       {principle.title}
+         {/* ================= TAB 3: SPECIFICATION DOCUMENTS VIEWER ================= */}
@@ -782,1 +782,1 @@ src/App.tsx
-                     </h3>
+         {activeTab === 'DOCS' && (
@@ -783,1 +783,1 @@ src/App.tsx
-                     <p className="text-xs text-stone-600 leading-relaxed">
+           <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
@@ -784,1 +784,1 @@ src/App.tsx
-                       {principle.desc}
+             {/* Sidebar Documents List */}
@@ -785,1 +785,1 @@ src/App.tsx
-                     </p>
+             <div className="lg:col-span-1 space-y-2">
@@ -786,1 +786,1 @@ src/App.tsx
-                   </div>
+               <div className="bg-white rounded-xl border border-stone-200 p-3 shadow-xs">
@@ -787,1 +787,1 @@ src/App.tsx
-                   
+                 <div className="text-xs font-bold text-stone-900 px-2 py-1 mb-1">
@@ -788,1 +788,1 @@ src/App.tsx
-                   <div className="mt-4 pt-3 border-t border-stone-100 flex items-center gap-1.5 text-[11px] font-medium text-emerald-700">
+                   {t("navigation.labels.txt_8cf69f")}</div>
@@ -789,1 +789,1 @@ src/App.tsx
-                     <CheckCircle2 className="w-3.5 h-3.5" />
+                 <div className="space-y-1">
@@ -790,1 +790,1 @@ src/App.tsx
-                     <span>مطبق ومحمي في الكود المعماري</span>
+                   {ARCHITECTURE_DOCS.map(doc => {
@@ -791,1 +791,1 @@ src/App.tsx
-                   </div>
+                     const isSelected = doc.id === selectedDocId;
@@ -792,1 +792,1 @@ src/App.tsx
-                 </div>
+                     return (
@@ -793,1 +793,1 @@ src/App.tsx
-               ))}
+                       <button
@@ -794,1 +794,1 @@ src/App.tsx
-             </div>
+                         key={doc.id}
@@ -795,1 +795,1 @@ src/App.tsx
-           </div>
+                         id={`doc-nav-${doc.id}`}
@@ -796,1 +796,1 @@ src/App.tsx
-         )}
+                         onClick={() => setSelectedDocId(doc.id)}
@@ -797,1 +797,1 @@ src/App.tsx
- 
+                         className={`w-full text-right px-3 py-2.5 rounded-lg text-xs font-medium transition-all flex items-center justify-between ${
@@ -798,1 +798,1 @@ src/App.tsx
-         {/* ================= TAB 3: SPECIFICATION DOCUMENTS VIEWER ================= */}
+                           isSelected 
@@ -799,1 +799,1 @@ src/App.tsx
-         {activeTab === 'DOCS' && (
+                             ? 'bg-stone-900 text-white shadow-xs' 
@@ -800,1 +800,1 @@ src/App.tsx
-           <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
+                             : 'text-stone-700 hover:bg-stone-100'
@@ -801,1 +801,1 @@ src/App.tsx
-             {/* Sidebar Documents List */}
+                         }`}
@@ -802,1 +802,1 @@ src/App.tsx
-             <div className="lg:col-span-1 space-y-2">
+                       >
@@ -803,1 +803,1 @@ src/App.tsx
-               <div className="bg-white rounded-xl border border-stone-200 p-3 shadow-xs">
+                         <div className="flex items-center gap-2 min-w-0">
@@ -804,1 +804,1 @@ src/App.tsx
-                 <div className="text-xs font-bold text-stone-900 px-2 py-1 mb-1">
+                           {getDocIcon(doc.iconName)}
@@ -805,1 +805,1 @@ src/App.tsx
-                   المستندات المعمارية المعتمدة (docs/)
+                           <span className="truncate">{doc.titleAr}</span>
@@ -806,1 +806,1 @@ src/App.tsx
-                 </div>
+                         </div>
@@ -807,1 +807,1 @@ src/App.tsx
-                 <div className="space-y-1">
+                         <span className={`font-mono text-[10px] shrink-0 ${isSelected ? 'text-stone-400' : 'text-stone-400'}`}>
@@ -808,1 +808,1 @@ src/App.tsx
-                   {ARCHITECTURE_DOCS.map(doc => {
+                           .md
@@ -809,1 +809,1 @@ src/App.tsx
-                     const isSelected = doc.id === selectedDocId;
+                         </span>
@@ -810,1 +810,1 @@ src/App.tsx
-                     return (
+                       </button>
@@ -811,1 +811,1 @@ src/App.tsx
-                       <button
+                     );
@@ -812,1 +812,1 @@ src/App.tsx
-                         key={doc.id}
+                   })}
@@ -813,1 +813,1 @@ src/App.tsx
-                         id={`doc-nav-${doc.id}`}
+                 </div>
@@ -814,1 +814,1 @@ src/App.tsx
-                         onClick={() => setSelectedDocId(doc.id)}
+               </div>
@@ -815,1 +815,1 @@ src/App.tsx
-                         className={`w-full text-right px-3 py-2.5 rounded-lg text-xs font-medium transition-all flex items-center justify-between ${
+ 
@@ -816,1 +816,1 @@ src/App.tsx
-                           isSelected 
+               {/* Document Summary Pill */}
@@ -817,1 +817,1 @@ src/App.tsx
-                             ? 'bg-stone-900 text-white shadow-xs' 
+               <div className="bg-stone-50 rounded-xl border border-stone-200 p-4 text-xs text-stone-600">
@@ -818,1 +818,1 @@ src/App.tsx
-                             : 'text-stone-700 hover:bg-stone-100'
+                 <div className="font-bold text-stone-900 mb-1 flex items-center gap-1.5">
@@ -819,1 +819,1 @@ src/App.tsx
-                         }`}
+                   <FileText className="w-3.5 h-3.5 text-stone-500" />
@@ -820,1 +820,1 @@ src/App.tsx
-                       >
+                   <span>{t("navigation.labels.txt_72b405")}</span>
@@ -821,1 +821,1 @@ src/App.tsx
-                         <div className="flex items-center gap-2 min-w-0">
+                 </div>
@@ -822,1 +822,1 @@ src/App.tsx
-                           {getDocIcon(doc.iconName)}
+                 <p className="leading-relaxed">
@@ -823,1 +823,1 @@ src/App.tsx
-                           <span className="truncate">{doc.titleAr}</span>
+                   {selectedDoc.summaryAr}
@@ -824,1 +824,1 @@ src/App.tsx
-                         </div>
+                 </p>
@@ -825,1 +825,1 @@ src/App.tsx
-                         <span className={`font-mono text-[10px] shrink-0 ${isSelected ? 'text-stone-400' : 'text-stone-400'}`}>
+                 <div className="mt-3 pt-2 border-t border-stone-200/60 font-mono text-[11px] text-stone-500">
@@ -826,1 +826,1 @@ src/App.tsx
-                           .md
+                   المسار: {selectedDoc.filename}
@@ -827,1 +827,1 @@ src/App.tsx
-                         </span>
+                 </div>
@@ -828,1 +828,1 @@ src/App.tsx
-                       </button>
+               </div>
@@ -829,1 +829,1 @@ src/App.tsx
-                     );
+             </div>
@@ -830,1 +830,1 @@ src/App.tsx
-                   })}
+ 
@@ -831,1 +831,1 @@ src/App.tsx
-                 </div>
+             {/* Document Reader Main Panel */}
@@ -832,1 +832,1 @@ src/App.tsx
-               </div>
+             <div className="lg:col-span-3 bg-white rounded-2xl border border-stone-200 p-6 shadow-xs">
@@ -833,1 +833,1 @@ src/App.tsx
- 
+               <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-6 border-b border-stone-100 gap-3">
@@ -834,1 +834,1 @@ src/App.tsx
-               {/* Document Summary Pill */}
+                 <div>
@@ -835,1 +835,1 @@ src/App.tsx
-               <div className="bg-stone-50 rounded-xl border border-stone-200 p-4 text-xs text-stone-600">
+                   <div className="flex items-center gap-2 mb-1">
@@ -836,1 +836,1 @@ src/App.tsx
-                 <div className="font-bold text-stone-900 mb-1 flex items-center gap-1.5">
+                     <span className="font-mono text-xs px-2 py-0.5 rounded bg-stone-100 text-stone-700 border border-stone-200">
@@ -837,1 +837,1 @@ src/App.tsx
-                   <FileText className="w-3.5 h-3.5 text-stone-500" />
+                       {selectedDoc.filename}
@@ -838,1 +838,1 @@ src/App.tsx
-                   <span>ملخص المستند:</span>
+                     </span>
@@ -839,1 +839,1 @@ src/App.tsx
-                 </div>
+                     <span className="text-xs text-stone-400">•</span>
@@ -840,1 +840,1 @@ src/App.tsx
-                 <p className="leading-relaxed">
+                     <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
@@ -841,1 +841,1 @@ src/App.tsx
-                   {selectedDoc.summaryAr}
+                       Production Ready Spec
@@ -842,1 +842,1 @@ src/App.tsx
-                 </p>
+                     </span>
@@ -843,1 +843,1 @@ src/App.tsx
-                 <div className="mt-3 pt-2 border-t border-stone-200/60 font-mono text-[11px] text-stone-500">
+                   </div>
@@ -844,1 +844,1 @@ src/App.tsx
-                   المسار: {selectedDoc.filename}
+                   <h2 className="text-lg font-bold text-stone-900">
@@ -845,1 +845,1 @@ src/App.tsx
-                 </div>
+                     {selectedDoc.titleAr} ({selectedDoc.titleEn})
@@ -846,1 +846,1 @@ src/App.tsx
-               </div>
+                   </h2>
@@ -847,1 +847,1 @@ src/App.tsx
-             </div>
+                 </div>
@@ -849,1 +849,1 @@ src/App.tsx
-             {/* Document Reader Main Panel */}
+                 <div className="flex items-center gap-2 text-xs">
@@ -850,1 +850,1 @@ src/App.tsx
-             <div className="lg:col-span-3 bg-white rounded-2xl border border-stone-200 p-6 shadow-xs">
+                   <span className="text-stone-500">
@@ -851,1 +851,1 @@ src/App.tsx
-               <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-6 border-b border-stone-100 gap-3">
+                     {t("navigation.labels.txt_3a0110")}</span>
@@ -852,1 +852,1 @@ src/App.tsx
-                 <div>
+                 </div>
@@ -853,1 +853,1 @@ src/App.tsx
-                   <div className="flex items-center gap-2 mb-1">
+               </div>
@@ -854,1 +854,1 @@ src/App.tsx
-                     <span className="font-mono text-xs px-2 py-0.5 rounded bg-stone-100 text-stone-700 border border-stone-200">
+ 
@@ -855,1 +855,1 @@ src/App.tsx
-                       {selectedDoc.filename}
+               {/* Markdown Display */}
@@ -856,1 +856,1 @@ src/App.tsx
-                     </span>
+               <div className="prose prose-stone max-w-none prose-headings:font-bold prose-h1:text-xl prose-h2:text-base prose-h3:text-sm prose-p:text-xs prose-p:leading-relaxed prose-li:text-xs prose-code:font-mono prose-code:text-xs prose-code:bg-stone-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-pre:bg-stone-900 prose-pre:text-stone-100 prose-pre:p-4 prose-pre:rounded-xl">
@@ -857,1 +857,1 @@ src/App.tsx
-                     <span className="text-xs text-stone-400">•</span>
+                 <ReactMarkdown>
@@ -858,1 +858,1 @@ src/App.tsx
-                     <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
+                   {selectedDoc.content}
@@ -859,1 +859,1 @@ src/App.tsx
-                       Production Ready Spec
+                 </ReactMarkdown>
@@ -860,1 +860,1 @@ src/App.tsx
-                     </span>
+               </div>
@@ -861,1 +861,1 @@ src/App.tsx
-                   </div>
+             </div>
@@ -862,1 +862,1 @@ src/App.tsx
-                   <h2 className="text-lg font-bold text-stone-900">
+           </div>
@@ -863,1 +863,1 @@ src/App.tsx
-                     {selectedDoc.titleAr} ({selectedDoc.titleEn})
+         )}
@@ -864,1 +864,1 @@ src/App.tsx
-                   </h2>
+ 
@@ -865,1 +865,1 @@ src/App.tsx
-                 </div>
+       </main>
@@ -867,1 +867,1 @@ src/App.tsx
-                 <div className="flex items-center gap-2 text-xs">
+       {/* Clean Technical Footer */}
@@ -868,1 +868,1 @@ src/App.tsx
-                   <span className="text-stone-500">
+       <footer className="bg-white border-t border-stone-200 mt-auto py-4">
@@ -869,1 +869,1 @@ src/App.tsx
-                     لا يحتوي على بيانات وهمية (Mock Data) أو واجهات مؤقتة
+         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-stone-500 gap-2">
@@ -870,1 +870,1 @@ src/App.tsx
-                   </span>
+           <div className="flex items-center gap-2">
@@ -871,1 +871,1 @@ src/App.tsx
-                 </div>
+             <span className="font-bold text-stone-800">Q Saudi Work Follow</span>
@@ -872,1 +872,1 @@ src/App.tsx
-               </div>
+             <span>•</span>
@@ -873,1 +873,1 @@ src/App.tsx
- 
+             <span>{t("navigation.labels.txt_276201")}</span>
@@ -874,1 +874,1 @@ src/App.tsx
-               {/* Markdown Display */}
+           </div>
@@ -875,1 +875,1 @@ src/App.tsx
-               <div className="prose prose-stone max-w-none prose-headings:font-bold prose-h1:text-xl prose-h2:text-base prose-h3:text-sm prose-p:text-xs prose-p:leading-relaxed prose-li:text-xs prose-code:font-mono prose-code:text-xs prose-code:bg-stone-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-pre:bg-stone-900 prose-pre:text-stone-100 prose-pre:p-4 prose-pre:rounded-xl">
+           <div className="flex items-center gap-3">
@@ -876,1 +876,1 @@ src/App.tsx
-                 <ReactMarkdown>
+             <span>Firestore SSOT</span>
@@ -877,1 +877,1 @@ src/App.tsx
-                   {selectedDoc.content}
+             <span>•</span>
@@ -878,1 +878,1 @@ src/App.tsx
-                 </ReactMarkdown>
+             <span>Google Sheets Projection</span>
@@ -879,1 +879,1 @@ src/App.tsx
-               </div>
+             <span>•</span>
@@ -880,1 +880,1 @@ src/App.tsx
-             </div>
+             <span>Offline-First (IndexedDB)</span>
@@ -882,1 +882,1 @@ src/App.tsx
-         )}
+         </div>
@@ -883,1 +883,1 @@ src/App.tsx
- 
+       </footer>
@@ -884,1 +884,1 @@ src/App.tsx
-       </main>
+ 
@@ -885,1 +885,1 @@ src/App.tsx
- 
+       {/* Floating Offline Status Pill & Sync Banner */}
@@ -886,1 +886,1 @@ src/App.tsx
-       {/* Clean Technical Footer */}
+       <OfflineIndicator onOpenOutbox={() => setIsOutboxOpen(true)} />
@@ -887,1 +887,1 @@ src/App.tsx
-       <footer className="bg-white border-t border-stone-200 mt-auto py-4">
+ 
@@ -888,1 +888,1 @@ src/App.tsx
-         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-stone-500 gap-2">
+       {/* Outbox Drawer (Operations Queue, Manual Sync, Network Simulator) */}
@@ -889,1 +889,1 @@ src/App.tsx
-           <div className="flex items-center gap-2">
+       <OutboxDrawer isOpen={isOutboxOpen} onClose={() => setIsOutboxOpen(false)} />
@@ -890,1 +890,1 @@ src/App.tsx
-             <span className="font-bold text-stone-800">Q Saudi Work Follow</span>
+     </div>
@@ -891,1 +891,1 @@ src/App.tsx
-             <span>•</span>
+   );
@@ -892,1 +892,1 @@ src/App.tsx
-             <span>هندسة معمارية للمشاريع الكبرى وسلاسل الإمداد الميدانية بالمملكة</span>
+ }
@@ -893,1 +893,1 @@ src/App.tsx
-           </div>
+ 
@@ -894,1 +894,1 @@ src/App.tsx
-           <div className="flex items-center gap-3">
+ 
@@ -895,1 +895,1 @@ src/App.tsx
-             <span>Firestore SSOT</span>
+ 
@@ -896,1 +896,1 @@ src/App.tsx
-             <span>•</span>
+ 
@@ -897,1 +897,1 @@ src/App.tsx
-             <span>Google Sheets Projection</span>
+ 
@@ -898,1 +898,1 @@ src/App.tsx
-             <span>•</span>
+ 
@@ -899,1 +899,1 @@ src/App.tsx
-             <span>Offline-First (IndexedDB)</span>
+ 
@@ -900,1 +900,1 @@ src/App.tsx
-           </div>
+ 
@@ -901,1 +901,1 @@ src/App.tsx
-         </div>
+ 
@@ -902,1 +902,1 @@ src/App.tsx
-       </footer>
+ 
@@ -904,1 +904,1 @@ src/App.tsx
-       {/* Floating Offline Status Pill & Sync Banner */}
+ 
@@ -905,1 +905,1 @@ src/App.tsx
-       <OfflineIndicator onOpenOutbox={() => setIsOutboxOpen(true)} />
+ 
@@ -907,1 +907,1 @@ src/App.tsx
-       {/* Outbox Drawer (Operations Queue, Manual Sync, Network Simulator) */}
+ 
@@ -908,1 +908,1 @@ src/App.tsx
-       <OutboxDrawer isOpen={isOutboxOpen} onClose={() => setIsOutboxOpen(false)} />
+ 
@@ -909,1 +909,1 @@ src/App.tsx
-     </div>
+ 
@@ -910,1 +910,1 @@ src/App.tsx
-   );
+ 
@@ -911,1 +911,1 @@ src/App.tsx
- }
+ 
```
