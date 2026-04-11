import type { CareGap, EhrNote, InsuranceClaim, LabResult, Medication, PriorAuthorization, SeverityLevel } from '../types/domain'

const DAY_MS = 24 * 60 * 60 * 1000

export const severityRank: Record<SeverityLevel, number> = {
  Critical: 4,
  High: 3,
  Medium: 2,
  Low: 1,
}

function daysSince(dateIso: string): number {
  const now = Date.now()
  const then = new Date(dateIso).getTime()
  return Math.max(0, Math.floor((now - then) / DAY_MS))
}

export function calculateSeverityScore(params: {
  labs: LabResult[]
  gaps: CareGap[]
  meds: Medication[]
  auths: PriorAuthorization[]
  notes: EhrNote[]
  claims: InsuranceClaim[]
}): number {
  const { labs, gaps, meds, auths, notes, claims } = params

  const criticalLabs = labs.filter((l) => l.result_flag === 'Critical High' || l.result_flag === 'Critical Low').length
  const criticalGaps = gaps.filter((g) => g.priority === 'Critical').length
  const highGaps = gaps.filter((g) => g.priority === 'High').length
  const nonAdherentMeds = meds.filter((m) => m.adherence_status === 'Non-Adherent').length
  const deniedOrPendingAuths = auths.filter((a) => a.decision === 'Denied' || a.decision === 'Pending').length

  const mostRecentNote = notes
    .slice()
    .sort((a, b) => new Date(b.note_date).getTime() - new Date(a.note_date).getTime())[0]
  const staleNoteBonus = mostRecentNote && daysSince(mostRecentNote.note_date) > 180 ? 25 : 0

  const erVisits = claims.filter((c) => c.place_of_service === 'Emergency Room').length
  const inpatientStays = claims.filter((c) => c.place_of_service === 'Inpatient Hospital').length

  return (
    criticalLabs * 40 +
    criticalGaps * 30 +
    highGaps * 15 +
    nonAdherentMeds * 20 +
    deniedOrPendingAuths * 10 +
    staleNoteBonus +
    erVisits * 20 +
    inpatientStays * 25
  )
}

export function levelFromScore(score: number): SeverityLevel {
  if (score >= 120) return 'Critical'
  if (score >= 60) return 'High'
  if (score >= 25) return 'Medium'
  return 'Low'
}
