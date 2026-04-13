import { useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { QueuePage } from './pages/QueuePage'
import { OverviewPage, type OverviewPageHandle } from './pages/OverviewPage'
import { DeepDivePage, type DeepDivePageHandle } from './pages/DeepDivePage'
import { SummaryPage } from './pages/SummaryPage'
import {
  loadCareGaps,
  loadDashboardData,
  loadEhrNotes,
  loadLabResults,
  loadMedications,
  loadPatientDetail,
  loadPriorAuthorizations,
  type PatientDetailApiRecord,
} from './services/dashboardApi'
import type { AppView, DashboardData, SeverityLevel } from './types/domain'
import type { TicketRow } from './types/dashboard'
import type { SuggestedQuestion } from './types/questions'
import type { CarePlanDraft, DeepDiveQuestionResponse, DeepDiveSectionId } from './types/callWorkflow'
import { createEmptySectionResponses } from './utils/callWorkflow'
import { buildTickets, filterTickets } from './utils/ticketBuilder'

const viewOrder: AppView[] = ['queue', 'overview', 'deep-dive', 'summary']

const viewLabels: Record<AppView, string> = {
  queue: '1. Ticket Queue',
  overview: '2. Overview + Questions',
  'deep-dive': '3. Deep Dive',
  summary: '4. Summary + Care Plan',
}

const gapPriorityRank: Record<string, number> = {
  Critical: 4,
  High: 3,
  Medium: 2,
  Low: 1,
}

const LEGACY_APP_CACHE_KEYS = [
  'app-cache-dashboard-data',
  'app-cache-patient-details-by-member',
  'app-cache-care-gaps-by-member',
  'app-cache-lab-results-by-member',
  'app-cache-medications-by-member',
  'app-cache-prior-auths-by-member',
  'app-cache-ehr-notes-by-member',
] as const

const LEGACY_DEEP_DIVE_PREFIXES = [
  'deep-dive-selected-questions:',
  'deep-dive-question-answers:',
  'deep-dive-call-notes:',
] as const

const LEGACY_VIEW2_PANEL_PREFIX = 'view2-panel-data:'

function App() {
  const location = useLocation()
  const navigate = useNavigate()

  const routeMatch = useMemo(() => {
    const match = location.pathname.match(/^\/(queue|overview|deep-dive|summary)(?:\/([^/]+))?$/)
    if (!match) return null
    return {
      view: match[1] as AppView,
      memberId: match[2] ? decodeURIComponent(match[2]) : null,
    }
  }, [location.pathname])

  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [activeFilter, setActiveFilter] = useState<'All' | SeverityLevel>('All')
  const [searchTerm, setSearchTerm] = useState('')
  const [activeDeepDiveSection, setActiveDeepDiveSection] = useState<DeepDiveSectionId>('clinical')
  const [supervisorNotesByMember, setSupervisorNotesByMember] = useState<Record<string, string[]>>({})
  const [deepDiveResponsesByMember, setDeepDiveResponsesByMember] = useState<Record<string, Record<DeepDiveSectionId, Record<string, DeepDiveQuestionResponse>>>>({})
  const [carePlanDraftByMember, setCarePlanDraftByMember] = useState<Record<string, CarePlanDraft>>({})
  const [draftToastVisible, setDraftToastVisible] = useState(false)
  const [patientDetailsByMember, setPatientDetailsByMember] = useState<Record<string, PatientDetailApiRecord>>({})
  const [patientDetailsLoadingByMember, setPatientDetailsLoadingByMember] = useState<Record<string, boolean>>({})
  const [patientDetailsErrorByMember, setPatientDetailsErrorByMember] = useState<Record<string, string>>({})
  const [careGapsByMember, setCareGapsByMember] = useState<Record<string, DashboardData['careGaps']>>({})
  const [careGapsLoadingByMember, setCareGapsLoadingByMember] = useState<Record<string, boolean>>({})
  const [careGapsErrorByMember, setCareGapsErrorByMember] = useState<Record<string, string>>({})
  const [labResultsByMember, setLabResultsByMember] = useState<Record<string, DashboardData['labResults']>>({})
  const [labResultsLoadingByMember, setLabResultsLoadingByMember] = useState<Record<string, boolean>>({})
  const [labResultsErrorByMember, setLabResultsErrorByMember] = useState<Record<string, string>>({})
  const [medicationsByMember, setMedicationsByMember] = useState<Record<string, DashboardData['medications']>>({})
  const [medicationsLoadingByMember, setMedicationsLoadingByMember] = useState<Record<string, boolean>>({})
  const [medicationsErrorByMember, setMedicationsErrorByMember] = useState<Record<string, string>>({})
  const [priorAuthsByMember, setPriorAuthsByMember] = useState<Record<string, DashboardData['priorAuths']>>({})
  const [priorAuthsLoadingByMember, setPriorAuthsLoadingByMember] = useState<Record<string, boolean>>({})
  const [priorAuthsErrorByMember, setPriorAuthsErrorByMember] = useState<Record<string, string>>({})
  const [ehrNotesByMember, setEhrNotesByMember] = useState<Record<string, DashboardData['ehrNotes']>>({})
  const [ehrNotesLoadingByMember, setEhrNotesLoadingByMember] = useState<Record<string, boolean>>({})
  const [ehrNotesErrorByMember, setEhrNotesErrorByMember] = useState<Record<string, string>>({})
  const [cacheHydrated] = useState(true)

  // Refs for page components to expose their save functions
  const overviewPageRef = useRef<OverviewPageHandle>(null)
  const deepDivePageRef = useRef<DeepDivePageHandle>(null)

  useEffect(() => {
    LEGACY_APP_CACHE_KEYS.forEach((key) => {
      window.localStorage.removeItem(key)
    })

    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index)
      if (!key) continue
      if (LEGACY_DEEP_DIVE_PREFIXES.some((prefix) => key.startsWith(prefix))) {
        window.localStorage.removeItem(key)
        index -= 1
      }
    }

    const view2Keys: string[] = []
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index)
      if (key && key.startsWith(LEGACY_VIEW2_PANEL_PREFIX)) {
        view2Keys.push(key)
      }
    }

    view2Keys.forEach((legacyKey) => {
      const memberId = legacyKey.slice(LEGACY_VIEW2_PANEL_PREFIX.length)
      const legacyRaw = window.localStorage.getItem(legacyKey)
      if (!memberId || !legacyRaw) {
        window.localStorage.removeItem(legacyKey)
        return
      }

      try {
        const view2Data = JSON.parse(legacyRaw)
        const sessionKey = `deep-dive-session:${memberId}`
        let existing: { selectedQuestions?: unknown; callNotes?: unknown } = {}
        try {
          const existingRaw = window.localStorage.getItem(sessionKey)
          existing = existingRaw ? JSON.parse(existingRaw) : {}
        } catch {
          existing = {}
        }

        window.localStorage.setItem(sessionKey, JSON.stringify({
          selectedQuestions: Array.isArray(existing.selectedQuestions) ? existing.selectedQuestions : [],
          callNotes: typeof existing.callNotes === 'string' ? existing.callNotes : '',
          view2Data,
        }))
      } catch {
        // Ignore invalid legacy payloads
      } finally {
        window.localStorage.removeItem(legacyKey)
      }
    })
  }, [])

  useEffect(() => {
    if (!cacheHydrated) return

    if (data) {
      setLoading(false)
      return
    }

    void (async () => {
      try {
        const result = await loadDashboardData()
        setData(result)
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : 'Failed to load patients API')
      } finally {
        setLoading(false)
      }
    })()
  }, [cacheHydrated, data])

  const currentView: AppView = routeMatch?.view ?? 'queue'
  const selectedMemberId = routeMatch?.memberId ?? null

  useEffect(() => {
    if (!cacheHydrated || !selectedMemberId || currentView === 'queue' || patientDetailsByMember[selectedMemberId]) return

    setPatientDetailsLoadingByMember((prev) => ({ ...prev, [selectedMemberId]: true }))
    setPatientDetailsErrorByMember((prev) => {
      const next = { ...prev }
      delete next[selectedMemberId]
      return next
    })

    void (async () => {
      try {
        const detail = await loadPatientDetail(selectedMemberId)
        setPatientDetailsByMember((prev) => ({ ...prev, [selectedMemberId]: detail }))
      } catch (error) {
        setPatientDetailsErrorByMember((prev) => ({
          ...prev,
          [selectedMemberId]: error instanceof Error ? error.message : 'Failed to load patient detail',
        }))
      } finally {
        setPatientDetailsLoadingByMember((prev) => ({ ...prev, [selectedMemberId]: false }))
      }
    })()
  }, [cacheHydrated, currentView, selectedMemberId, patientDetailsByMember])

  useEffect(() => {
    if (!cacheHydrated || !selectedMemberId || currentView === 'queue' || careGapsByMember[selectedMemberId]) return

    setCareGapsLoadingByMember((prev) => ({ ...prev, [selectedMemberId]: true }))
    setCareGapsErrorByMember((prev) => {
      const next = { ...prev }
      delete next[selectedMemberId]
      return next
    })

    void (async () => {
      try {
        const gaps = await loadCareGaps(selectedMemberId)
        setCareGapsByMember((prev) => ({ ...prev, [selectedMemberId]: gaps }))
      } catch (error) {
        setCareGapsErrorByMember((prev) => ({
          ...prev,
          [selectedMemberId]: error instanceof Error ? error.message : 'Failed to load care gaps',
        }))
      } finally {
        setCareGapsLoadingByMember((prev) => ({ ...prev, [selectedMemberId]: false }))
      }
    })()
  }, [cacheHydrated, currentView, selectedMemberId, careGapsByMember])

  useEffect(() => {
    if (!cacheHydrated || !selectedMemberId || currentView === 'queue' || labResultsByMember[selectedMemberId]) return

    setLabResultsLoadingByMember((prev) => ({ ...prev, [selectedMemberId]: true }))
    setLabResultsErrorByMember((prev) => {
      const next = { ...prev }
      delete next[selectedMemberId]
      return next
    })

    void (async () => {
      try {
        const rows = await loadLabResults(selectedMemberId)
        setLabResultsByMember((prev) => ({ ...prev, [selectedMemberId]: rows }))
      } catch (error) {
        setLabResultsErrorByMember((prev) => ({
          ...prev,
          [selectedMemberId]: error instanceof Error ? error.message : 'Failed to load lab results',
        }))
      } finally {
        setLabResultsLoadingByMember((prev) => ({ ...prev, [selectedMemberId]: false }))
      }
    })()
  }, [cacheHydrated, currentView, selectedMemberId, labResultsByMember])

  useEffect(() => {
    if (!cacheHydrated || !selectedMemberId || currentView === 'queue' || medicationsByMember[selectedMemberId]) return

    setMedicationsLoadingByMember((prev) => ({ ...prev, [selectedMemberId]: true }))
    setMedicationsErrorByMember((prev) => {
      const next = { ...prev }
      delete next[selectedMemberId]
      return next
    })

    void (async () => {
      try {
        const rows = await loadMedications(selectedMemberId)
        setMedicationsByMember((prev) => ({ ...prev, [selectedMemberId]: rows }))
      } catch (error) {
        setMedicationsErrorByMember((prev) => ({
          ...prev,
          [selectedMemberId]: error instanceof Error ? error.message : 'Failed to load medications',
        }))
      } finally {
        setMedicationsLoadingByMember((prev) => ({ ...prev, [selectedMemberId]: false }))
      }
    })()
  }, [cacheHydrated, currentView, selectedMemberId, medicationsByMember])

  useEffect(() => {
    if (!cacheHydrated || !selectedMemberId || currentView === 'queue' || priorAuthsByMember[selectedMemberId]) return

    setPriorAuthsLoadingByMember((prev) => ({ ...prev, [selectedMemberId]: true }))
    setPriorAuthsErrorByMember((prev) => {
      const next = { ...prev }
      delete next[selectedMemberId]
      return next
    })

    void (async () => {
      try {
        const rows = await loadPriorAuthorizations(selectedMemberId)
        setPriorAuthsByMember((prev) => ({ ...prev, [selectedMemberId]: rows }))
      } catch (error) {
        setPriorAuthsErrorByMember((prev) => ({
          ...prev,
          [selectedMemberId]: error instanceof Error ? error.message : 'Failed to load prior authorizations',
        }))
      } finally {
        setPriorAuthsLoadingByMember((prev) => ({ ...prev, [selectedMemberId]: false }))
      }
    })()
  }, [cacheHydrated, currentView, selectedMemberId, priorAuthsByMember])

  useEffect(() => {
    if (!cacheHydrated || !selectedMemberId || currentView === 'queue' || ehrNotesByMember[selectedMemberId]) return

    setEhrNotesLoadingByMember((prev) => ({ ...prev, [selectedMemberId]: true }))
    setEhrNotesErrorByMember((prev) => {
      const next = { ...prev }
      delete next[selectedMemberId]
      return next
    })

    void (async () => {
      try {
        const rows = await loadEhrNotes(selectedMemberId)
        setEhrNotesByMember((prev) => ({ ...prev, [selectedMemberId]: rows }))
      } catch (error) {
        setEhrNotesErrorByMember((prev) => ({
          ...prev,
          [selectedMemberId]: error instanceof Error ? error.message : 'Failed to load EHR notes',
        }))
      } finally {
        setEhrNotesLoadingByMember((prev) => ({ ...prev, [selectedMemberId]: false }))
      }
    })()
  }, [cacheHydrated, currentView, selectedMemberId, ehrNotesByMember])

  useEffect(() => {
    if (!selectedMemberId || currentView === 'queue') return

    const selectedMember = data?.members.find((member) => member.member_id === selectedMemberId) ?? null
    const sessionKey = `deep-dive-session:${selectedMemberId}`
    let existingSession: { selectedQuestions?: unknown; callNotes?: unknown; view2Data?: Record<string, unknown> } = {}
    try {
      const existingRaw = window.localStorage.getItem(sessionKey)
      existingSession = existingRaw ? JSON.parse(existingRaw) : {}
    } catch {
      existingSession = {}
    }

    const existingView2Data = (existingSession.view2Data && typeof existingSession.view2Data === 'object')
      ? existingSession.view2Data as {
        member?: unknown
        patientDetail?: unknown
        notes?: unknown
        labs?: unknown
        meds?: unknown
        gaps?: unknown
        auths?: unknown
      }
      : {}

    const hasPatientDetail = Object.prototype.hasOwnProperty.call(patientDetailsByMember, selectedMemberId)
    const hasNotes = Object.prototype.hasOwnProperty.call(ehrNotesByMember, selectedMemberId)
    const hasLabs = Object.prototype.hasOwnProperty.call(labResultsByMember, selectedMemberId)
    const hasMeds = Object.prototype.hasOwnProperty.call(medicationsByMember, selectedMemberId)
    const hasGaps = Object.prototype.hasOwnProperty.call(careGapsByMember, selectedMemberId)
    const hasAuths = Object.prototype.hasOwnProperty.call(priorAuthsByMember, selectedMemberId)

    const view2Data = {
      memberId: selectedMemberId,
      member: selectedMember ?? (existingView2Data.member ?? null),
      patientDetail: hasPatientDetail
        ? (patientDetailsByMember[selectedMemberId] ?? null)
        : (existingView2Data.patientDetail ?? null),
      notes: hasNotes
        ? (ehrNotesByMember[selectedMemberId] ?? [])
        : (Array.isArray(existingView2Data.notes) ? existingView2Data.notes : []),
      labs: hasLabs
        ? (labResultsByMember[selectedMemberId] ?? [])
        : (Array.isArray(existingView2Data.labs) ? existingView2Data.labs : []),
      meds: hasMeds
        ? (medicationsByMember[selectedMemberId] ?? [])
        : (Array.isArray(existingView2Data.meds) ? existingView2Data.meds : []),
      gaps: hasGaps
        ? (careGapsByMember[selectedMemberId] ?? [])
        : (Array.isArray(existingView2Data.gaps) ? existingView2Data.gaps : []),
      auths: hasAuths
        ? (priorAuthsByMember[selectedMemberId] ?? [])
        : (Array.isArray(existingView2Data.auths) ? existingView2Data.auths : []),
    }

    window.localStorage.setItem(sessionKey, JSON.stringify({
      selectedQuestions: Array.isArray(existingSession.selectedQuestions) ? existingSession.selectedQuestions : [],
      callNotes: typeof existingSession.callNotes === 'string' ? existingSession.callNotes : '',
      view2Data,
    }))
  }, [
    currentView,
    selectedMemberId,
    data,
    patientDetailsByMember,
    ehrNotesByMember,
    labResultsByMember,
    medicationsByMember,
    careGapsByMember,
    priorAuthsByMember,
  ])

  useEffect(() => {
    if (currentView !== 'summary' || !selectedMemberId || !data) return

    setCarePlanDraftByMember((prev) => {
      if (prev[selectedMemberId]) return prev
      return {
        ...prev,
        [selectedMemberId]: buildCarePlanDraft(selectedMemberId),
      }
    })
  }, [currentView, selectedMemberId, data, deepDiveResponsesByMember, supervisorNotesByMember])

  useEffect(() => {
    if (!draftToastVisible) return

    const timerId = window.setTimeout(() => setDraftToastVisible(false), 2200)
    return () => window.clearTimeout(timerId)
  }, [draftToastVisible])

  const members = data?.members ?? []
  const labResults = data?.labResults ?? []
  const medications = data?.medications ?? []
  const careGaps = data?.careGaps ?? []
  const priorAuths = data?.priorAuths ?? []

  const allTickets: TicketRow[] = useMemo(() => (data ? buildTickets(data) : []), [data])
  const visibleTickets = useMemo(() => filterTickets(allTickets, activeFilter, searchTerm), [allTickets, activeFilter, searchTerm])
  const activeTicketCount = loading ? 0 : allTickets.length

  const selectedTicket = useMemo(() => allTickets.find((ticket) => ticket.memberId === selectedMemberId) ?? null, [allTickets, selectedMemberId])
  const selectedMember = useMemo(() => members.find((member) => member.member_id === selectedMemberId) ?? null, [members, selectedMemberId])

  const selectedLabs = useMemo(
    () => {
      if (!selectedMemberId) return []
      const apiLabs = labResultsByMember[selectedMemberId]
      const source = apiLabs ?? labResults.filter((lab) => lab.member_id === selectedMemberId)
      return source.slice().sort((a, b) => new Date(b.draw_date).getTime() - new Date(a.draw_date).getTime())
    },
    [labResults, labResultsByMember, selectedMemberId],
  )

  const selectedMeds = useMemo(() => {
    if (!selectedMemberId) return []
    return medicationsByMember[selectedMemberId] ?? medications.filter((medication) => medication.member_id === selectedMemberId)
  }, [medications, medicationsByMember, selectedMemberId])
  const selectedGaps = useMemo(() => {
    if (!selectedMemberId) return []
    const apiGaps = careGapsByMember[selectedMemberId]
    if (apiGaps) return apiGaps.slice().sort((a, b) => gapPriorityRank[b.priority] - gapPriorityRank[a.priority])
    return careGaps.filter((gap) => gap.member_id === selectedMemberId).sort((a, b) => gapPriorityRank[b.priority] - gapPriorityRank[a.priority])
  }, [careGaps, careGapsByMember, selectedMemberId])
  const selectedAuths = useMemo(() => {
    if (!selectedMemberId) return []
    return priorAuthsByMember[selectedMemberId] ?? priorAuths.filter((auth) => auth.member_id === selectedMemberId)
  }, [priorAuths, priorAuthsByMember, selectedMemberId])
  const selectedClaims = useMemo(() => data?.insuranceClaims.filter((claim) => claim.member_id === selectedMemberId).sort((a, b) => new Date(b.date_of_service).getTime() - new Date(a.date_of_service).getTime()) ?? [], [data?.insuranceClaims, selectedMemberId])
  const selectedPharmacyClaims = useMemo(() => data?.pharmacyClaims.filter((claim) => claim.member_id === selectedMemberId).sort((a, b) => new Date(b.date_filled).getTime() - new Date(a.date_filled).getTime()) ?? [], [data?.pharmacyClaims, selectedMemberId])
  const selectedNotes = useMemo(() => {
    if (!selectedMemberId) return []
    const source = ehrNotesByMember[selectedMemberId] ?? data?.ehrNotes.filter((note) => note.member_id === selectedMemberId) ?? []
    return source.slice().sort((a, b) => new Date(b.note_date).getTime() - new Date(a.note_date).getTime())
  }, [data?.ehrNotes, ehrNotesByMember, selectedMemberId])

  const allQuestions = useMemo<SuggestedQuestion[]>(() => [], [])

  const sectionQuestions = useMemo(() => {
    return {
      clinical: [] as SuggestedQuestion[],
      labs: [] as SuggestedQuestion[],
      medications: [] as SuggestedQuestion[],
      gaps: [] as SuggestedQuestion[],
      auths: [] as SuggestedQuestion[],
      claims: [] as SuggestedQuestion[],
    } satisfies Record<DeepDiveSectionId, SuggestedQuestion[]>
  }, [])
  const deepDiveStateForMember = selectedMemberId ? (deepDiveResponsesByMember[selectedMemberId] ?? createEmptySectionResponses()) : createEmptySectionResponses()
  const supervisorNotes = selectedMemberId ? (supervisorNotesByMember[selectedMemberId] ?? []) : []
  const currentCarePlanDraft = selectedMemberId ? (carePlanDraftByMember[selectedMemberId] ?? null) : null
  const selectedPatientDetail = selectedMemberId ? (patientDetailsByMember[selectedMemberId] ?? null) : null
  const selectedPatientDetailLoading = selectedMemberId ? (patientDetailsLoadingByMember[selectedMemberId] ?? false) : false
  const selectedPatientDetailError = selectedMemberId ? (patientDetailsErrorByMember[selectedMemberId] ?? '') : ''
  const selectedCareGapsLoading = selectedMemberId ? (careGapsLoadingByMember[selectedMemberId] ?? false) : false
  const selectedCareGapsError = selectedMemberId ? (careGapsErrorByMember[selectedMemberId] ?? '') : ''
  const selectedLabResultsLoading = selectedMemberId ? (labResultsLoadingByMember[selectedMemberId] ?? false) : false
  const selectedLabResultsError = selectedMemberId ? (labResultsErrorByMember[selectedMemberId] ?? '') : ''
  const selectedMedicationsLoading = selectedMemberId ? (medicationsLoadingByMember[selectedMemberId] ?? false) : false
  const selectedMedicationsError = selectedMemberId ? (medicationsErrorByMember[selectedMemberId] ?? '') : ''
  const selectedPriorAuthsLoading = selectedMemberId ? (priorAuthsLoadingByMember[selectedMemberId] ?? false) : false
  const selectedPriorAuthsError = selectedMemberId ? (priorAuthsErrorByMember[selectedMemberId] ?? '') : ''
  const selectedEhrNotesLoading = selectedMemberId ? (ehrNotesLoadingByMember[selectedMemberId] ?? false) : false
  const selectedEhrNotesError = selectedMemberId ? (ehrNotesErrorByMember[selectedMemberId] ?? '') : ''

  function buildCarePlanDraft(memberId: string): CarePlanDraft {
    const patient = members.find((member) => member.member_id === memberId)
    const notes = data?.ehrNotes.filter((note) => note.member_id === memberId).sort((a, b) => new Date(b.note_date).getTime() - new Date(a.note_date).getTime()) ?? []
    const activeMeds = medications.filter((medication) => medication.member_id === memberId && medication.medication_status === 'Active')
    const openGaps = careGaps.filter((gap) => gap.member_id === memberId && gap.gap_status === 'Open')
    const criticalOrHighGaps = openGaps.filter((gap) => gap.priority === 'Critical' || gap.priority === 'High')
    const responses = deepDiveResponsesByMember[memberId] ?? createEmptySectionResponses()

    const followUpActions = Object.entries(responses).flatMap(([, sectionResponses]) =>
      Object.entries(sectionResponses)
        .filter(([, response]) => response.status === 'Needs Follow-Up')
        .map(([questionId, response]) => {
          const question = allQuestions.find((entry) => entry.id === questionId)
          const label = question?.text ?? questionId
          return response.notes.trim() ? `${label} - ${response.notes.trim()}` : label
        }),
    )

    return {
      patientName: patient?.patient_name ?? selectedTicket?.patientName ?? 'Patient',
      memberId,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      activeDiagnoses: Array.from(new Set(notes.map((note) => note.primary_diagnosis).filter(Boolean))),
      currentMedications: activeMeds.map((medication) => `${medication.drug_name} ${medication.dosage} - ${medication.frequency}`),
      openCareGaps: openGaps.map((gap) => `${gap.gap_description} (${gap.priority})`),
      recommendedInterventions: criticalOrHighGaps.map((gap) => gap.recommended_action),
      followUpActions,
      coordinatorNotes: supervisorNotes.length ? supervisorNotes.join('\n') : '',
    }
  }

  function beginPrep(memberId: string) {
    navigate(`/overview/${encodeURIComponent(memberId)}`)
  }

  function flagForSupervisor() {
    if (!selectedMemberId || !selectedTicket) return

    const timestamp = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    const note = `${timestamp} - Supervisor flag added for ${selectedTicket.patientName} (${selectedTicket.memberId}).`

    setSupervisorNotesByMember((prev) => ({
      ...prev,
      [selectedMemberId]: [...(prev[selectedMemberId] ?? []), note],
    }))
  }

  function completeCall() {
    if (selectedMemberId) navigate(`/summary/${encodeURIComponent(selectedMemberId)}`)
  }

  function updateDeepDiveQuestion(sectionId: DeepDiveSectionId, questionId: string, patch: Partial<DeepDiveQuestionResponse>) {
    if (!selectedMemberId) return

    setDeepDiveResponsesByMember((prev) => {
      const memberRecord = prev[selectedMemberId] ?? createEmptySectionResponses()
      const sectionRecord = memberRecord[sectionId] ?? {}
      const current = sectionRecord[questionId] ?? { notes: '', status: '' }

      return {
        ...prev,
        [selectedMemberId]: {
          ...memberRecord,
          [sectionId]: {
            ...sectionRecord,
            [questionId]: {
              ...current,
              ...patch,
            },
          },
        },
      }
    })
  }

  function getSectionProgress(sectionId: DeepDiveSectionId) {
    const questions = sectionQuestions[sectionId]
    const responses = deepDiveStateForMember[sectionId] ?? {}
    const completed = questions.filter((question) => {
      const status = responses[question.id]?.status ?? ''
      return status === 'Patient Answered' || status === 'Skipped' || status === 'Needs Follow-Up'
    }).length

    return {
      total: questions.length,
      completed,
      allComplete: questions.length > 0 && completed === questions.length,
    }
  }

  function updateCarePlanDraft(field: keyof CarePlanDraft, value: string | string[]) {
    if (!selectedMemberId) return

    setCarePlanDraftByMember((prev) => {
      const existing = prev[selectedMemberId] ?? buildCarePlanDraft(selectedMemberId)
      return {
        ...prev,
        [selectedMemberId]: {
          ...existing,
          [field]: value,
        },
      }
    })
  }

  function updateCarePlanDraftListItem(
    field: 'activeDiagnoses' | 'currentMedications' | 'openCareGaps' | 'recommendedInterventions' | 'followUpActions',
    index: number,
    value: string,
  ) {
    if (!selectedMemberId) return

    setCarePlanDraftByMember((prev) => {
      const existing = prev[selectedMemberId] ?? buildCarePlanDraft(selectedMemberId)
      const nextList = [...existing[field]]
      nextList[index] = value

      return {
        ...prev,
        [selectedMemberId]: {
          ...existing,
          [field]: nextList,
        },
      }
    })
  }

  function addCarePlanDraftItem(field: 'activeDiagnoses' | 'currentMedications' | 'openCareGaps' | 'recommendedInterventions' | 'followUpActions') {
    if (!selectedMemberId) return

    setCarePlanDraftByMember((prev) => {
      const existing = prev[selectedMemberId] ?? buildCarePlanDraft(selectedMemberId)
      return {
        ...prev,
        [selectedMemberId]: {
          ...existing,
          [field]: [...existing[field], ''],
        },
      }
    })
  }

  function removeCarePlanDraftItem(field: 'activeDiagnoses' | 'currentMedications' | 'openCareGaps' | 'recommendedInterventions' | 'followUpActions', index: number) {
    if (!selectedMemberId) return

    setCarePlanDraftByMember((prev) => {
      const existing = prev[selectedMemberId] ?? buildCarePlanDraft(selectedMemberId)
      return {
        ...prev,
        [selectedMemberId]: {
          ...existing,
          [field]: existing[field].filter((_, itemIndex) => itemIndex !== index),
        },
      }
    })
  }

  function saveDraft() {
    setDraftToastVisible(true)
  }

  function exportAsPdf() {
    window.print()
  }

  function startNewCall() {
    navigate('/queue')
    setActiveDeepDiveSection('clinical')
    setDraftToastVisible(false)
  }

  function navigateToView(view: AppView) {
    // Save current view data before navigating
    if (currentView === 'overview' && overviewPageRef.current) {
      overviewPageRef.current.saveBeforeNavigate()
    }
    if (currentView === 'deep-dive' && deepDivePageRef.current) {
      deepDivePageRef.current.saveBeforeNavigate()
    }

    if (view === 'queue') {
      navigate('/queue')
      return
    }

    if (!selectedMemberId) return
    navigate(`/${view}/${encodeURIComponent(selectedMemberId)}`)
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-clinical-bg px-2 py-2 md:px-4 md:py-4">
        <div className="w-full rounded-xl border border-red-200 bg-white p-8 shadow-sm md:rounded-2xl">
          <h2 className="text-xl font-semibold text-red-700">Unable to load patient data</h2>
          <p className="mt-2 text-sm text-slate-700">{loadError}</p>
          <p className="mt-1 text-sm text-slate-600">Expected endpoint: https://retrorsely-uncondensational-bentlee.ngrok-free.dev/api/v1/patients</p>
        </div>
      </div>
    )
  }

  const summaryDraft = currentCarePlanDraft ?? (selectedMemberId ? buildCarePlanDraft(selectedMemberId) : null)

  return (
    <div className="h-screen overflow-hidden bg-clinical-bg px-2 py-2 text-slate-900 md:px-4 md:py-4">
      <div className="flex h-full w-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm md:rounded-2xl">
        <header className="no-print bg-clinical-header px-8 py-5 text-white">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold">Care Coordinator Agent Dashboard</h1>
              <p className="mt-1 text-sm text-blue-100">Care Coordinator - Maria Santos</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-blue-100">{new Date().toLocaleDateString()}</p>
              <span className="mt-2 inline-flex rounded-full bg-white px-3 py-1 text-sm font-semibold text-clinical-header">{activeTicketCount} Active Tickets Today</span>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {viewOrder.map((view, idx) => {
              const complete = idx < viewOrder.indexOf(currentView)
              const active = view === currentView
              const disabled = view !== 'queue' && !selectedMemberId
              return (
                <button
                  key={view}
                  onClick={() => navigateToView(view)}
                  disabled={disabled}
                  className={`rounded-md border px-3 py-2 text-left text-sm transition ${active ? 'border-white bg-white/20' : complete ? 'border-blue-200/70 bg-blue-300/20' : 'border-blue-300/40 bg-blue-300/10'} disabled:cursor-not-allowed disabled:opacity-40`}
                >
                  {viewLabels[view]}
                </button>
              )
            })}
          </div>
        </header>

        <main className="flex-1 min-h-0 overflow-hidden bg-white p-6">
          <section className="fade-in h-full overflow-y-auto">
            <Routes>
              <Route path="/" element={<Navigate to="/queue" replace />} />
              <Route path="/queue" element={(
                <QueuePage
                visibleTickets={visibleTickets}
                activeFilter={activeFilter}
                searchTerm={searchTerm}
                isLoading={loading}
                onFilterChange={setActiveFilter}
                onSearchChange={setSearchTerm}
                onBeginPrep={beginPrep}
                />
              )} />
              <Route path="/overview/:memberId" element={(
                <OverviewPage
                ref={overviewPageRef}
                selectedMember={selectedMember}
                selectedTicket={selectedTicket}
                  selectedPatientDetail={selectedPatientDetail}
                  patientDetailLoading={selectedPatientDetailLoading}
                  patientDetailError={selectedPatientDetailError}
                  careGapsLoading={selectedCareGapsLoading}
                  careGapsError={selectedCareGapsError}
                labResultsLoading={selectedLabResultsLoading}
                labResultsError={selectedLabResultsError}
                medicationsLoading={selectedMedicationsLoading}
                medicationsError={selectedMedicationsError}
                priorAuthsLoading={selectedPriorAuthsLoading}
                priorAuthsError={selectedPriorAuthsError}
                ehrNotesLoading={selectedEhrNotesLoading}
                ehrNotesError={selectedEhrNotesError}
                selectedNotes={selectedNotes}
                selectedLabs={selectedLabs}
                selectedMeds={selectedMeds}
                selectedGaps={selectedGaps}
                selectedAuths={selectedAuths}
                />
              )} />
              <Route path="/deep-dive/:memberId" element={(
                <DeepDivePage
                ref={deepDivePageRef}
                selectedMember={selectedMember}
                selectedPatientDetail={selectedPatientDetail}
                patientDetailLoading={selectedPatientDetailLoading}
                patientDetailError={selectedPatientDetailError}
                selectedNotes={selectedNotes}
                selectedLabs={selectedLabs}
                selectedMeds={selectedMeds}
                selectedGaps={selectedGaps}
                selectedAuths={selectedAuths}
                selectedClaims={selectedClaims}
                selectedPharmacyClaims={selectedPharmacyClaims}
                activeDeepDiveSection={activeDeepDiveSection}
                sectionQuestions={sectionQuestions}
                deepDiveResponses={deepDiveStateForMember}
                supervisorNotes={supervisorNotes}
                onSetActiveSection={setActiveDeepDiveSection}
                onUpdateQuestion={updateDeepDiveQuestion}
                onFlagForSupervisor={flagForSupervisor}
                onCompleteCall={completeCall}
                getSectionProgress={getSectionProgress}
                />
              )} />
              <Route path="/summary/:memberId" element={(
                <SummaryPage
                draft={summaryDraft}
                onUpdateDraft={updateCarePlanDraft}
                onUpdateDraftListItem={updateCarePlanDraftListItem}
                onAddDraftItem={addCarePlanDraftItem}
                onRemoveDraftItem={removeCarePlanDraftItem}
                onSaveDraft={saveDraft}
                onExportAsPdf={exportAsPdf}
                onStartNewCall={startNewCall}
                toastVisible={draftToastVisible}
                sectionQuestions={sectionQuestions}
                deepDiveResponses={deepDiveStateForMember}
                />
              )} />
              <Route path="*" element={<Navigate to="/queue" replace />} />
            </Routes>
          </section>
        </main>

        {currentView !== 'queue' ? (
          <footer className="no-print shrink-0 flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-4">
            <button
              onClick={() => navigateToView(viewOrder[Math.max(0, viewOrder.indexOf(currentView) - 1)])}
              disabled={viewOrder.indexOf(currentView) === 0}
              className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Prev
            </button>

            <p className="text-sm text-slate-600">Patient in focus: {selectedTicket?.patientName ?? 'None selected'}</p>

            {currentView !== 'summary' ? (
              <button
                onClick={() => navigateToView(viewOrder[Math.min(viewOrder.length - 1, viewOrder.indexOf(currentView) + 1)])}
                disabled={viewOrder.indexOf(currentView) === viewOrder.length - 1}
                className="rounded-md bg-clinical-header px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
              </button>
            ) : (
              <div className="flex gap-3">
                <button
                  onClick={() => window.dispatchEvent(new Event('summary-export-docx'))}
                  className="rounded-md bg-clinical-header px-4 py-2 text-sm font-semibold text-white"
                >
                  Download Care Plan (.docx)
                </button>
                <button
                  onClick={() => window.dispatchEvent(new Event('summary-export-pdf'))}
                  className="rounded-md bg-clinical-header px-4 py-2 text-sm font-semibold text-white"
                >
                  Download Care Plan (.pdf)
                </button>
              </div>
            )}
          </footer>
        ) : null}
      </div>
    </div>
  )
}

export default App
