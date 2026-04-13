import type { CareGap, DashboardData, LabResult, Medication, PriorAuthorization } from '../types/domain'

interface PatientApiRecord {
  member_id: string
  full_name: string
  gender: string
  age: number
  location: string
  preferred_contact_method: string | null
  preferred_language: string | null
  primary_conditions: string | null
  risk_tier: string | null
  assigned_coordinator: string | null
  insurance_plan_type: string | null
}

export interface PatientDetailApiRecord {
  member_id: string
  full_name: string
  gender: string
  age: number
  date_of_birth: string | null
  street_address: string | null
  city: string | null
  state: string | null
  zip_code: number | string | null
  location: string
  phone_primary: string | null
  phone_secondary: string | null
  email_address: string | null
  preferred_contact_method: string | null
  preferred_language: string | null
  marital_status: string | null
  employment_status: string | null
  caregiver_support: string | null
  primary_conditions: string | null
  insurance_plan_type: string | null
  insurance_start_date: string | null
  risk_tier: string | null
  assigned_coordinator: string | null
}

interface CareGapApiRecord {
  gap_id: string
  member_id: string
  patient_name: string
  gender: string
  age: number
  gap_category: string
  gap_description: string
  clinical_guideline: string
  last_completed_date: string | null
  days_overdue: number
  priority: string
  recommended_action: string
  gap_status: string
  assigned_to: string
  gap_notes: string | null
}

interface LabResultApiRecord {
  lab_id: string
  member_id: string
  patient_name?: string
  gender?: string
  age?: number
  draw_date: string
  lab_type: string
  test_name: string
  result_value: number | string
  unit: string
  reference_range: string
  result_flag: string
  ordering_provider: string
  lab_facility: string
  status: string
  clinical_note: string
}

interface MedicationApiRecord {
  med_id: string
  member_id: string
  patient_name?: string
  gender?: string
  age?: number
  drug_name: string
  brand_name: string
  dosage: string
  route: string
  frequency: string
  indication: string
  prescribing_provider: string
  date_prescribed: string
  last_fill_date: string
  days_since_last_fill: number
  adherence_status: string
  medication_status: string
  rx_notes: string
}

interface PriorAuthorizationApiRecord {
  auth_id: string
  member_id: string
  patient_name?: string
  gender?: string
  age?: number
  request_date: string
  auth_type: string
  service_requested: string
  requesting_provider: string
  decision: string
  decision_date: string | null
  valid_from: string | null
  valid_through: string | null
  denial_reason: string | null
  appeal_status: string | null
  auth_notes: string | null
}

interface EhrNoteApiRecord {
  note_id: string
  member_id: string
  patient_name?: string
  gender?: string
  age?: number
  location?: string
  note_date: string
  note_type: string
  provider_name: string
  facility_name: string
  icd_code: string
  primary_diagnosis: string
  subjective: string
  objective: string
  assessment: string
  plan: string
  follow_up_date: string | null
}

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? 'https://retrorsely-uncondensational-bentlee.ngrok-free.dev').replace(/\/$/, '')
const API_V1_BASE = `${API_BASE_URL}/api/v1`
const PATIENTS_ENDPOINT = import.meta.env.VITE_PATIENTS_ENDPOINT ?? `${API_V1_BASE}/patients`
const REQUEST_TIMEOUT_MS = 10000

function buildRequestHeaders(url: string): HeadersInit | undefined {
  // ngrok free domains can require this header to bypass browser warning pages for API calls.
  if (url.includes('.ngrok-free.dev')) {
    return {
      'ngrok-skip-browser-warning': 'true',
    }
  }
  return undefined
}

async function fetchWithTimeout(url: string, timeoutMs = REQUEST_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs)

  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: buildRequestHeaders(url),
    })
  } finally {
    window.clearTimeout(timeoutId)
  }
}

function normalizeGender(value: string): string {
  if (value === 'F') return 'Female'
  if (value === 'M') return 'Male'
  return value
}

function mapPatientMembers(records: PatientApiRecord[]): DashboardData['members'] {
  return records.map((record) => ({
    member_id: record.member_id,
    patient_name: record.full_name,
    age: record.age,
    gender: normalizeGender(record.gender),
    location: record.location,
    preferred_language: record.preferred_language ?? 'English',
    preferred_contact_method: record.preferred_contact_method ?? 'Phone',
    primary_conditions: record.primary_conditions ?? '',
    risk_tier: record.risk_tier ?? 'Tier 4 — Low',
    assigned_coordinator: record.assigned_coordinator ?? 'Unassigned',
    insurance_plan_type: record.insurance_plan_type ?? 'N/A',
  }))
}

export async function loadDashboardData(): Promise<DashboardData> {
  const response = await fetchWithTimeout(PATIENTS_ENDPOINT)
  if (!response.ok) {
    throw new Error(`Patients API failed with status ${response.status}`)
  }

  const payload = (await response.json()) as unknown
  if (!Array.isArray(payload) || payload.length === 0) {
    throw new Error('Patients API returned empty or invalid payload')
  }

  const members = mapPatientMembers(payload as PatientApiRecord[])

  return {
    members,
    insuranceClaims: [],
    pharmacyClaims: [],
    ehrNotes: [],
    labResults: [],
    medications: [],
    priorAuths: [],
    careGaps: [],
  }
}

export async function loadPatientDetail(memberId: string): Promise<PatientDetailApiRecord> {
  const url = `${PATIENTS_ENDPOINT}/${encodeURIComponent(memberId)}`
  const response = await fetchWithTimeout(url)
  if (!response.ok) {
    throw new Error(`Patient detail API failed with status ${response.status}`)
  }

  const payload = (await response.json()) as unknown
  if (!payload || typeof payload !== 'object') {
    throw new Error('Patient detail API returned invalid payload')
  }

  return payload as PatientDetailApiRecord
}

function normalizeGapPriority(value: string): CareGap['priority'] {
  if (value === 'Critical' || value === 'High' || value === 'Medium' || value === 'Low') return value
  return 'Low'
}

function normalizeGapStatus(value: string): CareGap['gap_status'] {
  if (value === 'Open' || value === 'In Progress' || value === 'Closed') return value
  return 'Open'
}

function normalizeLabResultFlag(value: string): LabResult['result_flag'] {
  if (value === 'Normal' || value === 'High' || value === 'Low' || value === 'Critical High' || value === 'Critical Low') return value
  return 'Normal'
}

function normalizeMedicationAdherence(value: string): Medication['adherence_status'] {
  if (value === 'Adherent' || value === 'Partially Adherent' || value === 'Non-Adherent' || value === 'On Hold' || value === 'Discontinued') return value
  return 'Adherent'
}

function normalizePriorAuthDecision(value: string): PriorAuthorization['decision'] {
  if (value === 'Approved' || value === 'Denied' || value === 'Pending' || value === 'Appealed') return value
  return 'Pending'
}

export async function loadCareGaps(memberId: string): Promise<CareGap[]> {
  const urls = [
    `${API_V1_BASE}/care-gaps/${encodeURIComponent(memberId)}`,
    `${API_V1_BASE}/care-gaps?member_id=${encodeURIComponent(memberId)}`,
  ]

  let payload: unknown = null
  let lastStatus = 0

  for (const url of urls) {
    const response = await fetchWithTimeout(url)
    if (!response.ok) {
      lastStatus = response.status
      continue
    }

    payload = await response.json()
    break
  }

  if (payload == null) {
    throw new Error(`Care gaps API failed with status ${lastStatus || 'unknown'}`)
  }

  const rows = Array.isArray(payload) ? payload : [payload]

  return rows
    .filter((row): row is CareGapApiRecord => !!row && typeof row === 'object')
    .map((row) => ({
      gap_id: row.gap_id,
      member_id: row.member_id,
      patient_name: row.patient_name,
      gender: row.gender,
      age: Number(row.age ?? 0),
      gap_category: row.gap_category,
      gap_description: row.gap_description,
      clinical_guideline: row.clinical_guideline,
      last_completed_date: row.last_completed_date ?? '',
      days_overdue: Number(row.days_overdue ?? 0),
      priority: normalizeGapPriority(row.priority),
      recommended_action: row.recommended_action,
      gap_status: normalizeGapStatus(row.gap_status),
      assigned_to: row.assigned_to,
      gap_notes: row.gap_notes ?? '',
    }))
}

export async function loadLabResults(memberId: string): Promise<LabResult[]> {
  const urls = [
    `${API_V1_BASE}/lab-results/${encodeURIComponent(memberId)}`,
    `${API_V1_BASE}/lab-results?member_id=${encodeURIComponent(memberId)}`,
  ]

  let payload: unknown = null
  let lastStatus = 0

  for (const url of urls) {
    const response = await fetchWithTimeout(url)
    if (!response.ok) {
      lastStatus = response.status
      continue
    }

    payload = await response.json()
    break
  }

  if (payload == null) {
    throw new Error(`Lab results API failed with status ${lastStatus || 'unknown'}`)
  }

  const rows = Array.isArray(payload) ? payload : [payload]

  return rows
    .filter((row): row is LabResultApiRecord => !!row && typeof row === 'object')
    .map((row) => ({
      lab_id: row.lab_id,
      member_id: row.member_id,
      patient_name: row.patient_name,
      gender: row.gender,
      age: row.age,
      draw_date: row.draw_date,
      lab_type: row.lab_type,
      test_name: row.test_name,
      result_value: row.result_value,
      unit: row.unit,
      reference_range: row.reference_range,
      result_flag: normalizeLabResultFlag(row.result_flag),
      ordering_provider: row.ordering_provider,
      lab_facility: row.lab_facility,
      status: row.status,
      clinical_note: row.clinical_note,
    }))
}

export async function loadMedications(memberId: string): Promise<Medication[]> {
  const urls = [
    `${API_V1_BASE}/medications/${encodeURIComponent(memberId)}`,
    `${API_V1_BASE}/medications?member_id=${encodeURIComponent(memberId)}`,
  ]

  let payload: unknown = null
  let lastStatus = 0

  for (const url of urls) {
    const response = await fetchWithTimeout(url)
    if (!response.ok) {
      lastStatus = response.status
      continue
    }

    payload = await response.json()
    break
  }

  if (payload == null) {
    throw new Error(`Medications API failed with status ${lastStatus || 'unknown'}`)
  }

  const rows = Array.isArray(payload) ? payload : [payload]

  return rows
    .filter((row): row is MedicationApiRecord => !!row && typeof row === 'object')
    .map((row) => ({
      med_id: row.med_id,
      member_id: row.member_id,
      patient_name: row.patient_name,
      gender: row.gender,
      age: row.age,
      drug_name: row.drug_name,
      brand_name: row.brand_name,
      dosage: row.dosage,
      route: row.route,
      frequency: row.frequency,
      indication: row.indication,
      prescribing_provider: row.prescribing_provider,
      date_prescribed: row.date_prescribed,
      last_fill_date: row.last_fill_date,
      days_since_last_fill: Number(row.days_since_last_fill ?? 0),
      adherence_status: normalizeMedicationAdherence(row.adherence_status),
      medication_status: row.medication_status,
      rx_notes: row.rx_notes,
    }))
}

export async function loadPriorAuthorizations(memberId: string): Promise<PriorAuthorization[]> {
  const urls = [
    `${API_V1_BASE}/prior-auth/${encodeURIComponent(memberId)}`,
    `${API_V1_BASE}/prior-auth?member_id=${encodeURIComponent(memberId)}`,
  ]

  let payload: unknown = null
  let lastStatus = 0

  for (const url of urls) {
    const response = await fetchWithTimeout(url)
    if (!response.ok) {
      lastStatus = response.status
      continue
    }

    payload = await response.json()
    break
  }

  if (payload == null) {
    throw new Error(`Prior auth API failed with status ${lastStatus || 'unknown'}`)
  }

  const rows = Array.isArray(payload) ? payload : [payload]

  return rows
    .filter((row): row is PriorAuthorizationApiRecord => !!row && typeof row === 'object')
    .map((row) => ({
      auth_id: row.auth_id,
      member_id: row.member_id,
      patient_name: row.patient_name,
      gender: row.gender,
      age: row.age,
      request_date: row.request_date,
      auth_type: row.auth_type,
      service_requested: row.service_requested,
      requesting_provider: row.requesting_provider,
      decision: normalizePriorAuthDecision(row.decision),
      decision_date: row.decision_date ?? '',
      valid_from: row.valid_from ?? '',
      valid_through: row.valid_through ?? '',
      denial_reason: row.denial_reason ?? '',
      appeal_status: row.appeal_status ?? '',
      auth_notes: row.auth_notes ?? '',
    }))
}

export async function loadEhrNotes(memberId: string): Promise<DashboardData['ehrNotes']> {
  const urls = [
    `${API_V1_BASE}/ehr-notes/${encodeURIComponent(memberId)}`,
    `${API_V1_BASE}/ehr-notes?member_id=${encodeURIComponent(memberId)}`,
  ]

  let payload: unknown = null
  let lastStatus = 0

  for (const url of urls) {
    const response = await fetchWithTimeout(url)
    if (!response.ok) {
      lastStatus = response.status
      continue
    }

    payload = await response.json()
    break
  }

  if (payload == null) {
    throw new Error(`EHR notes API failed with status ${lastStatus || 'unknown'}`)
  }

  const rows = Array.isArray(payload) ? payload : [payload]

  return rows
    .filter((row): row is EhrNoteApiRecord => !!row && typeof row === 'object')
    .map((row) => ({
      note_id: row.note_id,
      member_id: row.member_id,
      patient_name: row.patient_name,
      gender: row.gender,
      age: row.age,
      location: row.location,
      note_date: row.note_date,
      note_type: row.note_type,
      provider_name: row.provider_name,
      facility_name: row.facility_name,
      icd_code: row.icd_code,
      primary_diagnosis: row.primary_diagnosis,
      subjective: row.subjective,
      objective: row.objective,
      assessment: row.assessment,
      plan: row.plan,
      follow_up_date: row.follow_up_date ?? '',
    }))
}
