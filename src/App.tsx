import React, { useState, useEffect } from 'react';
import { 
  Building2, Truck, Calculator, Layers, UserCheck, Navigation, Clock, AlertTriangle, AlertOctagon,
  FileText, RefreshCw, Database, ShieldCheck, WifiOff, Code, CheckCircle2, ChevronLeft, ChevronRight,
  ExternalLink, BookOpen, Boxes, Share2, Lock, ShieldAlert, FileSpreadsheet, LayoutDashboard, Wifi, Inbox
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
import { ReportsEngineView } from './components/reports/ReportsEngineView';
import { OperationsDashboardView } from './components/dashboard/OperationsDashboardView';
import { ExceptionEngineView } from './components/exceptionEngine/ExceptionEngineView';
import { WorkspaceIntegrationView } from './components/workspace/WorkspaceIntegrationView';
import { AdminConsoleView } from './components/admin/AdminConsoleView';
import { LegacyMigrationView } from './components/migration/LegacyMigrationView';
import { SecurityAuditView } from './components/security/SecurityAuditView';
import { AuthButton } from './components/auth/AuthButton';
import { PWAInstallButton } from './components/offline/PWAInstallButton';
import { OfflineIndicator } from './components/offline/OfflineIndicator';
import { OutboxDrawer } from './components/offline/OutboxDrawer';
import { LanguageSelector } from './components/i18n/LanguageSelector';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { outboxService } from './services/offline/outbox.service';
import { conflictResolutionService } from './services/offline/conflictResolution.service';

export default function App() {
  const [activeTab, setActiveTab] = useState<'SECURITY_AUDIT' | 'LEGACY_MIGRATION' | 'ADMIN_CONSOLE' | 'OPERATIONS_DASHBOARD' | 'REPORTS_ENGINE' | 'TRIP_ENGINE' | 'WORKSPACE_INTEGRATION' | 'EXCEPTION_ENGINE' | 'IMPORT_CENTER' | 'DATA_QUALITY' | 'MASTER_DATA' | 'PRICING_ENGINE' | 'WIZARD' | 'FIRESTORE_ARCH' | 'RELATIONS' | 'PRINCIPLES' | 'DOCS'>('SECURITY_AUDIT');
  const [selectedEntityId, setSelectedEntityId] = useState<string>('Trip');
  const [selectedDocId, setSelectedDocId] = useState<string>('architecture');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isOutboxOpen, setIsOutboxOpen] = useState<boolean>(false);
  const { isOnline, isSimulatedOffline } = useOnlineStatus();
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [conflictCount, setConflictCount] = useState<number>(0);

  useEffect(() => {
    const updateCount = async () => {
      try {
        const [ops, confs] = await Promise.all([outboxService.getOperations(), conflictResolutionService.getConflicts()]);
        setPendingCount(ops.filter(o => o.status === 'PENDING' || o.status === 'FAILED' || o.status === 'SENDING').length);
        setConflictCount(confs.filter(c => c.status === 'OPEN').length);
      } catch (e) { /* operational counters are non-blocking */ }
    };
    updateCount();
    const interval = setInterval(updateCount, 2500);
    return () => clearInterval(interval);
  }, []);

  const selectedEntity = ENTITY_RELATIONS.find(e => e.id === selectedEntityId) || ENTITY_RELATIONS[6];
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
    <div className="min-h-screen bg-stone-50 text-stone-900 font-sans flex flex-col antialiased">
      <LanguageSelector />
      {/* The remaining presentation strings are intentionally being migrated module-by-module under the i18n audit gate. */}
      {/* ... existing application UI ... */}
    </div>
  );
}
