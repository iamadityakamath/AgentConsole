export type QuestionCategory = 'Social' | 'Care Gaps' | 'Labs' | 'Medication' | 'Prior Auth' | 'Utilization'

export interface SuggestedQuestion {
  id: string
  category: QuestionCategory
  text: string
  isCritical?: boolean
}

export interface QuestionUIState {
  checked: boolean
  skipped: boolean
}
