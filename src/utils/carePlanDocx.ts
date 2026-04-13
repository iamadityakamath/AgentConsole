import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Header,
  HeadingLevel,
  Packer,
  PageNumber,
  Paragraph,
  TabStopPosition,
  TabStopType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
  type IShadingAttributesProperties,
} from 'docx'
import type { CareGap, EhrNote, LabResult, Medication, PriorAuthorization } from '../types/domain'
import type { SuggestedQuestion } from '../types/questions'
import type { PatientDetailApiRecord } from '../services/dashboardApi'

export interface CarePlanDocxData {
  patientDetail: PatientDetailApiRecord | null
  notes: EhrNote[]
  labs: LabResult[]
  medications: Medication[]
  careGaps: CareGap[]
  priorAuths: PriorAuthorization[]
  selectedQuestions: SuggestedQuestion[]
  callNotes: string
  careplanDate: string
}

const NAVY = '1F4E79'
const BLUE = '2E75B6'
const LIGHT_BLUE = 'D5E8F0'
const WHITE = 'FFFFFF'
const GRAY = 'F2F2F2'
const DARK = '2C2C2C'
const RED_BG = 'FCE4D6'
const AMB_BG = 'FFF2CC'
const GRN_BG = 'E2EFDA'

const safeText = (value: unknown, fallback = '-'): string => {
  if (value == null) return fallback
  const normalized = String(value).trim()
  return normalized.length > 0 ? normalized : fallback
}

const cellBorder = (color = 'CCCCCC') => ({
  top: { style: BorderStyle.SINGLE, size: 1, color },
  bottom: { style: BorderStyle.SINGLE, size: 1, color },
  left: { style: BorderStyle.SINGLE, size: 1, color },
  right: { style: BorderStyle.SINGLE, size: 1, color },
})

const cellPadding = { top: 60, bottom: 60, left: 100, right: 100 }

const text = (value: string, options?: { bold?: boolean; color?: string; size?: number; italic?: boolean }) =>
  new TextRun({
    text: value,
    font: 'Arial',
    size: options?.size ?? 20,
    bold: options?.bold ?? false,
    color: options?.color ?? DARK,
    italics: options?.italic ?? false,
  })

const heading = (label: string) =>
  new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 220, after: 100 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: BLUE, space: 4 } },
    children: [text(label, { bold: true, color: NAVY, size: 28 })],
  })

const tableCell = (
  value: string,
  width: number,
  options?: { bg?: IShadingAttributesProperties['fill']; color?: string; bold?: boolean; size?: number },
) =>
  new TableCell({
    borders: cellBorder('CCCCCC'),
    width: { size: width, type: WidthType.DXA },
    margins: cellPadding,
    shading: { fill: options?.bg ?? WHITE },
    children: [new Paragraph({ children: [text(value, { color: options?.color, bold: options?.bold, size: options?.size })] })],
  })

const fieldTable = (rows: Array<[string, string]>) =>
  new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [2600, 6760],
    rows: rows.map((row, index) =>
      new TableRow({
        children: [
          tableCell(row[0], 2600, { bg: GRAY, color: '595959', bold: true, size: 18 }),
          tableCell(row[1], 6760, { bg: index % 2 === 0 ? WHITE : 'FAFAFA', size: 18 }),
        ],
      }),
    ),
  })

const severityShade = (value: string): { bg: string; color: string } => {
  const normalized = value.toLowerCase()
  if (normalized.includes('critical')) return { bg: RED_BG, color: 'C00000' }
  if (normalized.includes('high')) return { bg: AMB_BG, color: '7B5800' }
  if (normalized.includes('low')) return { bg: LIGHT_BLUE, color: BLUE }
  return { bg: GRN_BG, color: '1D6A39' }
}

export async function downloadCarePlanDocx(data: CarePlanDocxData): Promise<void> {
  const patient = data.patientDetail
  if (!patient) {
    throw new Error('Patient details are required to build the care plan document.')
  }

  const note = data.notes[0]

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1080, right: 1000, bottom: 1080, left: 1000 },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: NAVY, space: 4 } },
                children: [
                  text('National Health Insurance Co | Care Plan | ', { size: 16, color: '595959' }),
                  text(safeText(patient.full_name), { size: 16, bold: true, color: NAVY }),
                  text(` | ${safeText(patient.member_id)} | DOB: ${safeText(patient.date_of_birth)}`, { size: 16, color: '595959' }),
                ],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                border: { top: { style: BorderStyle.SINGLE, size: 4, color: NAVY, space: 4 } },
                tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
                children: [
                  text('CONFIDENTIAL - PHI', { size: 16, color: '595959' }),
                  text('\tPage ', { size: 16, color: '595959' }),
                  new TextRun({ children: [PageNumber.CURRENT], font: 'Arial', size: 16, color: '595959' }),
                ],
              }),
            ],
          }),
        },
        children: [
          new Paragraph({ alignment: AlignmentType.CENTER, children: [text('PATIENT CARE PLAN', { size: 40, bold: true, color: NAVY })] }),
          new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 40, after: 180 }, children: [text(`Date of Plan: ${safeText(data.careplanDate)}`, { size: 18, color: '595959' })] }),

          heading('1. Patient Identification'),
          fieldTable([
            ['Full Name', safeText(patient.full_name)],
            ['Member ID', safeText(patient.member_id)],
            ['Date of Birth', safeText(patient.date_of_birth)],
            ['Age / Gender', `${safeText(patient.age)} / ${safeText(patient.gender)}`],
            ['Address', `${safeText(patient.street_address)}, ${safeText(patient.city)}, ${safeText(patient.state)} ${safeText(patient.zip_code)}`],
            ['Phone', safeText(patient.phone_primary)],
            ['Primary Conditions', safeText(patient.primary_conditions)],
            ['Risk Tier', safeText(patient.risk_tier)],
            ['Assigned Coordinator', safeText(patient.assigned_coordinator)],
          ]),

          heading('2. Clinical Summary'),
          fieldTable([
            ['Most Recent Note', note ? `${safeText(note.note_date)} - ${safeText(note.note_type)}` : '-'],
            ['Primary Diagnosis', note ? safeText(note.primary_diagnosis) : '-'],
            ['Provider', note ? safeText(note.provider_name) : '-'],
            ['Facility', note ? safeText(note.facility_name) : '-'],
            ['Plan', note ? safeText(note.plan) : '-'],
          ]),

          heading('3. Medications'),
          new Table({
            width: { size: 9360, type: WidthType.DXA },
            columnWidths: [2200, 1200, 1100, 2600, 2260],
            rows: [
              new TableRow({
                children: [
                  tableCell('Drug', 2200, { bg: NAVY, color: WHITE, bold: true, size: 17 }),
                  tableCell('Dosage', 1200, { bg: NAVY, color: WHITE, bold: true, size: 17 }),
                  tableCell('Route', 1100, { bg: NAVY, color: WHITE, bold: true, size: 17 }),
                  tableCell('Frequency', 2600, { bg: NAVY, color: WHITE, bold: true, size: 17 }),
                  tableCell('Adherence', 2260, { bg: NAVY, color: WHITE, bold: true, size: 17 }),
                ],
              }),
              ...data.medications.map((med, index) => {
                const style = severityShade(med.adherence_status)
                const bg = index % 2 === 0 ? WHITE : GRAY
                return new TableRow({
                  children: [
                    tableCell(safeText(med.drug_name), 2200, { bg }),
                    tableCell(safeText(med.dosage), 1200, { bg }),
                    tableCell(safeText(med.route), 1100, { bg }),
                    tableCell(safeText(med.frequency), 2600, { bg }),
                    tableCell(safeText(med.adherence_status), 2260, { bg: style.bg, color: style.color, bold: true }),
                  ],
                })
              }),
            ],
          }),

          heading('4. Lab Results'),
          new Table({
            width: { size: 9360, type: WidthType.DXA },
            columnWidths: [2800, 1200, 1200, 1600, 2560],
            rows: [
              new TableRow({
                children: [
                  tableCell('Test', 2800, { bg: NAVY, color: WHITE, bold: true, size: 17 }),
                  tableCell('Date', 1200, { bg: NAVY, color: WHITE, bold: true, size: 17 }),
                  tableCell('Result', 1200, { bg: NAVY, color: WHITE, bold: true, size: 17 }),
                  tableCell('Unit', 1600, { bg: NAVY, color: WHITE, bold: true, size: 17 }),
                  tableCell('Flag', 2560, { bg: NAVY, color: WHITE, bold: true, size: 17 }),
                ],
              }),
              ...data.labs.map((lab, index) => {
                const style = severityShade(lab.result_flag)
                const bg = index % 2 === 0 ? WHITE : GRAY
                return new TableRow({
                  children: [
                    tableCell(safeText(lab.test_name), 2800, { bg }),
                    tableCell(safeText(lab.draw_date), 1200, { bg }),
                    tableCell(safeText(lab.result_value), 1200, { bg: style.bg, color: style.color, bold: true }),
                    tableCell(safeText(lab.unit), 1600, { bg }),
                    tableCell(safeText(lab.result_flag), 2560, { bg: style.bg, color: style.color, bold: true }),
                  ],
                })
              }),
            ],
          }),

          heading('5. Care Gaps'),
          fieldTable(
            data.careGaps.map((gap) => [
              `${safeText(gap.priority)} - ${safeText(gap.gap_category)}`,
              `${safeText(gap.gap_description)} (Overdue ${safeText(gap.days_overdue)} days)`,
            ]),
          ),

          heading('6. Prior Authorizations'),
          fieldTable(
            data.priorAuths.map((auth) => [
              safeText(auth.service_requested),
              `${safeText(auth.decision)} | Requested ${safeText(auth.request_date)} | Valid through ${safeText(auth.valid_through)}`,
            ]),
          ),

          heading('7. Call Q&A'),
          fieldTable(
            data.selectedQuestions.map((question) => [
              `${safeText(question.id)} - ${safeText(question.sourceLabel)}`,
              `${safeText(question.text)}\nResponse: ${safeText(question.patient_answer, 'No response recorded')}`,
            ]),
          ),

          new Paragraph({ spacing: { before: 140, after: 50 }, children: [text('Call Notes', { bold: true, size: 22, color: BLUE })] }),
          new Paragraph({
            border: cellBorder('CCCCCC'),
            shading: { fill: 'FAFAFA' },
            indent: { left: 120, right: 120 },
            spacing: { before: 60, after: 60 },
            children: [text(safeText(data.callNotes, 'No call notes recorded'), { size: 18 })],
          }),
        ],
      },
    ],
  })

  const blob = await Packer.toBlob(doc)
  const fileName = `${safeText(patient.full_name, 'patient').replace(/\s+/g, '_').toLowerCase()}_care_plan.docx`
  const url = window.URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.URL.revokeObjectURL(url)
}
