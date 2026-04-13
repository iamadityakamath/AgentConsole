import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { CareGap, EhrNote, LabResult, Medication, PriorAuthorization } from '../types/domain'
import type { SuggestedQuestion } from '../types/questions'
import type { PatientDetailApiRecord } from '../services/dashboardApi'

export interface CarePlanPdfData {
  patientDetail: PatientDetailApiRecord
  notes: EhrNote[]
  labs: LabResult[]
  medications: Medication[]
  care_gaps: CareGap[]
  prior_auths: PriorAuthorization[]
  selectedQuestions: SuggestedQuestion[]
  callNotes: string
  careplanDate: string
}

const NAVY = '#1F4E79'
const DARK = '#1F2937'

const safe = (value: unknown, fallback = '-') => {
  if (value == null) return fallback
  const normalized = String(value).trim()
  return normalized.length > 0 ? normalized : fallback
}

function addPageHeader(doc: jsPDF, data: CarePlanPdfData) {
  const pageWidth = doc.internal.pageSize.getWidth()
  doc.setFillColor(31, 78, 121)
  doc.rect(0, 0, pageWidth, 26, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor('#FFFFFF')
  doc.text('NATIONAL HEALTH INSURANCE COMPANY', 14, 10)

  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.text(`PATIENT CARE PLAN | ${safe(data.patientDetail.full_name)} | ${safe(data.patientDetail.member_id)}`, 14, 18)
}

function addSectionTitle(doc: jsPDF, y: number, title: string): number {
  doc.setFillColor(46, 117, 182)
  doc.roundedRect(14, y, 182, 9, 1.5, 1.5, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor('#FFFFFF')
  doc.text(title, 16, y + 6)
  return y + 12
}

export function downloadCarePlanPdf(data: CarePlanPdfData) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  addPageHeader(doc, data)

  let y = 34

  y = addSectionTitle(doc, y, '1. Patient Identification')
  autoTable(doc, {
    startY: y,
    margin: { left: 14, right: 14 },
    theme: 'grid',
    headStyles: { fillColor: [31, 78, 121], textColor: 255, fontStyle: 'bold' },
    bodyStyles: { textColor: 33, fontSize: 9 },
    alternateRowStyles: { fillColor: [245, 248, 252] },
    body: [
      ['Full Name', safe(data.patientDetail.full_name)],
      ['Member ID', safe(data.patientDetail.member_id)],
      ['Date of Birth', safe(data.patientDetail.date_of_birth)],
      ['Age / Gender', `${safe(data.patientDetail.age)} / ${safe(data.patientDetail.gender)}`],
      ['Address', `${safe(data.patientDetail.street_address)}, ${safe(data.patientDetail.city)}, ${safe(data.patientDetail.state)} ${safe(data.patientDetail.zip_code)}`],
      ['Primary Conditions', safe(data.patientDetail.primary_conditions)],
      ['Risk Tier', safe(data.patientDetail.risk_tier)],
      ['Assigned Coordinator', safe(data.patientDetail.assigned_coordinator)],
      ['Date of Plan', safe(data.careplanDate)],
    ],
    columnStyles: { 0: { cellWidth: 45, fontStyle: 'bold' }, 1: { cellWidth: 137 } },
  })

  y = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y
  y += 6

  y = addSectionTitle(doc, y, '2. Patient Summary')
  const note = data.notes[0]
  autoTable(doc, {
    startY: y,
    margin: { left: 14, right: 14 },
    theme: 'grid',
    headStyles: { fillColor: [31, 78, 121], textColor: 255, fontStyle: 'bold' },
    bodyStyles: { textColor: 33, fontSize: 9 },
    alternateRowStyles: { fillColor: [245, 248, 252] },
    body: [
      ['Most Recent Note', note ? `${safe(note.note_date)} | ${safe(note.note_type)}` : '-'],
      ['Primary Diagnosis', note ? safe(note.primary_diagnosis) : '-'],
      ['Provider / Facility', note ? `${safe(note.provider_name)} | ${safe(note.facility_name)}` : '-'],
      ['Discharge Plan', note ? safe(note.plan) : '-'],
    ],
    columnStyles: { 0: { cellWidth: 45, fontStyle: 'bold' }, 1: { cellWidth: 137 } },
  })

  y = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y
  y += 6

  y = addSectionTitle(doc, y, '3. Medication Reconciliation')
  autoTable(doc, {
    startY: y,
    margin: { left: 14, right: 14 },
    theme: 'striped',
    headStyles: { fillColor: [31, 78, 121], textColor: 255, fontStyle: 'bold' },
    bodyStyles: { textColor: 33, fontSize: 8.5 },
    body: data.medications.map((med) => [
      safe(med.drug_name),
      safe(med.dosage),
      safe(med.frequency),
      safe(med.indication),
      safe(med.adherence_status),
    ]),
    head: [['Drug', 'Dosage', 'Frequency', 'Indication', 'Adherence']],
    columnStyles: {
      0: { cellWidth: 32 },
      1: { cellWidth: 20 },
      2: { cellWidth: 30 },
      3: { cellWidth: 60 },
      4: { cellWidth: 44 },
    },
    didParseCell: (hookData) => {
      if (hookData.section !== 'body' || hookData.column.index !== 4) return
      const value = String(hookData.cell.raw || '')
      if (value.includes('Non-Adherent')) hookData.cell.styles.fillColor = [252, 228, 214]
      else if (value.includes('Partially')) hookData.cell.styles.fillColor = [255, 242, 204]
      else if (value.includes('Adherent')) hookData.cell.styles.fillColor = [226, 239, 218]
    },
  })

  y = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y
  y += 6

  y = addSectionTitle(doc, y, '4. Recent Lab Results')
  autoTable(doc, {
    startY: y,
    margin: { left: 14, right: 14 },
    theme: 'striped',
    headStyles: { fillColor: [31, 78, 121], textColor: 255, fontStyle: 'bold' },
    bodyStyles: { textColor: 33, fontSize: 8.2 },
    head: [['Test Name', 'Date', 'Result', 'Unit', 'Ref Range', 'Flag']],
    body: data.labs.map((lab) => [
      safe(lab.test_name),
      safe(lab.draw_date),
      safe(lab.result_value),
      safe(lab.unit),
      safe(lab.reference_range),
      safe(lab.result_flag),
    ]),
    columnStyles: {
      0: { cellWidth: 45 },
      1: { cellWidth: 21 },
      2: { cellWidth: 18 },
      3: { cellWidth: 14 },
      4: { cellWidth: 48 },
      5: { cellWidth: 40 },
    },
    didParseCell: (hookData) => {
      if (hookData.section !== 'body' || hookData.column.index !== 5) return
      const value = String(hookData.cell.raw || '')
      if (value.includes('Critical')) hookData.cell.styles.fillColor = [252, 228, 214]
      else if (value === 'High' || value === 'Low') hookData.cell.styles.fillColor = [255, 242, 204]
      else hookData.cell.styles.fillColor = [226, 239, 218]
    },
  })

  y = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y
  y += 6

  y = addSectionTitle(doc, y, '5. Identified Care Gaps')
  autoTable(doc, {
    startY: y,
    margin: { left: 14, right: 14 },
    theme: 'striped',
    headStyles: { fillColor: [31, 78, 121], textColor: 255, fontStyle: 'bold' },
    bodyStyles: { textColor: 33, fontSize: 8.4 },
    head: [['Gap Description', 'Category', 'Priority', 'Overdue', 'Recommended Action']],
    body: data.care_gaps.map((gap) => [
      safe(gap.gap_description),
      safe(gap.gap_category),
      safe(gap.priority),
      `${safe(gap.days_overdue)} days`,
      safe(gap.recommended_action),
    ]),
    columnStyles: {
      0: { cellWidth: 55 },
      1: { cellWidth: 25 },
      2: { cellWidth: 20 },
      3: { cellWidth: 18 },
      4: { cellWidth: 68 },
    },
  })

  y = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y
  y += 6

  y = addSectionTitle(doc, y, '6. Prior Authorization Status')
  autoTable(doc, {
    startY: y,
    margin: { left: 14, right: 14 },
    theme: 'grid',
    headStyles: { fillColor: [31, 78, 121], textColor: 255, fontStyle: 'bold' },
    bodyStyles: { textColor: 33, fontSize: 8.5 },
    head: [['Service Requested', 'Type', 'Decision', 'Decision Date', 'Valid Through']],
    body: data.prior_auths.map((auth) => [
      safe(auth.service_requested),
      safe(auth.auth_type),
      safe(auth.decision),
      safe(auth.decision_date),
      safe(auth.valid_through),
    ]),
    columnStyles: {
      0: { cellWidth: 78 },
      1: { cellWidth: 18 },
      2: { cellWidth: 24 },
      3: { cellWidth: 30 },
      4: { cellWidth: 36 },
    },
  })

  y = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y
  y += 6

  y = addSectionTitle(doc, y, '7. Call Q&A and Notes')
  autoTable(doc, {
    startY: y,
    margin: { left: 14, right: 14 },
    theme: 'grid',
    headStyles: { fillColor: [31, 78, 121], textColor: 255, fontStyle: 'bold' },
    bodyStyles: { textColor: 33, fontSize: 8.3 },
    head: [['ID', 'Question', 'Patient Response']],
    body: data.selectedQuestions.map((question) => [
      safe(question.id),
      safe(question.text),
      safe(question.patient_answer, 'No response recorded'),
    ]),
    columnStyles: {
      0: { cellWidth: 14 },
      1: { cellWidth: 90 },
      2: { cellWidth: 88 },
    },
  })

  y = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y

  if (y > 255) {
    doc.addPage()
    addPageHeader(doc, data)
    y = 34
  }

  doc.setFillColor(245, 248, 252)
  doc.roundedRect(14, y + 4, 182, 22, 1.5, 1.5, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(NAVY)
  doc.text('Call Notes', 16, y + 11)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(DARK)
  const wrappedNotes = doc.splitTextToSize(safe(data.callNotes, 'No call notes recorded'), 176)
  doc.text(wrappedNotes, 16, y + 17)

  const pageCount = doc.getNumberOfPages()
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page)
    doc.setFontSize(8)
    doc.setTextColor('#6B7280')
    doc.text(`Page ${page} of ${pageCount}`, 196, 292, { align: 'right' })
    doc.text('CONFIDENTIAL - Contains PHI', 14, 292)
  }

  const filename = `${safe(data.patientDetail.full_name, 'patient').replace(/\s+/g, '_').toLowerCase()}_care_plan.pdf`
  doc.save(filename)
}
