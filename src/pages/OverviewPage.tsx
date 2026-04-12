import type { CareGap, EhrNote, LabResult, Medication, MemberProfile, PriorAuthorization } from '../types/domain'
import type { TicketRow } from '../types/dashboard'
import type { QuestionCategory, QuestionUIState, SuggestedQuestion } from '../types/questions'
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
  visibleQuestions: SuggestedQuestion[]
  questionStateForMember: Record<string, QuestionUIState>
  newQuestionText: string
  newQuestionCategory: QuestionCategory
  draggingQuestionId: string | null
  dragOverQuestionId: string | null
  onQuestionStateChange: (questionId: string, patch: Partial<QuestionUIState>) => void
  onNewQuestionTextChange: (value: string) => void
  onNewQuestionCategoryChange: (category: QuestionCategory) => void
  onAddCustomQuestion: () => void
  onDragStart: (questionId: string) => void
  onDragOver: (questionId: string) => void
  onDrop: (questionId: string) => void
  onDragEnd: () => void
  onSkipQuestion: (questionId: string) => void
}

export function OverviewPage(props: OverviewPageProps) {
  return <OverviewView {...props} />
}
