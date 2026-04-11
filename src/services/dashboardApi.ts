import type { CareGap, DashboardData, LabResult } from '../types/domain'

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

const PATIENTS_ENDPOINT = import.meta.env.VITE_PATIENTS_ENDPOINT ?? 'http://localhost:8000/api/v1/patients'
const REQUEST_TIMEOUT_MS = 10000

async function fetchWithTimeout(url: string, timeoutMs = REQUEST_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs)

  try {
    return await fetch(url, { signal: controller.signal })
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

export async function loadCareGaps(memberId: string): Promise<CareGap[]> {
  const urls = [
    `http://localhost:8000/api/v1/care-gaps/${encodeURIComponent(memberId)}`,
    `http://localhost:8000/api/v1/care-gaps?member_id=${encodeURIComponent(memberId)}`,
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
    `http://localhost:8000/api/v1/lab-results/${encodeURIComponent(memberId)}`,
    `http://localhost:8000/api/v1/lab-results?member_id=${encodeURIComponent(memberId)}`,
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
