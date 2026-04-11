export type SeverityLevel = 'Critical' | 'High' | 'Medium' | 'Low'

export interface MemberProfile {
  member_id: string
  patient_name: string
  age: number
  gender: string
  location: string
}

export interface InsuranceClaim {
  claim_id: string
  member_id: string
  patient_name: string
  date_of_service: string
  claim_type: string
  place_of_service: string
  provider_name: string
  facility_name: string
  icd_code: string
  diagnosis_description: string
  cpt_code: string
  procedure_description: string
  billed_amount: number
  claim_status: string
}

export interface PharmacyClaim {
  rx_claim_id: string
  member_id: string
  date_filled: string
  drug_name: string
  brand_name: string
  dosage: string
  frequency: string
  days_supply: number
  refill_number: number
  refills_remaining: number
  prescribing_provider: string
  pharmacy_name: string
  copay_amount: number
  plan_paid_amount: number
  fill_status: string
}

export interface EhrNote {
  note_id: string
  member_id: string
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
  follow_up_date: string
}

export interface LabResult {
  lab_id: string
  member_id: string
  draw_date: string
  lab_type: string
  test_name: string
  result_value: string
  unit: string
  reference_range: string
  result_flag: 'Normal' | 'High' | 'Low' | 'Critical High' | 'Critical Low'
  ordering_provider: string
  lab_facility: string
  status: string
  clinical_note: string
}

export interface Medication {
  med_id: string
  member_id: string
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
  adherence_status: 'Adherent' | 'Partially Adherent' | 'Non-Adherent' | 'On Hold' | 'Discontinued'
  medication_status: string
  rx_notes: string
}

export interface PriorAuthorization {
  auth_id: string
  member_id: string
  request_date: string
  auth_type: string
  service_requested: string
  requesting_provider: string
  decision: 'Approved' | 'Denied' | 'Pending' | 'Appealed'
  decision_date: string
  valid_from: string
  valid_through: string
  denial_reason: string
  appeal_status: string
  auth_notes: string
}

export interface CareGap {
  gap_id: string
  member_id: string
  gap_category: string
  gap_description: string
  clinical_guideline: string
  last_completed_date: string
  days_overdue: number
  priority: 'Critical' | 'High' | 'Medium' | 'Low'
  recommended_action: string
  gap_status: 'Open' | 'In Progress' | 'Closed'
  assigned_to: string
  gap_notes: string
}

export interface DashboardData {
  members: MemberProfile[]
  insuranceClaims: InsuranceClaim[]
  pharmacyClaims: PharmacyClaim[]
  ehrNotes: EhrNote[]
  labResults: LabResult[]
  medications: Medication[]
  priorAuths: PriorAuthorization[]
  careGaps: CareGap[]
}

export type AppView = 'queue' | 'overview' | 'deep-dive' | 'summary'
