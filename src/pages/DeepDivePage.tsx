import type { CareGap, EhrNote, InsuranceClaim, LabResult, Medication, MemberProfile, PharmacyClaim, PriorAuthorization } from '../types/domain'
import type { SuggestedQuestion } from '../types/questions'
import type { DeepDiveQuestionResponse, DeepDiveSectionId } from '../types/callWorkflow'
import { DeepDiveView } from '../components/DashboardViews'
import type { PatientDetailApiRecord } from '../services/dashboardApi'

interface DeepDivePageProps {
  selectedMember: MemberProfile | null
  selectedPatientDetail: PatientDetailApiRecord | null
  patientDetailLoading: boolean
  patientDetailError: string
  selectedNotes: EhrNote[]
  selectedLabs: LabResult[]
  selectedMeds: Medication[]
  selectedGaps: CareGap[]
  selectedAuths: PriorAuthorization[]
  selectedClaims: InsuranceClaim[]
  selectedPharmacyClaims: PharmacyClaim[]
  activeDeepDiveSection: DeepDiveSectionId
  sectionQuestions: Record<DeepDiveSectionId, SuggestedQuestion[]>
  deepDiveResponses: Record<DeepDiveSectionId, Record<string, DeepDiveQuestionResponse>>
  supervisorNotes: string[]
  onSetActiveSection: (section: DeepDiveSectionId) => void
  onUpdateQuestion: (sectionId: DeepDiveSectionId, questionId: string, patch: Partial<DeepDiveQuestionResponse>) => void
  onFlagForSupervisor: () => void
  onCompleteCall: () => void
  getSectionProgress: (sectionId: DeepDiveSectionId) => { total: number; completed: number; allComplete: boolean }
}

export function DeepDivePage(props: DeepDivePageProps) {
  return <DeepDiveView {...props} />
}
