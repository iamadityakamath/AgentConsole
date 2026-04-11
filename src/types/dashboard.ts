import type { AppView, SeverityLevel } from './domain'

export interface TicketRow {
  memberId: string
  patientName: string
  ageGender: string
  location: string
  preferredLanguage: string
  preferredContactMethod: string
  assignedCoordinator: string
  insurancePlanLabel: string
  riskTier: string
  severityScore: number
  severityLevel: SeverityLevel
  primaryConditions: string[]
  openCareGapsCount: number
  criticalLabFlags: number
  lastContactDate: string | null
  nonAdherentMedicationCount: number
}

export interface DashboardSessionState {
  currentView: AppView
  selectedMemberId: string | null
  activeFilter: 'All' | SeverityLevel
  searchTerm: string
}
