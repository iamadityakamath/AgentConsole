import type {
  CareGap,
  DashboardData,
  EhrNote,
  InsuranceClaim,
  LabResult,
  Medication,
  MemberProfile,
  PharmacyClaim,
  PriorAuthorization,
} from '../types/domain'

const FULL_MEMBERS: MemberProfile[] = [
  { member_id: 'M-10001', patient_name: 'Margaret Lewis', age: 67, gender: 'Female', location: 'Phoenix, AZ' },
  { member_id: 'M-10002', patient_name: 'Daniel Ortiz', age: 58, gender: 'Male', location: 'San Antonio, TX' },
  { member_id: 'M-10003', patient_name: 'Priya Natarajan', age: 49, gender: 'Female', location: 'Edison, NJ' },
  { member_id: 'M-10004', patient_name: 'George Williams', age: 73, gender: 'Male', location: 'Detroit, MI' },
  { member_id: 'M-10005', patient_name: 'Fatima Rahman', age: 39, gender: 'Female', location: 'Columbus, OH' },
]

const fullClaims: InsuranceClaim[] = [
  {
    claim_id: 'C-9001', member_id: 'M-10001', patient_name: 'Margaret Lewis', date_of_service: '2026-03-01', claim_type: 'Medical', place_of_service: 'Emergency Room', provider_name: 'Dr. Kent', facility_name: 'Valley General', icd_code: 'I50.9', diagnosis_description: 'Heart failure', cpt_code: '99284', procedure_description: 'ER visit', billed_amount: 1900, claim_status: 'Paid',
  },
  {
    claim_id: 'C-9002', member_id: 'M-10001', patient_name: 'Margaret Lewis', date_of_service: '2026-02-10', claim_type: 'Medical', place_of_service: 'Inpatient Hospital', provider_name: 'Dr. Kent', facility_name: 'Valley General', icd_code: 'I50.9', diagnosis_description: 'Heart failure', cpt_code: '99223', procedure_description: 'Initial hospital care', billed_amount: 12400, claim_status: 'Paid',
  },
  {
    claim_id: 'C-9003', member_id: 'M-10002', patient_name: 'Daniel Ortiz', date_of_service: '2026-03-06', claim_type: 'Medical', place_of_service: 'Outpatient Clinic', provider_name: 'Dr. Shah', facility_name: 'Westside Clinic', icd_code: 'E11.9', diagnosis_description: 'Type 2 diabetes', cpt_code: '99214', procedure_description: 'Office visit', billed_amount: 240, claim_status: 'Paid',
  },
  {
    claim_id: 'C-9004', member_id: 'M-10003', patient_name: 'Priya Natarajan', date_of_service: '2026-01-14', claim_type: 'Medical', place_of_service: 'Emergency Room', provider_name: 'Dr. Reed', facility_name: 'Mercy ER', icd_code: 'J45.909', diagnosis_description: 'Asthma', cpt_code: '99283', procedure_description: 'ER visit', billed_amount: 980, claim_status: 'Paid',
  },
  {
    claim_id: 'C-9005', member_id: 'M-10004', patient_name: 'George Williams', date_of_service: '2025-12-21', claim_type: 'Medical', place_of_service: 'Outpatient Clinic', provider_name: 'Dr. Lopez', facility_name: 'Metro Senior Health', icd_code: 'I10', diagnosis_description: 'Hypertension', cpt_code: '99213', procedure_description: 'Follow-up', billed_amount: 180, claim_status: 'Paid',
  },
]

const fullPharmacyClaims: PharmacyClaim[] = [
  { rx_claim_id: 'RX-8001', member_id: 'M-10001', date_filled: '2026-01-05', drug_name: 'Furosemide', brand_name: 'Lasix', dosage: '40mg', frequency: 'Once daily', days_supply: 30, refill_number: 2, refills_remaining: 0, prescribing_provider: 'Dr. Kent', pharmacy_name: 'Walgreens', copay_amount: 4, plan_paid_amount: 42, fill_status: 'Filled' },
  { rx_claim_id: 'RX-8002', member_id: 'M-10002', date_filled: '2026-03-05', drug_name: 'Metformin', brand_name: 'Glucophage', dosage: '500mg', frequency: 'Twice daily', days_supply: 30, refill_number: 3, refills_remaining: 2, prescribing_provider: 'Dr. Shah', pharmacy_name: 'CVS', copay_amount: 0, plan_paid_amount: 18, fill_status: 'Filled' },
  { rx_claim_id: 'RX-8003', member_id: 'M-10003', date_filled: '2026-03-01', drug_name: 'Albuterol', brand_name: 'Ventolin', dosage: '2 puffs', frequency: 'PRN', days_supply: 30, refill_number: 1, refills_remaining: 1, prescribing_provider: 'Dr. Reed', pharmacy_name: 'Rite Aid', copay_amount: 6, plan_paid_amount: 55, fill_status: 'Filled' },
]

const fullNotes: EhrNote[] = [
  { note_id: 'N-7001', member_id: 'M-10001', note_date: '2025-08-10', note_type: 'Progress', provider_name: 'Dr. Kent', facility_name: 'Valley General', icd_code: 'I50.9', primary_diagnosis: 'Congestive Heart Failure', subjective: 'Reports swelling and fatigue', objective: 'Weight increased, bilateral edema', assessment: 'Volume overload', plan: 'Increase diuretic; labs in 1 week', follow_up_date: '2025-08-17' },
  { note_id: 'N-7002', member_id: 'M-10002', note_date: '2026-03-07', note_type: 'Chronic Care', provider_name: 'Dr. Shah', facility_name: 'Westside Clinic', icd_code: 'E11.9', primary_diagnosis: 'Type 2 Diabetes Mellitus', subjective: 'Occasional dietary slips', objective: 'Weight stable', assessment: 'Suboptimal glycemic control', plan: 'Nutrition coaching; monitor A1C', follow_up_date: '2026-06-07' },
  { note_id: 'N-7003', member_id: 'M-10003', note_date: '2026-02-25', note_type: 'Follow-up', provider_name: 'Dr. Reed', facility_name: 'Mercy Pulmonary', icd_code: 'J45.909', primary_diagnosis: 'Moderate Persistent Asthma', subjective: 'Nighttime symptoms twice/week', objective: 'Mild wheeze', assessment: 'Partially controlled asthma', plan: 'Step up inhaled steroid', follow_up_date: '2026-04-01' },
  { note_id: 'N-7004', member_id: 'M-10004', note_date: '2025-10-02', note_type: 'Primary Care', provider_name: 'Dr. Lopez', facility_name: 'Metro Senior Health', icd_code: 'I10', primary_diagnosis: 'Hypertension', subjective: 'No headaches', objective: 'BP 148/92', assessment: 'Uncontrolled BP', plan: 'Adjust meds', follow_up_date: '2025-11-02' },
  { note_id: 'N-7005', member_id: 'M-10005', note_date: '2026-03-15', note_type: 'Behavioral Health', provider_name: 'Dr. Miller', facility_name: 'Hope Clinic', icd_code: 'F41.1', primary_diagnosis: 'Generalized Anxiety Disorder', subjective: 'Stress due to work', objective: 'Alert and oriented', assessment: 'Stable anxiety symptoms', plan: 'Continue therapy', follow_up_date: '2026-04-15' },
]

const fullLabs: LabResult[] = [
  { lab_id: 'L-6001', member_id: 'M-10001', draw_date: '2026-03-02', lab_type: 'Metabolic', test_name: 'Potassium', result_value: '2.8', unit: 'mmol/L', reference_range: '3.5-5.1', result_flag: 'Critical Low', ordering_provider: 'Dr. Kent', lab_facility: 'Valley Lab', status: 'Final', clinical_note: 'Needs urgent follow-up' },
  { lab_id: 'L-6002', member_id: 'M-10001', draw_date: '2026-03-02', lab_type: 'Cardiac', test_name: 'BNP', result_value: '1100', unit: 'pg/mL', reference_range: '<100', result_flag: 'Critical High', ordering_provider: 'Dr. Kent', lab_facility: 'Valley Lab', status: 'Final', clinical_note: 'Consistent with HF exacerbation' },
  { lab_id: 'L-6003', member_id: 'M-10002', draw_date: '2026-02-10', lab_type: 'Diabetes', test_name: 'HbA1c', result_value: '9.1', unit: '%', reference_range: '4.0-5.6', result_flag: 'High', ordering_provider: 'Dr. Shah', lab_facility: 'Quest', status: 'Final', clinical_note: 'Above target' },
  { lab_id: 'L-6004', member_id: 'M-10003', draw_date: '2025-11-12', lab_type: 'Pulmonary', test_name: 'Eosinophils', result_value: '0.7', unit: 'x10^9/L', reference_range: '0.0-0.5', result_flag: 'High', ordering_provider: 'Dr. Reed', lab_facility: 'Mercy Lab', status: 'Final', clinical_note: 'Recheck advised' },
  { lab_id: 'L-6005', member_id: 'M-10004', draw_date: '2026-01-20', lab_type: 'Renal', test_name: 'Creatinine', result_value: '1.1', unit: 'mg/dL', reference_range: '0.6-1.3', result_flag: 'Normal', ordering_provider: 'Dr. Lopez', lab_facility: 'Metro Lab', status: 'Final', clinical_note: 'Stable' },
]

const fullMeds: Medication[] = [
  { med_id: 'M-5001', member_id: 'M-10001', drug_name: 'Furosemide', brand_name: 'Lasix', dosage: '40mg', route: 'Oral', frequency: 'Daily', indication: 'Heart failure', prescribing_provider: 'Dr. Kent', date_prescribed: '2025-09-01', last_fill_date: '2026-01-05', days_since_last_fill: 96, adherence_status: 'Non-Adherent', medication_status: 'Active', rx_notes: 'Cost concern and transportation barriers reported' },
  { med_id: 'M-5002', member_id: 'M-10001', drug_name: 'Lisinopril', brand_name: 'Zestril', dosage: '10mg', route: 'Oral', frequency: 'Daily', indication: 'Hypertension', prescribing_provider: 'Dr. Kent', date_prescribed: '2025-09-01', last_fill_date: '2026-03-20', days_since_last_fill: 22, adherence_status: 'Partially Adherent', medication_status: 'Active', rx_notes: 'Misses evening doses' },
  { med_id: 'M-5003', member_id: 'M-10002', drug_name: 'Metformin', brand_name: 'Glucophage', dosage: '500mg', route: 'Oral', frequency: 'BID', indication: 'Diabetes', prescribing_provider: 'Dr. Shah', date_prescribed: '2025-10-01', last_fill_date: '2026-03-05', days_since_last_fill: 37, adherence_status: 'Partially Adherent', medication_status: 'Active', rx_notes: '' },
  { med_id: 'M-5004', member_id: 'M-10003', drug_name: 'Fluticasone', brand_name: 'Flovent', dosage: '110mcg', route: 'Inhaled', frequency: 'BID', indication: 'Asthma', prescribing_provider: 'Dr. Reed', date_prescribed: '2025-12-01', last_fill_date: '2026-02-22', days_since_last_fill: 49, adherence_status: 'Adherent', medication_status: 'Active', rx_notes: '' },
  { med_id: 'M-5005', member_id: 'M-10004', drug_name: 'Amlodipine', brand_name: 'Norvasc', dosage: '5mg', route: 'Oral', frequency: 'Daily', indication: 'Hypertension', prescribing_provider: 'Dr. Lopez', date_prescribed: '2025-08-15', last_fill_date: '2025-11-15', days_since_last_fill: 148, adherence_status: 'Non-Adherent', medication_status: 'Active', rx_notes: 'Could not afford copay' },
]

const fullAuths: PriorAuthorization[] = [
  { auth_id: 'A-4001', member_id: 'M-10001', request_date: '2026-03-03', auth_type: 'Medication', service_requested: 'Entresto', requesting_provider: 'Dr. Kent', decision: 'Denied', decision_date: '2026-03-06', valid_from: '2026-03-06', valid_through: '2026-09-06', denial_reason: 'Step therapy required', appeal_status: 'N/A', auth_notes: 'Patient symptomatic' },
  { auth_id: 'A-4002', member_id: 'M-10002', request_date: '2026-03-08', auth_type: 'DME', service_requested: 'Continuous Glucose Monitor', requesting_provider: 'Dr. Shah', decision: 'Pending', decision_date: '', valid_from: '', valid_through: '', denial_reason: '', appeal_status: 'N/A', auth_notes: '' },
  { auth_id: 'A-4003', member_id: 'M-10003', request_date: '2026-01-09', auth_type: 'Procedure', service_requested: 'Pulmonary Function Test', requesting_provider: 'Dr. Reed', decision: 'Approved', decision_date: '2026-01-10', valid_from: '2026-01-10', valid_through: '2026-07-10', denial_reason: '', appeal_status: 'N/A', auth_notes: '' },
]

const fullGaps: CareGap[] = [
  { gap_id: 'G-3001', member_id: 'M-10001', gap_category: 'Cardiac', gap_description: 'CHF follow-up visit overdue', clinical_guideline: 'ACC HF follow-up', last_completed_date: '2025-07-15', days_overdue: 250, priority: 'Critical', recommended_action: 'Schedule cardiology visit within 7 days', gap_status: 'Open', assigned_to: 'Maria Santos', gap_notes: '' },
  { gap_id: 'G-3002', member_id: 'M-10001', gap_category: 'Medication', gap_description: 'Medication reconciliation incomplete', clinical_guideline: 'CMS med rec', last_completed_date: '2025-08-01', days_overdue: 220, priority: 'High', recommended_action: 'Complete med rec on current call', gap_status: 'Open', assigned_to: 'Maria Santos', gap_notes: '' },
  { gap_id: 'G-3003', member_id: 'M-10002', gap_category: 'Diabetes', gap_description: 'A1C follow-up overdue', clinical_guideline: 'ADA 3-month A1C', last_completed_date: '2025-11-01', days_overdue: 161, priority: 'High', recommended_action: 'Order A1C this week', gap_status: 'Open', assigned_to: 'Maria Santos', gap_notes: '' },
  { gap_id: 'G-3004', member_id: 'M-10003', gap_category: 'Preventive Screening', gap_description: 'Annual influenza vaccination missing', clinical_guideline: 'CDC adult immunization', last_completed_date: '2024-10-01', days_overdue: 557, priority: 'Medium', recommended_action: 'Offer flu shot at next appointment', gap_status: 'Open', assigned_to: 'Maria Santos', gap_notes: '' },
  { gap_id: 'G-3005', member_id: 'M-10004', gap_category: 'Hypertension', gap_description: 'Blood pressure recheck overdue', clinical_guideline: 'ACC/AHA BP follow-up', last_completed_date: '2025-10-01', days_overdue: 192, priority: 'Medium', recommended_action: 'Schedule nurse BP check', gap_status: 'Open', assigned_to: 'Maria Santos', gap_notes: '' },
]

const liteMembers: MemberProfile[] = Array.from({ length: 25 }, (_, idx) => {
  const n = idx + 6
  return {
    member_id: `M-${(10000 + n).toString()}`,
    patient_name: `Synthetic Patient ${n}`,
    age: 30 + (idx % 40),
    gender: idx % 2 === 0 ? 'Female' : 'Male',
    location: idx % 3 === 0 ? 'Dallas, TX' : idx % 3 === 1 ? 'Atlanta, GA' : 'Tampa, FL',
  }
})

const liteNotes: EhrNote[] = liteMembers.map((m, idx) => ({
  note_id: `N-LITE-${idx + 1}`,
  member_id: m.member_id,
  note_date: idx % 4 === 0 ? '2025-05-01' : '2026-03-01',
  note_type: 'Primary Care',
  provider_name: 'Dr. Community',
  facility_name: 'Community Clinic',
  icd_code: idx % 2 === 0 ? 'E11.9' : 'I10',
  primary_diagnosis: idx % 2 === 0 ? 'Type 2 Diabetes Mellitus' : 'Hypertension',
  subjective: 'Routine follow-up',
  objective: 'Stable vitals',
  assessment: 'Chronic condition monitoring',
  plan: 'Continue current treatment',
  follow_up_date: '2026-06-01',
}))

const liteClaims: InsuranceClaim[] = liteMembers.map((m, idx) => ({
  claim_id: `C-LITE-${idx + 1}`,
  member_id: m.member_id,
  patient_name: m.patient_name,
  date_of_service: '2026-02-01',
  claim_type: 'Medical',
  place_of_service: idx % 8 === 0 ? 'Emergency Room' : 'Outpatient Clinic',
  provider_name: 'Dr. Community',
  facility_name: 'Community Clinic',
  icd_code: idx % 2 === 0 ? 'E11.9' : 'I10',
  diagnosis_description: idx % 2 === 0 ? 'Type 2 diabetes' : 'Hypertension',
  cpt_code: '99213',
  procedure_description: 'Follow-up visit',
  billed_amount: 160,
  claim_status: 'Paid',
}))

const liteMeds: Medication[] = liteMembers.map((m, idx) => ({
  med_id: `MED-LITE-${idx + 1}`,
  member_id: m.member_id,
  drug_name: idx % 2 === 0 ? 'Metformin' : 'Lisinopril',
  brand_name: idx % 2 === 0 ? 'Glucophage' : 'Zestril',
  dosage: idx % 2 === 0 ? '500mg' : '10mg',
  route: 'Oral',
  frequency: 'Daily',
  indication: idx % 2 === 0 ? 'Diabetes' : 'Hypertension',
  prescribing_provider: 'Dr. Community',
  date_prescribed: '2025-11-01',
  last_fill_date: '2026-03-01',
  days_since_last_fill: idx % 6 === 0 ? 75 : 28,
  adherence_status: idx % 6 === 0 ? 'Non-Adherent' : 'Adherent',
  medication_status: 'Active',
  rx_notes: idx % 10 === 0 ? 'Patient mentions transportation issues' : '',
}))

const liteLabs: LabResult[] = liteMembers.slice(0, 10).map((m, idx) => ({
  lab_id: `L-LITE-${idx + 1}`,
  member_id: m.member_id,
  draw_date: '2026-01-15',
  lab_type: 'Diabetes',
  test_name: 'HbA1c',
  result_value: idx % 4 === 0 ? '8.2' : '6.7',
  unit: '%',
  reference_range: '4.0-5.6',
  result_flag: idx % 4 === 0 ? 'High' : 'Normal',
  ordering_provider: 'Dr. Community',
  lab_facility: 'Quest',
  status: 'Final',
  clinical_note: '',
}))

const liteAuths: PriorAuthorization[] = liteMembers.slice(0, 12).map((m, idx) => ({
  auth_id: `A-LITE-${idx + 1}`,
  member_id: m.member_id,
  request_date: '2026-03-01',
  auth_type: 'Medication',
  service_requested: idx % 2 === 0 ? 'GLP-1 Therapy' : 'CPAP Supplies',
  requesting_provider: 'Dr. Community',
  decision: idx % 7 === 0 ? 'Pending' : 'Approved',
  decision_date: idx % 7 === 0 ? '' : '2026-03-03',
  valid_from: idx % 7 === 0 ? '' : '2026-03-03',
  valid_through: idx % 7 === 0 ? '' : '2026-09-03',
  denial_reason: '',
  appeal_status: 'N/A',
  auth_notes: '',
}))

const liteGaps: CareGap[] = liteMembers.map((m, idx) => ({
  gap_id: `G-LITE-${idx + 1}`,
  member_id: m.member_id,
  gap_category: idx % 2 === 0 ? 'Diabetes' : 'Preventive Screening',
  gap_description: idx % 2 === 0 ? 'Annual eye exam overdue' : 'Mammogram not completed',
  clinical_guideline: 'Annual screening',
  last_completed_date: '2024-12-01',
  days_overdue: 220 + idx,
  priority: idx % 9 === 0 ? 'Critical' : idx % 5 === 0 ? 'High' : 'Medium',
  recommended_action: idx % 2 === 0 ? 'Schedule retinal screening' : 'Schedule preventive screening',
  gap_status: idx % 7 === 0 ? 'In Progress' : 'Open',
  assigned_to: 'Maria Santos',
  gap_notes: '',
}))

export const mockDashboardData: DashboardData = {
  members: [...FULL_MEMBERS, ...liteMembers],
  insuranceClaims: [...fullClaims, ...liteClaims],
  pharmacyClaims: [...fullPharmacyClaims],
  ehrNotes: [...fullNotes, ...liteNotes],
  labResults: [...fullLabs, ...liteLabs],
  medications: [...fullMeds, ...liteMeds],
  priorAuths: [...fullAuths, ...liteAuths],
  careGaps: [...fullGaps, ...liteGaps],
}
