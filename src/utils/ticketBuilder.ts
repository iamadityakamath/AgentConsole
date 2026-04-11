import type { DashboardData, SeverityLevel } from '../types/domain'
import type { TicketRow } from '../types/dashboard'
import { calculateSeverityScore, levelFromScore, severityRank } from './severity'

function byDateDesc<T>(arr: T[], getter: (item: T) => string): T[] {
  return arr.slice().sort((a, b) => new Date(getter(b)).getTime() - new Date(getter(a)).getTime())
}

function severityFromRiskTier(riskTier: string | undefined, fallback: SeverityLevel): SeverityLevel {
  if (!riskTier) return fallback
  const value = riskTier.toLowerCase()
  if (value.includes('tier 1')) return 'Critical'
  if (value.includes('tier 2')) return 'High'
  if (value.includes('tier 3')) return 'Medium'
  if (value.includes('tier 4')) return 'Low'
  return fallback
}

function insurancePlanLabel(planType: string | undefined): string {
  if (!planType) return 'N/A'
  if (planType.includes('Dual Eligible Special Needs Plan')) return 'D-SNP'
  if (planType.includes('Medicaid Managed Care')) return 'Medicaid Standard'
  return planType
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
      const computedLevel = levelFromScore(score)
      const level = severityFromRiskTier(member.risk_tier, computedLevel)

      const sortedNotes = byDateDesc(notes, (n) => n.note_date)
      const recentDiagnoses = Array.from(
        new Set(sortedNotes.slice(0, 3).map((n) => n.primary_diagnosis).filter(Boolean)),
      )

      return {
        memberId: member.member_id,
        patientName: member.patient_name,
        ageGender: `${member.age}${member.gender.trim().charAt(0).toUpperCase()}`,
        location: member.location,
        preferredLanguage: member.preferred_language ?? 'English',
        preferredContactMethod: member.preferred_contact_method ?? 'Phone',
        assignedCoordinator: member.assigned_coordinator ?? 'Unassigned',
        insurancePlanLabel: insurancePlanLabel(member.insurance_plan_type),
        riskTier: member.risk_tier ?? 'Tier 4 — Low',
        severityScore: score,
        severityLevel: level,
        primaryConditions: member.primary_conditions
          ? member.primary_conditions.split(',').map((entry) => entry.trim()).filter(Boolean)
          : recentDiagnoses.length ? recentDiagnoses : ['No diagnosis on file'],
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
