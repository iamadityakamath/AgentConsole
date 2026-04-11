import type { DashboardData } from '../types/domain'

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
