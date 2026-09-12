/**
 * Types for Operations Dashboard
 * Covers filters, role-based project authorization, metric aggregations, and live terminal board.
 */

import { TripEngineStatus, TripPricingType } from './tripEngine';

export interface DashboardFilterParams {
  projectId: string; // 'ALL' or specific authorized projectId
  shiftDateFrom: string; // 'YYYY-MM-DD' or ''
  shiftDateTo: string; // 'YYYY-MM-DD' or ''
  carrierId: string; // 'ALL' or specific carrierId
  materialId: string; // 'ALL' or specific materialId
  pricingType: TripPricingType | 'ALL';
}

export interface UserSecurityProfile {
  userId: string;
  userNameAr: string;
  roleTitleAr: string;
  role: 'SUPER_ADMIN' | 'PROJECT_ADMIN' | 'SITE_SUPERVISOR' | 'AUDITOR';
  authorizedProjectIds: string[]; // List of project IDs this user is authorized to view
  isRestricted: boolean;
}

export interface TripStatusMetrics {
  totalTrips: number;
  completedTrips: number;
  inTransitTrips: number;
  returnedTrips: number;
  exceptionTrips: number;
  completedRatePercent: number;
  returnedRatePercent: number;
  pendingReviewTrips?: number;
  pendingPricingTrips?: number;
  weighbridgeTrips?: number;
  manualTrips?: number;
}

export interface TonnageMetrics {
  totalLoadedTons: number;
  totalReceivedTons: number;
  totalVarianceTons: number;
  variancePercent: number;
  isVarianceAcceptable: boolean; // within ±1% tolerance
}

export interface SettlementMetrics {
  totalSettlementAmount: number;
  tripBasedSettlementAmount: number;
  tonBasedSettlementAmount: number;
  tripBasedTripsCount: number;
  tonBasedTripsCount: number;
  currency: string;
}

export interface CarrierPerformanceItem {
  carrierId: string;
  carrierNameAr: string;
  totalTrips: number;
  completedTrips: number;
  returnedTrips: number;
  exceptionTrips: number;
  loadedTons: number;
  receivedTons: number;
  varianceTons: number;
  settlementAmount: number;
  completionRatePercent: number;
}

export interface MaterialDistributionItem {
  materialId: string;
  materialNameAr: string;
  code: string;
  totalTrips: number;
  loadedTons: number;
  receivedTons: number;
  settlementAmount: number;
  sharePercent: number; // Share of total volume
}

export interface PricingDistributionItem {
  pricingType: TripPricingType;
  titleAr: string;
  totalTrips: number;
  totalTons: number;
  totalSettlementAmount: number;
  averageRate: number;
  sharePercent: number; // Share of total settlement
}

export interface LiveTerminalEntry {
  tripId: string;
  tripSerial: string;
  ticketId: string;
  projectId: string;
  projectNameAr: string;
  truckPlateAr: string;
  truckType?: string;
  driverNameAr: string;
  carrierNameAr: string;
  materialNameAr: string;
  pricingType: TripPricingType;
  status: TripEngineStatus;
  loadedWeightKg: number;
  receivedWeightKg: number | null;
  varianceKg: number | null;
  variancePercent: number | null;
  settlementAmount: number;
  currency: string;
  eventTimeFormatted: string;
  notes: string;
}
