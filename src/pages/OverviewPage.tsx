import type { CareGap, EhrNote, LabResult, Medication, MemberProfile, PriorAuthorization } from '../types/domain'
import type { TicketRow } from '../types/dashboard'
import { OverviewView } from '../components/DashboardViews'
import type { PatientDetailApiRecord } from '../services/dashboardApi'

interface OverviewPageProps {
  selectedMember: MemberProfile | null
  selectedTicket: TicketRow | null
  selectedPatientDetail: PatientDetailApiRecord | null
  patientDetailLoading: boolean
  patientDetailError: string
  careGapsLoading: boolean
  careGapsError: string
  labResultsLoading: boolean
  labResultsError: string
  medicationsLoading: boolean
  medicationsError: string
  priorAuthsLoading: boolean
  priorAuthsError: string
  ehrNotesLoading: boolean
  ehrNotesError: string
  selectedNotes: EhrNote[]
  selectedLabs: LabResult[]
  selectedMeds: Medication[]
  selectedGaps: CareGap[]
  selectedAuths: PriorAuthorization[]
}

export function OverviewPage(props: OverviewPageProps) {
  return <OverviewView {...props} />
}
