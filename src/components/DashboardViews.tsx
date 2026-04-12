import type {
  CareGap,
  EhrNote,
  InsuranceClaim,
  LabResult,
  Medication,
  MemberProfile,
  PriorAuthorization,
  SeverityLevel,
} from '../types/domain'
import { useEffect, useMemo, useState } from 'react'
import type { TicketRow } from '../types/dashboard'
import type { SuggestedQuestion } from '../types/questions'
import type { PatientDetailApiRecord } from '../services/dashboardApi'
import {
  deepDiveSections,
  type CarePlanDraft,
  type DeepDiveQuestionResponse,
  type DeepDiveSectionId,
} from '../types/callWorkflow'
import {
  formatSectionQuestionCount,
  statusIsComplete,
} from '../utils/callWorkflow'

const severityPillStyles: Record<SeverityLevel, string> = {
  Critical: 'bg-red-100 text-red-700 border-red-200',
  High: 'bg-amber-100 text-amber-700 border-amber-200',
  Medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  Low: 'bg-emerald-100 text-emerald-700 border-emerald-200',
}

const labFlagStyles: Record<string, string> = {
  Normal: 'text-emerald-700',
  High: 'text-amber-700',
  Low: 'text-blue-700',
  'Critical High': 'font-semibold text-red-700',
  'Critical Low': 'font-semibold text-red-700',
}

const adherenceStyles: Record<string, string> = {
  Adherent: 'text-emerald-700',
  'Partially Adherent': 'text-amber-700',
  'Non-Adherent': 'text-red-700',
  'On Hold': 'text-slate-500',
  Discontinued: 'text-slate-500',
}

const categoryBorderStyles: Record<string, string> = {
  Medication: 'border-blue-500',
  Labs: 'border-red-500',
  'Care Gaps': 'border-orange-500',
  'Prior Auth': 'border-purple-500',
  Social: 'border-emerald-500',
  Utilization: 'border-teal-500',
}

function getQuestionPriorityStyle(priority: string): string {
  const value = priority.toLowerCase()
  if (value === 'critical') return 'border-red-200 bg-red-50 text-red-700'
  if (value === 'high') return 'border-amber-200 bg-amber-50 text-amber-700'
  if (value === 'medium') return 'border-yellow-200 bg-yellow-50 text-yellow-700'
  return 'border-slate-200 bg-white text-slate-600'
}

function formatQuestionCategory(value: string): string {
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

const gapPriorityStyles: Record<string, string> = {
  Critical: 'bg-red-100 text-red-700 border-red-200',
  High: 'bg-amber-100 text-amber-700 border-amber-200',
  Medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  Low: 'bg-emerald-100 text-emerald-700 border-emerald-200',
}

function formatDate(value: string | null): string {
  if (!value) return 'No contact recorded'
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
}

function truncateText(value: string, max = 60): string {
  if (value.length <= max) return value
  return `${value.slice(0, max - 3)}...`
}

function contactMethodIcon(method: string): string {
  const value = method.toLowerCase()
  if (value.includes('email')) return '✉️'
  if (value.includes('text')) return '💬'
  return '📞'
}

interface TicketQueueViewProps {
  visibleTickets: TicketRow[]
  activeFilter: 'All' | SeverityLevel
  searchTerm: string
  isLoading: boolean
  onFilterChange: (filter: 'All' | SeverityLevel) => void
  onSearchChange: (term: string) => void
  onBeginPrep: (memberId: string) => void
}

export function TicketQueueView({
  visibleTickets,
  activeFilter,
  searchTerm,
  isLoading,
  onFilterChange,
  onSearchChange,
  onBeginPrep,
}: TicketQueueViewProps) {
  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-800">Ticket Queue</h2>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          {isLoading ? (
            <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-300 border-t-clinical-header" />
          ) : null}
          <p>{visibleTickets.length} visible tickets</p>
        </div>
      </div>

      <div className="mb-4 flex items-center gap-3">
        {(['All', 'Critical', 'High', 'Medium', 'Low'] as const).map((filter) => (
          <button
            key={filter}
            onClick={() => onFilterChange(filter)}
            className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
              activeFilter === filter
                ? 'border-clinical-header bg-clinical-header text-white'
                : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400'
            }`}
          >
            {filter}
          </button>
        ))}

        <div className="ml-auto">
          <input
            type="text"
            value={searchTerm}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search by patient name or member ID"
            className="w-[320px] rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-clinical-header"
          />
        </div>
      </div>

      <div className="space-y-3">
        {isLoading ? (
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            Loading patients from API...
          </div>
        ) : null}
        {visibleTickets.map((ticket, idx) => (
          <article
            key={ticket.memberId}
            className={`grid grid-cols-[2.2fr_1fr] items-center gap-4 rounded-lg border px-5 py-4 ${
              idx % 2 === 1 ? 'bg-clinical-row' : 'bg-white'
            }`}
          >
            <div>
              <p className="text-lg font-semibold leading-tight text-slate-900">{ticket.patientName}</p>
              <p className="text-xs text-slate-500">Member ID: {ticket.memberId}</p>
              <p className="mt-1 text-sm text-slate-700">{ticket.ageGender} • {ticket.location}</p>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${severityPillStyles[ticket.severityLevel]}`}>
                  {ticket.riskTier}
                </span>
                <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${ticket.preferredLanguage.toLowerCase() === 'english' ? 'border-slate-300 bg-slate-100 text-slate-700' : 'border-violet-300 bg-violet-100 text-violet-700'}`}>
                  {ticket.preferredLanguage}
                </span>
                <span className="inline-flex rounded-full border border-slate-300 bg-white px-2 py-0.5 text-xs font-medium text-slate-700">
                  {contactMethodIcon(ticket.preferredContactMethod)} {ticket.preferredContactMethod}
                </span>
              </div>

              <div className="mt-2 flex flex-wrap gap-2">
                {ticket.primaryConditions.slice(0, 3).map((condition) => (
                  <span key={condition} className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                    {condition}
                  </span>
                ))}
              </div>

              <p className="mt-2 text-xs text-slate-600">
                Coordinator: <span className="font-semibold text-slate-800">{ticket.assignedCoordinator}</span>
              </p>
              <p className="text-xs text-slate-600">
                Plan: <span className="font-medium text-slate-800">{ticket.insurancePlanLabel}</span>
              </p>
            </div>

            <div className="text-right">
              <button
                onClick={() => onBeginPrep(ticket.memberId)}
                className="rounded-md bg-clinical-header px-3 py-2 text-sm font-semibold text-white transition hover:brightness-110"
              >
                Start Call Prep
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}

interface OverviewViewProps {
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
}

interface AiTimelineEvent {
  date: string
  event_type: string
  title: string
  description: string
  source_position_id: string
  related_position_ids?: string[]
  clinical_significance?: string
}

interface AiCoordinatorQuestion {
  question_id: string
  source_position_id: string
  source_type: string
  source_label: string
  category: string
  priority: string
  question_text: string
  clinical_context?: string
}

interface AiSuggestionsResponse {
  clinical_story?: string
  timeline_events?: AiTimelineEvent[]
  coordinator_questions?: AiCoordinatorQuestion[]
  missed_follow_ups?: Array<{
    source_position_id: string
    note_date: string
    follow_up_date_recommended: string
    follow_up_found: boolean
    days_overdue: number
    clinical_risk: string
  }>
  medication_risk_connections?: Array<{
    source_position_id: string
    drug_name: string
    adherence_status: string
    days_since_last_fill: number
    connected_lab_position_ids: string[]
    connected_gap_position_ids: string[]
    connected_note_position_ids: string[]
    risk_summary: string
  }>
  coordinator_alerts?: Array<{
    rank: number
    alert_title: string
    connected_position_ids: string[]
    reason: string
    suggested_opening: string
  }>
}

interface StoredView2Data {
  memberId: string
  member: MemberProfile | null
  patientDetail: PatientDetailApiRecord | null
  notes: EhrNote[]
  labs: LabResult[]
  meds: Medication[]
  gaps: CareGap[]
  auths: PriorAuthorization[]
}

function parseJsonString(value: string): unknown | null {
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

function parseUnknownArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[]
  if (typeof value === 'string') {
    const parsed = parseJsonString(value)
    if (Array.isArray(parsed)) return parsed as T[]
  }
  return []
}

function normalizeAiSuggestionsResponse(value: unknown): AiSuggestionsResponse | null {
  if (!value || typeof value !== 'object') return null

  const candidate = value as Record<string, unknown>

  const clinicalStory =
    candidate.clinical_story ??
    candidate.patient_summary ??
    candidate.summary ??
    candidate.clinicalSummary

  const timelineEvents =
    candidate.timeline_events ??
    candidate.timeline ??
    candidate.events

  const coordinatorQuestions =
    candidate.coordinator_questions ??
    candidate.suggested_questions ??
    candidate.questions

  const coordinatorAlerts =
    candidate.coordinator_alerts ??
    candidate.alerts

  const missedFollowUps =
    candidate.missed_follow_ups ??
    candidate.follow_ups ??
    candidate.missedFollowUps

  const medicationRiskConnections =
    candidate.medication_risk_connections ??
    candidate.medication_risks ??
    candidate.risk_connections

  const normalized: AiSuggestionsResponse = {}

  if (typeof clinicalStory === 'string' && clinicalStory.trim()) {
    normalized.clinical_story = clinicalStory
  }

  const timeline = parseUnknownArray<AiTimelineEvent>(timelineEvents)
  if (timeline.length > 0) {
    normalized.timeline_events = timeline
  }

  const questions = parseUnknownArray<AiCoordinatorQuestion>(coordinatorQuestions)
  if (questions.length > 0) {
    normalized.coordinator_questions = questions
  }

  const alerts = parseUnknownArray<NonNullable<AiSuggestionsResponse['coordinator_alerts']>[number]>(coordinatorAlerts)
  if (alerts.length > 0) {
    normalized.coordinator_alerts = alerts
  }

  const followUps = parseUnknownArray<NonNullable<AiSuggestionsResponse['missed_follow_ups']>[number]>(missedFollowUps)
  if (followUps.length > 0) {
    normalized.missed_follow_ups = followUps
  }

  const risks = parseUnknownArray<NonNullable<AiSuggestionsResponse['medication_risk_connections']>[number]>(medicationRiskConnections)
  if (risks.length > 0) {
    normalized.medication_risk_connections = risks
  }

  return Object.keys(normalized).length > 0 ? normalized : null
}

function parseAiSuggestionsResponse(raw: unknown): AiSuggestionsResponse | null {
  if (!raw || typeof raw !== 'object') return null

  const candidate = raw as Record<string, unknown>

  const normalizedDirect = normalizeAiSuggestionsResponse(candidate)
  if (normalizedDirect) {
    return normalizedDirect
  }

  const nestedContainers: unknown[] = [
    candidate.chatgpt_response,
    candidate.data,
    candidate.result,
    candidate.response,
    candidate.payload,
  ]
  for (const container of nestedContainers) {
    const normalized = normalizeAiSuggestionsResponse(container)
    if (normalized) {
      return normalized
    }
  }

  if (typeof candidate.chatgpt_response === 'string') {
    const cleaned = candidate.chatgpt_response
      .trim()
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```$/i, '')
      .trim()

    try {
      const parsed = JSON.parse(cleaned) as unknown
      const normalized = normalizeAiSuggestionsResponse(parsed)
      if (normalized) {
        return normalized
      }
    } catch {
      return null
    }
  }

  if (typeof candidate.message === 'string') {
    const parsed = parseJsonString(candidate.message)
    const normalized = normalizeAiSuggestionsResponse(parsed)
    if (normalized) {
      return normalized
    }
  }

  return null
}

export function OverviewView({
  selectedMember,
  selectedTicket,
  selectedPatientDetail,
  patientDetailLoading,
  patientDetailError,
  careGapsLoading,
  careGapsError,
  labResultsLoading,
  labResultsError,
  medicationsLoading,
  medicationsError,
  priorAuthsLoading,
  priorAuthsError,
  ehrNotesLoading,
  ehrNotesError,
  selectedNotes,
  selectedLabs,
  selectedMeds,
  selectedGaps,
  selectedAuths,
}: OverviewViewProps) {
  const [activePanel, setActivePanel] = useState<'demographics' | 'gaps' | 'labs' | 'medications' | 'auths' | 'notes'>('demographics')
  const [labFilterByDate, setLabFilterByDate] = useState<Record<string, 'All' | 'High' | 'Low'>>({})
  const [expandedGapSectionId, setExpandedGapSectionId] = useState<string | null>(null)
  const [expandedLabDate, setExpandedLabDate] = useState<string | null>(null)
  const [expandedMedicationSectionId, setExpandedMedicationSectionId] = useState<string | null>(null)
  const [expandedPriorAuthSectionId, setExpandedPriorAuthSectionId] = useState<string | null>(null)
  const [expandedEhrNoteSectionId, setExpandedEhrNoteSectionId] = useState<string | null>(null)
  const [aiSuggestionsLoading, setAiSuggestionsLoading] = useState(false)
  const [aiSuggestionsError, setAiSuggestionsError] = useState('')
  const [aiSuggestionsData, setAiSuggestionsData] = useState<AiSuggestionsResponse | null>(null)
  const [aiInsightsSection, setAiInsightsSection] = useState<'summary' | 'timeline' | 'questions' | 'alerts'>('summary')
  const [manualQuestions, setManualQuestions] = useState<AiCoordinatorQuestion[]>([])
  const [hiddenQuestionIds, setHiddenQuestionIds] = useState<string[]>([])
  const [questionTextEdits, setQuestionTextEdits] = useState<Record<string, string>>({})
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([])
  const [newQuestionText, setNewQuestionText] = useState('')
  const [newQuestionCategory, setNewQuestionCategory] = useState('Social')
  const [apiQuestionOrder, setApiQuestionOrder] = useState<string[]>([])
  const [draggingApiQuestionId, setDraggingApiQuestionId] = useState<string | null>(null)
  const [dragOverApiQuestionId, setDragOverApiQuestionId] = useState<string | null>(null)

  const aiSuggestionsEndpoint = 'http://localhost:8000/api/v1/ai/undertand_patient_data'
  const selectedMemberId = selectedMember?.member_id ?? selectedTicket?.memberId ?? ''

  const combinedQuestions = useMemo(() => {
    const questions = [...manualQuestions, ...(aiSuggestionsData?.coordinator_questions ?? [])]
    if (hiddenQuestionIds.length === 0) return questions
    return questions.filter((question) => !hiddenQuestionIds.includes(question.question_id))
  }, [manualQuestions, aiSuggestionsData, hiddenQuestionIds])

  useEffect(() => {
    const ids = combinedQuestions.map((question) => question.question_id)
    if (ids.length === 0) {
      setApiQuestionOrder([])
      return
    }

    setApiQuestionOrder((current) => {
      const retained = current.filter((id) => ids.includes(id))
      const additions = ids.filter((id) => !retained.includes(id))
      return [...retained, ...additions]
    })
  }, [combinedQuestions])

  const orderedApiQuestions = useMemo(() => {
    const questions = combinedQuestions
    if (questions.length === 0) return []

    const rank = new Map(apiQuestionOrder.map((id, index) => [id, index]))

    return questions.slice().sort((a, b) => {
      const rankA = rank.has(a.question_id) ? (rank.get(a.question_id) as number) : Number.MAX_SAFE_INTEGER
      const rankB = rank.has(b.question_id) ? (rank.get(b.question_id) as number) : Number.MAX_SAFE_INTEGER
      if (rankA !== rankB) return rankA - rankB
      return a.question_id.localeCompare(b.question_id)
    })
  }, [combinedQuestions, apiQuestionOrder])

  useEffect(() => {
    const ids = orderedApiQuestions.map((question) => question.question_id)
    if (ids.length === 0) {
      setSelectedQuestionIds([])
      return
    }

    setSelectedQuestionIds((current) => {
      const retained = current.filter((id) => ids.includes(id))
      const additions = ids.filter((id) => !retained.includes(id))
      return [...retained, ...additions]
    })
  }, [orderedApiQuestions])

  useEffect(() => {
    if (!selectedMemberId) return

    const selectedForDeepDive = orderedApiQuestions
      .filter((question) => selectedQuestionIds.includes(question.question_id))
      .map((question) => ({
        id: question.question_id,
        category: (question.category as SuggestedQuestion['category']) ?? 'Social',
        text: questionTextEdits[question.question_id] ?? question.question_text,
        sourcePositionId: question.source_position_id,
        sourceType: question.source_type,
        sourceLabel: question.source_label,
      }))

    window.localStorage.setItem(`deep-dive-selected-questions:${selectedMemberId}`, JSON.stringify(selectedForDeepDive))
  }, [orderedApiQuestions, selectedQuestionIds, questionTextEdits, selectedMemberId])

  useEffect(() => {
    if (!selectedMemberId) return

    const snapshot: StoredView2Data = {
      memberId: selectedMemberId,
      member: selectedMember ?? null,
      patientDetail: selectedPatientDetail ?? null,
      notes: selectedNotes,
      labs: selectedLabs,
      meds: selectedMeds,
      gaps: selectedGaps,
      auths: selectedAuths,
    }

    window.localStorage.setItem(`view2-panel-data:${selectedMemberId}`, JSON.stringify(snapshot))
  }, [selectedMemberId, selectedMember, selectedNotes, selectedLabs, selectedMeds, selectedGaps, selectedAuths])

  function addManualQuestion() {
    const text = newQuestionText.trim()
    if (!text) return

    const questionId = `custom-q-${Date.now()}`
    const question: AiCoordinatorQuestion = {
      question_id: questionId,
      source_position_id: '',
      source_type: 'manual',
      source_label: 'Added by Coordinator',
      category: newQuestionCategory,
      priority: 'Medium',
      question_text: text,
      clinical_context: '',
    }

    setManualQuestions((current) => [question, ...current])
    setApiQuestionOrder((current) => [questionId, ...current.filter((id) => id !== questionId)])
    setNewQuestionText('')
  }

  function getQuestionText(question: AiCoordinatorQuestion): string {
    return questionTextEdits[question.question_id] ?? question.question_text
  }

  function updateQuestionText(questionId: string, value: string) {
    setQuestionTextEdits((current) => ({
      ...current,
      [questionId]: value,
    }))
  }

  function removeQuestion(questionId: string) {
    setManualQuestions((current) => current.filter((question) => question.question_id !== questionId))
    setHiddenQuestionIds((current) => (current.includes(questionId) ? current : [...current, questionId]))
    setApiQuestionOrder((current) => current.filter((id) => id !== questionId))
    setQuestionTextEdits((current) => {
      if (!(questionId in current)) return current
      const { [questionId]: _removed, ...remaining } = current
      return remaining
    })
    setSelectedQuestionIds((current) => current.filter((id) => id !== questionId))
  }

  function reorderApiQuestions(fromId: string, toId: string) {
    if (fromId === toId) return

    const fromIndex = apiQuestionOrder.indexOf(fromId)
    const toIndex = apiQuestionOrder.indexOf(toId)
    if (fromIndex < 0 || toIndex < 0) return

    const next = apiQuestionOrder.slice()
    const [moved] = next.splice(fromIndex, 1)
    next.splice(toIndex, 0, moved)
    setApiQuestionOrder(next)
  }

  function buildAiSuggestionsPayload() {
    return {
      member_id: selectedMember?.member_id ?? selectedTicket?.memberId ?? null,
      patient_snapshot: {
        member_id: selectedPatientDetail?.member_id ?? selectedMember?.member_id ?? null,
        full_name: selectedPatientDetail?.full_name ?? selectedMember?.patient_name ?? selectedTicket?.patientName ?? null,
        age: selectedPatientDetail?.age ?? selectedMember?.age ?? null,
        gender: selectedPatientDetail?.gender ?? selectedMember?.gender ?? null,
        date_of_birth: selectedPatientDetail?.date_of_birth ?? null,
        location: selectedPatientDetail?.location ?? selectedMember?.location ?? null,
        phone_primary: selectedPatientDetail?.phone_primary ?? null,
        phone_secondary: selectedPatientDetail?.phone_secondary ?? null,
        email_address: selectedPatientDetail?.email_address ?? null,
        preferred_contact_method: selectedPatientDetail?.preferred_contact_method ?? selectedMember?.preferred_contact_method ?? null,
        preferred_language: selectedPatientDetail?.preferred_language ?? selectedMember?.preferred_language ?? null,
        marital_status: selectedPatientDetail?.marital_status ?? null,
        employment_status: selectedPatientDetail?.employment_status ?? null,
        caregiver_support: selectedPatientDetail?.caregiver_support ?? null,
        primary_conditions: selectedPatientDetail?.primary_conditions ?? selectedMember?.primary_conditions ?? null,
        insurance_plan_type: selectedPatientDetail?.insurance_plan_type ?? selectedMember?.insurance_plan_type ?? null,
        insurance_start_date: selectedPatientDetail?.insurance_start_date ?? null,
        risk_tier: selectedPatientDetail?.risk_tier ?? selectedMember?.risk_tier ?? null,
        assigned_coordinator: selectedPatientDetail?.assigned_coordinator ?? selectedMember?.assigned_coordinator ?? null,
      },
      care_gaps: selectedGaps.map((gap, index) => ({
        position_id: `gap-section-${index + 1}`,
        gap_id: gap.gap_id,
        gap_category: gap.gap_category,
        gap_description: gap.gap_description,
        clinical_guideline: gap.clinical_guideline,
        last_completed_date: gap.last_completed_date,
        days_overdue: gap.days_overdue,
        priority: gap.priority,
        recommended_action: gap.recommended_action,
        gap_status: gap.gap_status,
        assigned_to: gap.assigned_to,
        gap_notes: gap.gap_notes,
      })),
      labs: selectedLabs.map((lab, index) => ({
        position_id: `lab-section-${index + 1}`,
        lab_id: lab.lab_id,
        draw_date: lab.draw_date,
        lab_type: lab.lab_type,
        test_name: lab.test_name,
        result_value: lab.result_value,
        unit: lab.unit,
        reference_range: lab.reference_range,
        result_flag: lab.result_flag,
        ordering_provider: lab.ordering_provider,
        lab_facility: lab.lab_facility,
        clinical_note: lab.clinical_note,
      })),
      medications: selectedMeds.map((med, index) => ({
        position_id: `med-section-${index + 1}`,
        med_id: med.med_id,
        drug_name: med.drug_name,
        brand_name: med.brand_name,
        dosage: med.dosage,
        route: med.route,
        frequency: med.frequency,
        indication: med.indication,
        prescribing_provider: med.prescribing_provider,
        date_prescribed: med.date_prescribed,
        last_fill_date: med.last_fill_date,
        days_since_last_fill: med.days_since_last_fill,
        refill_risk: med.days_since_last_fill > 90 ? 'Overdue' : med.days_since_last_fill > 60 ? 'At Risk' : 'On Track',
        adherence_status: med.adherence_status,
        medication_status: med.medication_status,
        rx_notes: med.rx_notes,
      })),
      prior_auths: selectedAuths.map((auth, index) => ({
        position_id: `auth-section-${index + 1}`,
        auth_id: auth.auth_id,
        request_date: auth.request_date,
        auth_type: auth.auth_type,
        service_requested: auth.service_requested,
        requesting_provider: auth.requesting_provider,
        decision: auth.decision,
        decision_date: auth.decision_date,
        valid_from: auth.valid_from,
        valid_through: auth.valid_through,
        validity_status: auth.valid_through
          ? new Date(auth.valid_through).getTime() < Date.now()
            ? 'Expired'
            : Math.ceil((new Date(auth.valid_through).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) <= 30
              ? 'Expiring Soon'
              : 'Active Window'
          : 'No Validity Date',
        denial_reason: auth.denial_reason,
        appeal_status: auth.appeal_status,
        auth_notes: auth.auth_notes,
      })),
      ehr_notes: selectedNotes.map((note, index) => ({
        position_id: `note-section-${index + 1}`,
        note_id: note.note_id,
        location: note.location,
        note_date: note.note_date,
        note_type: note.note_type,
        provider_name: note.provider_name,
        facility_name: note.facility_name,
        icd_code: note.icd_code,
        primary_diagnosis: note.primary_diagnosis,
        subjective: note.subjective,
        objective: note.objective,
        assessment: note.assessment,
        plan: note.plan,
        follow_up_date: note.follow_up_date,
        follow_up_status: note.follow_up_date
          ? new Date(note.follow_up_date).getTime() < Date.now()
            ? 'Follow-up Overdue'
            : 'Follow-up Scheduled'
          : 'No Follow-up Date',
      })),
      generated_at: new Date().toISOString(),
      source: 'overview-left-panel',
    }
  }

  async function handleAiSuggestionsClick() {
    setAiSuggestionsLoading(true)
    setAiSuggestionsError('')

    try {
      const response = await fetch(aiSuggestionsEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(buildAiSuggestionsPayload()),
      })

      if (!response.ok) {
        throw new Error(`AI suggestions API failed with status ${response.status}`)
      }

      const responseBody = await response.json().catch(() => null)
      const parsedResponse = parseAiSuggestionsResponse(responseBody)
      setAiSuggestionsData(parsedResponse)
      if (!parsedResponse) {
        setAiSuggestionsError('Received AI response, but could not parse chatgpt_response JSON payload.')
      }
      setAiInsightsSection('summary')
      console.log('AI suggestions response:', responseBody)
    } catch (error) {
      setAiSuggestionsError(error instanceof Error ? error.message : 'AI suggestions request failed')
    } finally {
      setAiSuggestionsLoading(false)
    }
  }

  function focusSourceSection(sourcePositionId: string) {
    const sourceMatch = /^(gap|lab|med|auth|note)-section-(\d+)$/.exec(sourcePositionId)
    if (!sourceMatch) return

    const [, type, indexRaw] = sourceMatch
    const index = Number(indexRaw)
    if (Number.isNaN(index) || index <= 0) return

    if (type === 'gap') {
      if (index > selectedGaps.length) return
      setActivePanel('gaps')
      setExpandedGapSectionId(sourcePositionId)
    }

    if (type === 'lab') {
      if (index > selectedLabs.length) return
      setActivePanel('labs')

      const targetLab = selectedLabs[index - 1]
      if (targetLab?.draw_date) {
        setExpandedLabDate(targetLab.draw_date)
      }
    }

    if (type === 'med') {
      if (index > selectedMeds.length) return
      setActivePanel('medications')
      setExpandedMedicationSectionId(sourcePositionId)
    }

    if (type === 'auth') {
      if (index > selectedAuths.length) return
      setActivePanel('auths')
      setExpandedPriorAuthSectionId(sourcePositionId)
    }

    if (type === 'note') {
      if (index > selectedNotes.length) return
      setActivePanel('notes')
      setExpandedEhrNoteSectionId(sourcePositionId)
    }

    window.requestAnimationFrame(() => {
      const target = document.getElementById(sourcePositionId)
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    })
  }

  useEffect(() => {
    const applyFocusFromQuery = () => {
      const params = new URLSearchParams(window.location.search)
      const openPanel = params.get('openPanel')
      const openMedicationId = params.get('openMedicationId')
      const openMedicationIndex = Number(params.get('openMedicationIndex') ?? '')
      const openPriorAuthId = params.get('openPriorAuthId')
      const openPriorAuthIndex = Number(params.get('openPriorAuthIndex') ?? '')
      const openEhrNoteId = params.get('openEhrNoteId')
      const openEhrNoteIndex = Number(params.get('openEhrNoteIndex') ?? '')

      if (openPanel === 'medications') {
        setActivePanel('medications')
      } else if (openPanel === 'auths') {
        setActivePanel('auths')
      } else if (openPanel === 'notes') {
        setActivePanel('notes')
      }

      let medicationTargetSectionId: string | null = null
      let priorAuthTargetSectionId: string | null = null
      let ehrNoteTargetSectionId: string | null = null

      if (openMedicationId) {
        const medIndex = selectedMeds.findIndex((med) => med.med_id === openMedicationId)
        if (medIndex >= 0) {
          medicationTargetSectionId = `med-section-${medIndex + 1}`
        }
      } else if (!Number.isNaN(openMedicationIndex) && openMedicationIndex > 0 && openMedicationIndex <= selectedMeds.length) {
        medicationTargetSectionId = `med-section-${openMedicationIndex}`
      }

      if (openPriorAuthId) {
        const authIndex = selectedAuths.findIndex((auth) => auth.auth_id === openPriorAuthId)
        if (authIndex >= 0) {
          priorAuthTargetSectionId = `auth-section-${authIndex + 1}`
        }
      } else if (!Number.isNaN(openPriorAuthIndex) && openPriorAuthIndex > 0 && openPriorAuthIndex <= selectedAuths.length) {
        priorAuthTargetSectionId = `auth-section-${openPriorAuthIndex}`
      }

      if (openEhrNoteId) {
        const noteIndex = selectedNotes.findIndex((note) => note.note_id === openEhrNoteId)
        if (noteIndex >= 0) {
          ehrNoteTargetSectionId = `note-section-${noteIndex + 1}`
        }
      } else if (!Number.isNaN(openEhrNoteIndex) && openEhrNoteIndex > 0 && openEhrNoteIndex <= selectedNotes.length) {
        ehrNoteTargetSectionId = `note-section-${openEhrNoteIndex}`
      }

      const targetSectionId = medicationTargetSectionId ?? priorAuthTargetSectionId ?? ehrNoteTargetSectionId

      if (medicationTargetSectionId) setExpandedMedicationSectionId(medicationTargetSectionId)
      if (priorAuthTargetSectionId) setExpandedPriorAuthSectionId(priorAuthTargetSectionId)
      if (ehrNoteTargetSectionId) setExpandedEhrNoteSectionId(ehrNoteTargetSectionId)

      if (!targetSectionId) return

      window.requestAnimationFrame(() => {
        const target = document.getElementById(targetSectionId)
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
      })
    }

    applyFocusFromQuery()
    window.addEventListener('popstate', applyFocusFromQuery)

    return () => {
      window.removeEventListener('popstate', applyFocusFromQuery)
    }
  }, [selectedMeds, selectedAuths, selectedNotes])

  const panelItems: Array<{ id: 'demographics' | 'gaps' | 'labs' | 'medications' | 'auths' | 'notes'; label: string }> = [
    { id: 'demographics', label: 'Patient Demographics' },
    { id: 'gaps', label: 'Care Gap Reports' },
    { id: 'labs', label: 'Lab Results' },
    { id: 'medications', label: 'Medication List' },
    { id: 'auths', label: 'Prior Auth History' },
    { id: 'notes', label: 'EHR Clinical Notes' },
  ]

  const demographicsSections = selectedPatientDetail
    ? [
      {
        title: 'Identity',
        rows: [
          { label: 'Member ID', value: selectedPatientDetail.member_id },
          { label: 'Gender', value: selectedPatientDetail.gender },
          { label: 'Age', value: String(selectedPatientDetail.age) },
          { label: 'Date of Birth', value: selectedPatientDetail.date_of_birth ?? 'N/A' },
          { label: 'Preferred Language', value: selectedPatientDetail.preferred_language ?? 'N/A' },
        ],
      },
      {
        title: 'Address',
        rows: [
          { label: 'Street Address', value: selectedPatientDetail.street_address ?? 'N/A' },
          { label: 'City', value: selectedPatientDetail.city ?? 'N/A' },
          { label: 'State', value: selectedPatientDetail.state ?? 'N/A' },
          { label: 'Zip Code', value: selectedPatientDetail.zip_code == null ? 'N/A' : String(selectedPatientDetail.zip_code) },
          { label: 'Location', value: selectedPatientDetail.location },
        ],
      },
      {
        title: 'Contact',
        rows: [
          { label: 'Phone Primary', value: selectedPatientDetail.phone_primary ?? 'N/A' },
          { label: 'Phone Secondary', value: selectedPatientDetail.phone_secondary ?? 'N/A' },
          { label: 'Preferred Contact Method', value: selectedPatientDetail.preferred_contact_method ?? 'N/A' },
          { label: 'Email Address', value: selectedPatientDetail.email_address ?? 'N/A' },
        ],
      },
      {
        title: 'Social Profile',
        rows: [
          { label: 'Marital Status', value: selectedPatientDetail.marital_status ?? 'N/A' },
          { label: 'Employment Status', value: selectedPatientDetail.employment_status ?? 'N/A' },
          { label: 'Caregiver Support', value: selectedPatientDetail.caregiver_support ?? 'N/A' },
        ],
      },
      {
        title: 'Clinical and Coverage',
        rows: [
          { label: 'Primary Conditions', value: selectedPatientDetail.primary_conditions ?? 'N/A' },
          { label: 'Insurance Plan Type', value: selectedPatientDetail.insurance_plan_type ?? 'N/A' },
          { label: 'Insurance Start Date', value: selectedPatientDetail.insurance_start_date ?? 'N/A' },
          { label: 'Risk Tier', value: selectedPatientDetail.risk_tier ?? 'N/A' },
          { label: 'Assigned Coordinator', value: selectedPatientDetail.assigned_coordinator ?? 'N/A' },
        ],
      },
    ]
    : []

  return (
    <div className="grid h-full min-h-0 grid-cols-12 gap-5">
      {!selectedMember || !selectedTicket ? (
        <div className="col-span-12 flex h-full items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
          <div>
            <h2 className="text-xl font-semibold text-slate-800">No Patient Selected</h2>
            <p className="mt-2 text-slate-600">Choose Start Call Prep from the Ticket Queue to generate a personalized call plan.</p>
          </div>
        </div>
      ) : (
        <>
          <div className="col-span-5 grid min-h-0 grid-cols-[240px_1fr] gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <aside className="rounded-lg border border-slate-200 bg-white p-2">
              <p className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Sections</p>
              <div className="mt-1 space-y-1">
                {panelItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActivePanel(item.id)}
                    className={`w-full rounded-md px-3 py-2 text-left text-sm transition ${activePanel === item.id ? 'bg-clinical-header text-white' : 'text-slate-700 hover:bg-slate-100'}`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </aside>

            <div className="min-h-0 flex-1 overflow-y-auto rounded-lg border border-slate-200 bg-white p-3">
              {activePanel === 'demographics' ? (
                <>
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-700">Patient Demographics</h3>
                  {patientDetailLoading ? (
                    <p className="mt-2 text-sm text-slate-600">Loading patient details...</p>
                  ) : null}
                  {!patientDetailLoading && patientDetailError ? (
                    <p className="mt-2 text-sm text-red-700">{patientDetailError}</p>
                  ) : null}
                  {!patientDetailLoading && !patientDetailError && selectedPatientDetail ? (
                    <div className="mt-3 space-y-3">
                      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-blue-50/70 shadow-[0_1px_20px_rgba(15,23,42,0.06)]">
                        <div className="border-b border-slate-200/80 px-5 py-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Patient Snapshot</p>
                              <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">{selectedPatientDetail.full_name}</p>
                              <p className="mt-1 text-sm text-slate-600">Member ID {selectedPatientDetail.member_id}</p>
                            </div>
                            <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                              <span className="inline-flex rounded-full border border-slate-200 bg-white/90 px-3 py-1 text-xs font-medium text-slate-700 shadow-sm">
                                {selectedPatientDetail.age} · {selectedPatientDetail.gender}
                              </span>
                              <span className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 shadow-sm">
                                {selectedPatientDetail.risk_tier ?? 'N/A'}
                              </span>
                              <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 shadow-sm">
                                {selectedPatientDetail.preferred_contact_method ?? 'N/A'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        {demographicsSections.map((section) => (
                          <section key={section.title} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_12px_rgba(15,23,42,0.04)]">
                            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-4 py-3">
                              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{section.title}</p>
                            </div>
                            <div className="grid grid-cols-1 gap-px bg-slate-100 md:grid-cols-2 xl:grid-cols-3">
                              {section.rows.map((row) => (
                                <div
                                  key={row.label}
                                  className={`bg-white px-4 py-3 transition-colors hover:bg-slate-50/80 ${section.title === 'Contact' && row.label === 'Email Address' ? 'md:col-span-2 xl:col-span-3' : ''}`}
                                >
                                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{row.label}</p>
                                  <p className="mt-1 min-w-0 break-words text-sm leading-6 text-slate-900">{row.value}</p>
                                </div>
                              ))}
                            </div>
                          </section>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </>
              ) : null}

              {activePanel === 'gaps' ? (
                <>
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-700">Care Gap Reports</h3>
                  {careGapsLoading ? (
                    <p className="mt-2 text-sm text-slate-600">Loading care gaps...</p>
                  ) : null}
                  {!careGapsLoading && careGapsError ? (
                    <p className="mt-2 text-sm text-red-700">{careGapsError}</p>
                  ) : null}
                  {!careGapsLoading && !careGapsError && selectedGaps.length === 0 ? (
                    <p className="mt-2 text-sm text-slate-500">No open care gaps for this patient.</p>
                  ) : (
                    <div className="mt-2 space-y-2 pr-1 text-sm">
                      {selectedGaps.map((gap, sectionIndex) => {
                        const sectionId = `gap-section-${sectionIndex + 1}`
                        const isOpen = expandedGapSectionId ? expandedGapSectionId === sectionId : sectionIndex === 0
                        const fields: Array<{ label: string; value: string }> = [
                          { label: 'gap_id', value: gap.gap_id },
                          { label: 'member_id', value: gap.member_id },
                          { label: 'patient_name', value: gap.patient_name ?? 'N/A' },
                          { label: 'gender', value: gap.gender ?? 'N/A' },
                          { label: 'age', value: gap.age == null ? 'N/A' : String(gap.age) },
                          { label: 'gap_category', value: gap.gap_category },
                          { label: 'gap_description', value: gap.gap_description },
                          { label: 'clinical_guideline', value: gap.clinical_guideline },
                          { label: 'last_completed_date', value: gap.last_completed_date || 'N/A' },
                          { label: 'days_overdue', value: String(gap.days_overdue) },
                          { label: 'priority', value: gap.priority },
                          { label: 'recommended_action', value: gap.recommended_action },
                          { label: 'gap_status', value: gap.gap_status },
                          { label: 'assigned_to', value: gap.assigned_to },
                          { label: 'gap_notes', value: gap.gap_notes || 'N/A' },
                        ]

                        return (
                          <details id={sectionId} key={gap.gap_id} open={isOpen} className="group rounded-lg border border-slate-200 bg-white">
                            <summary className="flex cursor-pointer list-none items-start justify-between gap-3 px-3 py-2.5 hover:bg-slate-50">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-slate-800">{truncateText(gap.gap_description, 72)}</p>
                                <p className="mt-0.5 text-xs text-slate-600">
                                  {gap.gap_category} • {gap.gap_status} • {gap.days_overdue} days overdue
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${gapPriorityStyles[gap.priority]}`}>
                                  {gap.priority}
                                </span>
                                <span className="text-xs text-slate-500 transition group-open:rotate-180">▼</span>
                              </div>
                            </summary>

                            <div className="border-t border-slate-200 bg-slate-50 p-2.5">
                              <div className="grid grid-cols-1 gap-px overflow-hidden rounded-xl bg-slate-100 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                {fields.map((field) => (
                                  <div key={field.label} className="min-h-[58px] bg-white px-3 py-2">
                                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">{field.label}</p>
                                    <p className="mt-1 break-words text-[13px] leading-5 text-slate-900">{field.value}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </details>
                        )
                      })}
                    </div>
                  )}
                </>
              ) : null}

              {activePanel === 'labs' ? (
                <>
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-700">Lab Results</h3>
                  {labResultsLoading ? (
                    <p className="mt-2 text-sm text-slate-600">Loading lab results...</p>
                  ) : null}
                  {!labResultsLoading && labResultsError ? (
                    <p className="mt-2 text-sm text-red-700">{labResultsError}</p>
                  ) : null}
                  {!labResultsLoading && !labResultsError && selectedLabs.length === 0 ? (
                    <p className="mt-2 text-sm text-slate-500">No lab results on file for this patient.</p>
                  ) : (
                    <div className="mt-2 space-y-3 pr-1 text-sm">
                      {Object.entries(
                        selectedLabs.reduce<Record<string, typeof selectedLabs>>((acc, lab) => {
                          const list = acc[lab.draw_date] ?? []
                          list.push(lab)
                          acc[lab.draw_date] = list
                          return acc
                        }, {}),
                      )
                        .sort(([dateA], [dateB]) => new Date(dateB).getTime() - new Date(dateA).getTime())
                        .map(([drawDate, labsForDate], dateIndex) => {
                          const filter = labFilterByDate[drawDate] ?? 'All'
                          const visibleLabsForDate = filter === 'All'
                            ? labsForDate
                            : filter === 'High'
                              ? labsForDate.filter((lab) => lab.result_flag === 'High' || lab.result_flag === 'Critical High')
                              : labsForDate.filter((lab) => lab.result_flag === 'Low' || lab.result_flag === 'Critical Low')
                          const highCount = labsForDate.filter((lab) => lab.result_flag === 'High' || lab.result_flag === 'Critical High').length
                          const lowCount = labsForDate.filter((lab) => lab.result_flag === 'Low' || lab.result_flag === 'Critical Low').length

                          return (
                          <details key={drawDate} className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_12px_rgba(15,23,42,0.04)]" open={expandedLabDate ? expandedLabDate === drawDate : dateIndex === 0}>
                            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 bg-gradient-to-r from-white to-slate-50 px-4 py-3 hover:from-slate-50 hover:to-slate-100/70">
                              <div>
                                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Draw Date</p>
                                <p className="mt-1 text-base font-semibold text-slate-900">{formatDate(drawDate)}</p>
                                <p className="mt-0.5 text-xs text-slate-500">All reports collected on this date</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                                  {labsForDate.length} report{labsForDate.length === 1 ? '' : 's'}
                                </span>
                                <span className="text-xs text-slate-500 transition group-open:rotate-180">▼</span>
                              </div>
                            </summary>

                            <div className="space-y-2 border-t border-slate-200 bg-slate-50 p-2.5">
                              <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
                                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Filter</span>
                                {(['All', 'High', 'Low'] as const).map((option) => (
                                  <button
                                    key={option}
                                    type="button"
                                    onClick={() => setLabFilterByDate((prev) => ({ ...prev, [drawDate]: option }))}
                                    className={`rounded-full border px-2.5 py-1 text-xs font-medium transition ${filter === option ? 'border-clinical-header bg-clinical-header text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'}`}
                                  >
                                    {option}
                                  </button>
                                ))}
                                <span className="ml-auto text-xs text-slate-500">
                                  High: {highCount} • Low: {lowCount}
                                </span>
                              </div>

                              {visibleLabsForDate.length === 0 ? (
                                <div className="rounded-xl border border-dashed border-slate-300 bg-white px-3 py-4 text-sm text-slate-500">
                                  No results for the selected filter on this date.
                                </div>
                              ) : null}

                              {visibleLabsForDate.map((lab) => {
                                const sectionId = `lab-section-${selectedLabs.findIndex((candidate) => candidate.lab_id === lab.lab_id) + 1}`

                                return (
                                <article
                                  id={sectionId}
                                  key={lab.lab_id}
                                  className={`rounded-2xl border bg-white p-3 shadow-sm ${lab.result_flag === 'Critical High' || lab.result_flag === 'Critical Low' ? 'border-red-200 ring-1 ring-red-100' : lab.result_flag === 'High' || lab.result_flag === 'Low' ? 'border-amber-200 ring-1 ring-amber-100' : 'border-slate-200'}`}
                                >
                                  <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-2.5">
                                    <div className="min-w-0">
                                      <p className="truncate text-sm font-semibold text-slate-900">{lab.test_name}</p>
                                      <p className="mt-0.5 text-xs text-slate-500">{lab.lab_type} • {formatDate(lab.draw_date)} • Lab ID {lab.lab_id}</p>
                                    </div>
                                    <span className={`inline-flex shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${labFlagStyles[lab.result_flag] ?? 'text-slate-700'}`}>
                                      {lab.result_flag}
                                    </span>
                                  </div>

                                    <div className="mt-3 space-y-3">
                                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                        <div className="rounded-2xl bg-slate-50 p-3 md:col-span-1">
                                          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Result Value</p>
                                          <p className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">{lab.result_value}</p>
                                          <p className="mt-1 text-sm text-slate-600">{lab.unit}</p>
                                        </div>

                                        <div className="rounded-2xl border border-slate-200 bg-white p-3 md:col-span-1">
                                          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Reference Range</p>
                                          <p className="mt-1 break-words text-sm leading-6 text-slate-900">{lab.reference_range}</p>
                                        </div>
                                      </div>

                                      <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                                        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Provider Name</p>
                                        <p className="mt-1 break-words text-[13px] leading-5 text-slate-900">{lab.ordering_provider}</p>
                                      </div>

                                      <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                                        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Facility</p>
                                        <p className="mt-1 break-words text-[13px] leading-5 text-slate-900">{lab.lab_facility}</p>
                                      </div>
                                  </div>

                                  <div className="mt-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Clinical Note</p>
                                    <p className="mt-1 break-words text-[13px] leading-5 text-slate-900">{lab.clinical_note}</p>
                                  </div>
                                </article>
                                )})}
                            </div>
                          </details>
                        )})}
                    </div>
                  )}
                </>
              ) : null}

              {activePanel === 'medications' ? (
                <>
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-700">Medication List</h3>
                  {medicationsLoading ? (
                    <p className="mt-2 text-sm text-slate-600">Loading medications...</p>
                  ) : null}
                  {!medicationsLoading && medicationsError ? (
                    <p className="mt-2 text-sm text-red-700">{medicationsError}</p>
                  ) : null}
                  {!medicationsLoading && !medicationsError && selectedMeds.length === 0 ? (
                    <p className="mt-2 text-sm text-slate-500">No medications on file for this patient.</p>
                  ) : (
                    <div className="mt-2 space-y-3 pr-1 text-sm">
                      {selectedMeds.map((med, sectionIndex) => {
                        const sectionId = `med-section-${sectionIndex + 1}`
                        const isOpen = expandedMedicationSectionId
                          ? expandedMedicationSectionId === sectionId
                          : sectionIndex === 0

                        const refillRisk = med.days_since_last_fill > 90
                          ? { label: 'Overdue', style: 'border-red-200 bg-red-50 text-red-700' }
                          : med.days_since_last_fill > 60
                            ? { label: 'At Risk', style: 'border-amber-200 bg-amber-50 text-amber-700' }
                            : { label: 'On Track', style: 'border-emerald-200 bg-emerald-50 text-emerald-700' }

                        const medicationStatusStyle = med.medication_status === 'Active'
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                          : med.medication_status === 'On Hold'
                            ? 'border-amber-200 bg-amber-50 text-amber-700'
                            : 'border-slate-200 bg-slate-100 text-slate-700'

                        return (
                          <details id={sectionId} key={med.med_id} open={isOpen} className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_12px_rgba(15,23,42,0.04)]">
                            <summary
                              onClick={(event) => {
                                event.preventDefault()
                                setExpandedMedicationSectionId((current) => (current === sectionId ? null : sectionId))
                              }}
                              className="flex cursor-pointer list-none items-start justify-between gap-3 bg-gradient-to-r from-white to-slate-50 px-4 py-3 hover:from-slate-50 hover:to-slate-100/70"
                            >
                              <div className="min-w-0">
                                <p className="truncate text-base font-semibold text-slate-900">{truncateText(`${med.drug_name} ${med.dosage}`, 84)}</p>
                                <p className="mt-0.5 text-xs text-slate-600">{med.brand_name} • {med.route} • {med.frequency}</p>
                                <p className="mt-1 line-clamp-2 text-xs text-slate-500">{med.indication}</p>
                              </div>

                              <div className="flex shrink-0 items-center gap-2">
                                <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${medicationStatusStyle}`}>
                                  {med.medication_status}
                                </span>
                                <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${adherenceStyles[med.adherence_status] ?? 'text-slate-600'} border-slate-200 bg-slate-50`}>
                                  {med.adherence_status}
                                </span>
                                <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${refillRisk.style}`}>
                                  {refillRisk.label}
                                </span>
                                <span className="text-xs text-slate-500 transition group-open:rotate-180">▼</span>
                              </div>
                            </summary>

                            <div className="space-y-3 border-t border-slate-200 bg-slate-50 p-3">
                              <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                                <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Days Since Last Fill</p>
                                  <p className="mt-1 text-xl font-semibold text-slate-900">{med.days_since_last_fill}d</p>
                                </div>
                                <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Last Fill Date</p>
                                  <p className="mt-1 text-sm font-medium text-slate-900">{formatDate(med.last_fill_date)}</p>
                                </div>
                                <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Prescribed Date</p>
                                  <p className="mt-1 text-sm font-medium text-slate-900">{formatDate(med.date_prescribed)}</p>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                                <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Provider</p>
                                  <p className="mt-1 break-words text-[13px] leading-5 text-slate-900">{med.prescribing_provider}</p>
                                </div>
                                <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Medication ID</p>
                                  <p className="mt-1 break-words text-[13px] leading-5 text-slate-900">{med.med_id}</p>
                                </div>
                              </div>

                              <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Clinical Notes</p>
                                <p className="mt-1 break-words text-[13px] leading-5 text-slate-900">{med.rx_notes || 'N/A'}</p>
                              </div>
                            </div>
                          </details>
                        )
                      })}
                    </div>
                  )}
                </>
              ) : null}

              {activePanel === 'auths' ? (
                <>
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-700">Prior Auth History</h3>
                  {priorAuthsLoading ? (
                    <p className="mt-2 text-sm text-slate-600">Loading prior authorizations...</p>
                  ) : null}
                  {!priorAuthsLoading && priorAuthsError ? (
                    <p className="mt-2 text-sm text-red-700">{priorAuthsError}</p>
                  ) : null}
                  {!priorAuthsLoading && !priorAuthsError && selectedAuths.length === 0 ? (
                    <p className="mt-2 text-sm text-slate-500">No prior authorization history on file.</p>
                  ) : (
                    <div className="mt-2 space-y-3 pr-1 text-sm">
                      {selectedAuths.map((auth, sectionIndex) => {
                        const sectionId = `auth-section-${sectionIndex + 1}`
                        const isOpen = expandedPriorAuthSectionId
                          ? expandedPriorAuthSectionId === sectionId
                          : sectionIndex === 0

                        const decisionStyle = auth.decision === 'Denied'
                          ? 'border-red-200 bg-red-50 text-red-700'
                          : auth.decision === 'Pending'
                            ? 'border-amber-200 bg-amber-50 text-amber-700'
                            : auth.decision === 'Appealed'
                              ? 'border-violet-200 bg-violet-50 text-violet-700'
                              : 'border-emerald-200 bg-emerald-50 text-emerald-700'

                        const expiresSoon = auth.valid_through
                          ? Math.ceil((new Date(auth.valid_through).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                          : null

                        const validityStyle = expiresSoon != null && expiresSoon < 0
                          ? 'border-red-200 bg-red-50 text-red-700'
                          : expiresSoon != null && expiresSoon <= 30
                            ? 'border-amber-200 bg-amber-50 text-amber-700'
                            : 'border-emerald-200 bg-emerald-50 text-emerald-700'

                        const validityLabel = auth.valid_through
                          ? expiresSoon != null && expiresSoon < 0
                            ? 'Expired'
                            : expiresSoon != null && expiresSoon <= 30
                              ? 'Expiring Soon'
                              : 'Active Window'
                          : 'No Validity Date'

                        return (
                          <details id={sectionId} key={auth.auth_id} open={isOpen} className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_12px_rgba(15,23,42,0.04)]">
                            <summary
                              onClick={(event) => {
                                event.preventDefault()
                                setExpandedPriorAuthSectionId((current) => (current === sectionId ? null : sectionId))
                              }}
                              className="flex cursor-pointer list-none items-start justify-between gap-3 bg-gradient-to-r from-white to-slate-50 px-4 py-3 hover:from-slate-50 hover:to-slate-100/70"
                            >
                              <div className="min-w-0">
                                <p className="truncate text-base font-semibold text-slate-900">{truncateText(auth.service_requested, 84)}</p>
                                <p className="mt-0.5 text-xs text-slate-600">{auth.auth_type} • Requested {formatDate(auth.request_date)} • Auth ID {auth.auth_id}</p>
                              </div>
                              <div className="flex shrink-0 items-center gap-2">
                                <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${decisionStyle}`}>
                                  {auth.decision}
                                </span>
                                <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${validityStyle}`}>
                                  {validityLabel}
                                </span>
                                <span className="text-xs text-slate-500 transition group-open:rotate-180">▼</span>
                              </div>
                            </summary>

                            <div className="space-y-3 border-t border-slate-200 bg-slate-50 p-3">
                              <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                                <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Decision Date</p>
                                  <p className="mt-1 text-sm font-medium text-slate-900">{formatDate(auth.decision_date)}</p>
                                </div>
                                <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Valid From</p>
                                  <p className="mt-1 text-sm font-medium text-slate-900">{formatDate(auth.valid_from)}</p>
                                </div>
                                <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Valid Through</p>
                                  <p className="mt-1 text-sm font-medium text-slate-900">{formatDate(auth.valid_through)}</p>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                                <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Requesting Provider</p>
                                  <p className="mt-1 break-words text-[13px] leading-5 text-slate-900">{auth.requesting_provider}</p>
                                </div>
                                <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Appeal Status</p>
                                  <p className="mt-1 break-words text-[13px] leading-5 text-slate-900">{auth.appeal_status || 'N/A'}</p>
                                </div>
                              </div>

                              {auth.denial_reason ? (
                                <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5">
                                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-red-600">Denial Reason</p>
                                  <p className="mt-1 break-words text-[13px] leading-5 text-red-800">{auth.denial_reason}</p>
                                </div>
                              ) : null}

                              <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Authorization Notes</p>
                                <p className="mt-1 break-words text-[13px] leading-5 text-slate-900">{auth.auth_notes || 'N/A'}</p>
                              </div>
                            </div>
                          </details>
                        )
                      })}
                    </div>
                  )}
                </>
              ) : null}

              {activePanel === 'notes' ? (
                <>
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-700">EHR Clinical Notes</h3>
                  {ehrNotesLoading ? (
                    <p className="mt-2 text-sm text-slate-600">Loading EHR notes...</p>
                  ) : null}
                  {!ehrNotesLoading && ehrNotesError ? (
                    <p className="mt-2 text-sm text-red-700">{ehrNotesError}</p>
                  ) : null}
                  {!ehrNotesLoading && !ehrNotesError && selectedNotes.length === 0 ? (
                    <p className="mt-2 text-sm text-slate-500">No EHR notes on file for this patient.</p>
                  ) : (
                    <div className="mt-2 space-y-3 pr-1 text-sm">
                      {selectedNotes.map((note, sectionIndex) => {
                        const sectionId = `note-section-${sectionIndex + 1}`
                        const isOpen = expandedEhrNoteSectionId
                          ? expandedEhrNoteSectionId === sectionId
                          : sectionIndex === 0

                        const noteTypeStyle = note.note_type.toLowerCase().includes('er') || note.note_type.toLowerCase().includes('urgent')
                          ? 'border-red-200 bg-red-50 text-red-700'
                          : note.note_type.toLowerCase().includes('discharge')
                            ? 'border-violet-200 bg-violet-50 text-violet-700'
                            : 'border-sky-200 bg-sky-50 text-sky-700'

                        const followUpStatus = note.follow_up_date
                          ? new Date(note.follow_up_date).getTime() < Date.now()
                            ? { label: 'Follow-up Overdue', style: 'border-red-200 bg-red-50 text-red-700' }
                            : { label: 'Follow-up Scheduled', style: 'border-emerald-200 bg-emerald-50 text-emerald-700' }
                          : { label: 'No Follow-up Date', style: 'border-slate-200 bg-slate-100 text-slate-700' }

                        return (
                          <details id={sectionId} key={note.note_id} open={isOpen} className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_12px_rgba(15,23,42,0.04)]">
                            <summary
                              onClick={(event) => {
                                event.preventDefault()
                                setExpandedEhrNoteSectionId((current) => (current === sectionId ? null : sectionId))
                              }}
                              className="flex cursor-pointer list-none items-start justify-between gap-3 bg-gradient-to-r from-white to-slate-50 px-4 py-3 hover:from-slate-50 hover:to-slate-100/70"
                            >
                              <div className="min-w-0">
                                <p className="truncate text-base font-semibold text-slate-900">{truncateText(note.primary_diagnosis, 84)}</p>
                                <p className="mt-0.5 text-xs text-slate-600">{formatDate(note.note_date)} • ICD {note.icd_code} • Note ID {note.note_id}</p>
                              </div>
                              <div className="flex shrink-0 items-center gap-2">
                                <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${noteTypeStyle}`}>
                                  {note.note_type}
                                </span>
                                <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${followUpStatus.style}`}>
                                  {followUpStatus.label}
                                </span>
                                <span className="text-xs text-slate-500 transition group-open:rotate-180">▼</span>
                              </div>
                            </summary>

                            <div className="space-y-3 border-t border-slate-200 bg-slate-50 p-3">
                              <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                                <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Provider</p>
                                  <p className="mt-1 break-words text-[13px] leading-5 text-slate-900">{note.provider_name}</p>
                                </div>
                                <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Facility</p>
                                  <p className="mt-1 break-words text-[13px] leading-5 text-slate-900">{note.facility_name}</p>
                                </div>
                                <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Follow-up Date</p>
                                  <p className="mt-1 text-sm font-medium text-slate-900">{note.follow_up_date ? formatDate(note.follow_up_date) : 'N/A'}</p>
                                </div>
                              </div>

                              <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Location</p>
                                <p className="mt-1 break-words text-[13px] leading-5 text-slate-900">{note.location ?? 'N/A'}</p>
                              </div>

                              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                                <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Subjective</p>
                                  <p className="mt-1 break-words text-[13px] leading-5 text-slate-900">{note.subjective}</p>
                                </div>
                                <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Objective</p>
                                  <p className="mt-1 break-words text-[13px] leading-5 text-slate-900">{note.objective}</p>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                                <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Assessment</p>
                                  <p className="mt-1 break-words text-[13px] leading-5 text-slate-900">{note.assessment}</p>
                                </div>
                                <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Plan</p>
                                  <p className="mt-1 break-words text-[13px] leading-5 text-slate-900">{note.plan}</p>
                                </div>
                              </div>
                            </div>
                          </details>
                        )
                      })}
                    </div>
                  )}
                </>
              ) : null}
            </div>
          </div>

          <div className="col-span-7 flex min-h-0 flex-col rounded-xl border border-slate-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-800">AI Insights</h2>
              <div className="flex items-center gap-2">
                {aiSuggestionsData ? (
                  <button
                    type="button"
                    onClick={handleAiSuggestionsClick}
                    className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                  >
                    {aiSuggestionsLoading ? 'Refreshing...' : 'Refresh AI'}
                  </button>
                ) : null}
              </div>
            </div>

            {aiSuggestionsError ? (
              <p className="mb-3 text-sm text-red-700">{aiSuggestionsError}</p>
            ) : null}

            <div className="relative min-h-0 flex-1">
              {!aiSuggestionsData ? (
                <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-white/45 backdrop-blur-sm">
                  <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white/95 p-6 text-center shadow-[0_12px_40px_rgba(15,23,42,0.18)]">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">AI Insights</p>
                    <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">Generate Smart Suggestions</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      Pull timeline, summary, and coordinator prompts from the patient data in the left panel.
                    </p>
                    <button
                      type="button"
                      onClick={handleAiSuggestionsClick}
                      disabled={aiSuggestionsLoading}
                      className="mt-5 inline-flex min-w-[180px] items-center justify-center rounded-full bg-clinical-header px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {aiSuggestionsLoading ? 'Generating...' : 'AI Suggestions'}
                    </button>
                    {aiSuggestionsLoading ? (
                      <p className="mt-3 text-xs text-slate-500">Analyzing patient context...</p>
                    ) : null}
                  </div>
                </div>
              ) : null}

              <div className={`grid h-full min-h-0 grid-cols-[220px_1fr] gap-3 transition-all duration-500 ${aiSuggestionsData ? 'opacity-100 blur-0 scale-100' : 'pointer-events-none opacity-70 blur-[2px] scale-[0.985]'}`}>
              <aside className="rounded-lg border border-slate-200 bg-slate-50 p-2">
                <p className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Insight Sections</p>
                <div className="mt-1 space-y-1">
                  <button
                    type="button"
                    onClick={() => setAiInsightsSection('summary')}
                    className={`w-full rounded-md px-3 py-2 text-left text-sm transition ${aiInsightsSection === 'summary' ? 'bg-clinical-header text-white' : 'text-slate-700 hover:bg-slate-100'}`}
                  >
                    Patient Summary
                  </button>
                  <button
                    type="button"
                    onClick={() => setAiInsightsSection('timeline')}
                    className={`w-full rounded-md px-3 py-2 text-left text-sm transition ${aiInsightsSection === 'timeline' ? 'bg-clinical-header text-white' : 'text-slate-700 hover:bg-slate-100'}`}
                  >
                    Timeline Events
                  </button>
                  <button
                    type="button"
                    onClick={() => setAiInsightsSection('alerts')}
                    className={`w-full rounded-md px-3 py-2 text-left text-sm transition ${aiInsightsSection === 'alerts' ? 'bg-clinical-header text-white' : 'text-slate-700 hover:bg-slate-100'}`}
                  >
                    Alerts
                  </button>
                  <button
                    type="button"
                    onClick={() => setAiInsightsSection('questions')}
                    className={`w-full rounded-md px-3 py-2 text-left text-sm transition ${aiInsightsSection === 'questions' ? 'bg-clinical-header text-white' : 'text-slate-700 hover:bg-slate-100'}`}
                  >
                    Suggested Questions
                  </button>

                </div>
              </aside>

              <div className="min-h-0 overflow-y-auto pr-1">
                {aiInsightsSection === 'summary' ? (
                  <div className="space-y-3">
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Clinical Story</p>
                      <p className="mt-2 text-sm leading-6 text-slate-800">
                        {aiSuggestionsData?.clinical_story ?? 'Click AI Suggestions to generate a patient summary.'}
                      </p>
                    </div>

                    {aiSuggestionsData?.missed_follow_ups && aiSuggestionsData.missed_follow_ups.length > 0 ? (
                      <div className="rounded-lg border border-slate-200 bg-white p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Missed Follow-Ups</p>
                        <div className="mt-2 space-y-2">
                          {aiSuggestionsData.missed_follow_ups.map((item) => (
                            <article key={`${item.source_position_id}-${item.follow_up_date_recommended}`} className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                              <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                                <button
                                  type="button"
                                  onClick={() => focusSourceSection(item.source_position_id)}
                                  className="underline underline-offset-2 hover:text-amber-900"
                                >
                                  {item.source_position_id}
                                </button>
                              </p>
                              <p className="mt-1 text-sm text-amber-900">Recommended: {formatDate(item.follow_up_date_recommended)} • Overdue: {item.days_overdue} days</p>
                              <p className="mt-1 text-sm text-amber-800">{item.clinical_risk}</p>
                            </article>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {aiSuggestionsData?.medication_risk_connections && aiSuggestionsData.medication_risk_connections.length > 0 ? (
                      <div className="rounded-lg border border-slate-200 bg-white p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Medication Risk Connections</p>
                        <div className="mt-2 space-y-2">
                          {aiSuggestionsData.medication_risk_connections.map((item) => (
                            <article key={`${item.source_position_id}-${item.drug_name}`} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                              <p className="text-sm font-semibold text-slate-900">{item.drug_name} • {item.adherence_status}</p>
                              <p className="mt-1 text-xs text-slate-600">
                                <button
                                  type="button"
                                  onClick={() => focusSourceSection(item.source_position_id)}
                                  className="underline underline-offset-2 hover:text-slate-800"
                                >
                                  {item.source_position_id}
                                </button>
                                {' • '}
                                {item.days_since_last_fill} days since fill
                              </p>
                              <p className="mt-1 text-sm text-slate-800">{item.risk_summary}</p>
                              <p className="mt-1 text-xs text-slate-600">
                                Labs:{' '}
                                {item.connected_lab_position_ids.length > 0
                                  ? item.connected_lab_position_ids.map((id, idx) => (
                                    <span key={id}>
                                      <button type="button" onClick={() => focusSourceSection(id)} className="underline underline-offset-2 hover:text-slate-800">{id}</button>
                                      {idx < item.connected_lab_position_ids.length - 1 ? ', ' : ''}
                                    </span>
                                  ))
                                  : 'None'}
                              </p>
                              <p className="mt-1 text-xs text-slate-600">
                                Care gaps:{' '}
                                {item.connected_gap_position_ids.length > 0
                                  ? item.connected_gap_position_ids.map((id, idx) => (
                                    <span key={id}>
                                      <button type="button" onClick={() => focusSourceSection(id)} className="underline underline-offset-2 hover:text-slate-800">{id}</button>
                                      {idx < item.connected_gap_position_ids.length - 1 ? ', ' : ''}
                                    </span>
                                  ))
                                  : 'None'}
                              </p>
                              <p className="mt-1 text-xs text-slate-600">
                                Notes:{' '}
                                {item.connected_note_position_ids.length > 0
                                  ? item.connected_note_position_ids.map((id, idx) => (
                                    <span key={id}>
                                      <button type="button" onClick={() => focusSourceSection(id)} className="underline underline-offset-2 hover:text-slate-800">{id}</button>
                                      {idx < item.connected_note_position_ids.length - 1 ? ', ' : ''}
                                    </span>
                                  ))
                                  : 'None'}
                              </p>
                            </article>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {aiInsightsSection === 'timeline' ? (
                  <div className="space-y-2">
                    {aiSuggestionsData?.timeline_events && aiSuggestionsData.timeline_events.length > 0 ? (
                      aiSuggestionsData.timeline_events
                        .slice()
                        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                        .map((event) => (
                          <article key={`${event.source_position_id}-${event.date}-${event.title}`} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{formatDate(event.date)}</p>
                                <p className="mt-1 text-sm font-semibold text-slate-900">{event.title}</p>
                                <p className="mt-1 text-sm text-slate-700">{event.description}</p>
                                <p className="mt-2 text-xs text-slate-500">
                                  Source:{' '}
                                  <button
                                    type="button"
                                    onClick={() => focusSourceSection(event.source_position_id)}
                                    className="underline underline-offset-2 hover:text-slate-700"
                                  >
                                    {event.source_position_id}
                                  </button>
                                </p>
                                {event.related_position_ids && event.related_position_ids.length > 0 ? (
                                  <p className="mt-1 text-xs text-slate-500">
                                    Related:{' '}
                                    {event.related_position_ids.map((id, idx, arr) => (
                                      <span key={id}>
                                        <button type="button" onClick={() => focusSourceSection(id)} className="underline underline-offset-2 hover:text-slate-700">{id}</button>
                                        {idx < arr.length - 1 ? ', ' : ''}
                                      </span>
                                    ))}
                                  </p>
                                ) : null}
                              </div>
                              <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${event.clinical_significance === 'critical' ? 'border-red-200 bg-red-50 text-red-700' : event.clinical_significance === 'high' ? 'border-amber-200 bg-amber-50 text-amber-700' : event.clinical_significance === 'medium' ? 'border-yellow-200 bg-yellow-50 text-yellow-700' : 'border-slate-200 bg-white text-slate-600'}`}>
                                {(event.clinical_significance ?? 'info').toUpperCase()}
                              </span>
                            </div>
                          </article>
                        ))
                    ) : (
                      <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600">
                        Click AI Suggestions to generate timeline events.
                      </div>
                    )}
                  </div>
                ) : null}

                {aiInsightsSection === 'questions' ? (
                  <>
                    <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-600">Add Question</p>
                      <div className="flex items-center gap-2">
                        <select
                          value={newQuestionCategory}
                          onChange={(event) => setNewQuestionCategory(event.target.value)}
                          className="w-[140px] rounded-md border border-slate-300 bg-white px-2 py-2 text-sm outline-none focus:border-clinical-header"
                        >
                          <option value="Social">Social</option>
                          <option value="Care Gaps">Care Gaps</option>
                          <option value="Labs">Labs</option>
                          <option value="Medication">Medication</option>
                          <option value="Prior Auth">Prior Auth</option>
                          <option value="Utilization">Utilization</option>
                        </select>
                        <input
                          type="text"
                          value={newQuestionText}
                          onChange={(event) => setNewQuestionText(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                              event.preventDefault()
                              addManualQuestion()
                            }
                          }}
                          placeholder="Type a question"
                          className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-clinical-header"
                        />
                        <button
                          type="button"
                          onClick={addManualQuestion}
                          className="rounded-md bg-clinical-header px-3 py-2 text-sm font-semibold text-white transition hover:brightness-110"
                        >
                          Add
                        </button>
                      </div>
                    </div>

                    {orderedApiQuestions.length > 0 ? (
                      <div className="mb-4 space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Questions (Drag to Reorder)</p>
                        {orderedApiQuestions.map((item) => (
                          <article
                            key={item.question_id}
                            onDragOver={(event) => {
                              event.preventDefault()
                              setDragOverApiQuestionId(item.question_id)
                            }}
                            onDrop={() => {
                              if (draggingApiQuestionId) {
                                reorderApiQuestions(draggingApiQuestionId, item.question_id)
                              }
                              setDraggingApiQuestionId(null)
                              setDragOverApiQuestionId(null)
                            }}
                            className={`rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition ${
                              draggingApiQuestionId === item.question_id ? 'opacity-50' : ''
                            } ${dragOverApiQuestionId === item.question_id ? 'ring-2 ring-clinical-header/40' : ''}`}
                          >
                            <div className="flex items-start gap-3">
                              <button
                                type="button"
                                draggable
                                onDragStart={(event) => {
                                  setDraggingApiQuestionId(item.question_id)
                                  event.dataTransfer.effectAllowed = 'move'
                                }}
                                onDragEnd={() => {
                                  setDraggingApiQuestionId(null)
                                  setDragOverApiQuestionId(null)
                                }}
                                className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded text-slate-400 transition hover:bg-slate-200 hover:text-slate-600"
                                title="Drag from handle to reorder"
                                aria-label="Drag handle"
                              >
                                <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" aria-hidden="true">
                                  <circle cx="4" cy="3" r="1" />
                                  <circle cx="10" cy="3" r="1" />
                                  <circle cx="4" cy="7" r="1" />
                                  <circle cx="10" cy="7" r="1" />
                                  <circle cx="4" cy="11" r="1" />
                                  <circle cx="10" cy="11" r="1" />
                                </svg>
                              </button>
                              <div className="flex-1">
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <div className="flex flex-wrap items-center gap-2">
                                      <input
                                        type="checkbox"
                                        checked={selectedQuestionIds.includes(item.question_id)}
                                        onChange={(event) => {
                                          setSelectedQuestionIds((current) => (
                                            event.target.checked
                                              ? [...current, item.question_id]
                                              : current.filter((id) => id !== item.question_id)
                                          ))
                                        }}
                                        className="h-4 w-4"
                                        title="Include this question in View 3"
                                      />
                                      <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600">
                                        {formatQuestionCategory(item.category)}
                                      </span>
                                      <span className="text-xs text-slate-500">{item.source_label}</span>
                                    </div>
                                    <textarea
                                      value={getQuestionText(item)}
                                      onChange={(event) => updateQuestionText(item.question_id, event.target.value)}
                                      rows={2}
                                      className="mt-1 w-full resize-y rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-800 outline-none focus:border-clinical-header"
                                    />
                                    {item.source_position_id ? (
                                      <p className="mt-2 text-xs text-slate-500">
                                        Source:{' '}
                                        <button
                                          type="button"
                                          onClick={() => focusSourceSection(item.source_position_id)}
                                          className="underline underline-offset-2 hover:text-slate-700"
                                        >
                                          {item.source_position_id}
                                        </button>
                                      </p>
                                    ) : null}
                                    {item.clinical_context ? (
                                      <p className="mt-1 text-xs leading-5 text-slate-600">{item.clinical_context}</p>
                                    ) : null}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${getQuestionPriorityStyle(item.priority)}`}>
                                      {item.priority}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => removeQuestion(item.question_id)}
                                      className="text-xs font-medium text-slate-500 underline hover:text-slate-700"
                                    >
                                      Delete
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </article>
                        ))}
                      </div>
                    ) : (
                      <div className="mb-4 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600">
                        No AI suggested questions yet. Click AI Suggestions to generate them.
                      </div>
                    )}
                  </>
                ) : null}



                {aiInsightsSection === 'alerts' ? (
                  <div className="space-y-2">
                    {aiSuggestionsData?.coordinator_alerts && aiSuggestionsData.coordinator_alerts.length > 0 ? (
                      aiSuggestionsData.coordinator_alerts
                        .slice()
                        .sort((a, b) => a.rank - b.rank)
                        .map((alert) => (
                          <article key={`${alert.rank}-${alert.alert_title}`} className="rounded-lg border border-red-200 bg-red-50 p-3">
                            <p className="mt-1 text-sm font-semibold text-red-900">{alert.alert_title}</p>
                            <p className="mt-1 text-sm text-red-800">{alert.reason}</p>
                            <p className="mt-1 text-xs text-red-700">Suggested opening: {alert.suggested_opening}</p>
                            <p className="mt-1 text-xs text-red-700">
                              Linked IDs:{' '}
                              {alert.connected_position_ids.length > 0 ? (
                                alert.connected_position_ids.map((id, idx) => (
                                  <span key={id}>
                                    <button
                                      type="button"
                                      onClick={() => focusSourceSection(id)}
                                      className="underline underline-offset-2 hover:text-red-900"
                                    >
                                      {id}
                                    </button>
                                    {idx < alert.connected_position_ids.length - 1 ? ', ' : ''}
                                  </span>
                                ))
                              ) : (
                                'None'
                              )}
                            </p>
                          </article>
                        ))
                    ) : (
                      <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600">
                        No alerts generated yet. Click AI Suggestions to generate alerts.
                      </div>
                    )}
                  </div>
                ) : null}
              </div>

            </div>
            </div>

          </div>
        </>
      )}
    </div>
  )
}

interface DeepDiveViewProps {
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
  selectedPharmacyClaims: Array<{
    rx_claim_id: string
    date_filled: string
    drug_name: string
    dosage: string
    days_supply: number
    prescribing_provider: string
    pharmacy_name: string
    copay_amount: number
    plan_paid_amount: number
    fill_status: string
  }>
  activeDeepDiveSection: DeepDiveSectionId
  sectionQuestions: Record<DeepDiveSectionId, SuggestedQuestion[]>
  deepDiveResponses: Record<DeepDiveSectionId, Record<string, DeepDiveQuestionResponse>>
  supervisorNotes: string[]
  onSetActiveSection: (sectionId: DeepDiveSectionId) => void
  onUpdateQuestion: (sectionId: DeepDiveSectionId, questionId: string, patch: Partial<DeepDiveQuestionResponse>) => void
  getSectionProgress: (sectionId: DeepDiveSectionId) => { total: number; completed: number; allComplete: boolean }
}

export function DeepDiveView({
  selectedMember,
  selectedPatientDetail,
  patientDetailLoading,
  patientDetailError,
  selectedNotes,
  selectedLabs,
  selectedMeds,
  selectedGaps,
  selectedAuths,
  selectedPharmacyClaims,
  supervisorNotes,
}: DeepDiveViewProps) {
  const [activeDataPanel, setActiveDataPanel] = useState<'demographics' | 'gaps' | 'labs' | 'medications' | 'auths' | 'notes'>('demographics')
  const [selectedQuestions, setSelectedQuestions] = useState<SuggestedQuestion[]>([])
  const [storedView2Data, setStoredView2Data] = useState<StoredView2Data | null>(null)
  const [questionAnswers, setQuestionAnswers] = useState<Record<string, string>>({})
  const [showNoteInput, setShowNoteInput] = useState<boolean>(false)
  const [callNotes, setCallNotes] = useState<string>('')
  const [activeSourcePositionId, setActiveSourcePositionId] = useState<string | null>(null)

  const routeMemberId = (() => {
    const match = /^\/deep-dive\/([^/]+)$/.exec(window.location.pathname)
    return match?.[1] ? decodeURIComponent(match[1]) : ''
  })()

  const effectiveMember = selectedMember ?? storedView2Data?.member ?? null
  const effectivePatientDetail = selectedPatientDetail ?? storedView2Data?.patientDetail ?? null
  const effectiveNotes = selectedNotes.length > 0 ? selectedNotes : (storedView2Data?.notes ?? [])
  const effectiveLabs = selectedLabs.length > 0 ? selectedLabs : (storedView2Data?.labs ?? [])
  const effectiveMeds = selectedMeds.length > 0 ? selectedMeds : (storedView2Data?.meds ?? [])
  const effectiveGaps = selectedGaps.length > 0 ? selectedGaps : (storedView2Data?.gaps ?? [])
  const effectiveAuths = selectedAuths.length > 0 ? selectedAuths : (storedView2Data?.auths ?? [])

  const demographicsSections = effectivePatientDetail
    ? [
      {
        title: 'Identity',
        rows: [
          { label: 'Member ID', value: effectivePatientDetail.member_id },
          { label: 'Gender', value: effectivePatientDetail.gender },
          { label: 'Age', value: String(effectivePatientDetail.age) },
          { label: 'Date of Birth', value: effectivePatientDetail.date_of_birth ?? 'N/A' },
          { label: 'Preferred Language', value: effectivePatientDetail.preferred_language ?? 'N/A' },
        ],
      },
      {
        title: 'Address',
        rows: [
          { label: 'Street Address', value: effectivePatientDetail.street_address ?? 'N/A' },
          { label: 'City', value: effectivePatientDetail.city ?? 'N/A' },
          { label: 'State', value: effectivePatientDetail.state ?? 'N/A' },
          { label: 'Zip Code', value: effectivePatientDetail.zip_code == null ? 'N/A' : String(effectivePatientDetail.zip_code) },
          { label: 'Location', value: effectivePatientDetail.location },
        ],
      },
      {
        title: 'Contact',
        rows: [
          { label: 'Phone Primary', value: effectivePatientDetail.phone_primary ?? 'N/A' },
          { label: 'Phone Secondary', value: effectivePatientDetail.phone_secondary ?? 'N/A' },
          { label: 'Preferred Contact Method', value: effectivePatientDetail.preferred_contact_method ?? 'N/A' },
          { label: 'Email Address', value: effectivePatientDetail.email_address ?? 'N/A' },
        ],
      },
      {
        title: 'Social Profile',
        rows: [
          { label: 'Marital Status', value: effectivePatientDetail.marital_status ?? 'N/A' },
          { label: 'Employment Status', value: effectivePatientDetail.employment_status ?? 'N/A' },
          { label: 'Caregiver Support', value: effectivePatientDetail.caregiver_support ?? 'N/A' },
        ],
      },
      {
        title: 'Clinical and Coverage',
        rows: [
          { label: 'Primary Conditions', value: effectivePatientDetail.primary_conditions ?? 'N/A' },
          { label: 'Insurance Plan Type', value: effectivePatientDetail.insurance_plan_type ?? 'N/A' },
          { label: 'Insurance Start Date', value: effectivePatientDetail.insurance_start_date ?? 'N/A' },
          { label: 'Risk Tier', value: effectivePatientDetail.risk_tier ?? 'N/A' },
          { label: 'Assigned Coordinator', value: effectivePatientDetail.assigned_coordinator ?? 'N/A' },
        ],
      },
    ]
    : []

  useEffect(() => {
    const memberId = selectedMember?.member_id || routeMemberId
    if (!memberId) {
      setSelectedQuestions([])
      return
    }

    const raw = window.localStorage.getItem(`deep-dive-selected-questions:${memberId}`)
    if (!raw) {
      setSelectedQuestions([])
      return
    }

    try {
      const parsed = JSON.parse(raw) as SuggestedQuestion[]
      setSelectedQuestions(Array.isArray(parsed) ? parsed : [])
    } catch {
      setSelectedQuestions([])
    }
  }, [selectedMember?.member_id, routeMemberId])

  useEffect(() => {
    if (selectedMember) {
      setStoredView2Data(null)
      return
    }

    if (!routeMemberId) return

    const raw = window.localStorage.getItem(`view2-panel-data:${routeMemberId}`)
    if (!raw) {
      setStoredView2Data(null)
      return
    }

    try {
      const parsed = JSON.parse(raw) as StoredView2Data
      setStoredView2Data(parsed)
    } catch {
      setStoredView2Data(null)
    }
  }, [selectedMember, routeMemberId])

  function mapCategoryToPanel(category: string): 'gaps' | 'labs' | 'medications' | 'auths' | 'notes' {
    const normalized = category.toLowerCase()
    if (normalized.includes('lab')) return 'labs'
    if (normalized.includes('med')) return 'medications'
    if (normalized.includes('auth')) return 'auths'
    if (normalized.includes('gap')) return 'gaps'
    return 'notes'
  }

  function focusSourceInDeepDive(sourcePositionId?: string, fallbackCategory?: string) {
    const sourceMatch = sourcePositionId ? /^(gap|lab|med|auth|note)-section-(\d+)$/.exec(sourcePositionId) : null
    const sourceType = sourceMatch?.[1]

    const targetPanel =
      sourceType === 'gap' ? 'gaps'
      : sourceType === 'lab' ? 'labs'
      : sourceType === 'med' ? 'medications'
      : sourceType === 'auth' ? 'auths'
      : sourceType === 'note' ? 'notes'
      : mapCategoryToPanel(fallbackCategory ?? '')

    setActiveDataPanel(targetPanel)

    if (!sourcePositionId) {
      setActiveSourcePositionId(null)
      return
    }

    setActiveSourcePositionId(sourcePositionId)
    window.requestAnimationFrame(() => {
      const target = document.getElementById(sourcePositionId)
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    })
  }

  function renderLeftPanel(panelId: 'demographics' | 'gaps' | 'labs' | 'medications' | 'auths' | 'notes') {
    switch (panelId) {
      case 'demographics':
        return (
          <div className="flex h-full flex-col rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="mb-3 rounded-lg bg-white p-4 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900">Patient Demographics</h3>
              <p className="mt-1 text-sm text-slate-600">
                Same demographic panel as View 2.
              </p>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto rounded-lg border border-slate-200 bg-white p-3">
              {patientDetailLoading ? (
                <p className="mt-2 text-sm text-slate-600">Loading patient details...</p>
              ) : null}
              {!patientDetailLoading && patientDetailError ? (
                <p className="mt-2 text-sm text-red-700">{patientDetailError}</p>
              ) : null}
              {!patientDetailLoading && !patientDetailError && effectivePatientDetail ? (
                <div className="mt-3 space-y-3">
                  <div className="overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-blue-50/70 shadow-[0_1px_20px_rgba(15,23,42,0.06)]">
                    <div className="border-b border-slate-200/80 px-5 py-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Patient Snapshot</p>
                          <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">{effectivePatientDetail.full_name}</p>
                          <p className="mt-1 text-sm text-slate-600">Member ID {effectivePatientDetail.member_id}</p>
                        </div>
                        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                          <span className="inline-flex rounded-full border border-slate-200 bg-white/90 px-3 py-1 text-xs font-medium text-slate-700 shadow-sm">
                            {effectivePatientDetail.age} · {effectivePatientDetail.gender}
                          </span>
                          <span className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 shadow-sm">
                            {effectivePatientDetail.risk_tier ?? 'N/A'}
                          </span>
                          <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 shadow-sm">
                            {effectivePatientDetail.preferred_contact_method ?? 'N/A'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {demographicsSections.map((section) => (
                      <section key={section.title} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_12px_rgba(15,23,42,0.04)]">
                        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-4 py-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{section.title}</p>
                        </div>
                        <div className="grid grid-cols-1 gap-px bg-slate-100 md:grid-cols-2 xl:grid-cols-3">
                          {section.rows.map((row) => (
                            <div
                              key={row.label}
                              className={`bg-white px-4 py-3 transition-colors hover:bg-slate-50/80 ${section.title === 'Contact' && row.label === 'Email Address' ? 'md:col-span-2 xl:col-span-3' : ''}`}
                            >
                              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{row.label}</p>
                              <p className="mt-1 min-w-0 break-words text-sm leading-6 text-slate-900">{row.value}</p>
                            </div>
                          ))}
                        </div>
                      </section>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        )

      case 'notes':
        return (
          <div className="flex h-full flex-col rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="mb-3 rounded-lg bg-white p-4 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900">Clinical Notes & History</h3>
              <p className="mt-1 text-sm text-slate-600">
                {effectiveMember?.patient_name ?? 'This patient'} has {effectiveNotes.length} note{effectiveNotes.length === 1 ? '' : 's'} on file. The most recent note is expanded by default.
              </p>
            </div>

            <div className="min-h-0 flex-1 space-y-3 overflow-auto pr-1">
              {effectiveNotes.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-600">
                  No clinical notes on file for this patient.
                </div>
              ) : (
                effectiveNotes.map((note, index) => {
                  const sourcePositionId = `note-section-${index + 1}`
                  const isSourceActive = activeSourcePositionId === sourcePositionId

                  return (
                  <details id={sourcePositionId} key={note.note_id} open={index === 0} className={`rounded-lg border bg-white p-3 ${isSourceActive ? 'border-blue-400 ring-1 ring-blue-300' : 'border-slate-200'}`}>
                    <summary className="cursor-pointer list-none text-sm font-semibold text-slate-800">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <span>{formatDate(note.note_date)} - {note.note_type}</span>
                        <span className="text-xs font-normal text-slate-500">{note.provider_name} | {note.facility_name}</span>
                      </div>
                    </summary>
                    <div className="mt-3 space-y-3 text-sm text-slate-700">
                      <div className="grid grid-cols-2 gap-3 rounded-md bg-slate-50 p-3 text-xs">
                        <div><span className="font-semibold text-slate-500">Primary Dx:</span> {note.primary_diagnosis}</div>
                        <div><span className="font-semibold text-slate-500">Follow-up:</span> {formatDate(note.follow_up_date)}</div>
                        <div><span className="font-semibold text-slate-500">ICD:</span> {note.icd_code}</div>
                        <div><span className="font-semibold text-slate-500">Provider:</span> {note.provider_name}</div>
                      </div>
                      {([
                        ['Subjective', note.subjective],
                        ['Objective', note.objective],
                        ['Assessment', note.assessment],
                        ['Plan', note.plan],
                      ] as const).map(([label, value], idx) => (
                        <details key={label} open={index === 0 && idx === 0} className="rounded-md border border-slate-200 bg-white p-2">
                          <summary className="cursor-pointer list-none text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</summary>
                          <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{value}</p>
                        </details>
                      ))}
                    </div>
                  </details>
                )})
              )}
            </div>
          </div>
        )

      case 'labs': {
        const groupedLabs = effectiveLabs.reduce<Record<string, typeof effectiveLabs>>((acc, lab) => {
          const list = acc[lab.lab_type] ?? []
          list.push(lab)
          acc[lab.lab_type] = list
          return acc
        }, {})
        const groupNames = Object.keys(groupedLabs)
        const abnormalCount = effectiveLabs.filter((lab) => lab.result_flag !== 'Normal').length

        return (
          <div className="flex h-full flex-col rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="mb-3 rounded-lg bg-white p-4 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900">Lab Results</h3>
              <p className="mt-1 text-sm text-slate-600">
                {effectiveMember?.patient_name ?? 'This patient'} has {effectiveLabs.length} lab result{effectiveLabs.length === 1 ? '' : 's'} across {groupNames.length} lab type{groupNames.length === 1 ? '' : 's'}. {abnormalCount} are abnormal.
              </p>
            </div>
            <div className="min-h-0 flex-1 space-y-3 overflow-auto pr-1">
              {effectiveLabs.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-600">No lab results on file for this patient.</div>
              ) : (
                groupNames.map((labType, index) => (
                  <details key={labType} open={index === 0} className="rounded-lg border border-slate-200 bg-white p-3">
                    <summary className="cursor-pointer list-none text-sm font-semibold text-slate-800">{labType}</summary>
                    <div className="mt-3 overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead>
                          <tr className="text-xs text-slate-500">
                            <th className="py-1 font-medium">Draw Date</th>
                            <th className="py-1 font-medium">Lab Type</th>
                            <th className="py-1 font-medium">Test Name</th>
                            <th className="py-1 font-medium">Result</th>
                            <th className="py-1 font-medium">Unit</th>
                            <th className="py-1 font-medium">Reference</th>
                            <th className="py-1 font-medium">Flag</th>
                          </tr>
                        </thead>
                        <tbody>
                          {groupedLabs[labType].map((lab, idx) => {
                            const sourcePositionId = `lab-section-${effectiveLabs.findIndex((item) => item.lab_id === lab.lab_id) + 1}`
                            const isSourceActive = activeSourcePositionId === sourcePositionId
                            return (
                            <tr id={sourcePositionId} key={lab.lab_id} className={`${idx % 2 === 1 ? 'bg-clinical-row' : ''} ${isSourceActive ? 'bg-blue-50 outline outline-1 outline-blue-300' : ''}`}>
                              <td className="px-1 py-1.5">{formatDate(lab.draw_date)}</td>
                              <td className="px-1 py-1.5">{lab.lab_type}</td>
                              <td className="px-1 py-1.5">{lab.test_name}</td>
                              <td className="px-1 py-1.5">{lab.result_value}</td>
                              <td className="px-1 py-1.5">{lab.unit}</td>
                              <td className="px-1 py-1.5">{lab.reference_range}</td>
                              <td className={`px-1 py-1.5 font-semibold ${labFlagStyles[lab.result_flag] ?? 'text-slate-700'}`}>{lab.result_flag}</td>
                            </tr>
                          )})}
                        </tbody>
                      </table>
                    </div>
                  </details>
                ))
              )}
            </div>
          </div>
        )
      }

      case 'medications': {
        const activeMedications = effectiveMeds.filter((medication) => medication.medication_status === 'Active')
        const nonAdherentCount = effectiveMeds.filter((medication) => medication.adherence_status === 'Non-Adherent').length
        const onHoldCount = effectiveMeds.filter((medication) => medication.adherence_status === 'On Hold').length

        return (
          <div className="flex h-full flex-col rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="mb-3 rounded-lg bg-white p-4 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900">Medications</h3>
              <p className="mt-1 text-sm text-slate-600">
                {effectiveMember?.patient_name ?? 'This patient'} has {activeMedications.length} active medication{activeMedications.length === 1 ? '' : 's'}. {nonAdherentCount} are Non-Adherent and {onHoldCount} are On Hold.
              </p>
            </div>
            <div className="min-h-0 flex-1 space-y-3 overflow-auto pr-1">
              <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white p-3">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="text-xs text-slate-500">
                      <th className="py-1 font-medium">Drug Name</th>
                      <th className="py-1 font-medium">Brand</th>
                      <th className="py-1 font-medium">Dosage</th>
                      <th className="py-1 font-medium">Frequency</th>
                      <th className="py-1 font-medium">Indication</th>
                      <th className="py-1 font-medium">Last Fill</th>
                      <th className="py-1 font-medium">Days Since Fill</th>
                      <th className="py-1 font-medium">Adherence</th>
                      <th className="py-1 font-medium">Rx Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {effectiveMeds.map((medication, index) => {
                      const sourcePositionId = `med-section-${index + 1}`
                      const isSourceActive = activeSourcePositionId === sourcePositionId
                      return (
                      <tr id={sourcePositionId} key={medication.med_id} className={`${index % 2 === 1 ? 'bg-clinical-row' : ''} ${medication.adherence_status === 'Non-Adherent' ? 'bg-red-50' : ''} ${isSourceActive ? 'outline outline-1 outline-blue-300 bg-blue-50' : ''}`}>
                        <td className="px-1 py-1.5">{medication.drug_name}</td>
                        <td className="px-1 py-1.5">{medication.brand_name}</td>
                        <td className="px-1 py-1.5">{medication.dosage}</td>
                        <td className="px-1 py-1.5">{medication.frequency}</td>
                        <td className="px-1 py-1.5">{medication.indication}</td>
                        <td className="px-1 py-1.5">{formatDate(medication.last_fill_date)}</td>
                        <td className="px-1 py-1.5">{medication.days_since_last_fill}</td>
                        <td className={`px-1 py-1.5 font-semibold ${adherenceStyles[medication.adherence_status] ?? 'text-slate-700'}`}>{medication.adherence_status}</td>
                        <td className="px-1 py-1.5">{medication.rx_notes || '-'}</td>
                      </tr>
                    )})}
                  </tbody>
                </table>
              </div>

              <details open className="rounded-lg border border-slate-200 bg-white p-3">
                <summary className="cursor-pointer list-none text-sm font-semibold text-slate-800">Pharmacy Claims</summary>
                <div className="mt-3 overflow-x-auto">
                  {selectedPharmacyClaims.length === 0 ? (
                    <p className="text-sm text-slate-500">No pharmacy claims on file for this patient.</p>
                  ) : (
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="text-xs text-slate-500">
                          <th className="py-1 font-medium">Date Filled</th>
                          <th className="py-1 font-medium">Drug</th>
                          <th className="py-1 font-medium">Dosage</th>
                          <th className="py-1 font-medium">Days Supply</th>
                          <th className="py-1 font-medium">Prescriber</th>
                          <th className="py-1 font-medium">Pharmacy</th>
                          <th className="py-1 font-medium">Copay</th>
                          <th className="py-1 font-medium">Plan Paid</th>
                          <th className="py-1 font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedPharmacyClaims.map((claim, index) => (
                          <tr key={claim.rx_claim_id} className={index % 2 === 1 ? 'bg-clinical-row' : ''}>
                            <td className="px-1 py-1.5">{formatDate(claim.date_filled)}</td>
                            <td className="px-1 py-1.5">{claim.drug_name}</td>
                            <td className="px-1 py-1.5">{claim.dosage}</td>
                            <td className="px-1 py-1.5">{claim.days_supply}</td>
                            <td className="px-1 py-1.5">{claim.prescribing_provider}</td>
                            <td className="px-1 py-1.5">{claim.pharmacy_name}</td>
                            <td className="px-1 py-1.5">{formatMoney(claim.copay_amount)}</td>
                            <td className="px-1 py-1.5">{formatMoney(claim.plan_paid_amount)}</td>
                            <td className="px-1 py-1.5">{claim.fill_status}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </details>
            </div>
          </div>
        )
      }

      case 'gaps':
        return (
          <div className="flex h-full flex-col rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="mb-3 rounded-lg bg-white p-4 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900">Care Gaps</h3>
              <p className="mt-1 text-sm text-slate-600">
                {effectiveMember?.patient_name ?? 'This patient'} has {effectiveGaps.length} care gap{effectiveGaps.length === 1 ? '' : 's'} on file. Open critical gaps are highlighted first.
              </p>
            </div>

            <div className="min-h-0 flex-1 overflow-auto pr-1">
              {effectiveGaps.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-600">No care gaps on file for this patient.</div>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white p-3">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="text-xs text-slate-500">
                        <th className="py-1 font-medium">Category</th>
                        <th className="py-1 font-medium">Gap Description</th>
                        <th className="py-1 font-medium">Priority</th>
                        <th className="py-1 font-medium">Days Overdue</th>
                        <th className="py-1 font-medium">Last Completed</th>
                        <th className="py-1 font-medium">Status</th>
                        <th className="py-1 font-medium">Recommended Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {effectiveGaps.map((gap, index) => {
                        const sourcePositionId = `gap-section-${index + 1}`
                        const isSourceActive = activeSourcePositionId === sourcePositionId
                        return (
                        <tr id={sourcePositionId} key={gap.gap_id} className={`${index % 2 === 1 ? 'bg-clinical-row' : ''} ${gap.priority === 'Critical' ? 'bg-red-50' : gap.priority === 'High' ? 'bg-amber-50' : ''} ${isSourceActive ? 'outline outline-1 outline-blue-300 bg-blue-50' : ''}`}>
                          <td className="px-1 py-1.5">{gap.gap_category}</td>
                          <td className="px-1 py-1.5">{gap.gap_description}</td>
                          <td className="px-1 py-1.5"><span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${gapPriorityStyles[gap.priority]}`}>{gap.priority}</span></td>
                          <td className="px-1 py-1.5">{gap.days_overdue}</td>
                          <td className="px-1 py-1.5">{formatDate(gap.last_completed_date)}</td>
                          <td className="px-1 py-1.5">{gap.gap_status}</td>
                          <td className="px-1 py-1.5">{gap.recommended_action}</td>
                        </tr>
                      )})}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )

      case 'auths':
        return (
          <div className="flex h-full flex-col rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="mb-3 rounded-lg bg-white p-4 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900">Prior Authorizations</h3>
              <p className="mt-1 text-sm text-slate-600">
                {effectiveMember?.patient_name ?? 'This patient'} has {effectiveAuths.length} prior authorization{effectiveAuths.length === 1 ? '' : 's'} on file.
              </p>
            </div>
            <div className="min-h-0 flex-1 overflow-auto pr-1">
              {effectiveAuths.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-600">No prior authorizations on file for this patient.</div>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white p-3">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="text-xs text-slate-500">
                        <th className="py-1 font-medium">Auth Type</th>
                        <th className="py-1 font-medium">Service Requested</th>
                        <th className="py-1 font-medium">Decision</th>
                        <th className="py-1 font-medium">Decision Date</th>
                        <th className="py-1 font-medium">Valid Through</th>
                        <th className="py-1 font-medium">Denial Reason</th>
                        <th className="py-1 font-medium">Appeal Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {effectiveAuths.map((auth, index) => {
                        const sourcePositionId = `auth-section-${index + 1}`
                        const isSourceActive = activeSourcePositionId === sourcePositionId
                        return (
                        <tr id={sourcePositionId} key={auth.auth_id} className={`${index % 2 === 1 ? 'bg-clinical-row' : ''} ${isSourceActive ? 'bg-blue-50 outline outline-1 outline-blue-300' : ''}`}>
                          <td className="px-1 py-1.5">{auth.auth_type}</td>
                          <td className="px-1 py-1.5">{auth.service_requested}</td>
                          <td className={`px-1 py-1.5 font-semibold ${auth.decision === 'Denied' ? 'text-red-700' : auth.decision === 'Pending' ? 'text-amber-700' : auth.decision === 'Appealed' ? 'text-purple-700' : 'text-emerald-700'}`}>{auth.decision}</td>
                          <td className="px-1 py-1.5">{auth.decision_date ? formatDate(auth.decision_date) : '-'}</td>
                          <td className="px-1 py-1.5">{auth.valid_through ? formatDate(auth.valid_through) : '-'}</td>
                          <td className="px-1 py-1.5">{auth.denial_reason || '-'}</td>
                          <td className="px-1 py-1.5">{auth.appeal_status || '-'}</td>
                        </tr>
                      )})}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )

      default:
        return null
    }
  }

  function renderRightPanel() {
    return (
      <div className="flex h-full flex-col gap-4 overflow-hidden">
        <div className="flex-1 overflow-y-auto rounded-xl border border-slate-200 bg-white p-4">
          <div className="mb-3 flex items-center justify-between border-b border-slate-200 pb-3">
            <div>
              <h3 className="text-lg font-semibold text-slate-800">Questions</h3>
              <p className="text-sm text-slate-500">{selectedQuestions.length} questions</p>
            </div>
          </div>

          <div className="min-h-0 flex-1 space-y-3 overflow-auto pr-1">
            {selectedQuestions.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600">No questions selected. Go back to View 2 to select questions.</div>
            ) : (
              selectedQuestions.map((question) => (
                <article key={question.id} className={`rounded-lg border-l-4 border border-slate-200 bg-white p-4 shadow-sm ${categoryBorderStyles[question.category]}`}>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{question.category}</p>
                  <p className="mt-1 text-sm font-semibold text-slate-800">{question.text}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-xs font-medium text-slate-500">Source:</span>
                    <button
                      type="button"
                      onClick={() => focusSourceInDeepDive(question.sourcePositionId, question.category)}
                      className="inline-block rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700 underline-offset-2 hover:bg-slate-200 hover:underline"
                      title="Jump to source in left panel"
                    >
                      {question.sourceLabel ?? formatQuestionCategory(question.category)}
                    </button>
                  </div>
                  <textarea
                    placeholder="Write your answer here..."
                    value={questionAnswers[question.id] || ''}
                    onChange={(e) => setQuestionAnswers({ ...questionAnswers, [question.id]: e.target.value })}
                    rows={3}
                    className="mt-2 w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 placeholder-slate-400 transition focus:border-blue-300 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-300"
                  />
                </article>
              ))
            )}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="mb-3 flex items-center justify-between border-b border-slate-200 pb-3">
            <div>
              <h3 className="text-lg font-semibold text-slate-800">Call Notes</h3>
              <p className="text-sm text-slate-500">Add any additional notes</p>
            </div>
            <button
              onClick={() => setShowNoteInput(!showNoteInput)}
              className="rounded-md bg-blue-500 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-600 transition"
            >
              {showNoteInput ? 'Hide' : 'Add Note'}
            </button>
          </div>

          {showNoteInput && (
            <textarea
              placeholder="Type your call notes here..."
              value={callNotes}
              onChange={(e) => setCallNotes(e.target.value)}
              rows={5}
              className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 placeholder-slate-400 transition focus:border-blue-300 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-300"
            />
          )}

          {callNotes && !showNoteInput && (
            <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 whitespace-pre-wrap">
              {callNotes}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col space-y-4 overflow-hidden">
      <div className="flex items-center justify-between rounded-xl bg-slate-900 px-5 py-4 text-white">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-300">Current Patient</p>
          <h2 className="mt-1 text-lg font-semibold">
            {effectiveMember?.patient_name ?? 'No patient selected'} <span className="text-sm font-normal text-slate-300">{effectiveMember?.member_id ?? ''}</span>
          </h2>
        </div>
      </div>

      {supervisorNotes.length > 0 ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-semibold">Supervisor Notes</p>
          <ul className="mt-2 space-y-1">
            {supervisorNotes.map((note) => <li key={note}>{note}</li>)}
          </ul>
        </div>
      ) : null}

      <div className="grid min-h-0 flex-1 grid-cols-[280px_minmax(0,1fr)] gap-4 overflow-hidden">
        <aside className="sticky top-4 max-h-full overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="mb-3 border-b border-slate-200 pb-3">
            <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">Sections</h3>
            <p className="mt-1 text-sm text-slate-600">Same data panel navigation as View 2.</p>
          </div>
          <div className="space-y-2">
            {[
              { id: 'demographics', label: 'Patient Demographics' },
              { id: 'gaps', label: 'Care Gap Reports' },
              { id: 'labs', label: 'Lab Results' },
              { id: 'medications', label: 'Medication List' },
              { id: 'auths', label: 'Prior Auth History' },
              { id: 'notes', label: 'EHR Clinical Notes' },
            ].map((section) => {
              const isActive = activeDataPanel === section.id
              return (
                <button key={section.id} onClick={() => {
                  setActiveSourcePositionId(null)
                  setActiveDataPanel(section.id as 'demographics' | 'gaps' | 'labs' | 'medications' | 'auths' | 'notes')
                }} className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition ${isActive ? 'border-clinical-header bg-white shadow-sm' : 'border-slate-200 bg-white hover:bg-slate-100'}`}>
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">•</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-slate-800">{section.label}</span>
                  </span>
                </button>
              )
            })}
          </div>
        </aside>

        <div className="flex h-full min-h-0 gap-4 overflow-hidden">
          <div className="min-h-0 w-[55%] overflow-y-auto">
            {renderLeftPanel(activeDataPanel)}
          </div>
          <div className="min-h-0 w-[45%] overflow-y-auto">
            {renderRightPanel()}
          </div>
        </div>
      </div>
    </div>
  )
}

interface SummaryViewProps {
  draft: CarePlanDraft
  onUpdateDraft: (field: keyof CarePlanDraft, value: string | string[]) => void
  onUpdateDraftListItem: (field: 'activeDiagnoses' | 'currentMedications' | 'openCareGaps' | 'recommendedInterventions' | 'followUpActions', index: number, value: string) => void
  onAddDraftItem: (field: 'activeDiagnoses' | 'currentMedications' | 'openCareGaps' | 'recommendedInterventions' | 'followUpActions') => void
  onRemoveDraftItem: (field: 'activeDiagnoses' | 'currentMedications' | 'openCareGaps' | 'recommendedInterventions' | 'followUpActions', index: number) => void
  onSaveDraft: () => void
  onExportAsPdf: () => void
  onStartNewCall: () => void
  toastVisible: boolean
  sectionQuestions: Record<DeepDiveSectionId, SuggestedQuestion[]>
  deepDiveResponses: Record<DeepDiveSectionId, Record<string, DeepDiveQuestionResponse>>
}

export function SummaryView({
  draft,
  onUpdateDraft,
  onUpdateDraftListItem,
  onAddDraftItem,
  onRemoveDraftItem,
  onSaveDraft,
  onExportAsPdf,
  onStartNewCall,
  toastVisible,
  sectionQuestions,
  deepDiveResponses,
}: SummaryViewProps) {
  function renderQuestionSummarySection(sectionId: DeepDiveSectionId, title: string) {
    const questions = sectionQuestions[sectionId]
    const responses = deepDiveResponses[sectionId] ?? {}

    return (
      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-slate-900">{title}</h3>
            <p className="text-xs text-slate-500">{formatSectionQuestionCount(questions.filter((question) => statusIsComplete(responses[question.id]?.status ?? '')).length, questions.length)}</p>
          </div>
        </div>

        <div className="space-y-3">
          {questions.length === 0 ? (
            <p className="text-sm text-slate-500">No questions available for this section.</p>
          ) : (
            questions.map((question) => {
              const response = responses[question.id] ?? { notes: '', status: '' }
              const isSkipped = response.status === 'Skipped'
              const isFollowUp = response.status === 'Needs Follow-Up'

              return (
                <article key={question.id} className={`rounded-md border p-3 ${isSkipped ? 'border-slate-200 bg-slate-50 text-slate-500' : 'border-slate-200 bg-white'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{question.text}</p>
                      <p className="mt-1 text-xs uppercase tracking-wide text-slate-500">{question.category}</p>
                    </div>
                    {isFollowUp ? (
                      <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">Needs Follow-Up</span>
                    ) : isSkipped ? (
                      <span className="inline-flex rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">Skipped</span>
                    ) : null}
                  </div>
                  <div className="mt-2 rounded-md bg-slate-50 p-2 text-sm text-slate-700">
                    {isSkipped ? <p>Skipped</p> : response.notes.trim() ? <p className="whitespace-pre-wrap">{response.notes}</p> : <p className="italic text-slate-500">No coordinator notes captured.</p>}
                  </div>
                </article>
              )
            })
          )}
        </div>
      </section>
    )
  }

  function renderEditableListField(
    label: string,
    field: 'activeDiagnoses' | 'currentMedications' | 'openCareGaps' | 'recommendedInterventions' | 'followUpActions',
    items: string[],
    placeholder: string,
  ) {
    return (
      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-600">{label}</h4>
          <button onClick={() => onAddDraftItem(field)} className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100">Add Item</button>
        </div>

        <div className="space-y-2">
          {items.length === 0 ? (
            <p className="text-sm text-slate-500">No items added yet.</p>
          ) : (
            items.map((item, index) => (
              <div key={`${field}-${index}`} className="flex items-start gap-2">
                <textarea
                  value={item}
                  onChange={(event) => onUpdateDraftListItem(field, index, event.target.value)}
                  rows={2}
                  placeholder={placeholder}
                  className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-clinical-header"
                />
                <button onClick={() => onRemoveDraftItem(field, index)} className="mt-1 rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100">Remove</button>
              </div>
            ))
          )}
        </div>
      </section>
    )
  }

  return (
    <div className="summary-print-root grid min-h-[720px] grid-cols-[44%_56%] gap-5">
      <div className="flex flex-col rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div className="mb-3 rounded-lg bg-white p-4 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">Answers Collected</h2>
          <p className="mt-1 text-sm text-slate-600">Read-only call summary organized by section.</p>
        </div>

        <div className="max-h-[780px] flex-1 space-y-3 overflow-auto pr-1">
          {deepDiveSections.map((section) => renderQuestionSummarySection(section.id, section.label))}
        </div>
      </div>

      <div className="flex flex-col rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-3 rounded-lg bg-slate-50 p-4">
          <h2 className="text-xl font-semibold text-slate-900">Care Plan Draft Preview</h2>
          <p className="mt-1 text-sm text-slate-600">All sections are editable inline.</p>
        </div>

        <div className="max-h-[780px] flex-1 space-y-4 overflow-auto pr-1">
          <section className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="grid grid-cols-3 gap-3">
              <label className="block text-sm">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Patient Name</span>
                <input value={draft.patientName} onChange={(event) => onUpdateDraft('patientName', event.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-clinical-header" />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Member ID</span>
                <input value={draft.memberId} onChange={(event) => onUpdateDraft('memberId', event.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-clinical-header" />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Date</span>
                <input value={draft.date} onChange={(event) => onUpdateDraft('date', event.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-clinical-header" />
              </label>
            </div>
          </section>

          {renderEditableListField('Active Diagnoses', 'activeDiagnoses', draft.activeDiagnoses, 'Type or edit diagnosis')}
          {renderEditableListField('Current Medications', 'currentMedications', draft.currentMedications, 'Type or edit medication line')}
          {renderEditableListField('Open Care Gaps', 'openCareGaps', draft.openCareGaps, 'Type or edit care gap')}
          {renderEditableListField('Recommended Interventions', 'recommendedInterventions', draft.recommendedInterventions, 'Type or edit intervention')}
          {renderEditableListField('Follow-Up Actions', 'followUpActions', draft.followUpActions, 'Type or edit follow-up action')}

          <section className="rounded-lg border border-slate-200 bg-white p-4">
            <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Coordinator Notes</h4>
            <textarea
              value={draft.coordinatorNotes}
              onChange={(event) => onUpdateDraft('coordinatorNotes', event.target.value)}
              rows={5}
              placeholder="Add free-text notes for the care plan"
              className="mt-3 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-clinical-header"
            />
          </section>
        </div>
      </div>

      <div className="no-print fixed bottom-6 right-6 flex items-center gap-2">
        {toastVisible ? (
          <div className="rounded-lg bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-lg">Draft saved successfully</div>
        ) : null}
      </div>

      <div className="no-print fixed inset-x-0 bottom-0 flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
        <button onClick={onSaveDraft} className="rounded-md bg-clinical-header px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110">Save Draft</button>
        <button onClick={onExportAsPdf} className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">Export as PDF</button>
        <button onClick={onStartNewCall} className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">Start New Call</button>
      </div>
    </div>
  )
}
