import { useEffect, useMemo, useState } from 'react'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { QueuePage } from './pages/QueuePage'
import { OverviewPage } from './pages/OverviewPage'
import { DeepDivePage } from './pages/DeepDivePage'
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
import type { QuestionCategory, QuestionUIState, SuggestedQuestion } from './types/questions'
import type { CarePlanDraft, DeepDiveQuestionResponse, DeepDiveSectionId } from './types/callWorkflow'
import { createEmptySectionResponses, sectionFromCategory } from './utils/callWorkflow'
import { buildTickets, filterTickets } from './utils/ticketBuilder'
import { generateSuggestedQuestions } from './utils/questionGenerator'

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
  const [customQuestionsByMember, setCustomQuestionsByMember] = useState<Record<string, SuggestedQuestion[]>>({})
  const [questionOrderByMember, setQuestionOrderByMember] = useState<Record<string, string[]>>({})
  const [questionStateByMember, setQuestionStateByMember] = useState<Record<string, Record<string, QuestionUIState>>>({})
  const [newQuestionText, setNewQuestionText] = useState('')
  const [newQuestionCategory, setNewQuestionCategory] = useState<QuestionCategory>('Social')
  const [draggingQuestionId, setDraggingQuestionId] = useState<string | null>(null)
  const [dragOverQuestionId, setDragOverQuestionId] = useState<string | null>(null)
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

  useEffect(() => {
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
  }, [])

  const currentView: AppView = routeMatch?.view ?? 'queue'
  const selectedMemberId = routeMatch?.memberId ?? null

  useEffect(() => {
    if (currentView !== 'overview' || !selectedMemberId || patientDetailsByMember[selectedMemberId]) return

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
  }, [currentView, selectedMemberId, patientDetailsByMember])

  useEffect(() => {
    if (currentView !== 'overview' || !selectedMemberId || careGapsByMember[selectedMemberId]) return

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
  }, [currentView, selectedMemberId, careGapsByMember])

  useEffect(() => {
    if (currentView !== 'overview' || !selectedMemberId || labResultsByMember[selectedMemberId]) return

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
  }, [currentView, selectedMemberId, labResultsByMember])

  useEffect(() => {
    if (currentView !== 'overview' || !selectedMemberId || medicationsByMember[selectedMemberId]) return

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
  }, [currentView, selectedMemberId, medicationsByMember])

  useEffect(() => {
    if (currentView !== 'overview' || !selectedMemberId || priorAuthsByMember[selectedMemberId]) return

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
  }, [currentView, selectedMemberId, priorAuthsByMember])

  useEffect(() => {
    if (currentView !== 'overview' || !selectedMemberId || ehrNotesByMember[selectedMemberId]) return

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
  }, [currentView, selectedMemberId, ehrNotesByMember])

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

  const generatedQuestions = useMemo(
    () => generateSuggestedQuestions({ medications: selectedMeds, labs: selectedLabs, gaps: selectedGaps, priorAuths: selectedAuths }),
    [selectedMeds, selectedLabs, selectedGaps, selectedAuths],
  )

  const customQuestions = selectedMemberId ? (customQuestionsByMember[selectedMemberId] ?? []) : []
  const allQuestions = useMemo(() => [...generatedQuestions, ...customQuestions], [generatedQuestions, customQuestions])

  const claimsQuestions = useMemo(() => {
    if (!selectedTicket) return []

    const erVisits = selectedClaims.filter((claim) => claim.place_of_service === 'Emergency Room').length
    const inpatientStays = selectedClaims.filter((claim) => claim.place_of_service === 'Inpatient Hospital').length
    const totalBilled = selectedClaims.reduce((sum, claim) => sum + claim.billed_amount, 0)

    return [
      {
        id: `utilization-er-${selectedTicket.memberId}`,
        category: 'Utilization' as const,
        text: `You visited the ER ${erVisits} times in the past year - can you tell me what was happening during those visits?`,
      },
      {
        id: `utilization-inpatient-${selectedTicket.memberId}`,
        category: 'Utilization' as const,
        text: `We see ${inpatientStays} inpatient stays on file. What was the main reason for those hospital stays?`,
      },
      {
        id: `utilization-cost-${selectedTicket.memberId}`,
        category: 'Utilization' as const,
        text: `Your claims show about ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(totalBilled)} in billed services. Have any of those care episodes been difficult to manage or follow up on afterward?`,
      },
    ] satisfies SuggestedQuestion[]
  }, [selectedClaims, selectedTicket])

  const sectionQuestions = useMemo(() => {
    const all = [...allQuestions, ...claimsQuestions]

    return {
      clinical: all.filter((question) => sectionFromCategory(question.category) === 'clinical'),
      labs: all.filter((question) => sectionFromCategory(question.category) === 'labs'),
      medications: all.filter((question) => sectionFromCategory(question.category) === 'medications'),
      gaps: all.filter((question) => sectionFromCategory(question.category) === 'gaps'),
      auths: all.filter((question) => sectionFromCategory(question.category) === 'auths'),
      claims: all.filter((question) => sectionFromCategory(question.category) === 'claims'),
    } satisfies Record<DeepDiveSectionId, SuggestedQuestion[]>
  }, [allQuestions, claimsQuestions])

  const orderedQuestions = useMemo(() => {
    const memberOrder = selectedMemberId ? (questionOrderByMember[selectedMemberId] ?? []) : []
    const rank = new Map(memberOrder.map((id, index) => [id, index]))
    const indexMap = new Map(allQuestions.map((question, index) => [question.id, index]))

    return allQuestions.slice().sort((a, b) => {
      const rankA = rank.has(a.id) ? (rank.get(a.id) as number) : Number.MAX_SAFE_INTEGER
      const rankB = rank.has(b.id) ? (rank.get(b.id) as number) : Number.MAX_SAFE_INTEGER
      if (rankA !== rankB) return rankA - rankB
      return (indexMap.get(a.id) as number) - (indexMap.get(b.id) as number)
    })
  }, [allQuestions, questionOrderByMember, selectedMemberId])

  const questionStateForMember = selectedMemberId ? (questionStateByMember[selectedMemberId] ?? {}) : {}
  const visibleQuestions = useMemo(() => orderedQuestions.filter((question) => !questionStateForMember[question.id]?.skipped), [orderedQuestions, questionStateForMember])
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
          const question = [...allQuestions, ...claimsQuestions].find((entry) => entry.id === questionId)
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

  function beginCall() {
    if (selectedMemberId) setActiveDeepDiveSection('clinical')
    if (selectedMemberId) navigate(`/deep-dive/${encodeURIComponent(selectedMemberId)}`)
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

  function setQuestionState(questionId: string, patch: Partial<QuestionUIState>) {
    if (!selectedMemberId) return

    setQuestionStateByMember((prev) => {
      const memberMap = prev[selectedMemberId] ?? {}
      const current = memberMap[questionId] ?? { checked: false, skipped: false }

      return {
        ...prev,
        [selectedMemberId]: {
          ...memberMap,
          [questionId]: {
            ...current,
            ...patch,
          },
        },
      }
    })
  }

  function addCustomQuestion() {
    if (!selectedMemberId) return

    const text = newQuestionText.trim()
    if (!text) return

    const customQuestion: SuggestedQuestion = {
      id: `custom-${selectedMemberId}-${Date.now()}`,
      category: newQuestionCategory,
      text,
    }

    setCustomQuestionsByMember((prev) => {
      const existing = prev[selectedMemberId] ?? []
      return {
        ...prev,
        [selectedMemberId]: [...existing, customQuestion],
      }
    })

    setQuestionOrderByMember((prev) => {
      const existing = prev[selectedMemberId] ?? []
      return {
        ...prev,
        [selectedMemberId]: [...existing, customQuestion.id],
      }
    })

    setNewQuestionText('')
  }

  function reorderQuestions(fromId: string, toId: string) {
    if (!selectedMemberId || fromId === toId) return

    const currentIds = orderedQuestions.map((question) => question.id)
    const fromIndex = currentIds.indexOf(fromId)
    const toIndex = currentIds.indexOf(toId)
    if (fromIndex < 0 || toIndex < 0) return

    const nextIds = currentIds.slice()
    const [moved] = nextIds.splice(fromIndex, 1)
    nextIds.splice(toIndex, 0, moved)

    setQuestionOrderByMember((prev) => ({
      ...prev,
      [selectedMemberId]: nextIds,
    }))
  }

  function onQuestionDrop(targetQuestionId: string) {
    if (draggingQuestionId) reorderQuestions(draggingQuestionId, targetQuestionId)
    setDraggingQuestionId(null)
    setDragOverQuestionId(null)
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
    setNewQuestionText('')
    setDraftToastVisible(false)
  }

  function navigateToView(view: AppView) {
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
          <p className="mt-1 text-sm text-slate-600">Expected endpoint: http://localhost:8000/api/v1/patients</p>
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
          <section className="fade-in h-full overflow-hidden">
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
                visibleQuestions={visibleQuestions}
                questionStateForMember={questionStateForMember}
                newQuestionText={newQuestionText}
                newQuestionCategory={newQuestionCategory}
                draggingQuestionId={draggingQuestionId}
                dragOverQuestionId={dragOverQuestionId}
                onQuestionStateChange={setQuestionState}
                onBeginCall={beginCall}
                onNewQuestionTextChange={setNewQuestionText}
                onNewQuestionCategoryChange={setNewQuestionCategory}
                onAddCustomQuestion={addCustomQuestion}
                onDragStart={setDraggingQuestionId}
                onDragOver={setDragOverQuestionId}
                onDrop={onQuestionDrop}
                onDragEnd={() => {
                  setDraggingQuestionId(null)
                  setDragOverQuestionId(null)
                }}
                onSkipQuestion={(questionId) => setQuestionState(questionId, { skipped: true })}
                />
              )} />
              <Route path="/deep-dive/:memberId" element={(
                <DeepDivePage
                selectedMember={selectedMember}
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

        {currentView !== 'summary' ? (
          <footer className="no-print shrink-0 flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-4">
            <button
              onClick={() => navigateToView(viewOrder[Math.max(0, viewOrder.indexOf(currentView) - 1)])}
              disabled={viewOrder.indexOf(currentView) === 0}
              className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Prev
            </button>

            <p className="text-sm text-slate-600">Patient in focus: {selectedTicket?.patientName ?? 'None selected'}</p>

            <button
              onClick={() => navigateToView(viewOrder[Math.min(viewOrder.length - 1, viewOrder.indexOf(currentView) + 1)])}
              disabled={viewOrder.indexOf(currentView) === viewOrder.length - 1}
              className="rounded-md bg-clinical-header px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
            </button>
          </footer>
        ) : null}
      </div>
    </div>
  )
}

export default App
