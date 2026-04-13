import type { CarePlanDraft, DeepDiveQuestionResponse, DeepDiveSectionId } from '../types/callWorkflow'
import type { SuggestedQuestion } from '../types/questions'
import { SummaryView } from '../components/DashboardViews'

interface SummaryPageProps {
  draft: CarePlanDraft | null
  onUpdateDraft: (field: keyof CarePlanDraft, value: string | string[]) => void
  onUpdateDraftListItem: (
    field: 'activeDiagnoses' | 'currentMedications' | 'openCareGaps' | 'recommendedInterventions' | 'followUpActions',
    index: number,
    value: string,
  ) => void
  onAddDraftItem: (field: 'activeDiagnoses' | 'currentMedications' | 'openCareGaps' | 'recommendedInterventions' | 'followUpActions') => void
  onRemoveDraftItem: (
    field: 'activeDiagnoses' | 'currentMedications' | 'openCareGaps' | 'recommendedInterventions' | 'followUpActions',
    index: number,
  ) => void
  onSaveDraft: () => void
  onExportAsPdf: () => void
  onStartNewCall: () => void
  toastVisible: boolean
  sectionQuestions: Record<DeepDiveSectionId, SuggestedQuestion[]>
  deepDiveResponses: Record<DeepDiveSectionId, Record<string, DeepDiveQuestionResponse>>
}

export function SummaryPage({ draft }: SummaryPageProps) {
  if (!draft) return null
  return <SummaryView />
}
