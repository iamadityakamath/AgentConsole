import type { DeepDiveQuestionResponse, DeepDiveSectionId } from '../types/callWorkflow'

export function createEmptySectionResponses(): Record<DeepDiveSectionId, Record<string, DeepDiveQuestionResponse>> {
  return {
    clinical: {},
    labs: {},
    medications: {},
    gaps: {},
    auths: {},
    claims: {},
  }
}

export function statusIsComplete(status: DeepDiveQuestionResponse['status']): boolean {
  return status === 'Patient Answered' || status === 'Skipped' || status === 'Needs Follow-Up'
}

export function sectionFromCategory(category: string): DeepDiveSectionId | null {
  if (category === 'Social') return 'clinical'
  if (category === 'Labs') return 'labs'
  if (category === 'Medication') return 'medications'
  if (category === 'Care Gaps') return 'gaps'
  if (category === 'Prior Auth') return 'auths'
  if (category === 'Utilization') return 'claims'
  return null
}

export function formatSectionQuestionCount(count: number, total: number): string {
  return `${count}/${total} questions answered`
}
