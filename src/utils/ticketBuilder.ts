import type { DashboardData, SeverityLevel } from '../types/domain'
import type { TicketRow } from '../types/dashboard'
import { calculateSeverityScore, levelFromScore, severityRank } from './severity'

function byDateDesc<T>(arr: T[], getter: (item: T) => string): T[] {
  return arr.slice().sort((a, b) => new Date(getter(b)).getTime() - new Date(getter(a)).getTime())
}

export function buildTickets(data: DashboardData): TicketRow[] {
  return data.members
    .map((member) => {
      const notes = data.ehrNotes.filter((n) => n.member_id === member.member_id)
      const labs = data.labResults.filter((l) => l.member_id === member.member_id)
      const gaps = data.careGaps.filter((g) => g.member_id === member.member_id)
      const meds = data.medications.filter((m) => m.member_id === member.member_id)
      const auths = data.priorAuths.filter((a) => a.member_id === member.member_id)
      const claims = data.insuranceClaims.filter((c) => c.member_id === member.member_id)

      const score = calculateSeverityScore({ labs, gaps, meds, auths, notes, claims })
      const level = levelFromScore(score)

      const sortedNotes = byDateDesc(notes, (n) => n.note_date)
      const recentDiagnoses = Array.from(
        new Set(sortedNotes.slice(0, 3).map((n) => n.primary_diagnosis).filter(Boolean)),
      )

      return {
        memberId: member.member_id,
        patientName: member.patient_name,
        severityScore: score,
        severityLevel: level,
        primaryConditions: recentDiagnoses.length ? recentDiagnoses : ['No diagnosis on file'],
        openCareGapsCount: gaps.filter((g) => g.gap_status === 'Open').length,
        criticalLabFlags: labs.filter((l) => l.result_flag === 'Critical High' || l.result_flag === 'Critical Low').length,
        lastContactDate: sortedNotes[0]?.note_date ?? null,
        nonAdherentMedicationCount: meds.filter((m) => m.adherence_status === 'Non-Adherent').length,
      } satisfies TicketRow
    })
    .sort((a, b) => {
      const levelDelta = severityRank[b.severityLevel] - severityRank[a.severityLevel]
      if (levelDelta !== 0) return levelDelta
      if (b.openCareGapsCount !== a.openCareGapsCount) {
        return b.openCareGapsCount - a.openCareGapsCount
      }
      return a.patientName.localeCompare(b.patientName)
    })
}

export function filterTickets(
  tickets: TicketRow[],
  filter: 'All' | SeverityLevel,
  searchTerm: string,
): TicketRow[] {
  const term = searchTerm.trim().toLowerCase()
  return tickets.filter((ticket) => {
    const filterMatch = filter === 'All' || ticket.severityLevel === filter
    const searchMatch =
      !term ||
      ticket.patientName.toLowerCase().includes(term) ||
      ticket.memberId.toLowerCase().includes(term)
    return filterMatch && searchMatch
  })
}
