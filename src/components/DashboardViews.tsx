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
import { useState } from 'react'
import type { TicketRow } from '../types/dashboard'
import type { QuestionCategory, QuestionUIState, SuggestedQuestion } from '../types/questions'
import type { PatientDetailApiRecord } from '../services/dashboardApi'
import {
  deepDiveSections,
  deepDiveStatusStyles,
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
  visibleQuestions: SuggestedQuestion[]
  questionStateForMember: Record<string, QuestionUIState>
  newQuestionText: string
  newQuestionCategory: QuestionCategory
  draggingQuestionId: string | null
  dragOverQuestionId: string | null
  onQuestionStateChange: (questionId: string, patch: Partial<QuestionUIState>) => void
  onFilterChange?: never
  onSearchChange?: never
  onBeginCall: () => void
  onNewQuestionTextChange: (value: string) => void
  onNewQuestionCategoryChange: (category: QuestionCategory) => void
  onAddCustomQuestion: () => void
  onDragStart: (questionId: string) => void
  onDragOver: (questionId: string) => void
  onDrop: (questionId: string) => void
  onDragEnd: () => void
  onSkipQuestion: (questionId: string) => void
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
  visibleQuestions,
  questionStateForMember,
  newQuestionText,
  newQuestionCategory,
  draggingQuestionId,
  dragOverQuestionId,
  onQuestionStateChange,
  onBeginCall,
  onNewQuestionTextChange,
  onNewQuestionCategoryChange,
  onAddCustomQuestion,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onSkipQuestion,
}: OverviewViewProps) {
  const [activePanel, setActivePanel] = useState<'demographics' | 'gaps' | 'labs' | 'medications' | 'auths' | 'notes'>('demographics')
  const [labFilterByDate, setLabFilterByDate] = useState<Record<string, 'All' | 'High' | 'Low'>>({})

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

            <div className="min-h-0 overflow-y-auto rounded-lg border border-slate-200 bg-white p-3">
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
                      {selectedGaps.map((gap) => {
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
                          <details key={gap.gap_id} className="group rounded-lg border border-slate-200 bg-white">
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
                          <details key={drawDate} className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_12px_rgba(15,23,42,0.04)]" open={dateIndex === 0}>
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

                              {visibleLabsForDate.map((lab) => (
                                <article
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
                              ))}
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
                      {selectedMeds.map((med) => {
                        const fields: Array<{ label: string; value: string }> = [
                          { label: 'med_id', value: med.med_id },
                          { label: 'drug_name', value: med.drug_name },
                          { label: 'brand_name', value: med.brand_name },
                          { label: 'dosage', value: med.dosage },
                          { label: 'route', value: med.route },
                          { label: 'frequency', value: med.frequency },
                          { label: 'indication', value: med.indication },
                          { label: 'prescribing_provider', value: med.prescribing_provider },
                          { label: 'date_prescribed', value: med.date_prescribed || 'N/A' },
                          { label: 'last_fill_date', value: med.last_fill_date || 'N/A' },
                          { label: 'days_since_last_fill', value: String(med.days_since_last_fill) },
                          { label: 'adherence_status', value: med.adherence_status },
                          { label: 'medication_status', value: med.medication_status },
                          { label: 'rx_notes', value: med.rx_notes || 'N/A' },
                        ]

                        return (
                          <details key={med.med_id} className="group rounded-lg border border-slate-200 bg-white">
                            <summary className="flex cursor-pointer list-none items-start justify-between gap-3 px-3 py-2.5 hover:bg-slate-50">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-slate-800">{truncateText(`${med.drug_name} ${med.dosage}`, 72)}</p>
                                <p className="mt-0.5 text-xs text-slate-600">
                                  {med.frequency} • Last fill {formatDate(med.last_fill_date)}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`inline-flex rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-semibold ${adherenceStyles[med.adherence_status] ?? 'text-slate-600'}`}>
                                  {med.adherence_status}
                                </span>
                                <span className="text-xs text-slate-500 transition group-open:rotate-180">▼</span>
                              </div>
                            </summary>

                            <div className="border-t border-slate-200 bg-slate-50 p-3">
                              <div className="grid grid-cols-1 gap-1.5 xl:grid-cols-2">
                                {fields.map((field) => (
                                  <div key={field.label} className="rounded border border-slate-200 bg-white px-2 py-1.5">
                                    <p className="text-xs uppercase tracking-wide text-slate-500">{field.label}</p>
                                    <p className="mt-1 break-words text-sm text-slate-800">{field.value}</p>
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
                      {selectedAuths.map((auth) => {
                        const fields: Array<{ label: string; value: string }> = [
                          { label: 'auth_id', value: auth.auth_id },
                          { label: 'member_id', value: auth.member_id },
                          { label: 'patient_name', value: auth.patient_name ?? 'N/A' },
                          { label: 'gender', value: auth.gender ?? 'N/A' },
                          { label: 'age', value: auth.age == null ? 'N/A' : String(auth.age) },
                          { label: 'request_date', value: auth.request_date || 'N/A' },
                          { label: 'auth_type', value: auth.auth_type },
                          { label: 'service_requested', value: auth.service_requested },
                          { label: 'requesting_provider', value: auth.requesting_provider },
                          { label: 'decision', value: auth.decision },
                          { label: 'decision_date', value: auth.decision_date || 'N/A' },
                          { label: 'valid_from', value: auth.valid_from || 'N/A' },
                          { label: 'valid_through', value: auth.valid_through || 'N/A' },
                          { label: 'denial_reason', value: auth.denial_reason || 'N/A' },
                          { label: 'appeal_status', value: auth.appeal_status || 'N/A' },
                          { label: 'auth_notes', value: auth.auth_notes || 'N/A' },
                        ]

                        return (
                          <details key={auth.auth_id} className="group rounded-lg border border-slate-200 bg-white">
                            <summary className="flex cursor-pointer list-none items-start justify-between gap-3 px-3 py-2.5 hover:bg-slate-50">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-slate-800">{truncateText(auth.service_requested, 72)}</p>
                                <p className="mt-0.5 text-xs text-slate-600">
                                  {auth.auth_type} • {formatDate(auth.request_date)}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${auth.decision === 'Denied' ? 'border-red-200 bg-red-50 text-red-700' : auth.decision === 'Pending' ? 'border-amber-200 bg-amber-50 text-amber-700' : auth.decision === 'Appealed' ? 'border-violet-200 bg-violet-50 text-violet-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
                                  {auth.decision}
                                </span>
                                <span className="text-xs text-slate-500 transition group-open:rotate-180">▼</span>
                              </div>
                            </summary>

                            <div className="border-t border-slate-200 bg-slate-50 p-3">
                              <div className="grid grid-cols-1 gap-1.5 xl:grid-cols-2">
                                {fields.map((field) => (
                                  <div key={field.label} className="rounded border border-slate-200 bg-white px-2 py-1.5">
                                    <p className="text-xs uppercase tracking-wide text-slate-500">{field.label}</p>
                                    <p className="mt-1 break-words text-sm text-slate-800">{field.value}</p>
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
                      {selectedNotes.map((note) => {
                        const fields: Array<{ label: string; value: string }> = [
                          { label: 'note_id', value: note.note_id },
                          { label: 'member_id', value: note.member_id },
                          { label: 'patient_name', value: note.patient_name ?? 'N/A' },
                          { label: 'gender', value: note.gender ?? 'N/A' },
                          { label: 'age', value: note.age == null ? 'N/A' : String(note.age) },
                          { label: 'location', value: note.location ?? 'N/A' },
                          { label: 'note_date', value: note.note_date || 'N/A' },
                          { label: 'note_type', value: note.note_type },
                          { label: 'provider_name', value: note.provider_name },
                          { label: 'facility_name', value: note.facility_name },
                          { label: 'icd_code', value: note.icd_code },
                          { label: 'primary_diagnosis', value: note.primary_diagnosis },
                          { label: 'subjective', value: note.subjective },
                          { label: 'objective', value: note.objective },
                          { label: 'assessment', value: note.assessment },
                          { label: 'plan', value: note.plan },
                          { label: 'follow_up_date', value: note.follow_up_date || 'N/A' },
                        ]

                        return (
                          <details key={note.note_id} className="group rounded-lg border border-slate-200 bg-white">
                            <summary className="flex cursor-pointer list-none items-start justify-between gap-3 px-3 py-2.5 hover:bg-slate-50">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-slate-800">{truncateText(note.primary_diagnosis, 72)}</p>
                                <p className="mt-0.5 text-xs text-slate-600">
                                  {note.note_type} • {formatDate(note.note_date)}
                                </p>
                              </div>
                              <span className="text-xs text-slate-500 transition group-open:rotate-180">▼</span>
                            </summary>

                            <div className="border-t border-slate-200 bg-slate-50 p-3">
                              <div className="grid grid-cols-1 gap-1.5 xl:grid-cols-2">
                                {fields.map((field) => (
                                  <div key={field.label} className="rounded border border-slate-200 bg-white px-2 py-1.5">
                                    <p className="text-xs uppercase tracking-wide text-slate-500">{field.label}</p>
                                    <p className="mt-1 break-words text-sm text-slate-800">{field.value}</p>
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
            </div>
          </div>

          <div className="col-span-7 flex min-h-0 flex-col rounded-xl border border-slate-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-800">Suggested Pre-Call Questions</h2>
              <p className="text-sm text-slate-500">
                {visibleQuestions.filter((q) => questionStateForMember[q.id]?.checked).length}/{visibleQuestions.length} covered
              </p>
            </div>

            <div className="mb-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-600">Add Custom Question</p>
              <div className="flex items-center gap-2">
                <select
                  value={newQuestionCategory}
                  onChange={(event) => onNewQuestionCategoryChange(event.target.value as QuestionCategory)}
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
                  onChange={(event) => onNewQuestionTextChange(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      onAddCustomQuestion()
                    }
                  }}
                  placeholder="Type a custom question for this patient"
                  className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-clinical-header"
                />
                <button
                  onClick={onAddCustomQuestion}
                  className="rounded-md bg-clinical-header px-3 py-2 text-sm font-semibold text-white transition hover:brightness-110"
                >
                  Add
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 space-y-2 overflow-auto pr-1">
              {visibleQuestions.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600">
                  All questions are currently skipped. Return to Ticket Queue and choose another member or continue to Begin Call.
                </div>
              ) : (
                visibleQuestions.map((question) => (
                  <article
                    key={question.id}
                    onDragOver={(event) => {
                      event.preventDefault()
                      onDragOver(question.id)
                    }}
                    onDrop={() => onDrop(question.id)}
                    className={`group rounded-lg border-l-4 border border-slate-200 bg-slate-50 p-3 ${categoryBorderStyles[question.category]} ${
                      draggingQuestionId === question.id ? 'opacity-50' : ''
                    } ${dragOverQuestionId === question.id ? 'ring-2 ring-clinical-header/40' : ''}`}
                  >
                    <div className="flex items-start gap-3">
                      <button
                        type="button"
                        draggable
                        onDragStart={(event) => {
                          onDragStart(question.id)
                          event.dataTransfer.effectAllowed = 'move'
                        }}
                        onDragEnd={onDragEnd}
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
                      <input
                        type="checkbox"
                        className="mt-1 h-4 w-4"
                        checked={questionStateForMember[question.id]?.checked ?? false}
                        onChange={(event) => onQuestionStateChange(question.id, { checked: event.target.checked })}
                      />
                      <div className="flex-1">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{question.category}</p>
                        <p className="mt-1 text-sm text-slate-800">{question.text}</p>
                      </div>
                      <button
                        onClick={() => onSkipQuestion(question.id)}
                        className="text-xs font-medium text-slate-500 underline hover:text-slate-700"
                      >
                        Skip
                      </button>
                    </div>
                  </article>
                ))
              )}
            </div>

            <div className="mt-4 border-t border-slate-200 pt-4 text-right">
              <button
                onClick={onBeginCall}
                className="rounded-md bg-clinical-header px-6 py-3 text-base font-semibold text-white transition hover:brightness-110"
              >
                Begin Call {'->'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

interface DeepDiveViewProps {
  selectedMember: MemberProfile | null
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
  onFlagForSupervisor: () => void
  onCompleteCall: () => void
  getSectionProgress: (sectionId: DeepDiveSectionId) => { total: number; completed: number; allComplete: boolean }
}

export function DeepDiveView({
  selectedMember,
  selectedNotes,
  selectedLabs,
  selectedMeds,
  selectedGaps,
  selectedAuths,
  selectedClaims,
  selectedPharmacyClaims,
  activeDeepDiveSection,
  sectionQuestions,
  deepDiveResponses,
  supervisorNotes,
  onSetActiveSection,
  onUpdateQuestion,
  onFlagForSupervisor,
  onCompleteCall,
  getSectionProgress,
}: DeepDiveViewProps) {
  function renderQuestionCard(sectionId: DeepDiveSectionId, question: SuggestedQuestion) {
    const response = deepDiveResponses[sectionId]?.[question.id] ?? { notes: '', status: '' }

    return (
      <article key={question.id} className={`rounded-lg border-l-4 border border-slate-200 bg-slate-50 p-3 ${categoryBorderStyles[question.category]}`}>
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{question.category}</p>
            <p className="mt-1 text-sm font-semibold text-slate-800">{question.text}</p>
            <label className="mt-3 block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
              Coordinator Notes
              <textarea
                value={response.notes}
                onChange={(event) => onUpdateQuestion(sectionId, question.id, { notes: event.target.value })}
                rows={4}
                placeholder="Capture what the patient said, barriers, and next steps"
                className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-clinical-header"
              />
            </label>

            <div className="mt-3 flex flex-wrap gap-2">
              {(['Patient Answered', 'Skipped', 'Needs Follow-Up'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => onUpdateQuestion(sectionId, question.id, { status })}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                    response.status === status ? deepDiveStatusStyles[status] : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>
        </div>
      </article>
    )
  }

  function renderLeftPanel(sectionId: DeepDiveSectionId) {
    switch (sectionId) {
      case 'clinical':
        return (
          <div className="flex h-full flex-col rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="mb-3 rounded-lg bg-white p-4 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900">Clinical Notes & History</h3>
              <p className="mt-1 text-sm text-slate-600">
                {selectedMember?.patient_name ?? 'This patient'} has {selectedNotes.length} note{selectedNotes.length === 1 ? '' : 's'} on file. The most recent note is expanded by default.
              </p>
            </div>

            <div className="max-h-[640px] flex-1 space-y-3 overflow-auto pr-1">
              {selectedNotes.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-600">
                  No clinical notes on file for this patient.
                </div>
              ) : (
                selectedNotes.map((note, index) => (
                  <details key={note.note_id} open={index === 0} className="rounded-lg border border-slate-200 bg-white p-3">
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
                ))
              )}
            </div>
          </div>
        )

      case 'labs': {
        const groupedLabs = selectedLabs.reduce<Record<string, typeof selectedLabs>>((acc, lab) => {
          const list = acc[lab.lab_type] ?? []
          list.push(lab)
          acc[lab.lab_type] = list
          return acc
        }, {})
        const groupNames = Object.keys(groupedLabs)
        const abnormalCount = selectedLabs.filter((lab) => lab.result_flag !== 'Normal').length

        return (
          <div className="flex h-full flex-col rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="mb-3 rounded-lg bg-white p-4 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900">Lab Results</h3>
              <p className="mt-1 text-sm text-slate-600">
                {selectedMember?.patient_name ?? 'This patient'} has {selectedLabs.length} lab result{selectedLabs.length === 1 ? '' : 's'} across {groupNames.length} lab type{groupNames.length === 1 ? '' : 's'}. {abnormalCount} are abnormal.
              </p>
            </div>
            <div className="max-h-[640px] flex-1 space-y-3 overflow-auto pr-1">
              {selectedLabs.length === 0 ? (
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
                          {groupedLabs[labType].map((lab, idx) => (
                            <tr key={lab.lab_id} className={idx % 2 === 1 ? 'bg-clinical-row' : ''}>
                              <td className="px-1 py-1.5">{formatDate(lab.draw_date)}</td>
                              <td className="px-1 py-1.5">{lab.lab_type}</td>
                              <td className="px-1 py-1.5">{lab.test_name}</td>
                              <td className="px-1 py-1.5">{lab.result_value}</td>
                              <td className="px-1 py-1.5">{lab.unit}</td>
                              <td className="px-1 py-1.5">{lab.reference_range}</td>
                              <td className={`px-1 py-1.5 font-semibold ${labFlagStyles[lab.result_flag] ?? 'text-slate-700'}`}>{lab.result_flag}</td>
                            </tr>
                          ))}
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
        const activeMedications = selectedMeds.filter((medication) => medication.medication_status === 'Active')
        const nonAdherentCount = selectedMeds.filter((medication) => medication.adherence_status === 'Non-Adherent').length
        const onHoldCount = selectedMeds.filter((medication) => medication.adherence_status === 'On Hold').length

        return (
          <div className="flex h-full flex-col rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="mb-3 rounded-lg bg-white p-4 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900">Medications</h3>
              <p className="mt-1 text-sm text-slate-600">
                {selectedMember?.patient_name ?? 'This patient'} has {activeMedications.length} active medication{activeMedications.length === 1 ? '' : 's'}. {nonAdherentCount} are Non-Adherent and {onHoldCount} are On Hold.
              </p>
            </div>
            <div className="max-h-[640px] flex-1 space-y-3 overflow-auto pr-1">
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
                    {selectedMeds.map((medication, index) => (
                      <tr key={medication.med_id} className={`${index % 2 === 1 ? 'bg-clinical-row' : ''} ${medication.adherence_status === 'Non-Adherent' ? 'bg-red-50' : ''}`}>
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
                    ))}
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
                {selectedMember?.patient_name ?? 'This patient'} has {selectedGaps.length} care gap{selectedGaps.length === 1 ? '' : 's'} on file. Open critical gaps are highlighted first.
              </p>
            </div>

            <div className="max-h-[640px] flex-1 overflow-auto pr-1">
              {selectedGaps.length === 0 ? (
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
                      {selectedGaps.map((gap, index) => (
                        <tr key={gap.gap_id} className={`${index % 2 === 1 ? 'bg-clinical-row' : ''} ${gap.priority === 'Critical' ? 'bg-red-50' : gap.priority === 'High' ? 'bg-amber-50' : ''}`}>
                          <td className="px-1 py-1.5">{gap.gap_category}</td>
                          <td className="px-1 py-1.5">{gap.gap_description}</td>
                          <td className="px-1 py-1.5"><span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${gapPriorityStyles[gap.priority]}`}>{gap.priority}</span></td>
                          <td className="px-1 py-1.5">{gap.days_overdue}</td>
                          <td className="px-1 py-1.5">{formatDate(gap.last_completed_date)}</td>
                          <td className="px-1 py-1.5">{gap.gap_status}</td>
                          <td className="px-1 py-1.5">{gap.recommended_action}</td>
                        </tr>
                      ))}
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
                {selectedMember?.patient_name ?? 'This patient'} has {selectedAuths.length} prior authorization{selectedAuths.length === 1 ? '' : 's'} on file.
              </p>
            </div>
            <div className="max-h-[640px] flex-1 overflow-auto pr-1">
              {selectedAuths.length === 0 ? (
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
                      {selectedAuths.map((auth, index) => (
                        <tr key={auth.auth_id} className={index % 2 === 1 ? 'bg-clinical-row' : ''}>
                          <td className="px-1 py-1.5">{auth.auth_type}</td>
                          <td className="px-1 py-1.5">{auth.service_requested}</td>
                          <td className={`px-1 py-1.5 font-semibold ${auth.decision === 'Denied' ? 'text-red-700' : auth.decision === 'Pending' ? 'text-amber-700' : auth.decision === 'Appealed' ? 'text-purple-700' : 'text-emerald-700'}`}>{auth.decision}</td>
                          <td className="px-1 py-1.5">{auth.decision_date ? formatDate(auth.decision_date) : '-'}</td>
                          <td className="px-1 py-1.5">{auth.valid_through ? formatDate(auth.valid_through) : '-'}</td>
                          <td className="px-1 py-1.5">{auth.denial_reason || '-'}</td>
                          <td className="px-1 py-1.5">{auth.appeal_status || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )

      case 'claims': {
        const erVisits = selectedClaims.filter((claim) => claim.place_of_service === 'Emergency Room').length
        const inpatientStays = selectedClaims.filter((claim) => claim.place_of_service === 'Inpatient Hospital').length
        const totalBilled = selectedClaims.reduce((sum, claim) => sum + claim.billed_amount, 0)

        return (
          <div className="flex h-full flex-col rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="mb-3 rounded-lg bg-white p-4 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900">Claims & Utilization</h3>
              <p className="mt-1 text-sm text-slate-600">
                {selectedMember?.patient_name ?? 'This patient'} has {selectedClaims.length} insurance claim{selectedClaims.length === 1 ? '' : 's'} on file.
              </p>
            </div>

            <div className="mb-3 grid grid-cols-4 gap-3">
              <div className="rounded-lg border border-slate-200 bg-white p-3"><p className="text-xs uppercase tracking-wide text-slate-500">Total Claims</p><p className="mt-1 text-xl font-semibold text-slate-900">{selectedClaims.length}</p></div>
              <div className="rounded-lg border border-slate-200 bg-white p-3"><p className="text-xs uppercase tracking-wide text-slate-500">ER Visits</p><p className="mt-1 text-xl font-semibold text-red-700">{erVisits}</p></div>
              <div className="rounded-lg border border-slate-200 bg-white p-3"><p className="text-xs uppercase tracking-wide text-slate-500">Inpatient Stays</p><p className="mt-1 text-xl font-semibold text-amber-700">{inpatientStays}</p></div>
              <div className="rounded-lg border border-slate-200 bg-white p-3"><p className="text-xs uppercase tracking-wide text-slate-500">Total Billed</p><p className="mt-1 text-xl font-semibold text-slate-900">{formatMoney(totalBilled)}</p></div>
            </div>

            <div className="max-h-[640px] flex-1 overflow-auto pr-1">
              {selectedClaims.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-600">No claims on file for this patient.</div>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white p-3">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="text-xs text-slate-500">
                        <th className="py-1 font-medium">Date</th>
                        <th className="py-1 font-medium">Claim Type</th>
                        <th className="py-1 font-medium">Place of Service</th>
                        <th className="py-1 font-medium">Provider</th>
                        <th className="py-1 font-medium">Facility</th>
                        <th className="py-1 font-medium">Diagnosis</th>
                        <th className="py-1 font-medium">Billed Amount</th>
                        <th className="py-1 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedClaims.map((claim, index) => (
                        <tr key={claim.claim_id} className={`${index % 2 === 1 ? 'bg-clinical-row' : ''} ${claim.place_of_service === 'Emergency Room' ? 'bg-red-50' : claim.place_of_service === 'Inpatient Hospital' ? 'bg-amber-50' : ''}`}>
                          <td className="px-1 py-1.5">{formatDate(claim.date_of_service)}</td>
                          <td className="px-1 py-1.5">{claim.claim_type}</td>
                          <td className="px-1 py-1.5">{claim.place_of_service}</td>
                          <td className="px-1 py-1.5">{claim.provider_name}</td>
                          <td className="px-1 py-1.5">{claim.facility_name}</td>
                          <td className="px-1 py-1.5">{claim.diagnosis_description}</td>
                          <td className="px-1 py-1.5">{formatMoney(claim.billed_amount)}</td>
                          <td className="px-1 py-1.5">{claim.claim_status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )
      }
    }
  }

  function renderRightPanel(sectionId: DeepDiveSectionId) {
    const questions = sectionQuestions[sectionId]
    const progress = getSectionProgress(sectionId)

    return (
      <div className="flex h-full flex-col rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between border-b border-slate-200 pb-3">
          <div>
            <h3 className="text-lg font-semibold text-slate-800">Questions & Answers</h3>
            <p className="text-sm text-slate-500">{formatSectionQuestionCount(progress.completed, progress.total)}</p>
          </div>
          {progress.allComplete ? <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">All answered</span> : null}
        </div>

        <div className="max-h-[640px] flex-1 space-y-2 overflow-auto pr-1">
          {questions.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600">No questions available for this section.</div>
          ) : (
            questions.map((question) => renderQuestionCard(sectionId, question))
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-xl bg-slate-900 px-5 py-4 text-white">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-300">Current Patient</p>
          <h2 className="mt-1 text-lg font-semibold">
            {selectedMember?.patient_name ?? 'No patient selected'} <span className="text-sm font-normal text-slate-300">{selectedMember?.member_id ?? ''}</span>
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onFlagForSupervisor} className="rounded-md border border-white/20 bg-white/10 px-3 py-2 text-sm font-semibold text-white transition hover:bg-white/20">Flag for Supervisor</button>
          <button onClick={onCompleteCall} className="rounded-md bg-emerald-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-400">Complete Call</button>
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

      <div className="grid grid-cols-[280px_minmax(0,1fr)] gap-4">
        <aside className="sticky top-4 h-fit rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="mb-3 border-b border-slate-200 pb-3">
            <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">Section Navigator</h3>
            <p className="mt-1 text-sm text-slate-600">Jump freely between sections.</p>
          </div>
          <div className="space-y-2">
            {deepDiveSections.map((section) => {
              const progress = getSectionProgress(section.id)
              const isActive = activeDeepDiveSection === section.id
              return (
                <button key={section.id} onClick={() => onSetActiveSection(section.id)} className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition ${isActive ? 'border-clinical-header bg-white shadow-sm' : 'border-slate-200 bg-white hover:bg-slate-100'}`}>
                  <span className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold ${progress.allComplete ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{progress.allComplete ? '✓' : section.icon}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-slate-800">{section.label}</span>
                    <span className="block text-xs text-slate-500">{formatSectionQuestionCount(progress.completed, progress.total)}</span>
                  </span>
                </button>
              )
            })}
          </div>
        </aside>

        <div className="grid min-h-[680px] grid-cols-[55%_45%] gap-4">
          {renderLeftPanel(activeDeepDiveSection)}
          {renderRightPanel(activeDeepDiveSection)}
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
