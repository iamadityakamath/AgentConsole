export type DeepDiveSectionId = 'clinical' | 'labs' | 'medications' | 'gaps' | 'auths' | 'claims'

export type DeepDiveQuestionStatus = '' | 'Patient Answered' | 'Skipped' | 'Needs Follow-Up'

export interface DeepDiveQuestionResponse {
  notes: string
  status: DeepDiveQuestionStatus
}

export interface CarePlanDraft {
  patientName: string
  memberId: string
  date: string
  activeDiagnoses: string[]
  currentMedications: string[]
  openCareGaps: string[]
  recommendedInterventions: string[]
  followUpActions: string[]
  coordinatorNotes: string
}

export const deepDiveSections: Array<{
  id: DeepDiveSectionId
  label: string
  icon: string
}> = [
  { id: 'clinical', label: 'Clinical Notes & History', icon: 'C' },
  { id: 'labs', label: 'Lab Results', icon: 'L' },
  { id: 'medications', label: 'Medications', icon: 'M' },
  { id: 'gaps', label: 'Care Gaps', icon: 'G' },
  { id: 'auths', label: 'Prior Authorizations', icon: 'A' },
  { id: 'claims', label: 'Claims & Utilization', icon: 'U' },
]

export const deepDiveStatusStyles: Record<Exclude<DeepDiveQuestionStatus, ''>, string> = {
  'Patient Answered': 'border-emerald-200 bg-emerald-50 text-emerald-700',
  Skipped: 'border-slate-200 bg-slate-100 text-slate-600',
  'Needs Follow-Up': 'border-amber-200 bg-amber-50 text-amber-700',
}
