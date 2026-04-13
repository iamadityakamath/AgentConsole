export type QuestionCategory = 'Social' | 'Care Gaps' | 'Labs' | 'Medication' | 'Prior Auth' | 'Utilization'

export interface SuggestedQuestion {
  id: string
  category: QuestionCategory
  text: string
  isCritical?: boolean
  sourcePositionId?: string
  sourceType?: string
  sourceLabel?: string
  patient_answer?: string
}

export interface QuestionUIState {
  checked: boolean
  skipped: boolean
}
