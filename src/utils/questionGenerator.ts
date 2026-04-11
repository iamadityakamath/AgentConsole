import type { CareGap, LabResult, Medication, PriorAuthorization } from '../types/domain'
import type { SuggestedQuestion } from '../types/questions'

const DAY_MS = 24 * 60 * 60 * 1000

function daysSince(dateIso: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(dateIso).getTime()) / DAY_MS))
}

function symptomHint(lab: LabResult): string {
  const key = `${lab.test_name} ${lab.lab_type}`.toLowerCase()
  if (key.includes('potassium')) return 'muscle weakness, cramps, or palpitations'
  if (key.includes('a1c') || key.includes('glucose')) return 'increased thirst, frequent urination, or fatigue'
  if (key.includes('bnp') || key.includes('cardiac')) return 'shortness of breath or swelling'
  if (key.includes('creatinine') || key.includes('renal')) return 'changes in urination or swelling'
  return 'new symptoms since your last test'
}

function screeningType(text: string): string {
  const lower = text.toLowerCase()
  if (lower.includes('mammogram')) return 'mammogram'
  if (lower.includes('colonoscopy')) return 'colonoscopy'
  if (lower.includes('flu') || lower.includes('influenza')) return 'flu shot'
  if (lower.includes('eye exam')) return 'eye exam'
  if (lower.includes('screening')) return 'recommended screening'
  return 'preventive screening'
}

export function generateSuggestedQuestions(params: {
  medications: Medication[]
  labs: LabResult[]
  gaps: CareGap[]
  priorAuths: PriorAuthorization[]
}): SuggestedQuestion[] {
  const { medications, labs, gaps, priorAuths } = params

  const socialQuestions: SuggestedQuestion[] = [
    {
      id: 'social-overall',
      category: 'Social',
      text: 'How have you been feeling overall since we last spoke?',
    },
    {
      id: 'social-home',
      category: 'Social',
      text: "Has anything changed at home - with your living situation, your support system, or your ability to get to appointments?",
    },
    {
      id: 'social-food',
      category: 'Social',
      text: 'Are you having any difficulty affording food or other basic needs?',
    },
    {
      id: 'social-concerns',
      category: 'Social',
      text: "Is there anything you've been worried about that you'd like to talk through today?",
    },
  ]

  const medicationQuestions: SuggestedQuestion[] = []
  const hasCostBarrier = medications.some((m) => /cost|afford/i.test(m.rx_notes))
  const hasTransportationBarrier = medications.some((m) => /transportation/i.test(m.rx_notes))

  medications.forEach((med) => {
    if (med.adherence_status === 'Non-Adherent') {
      medicationQuestions.push({
        id: `med-nonadherent-${med.med_id}`,
        category: 'Medication',
        text: `We noticed you haven't refilled your ${med.drug_name} ${med.dosage} in ${med.days_since_last_fill} days. Can you tell me what's been making it difficult to keep up with this medication?`,
      })
    }
    if (med.adherence_status === 'Partially Adherent') {
      medicationQuestions.push({
        id: `med-partial-${med.med_id}`,
        category: 'Medication',
        text: `You've been taking your ${med.drug_name} most days - are there specific days or times when it's harder to remember?`,
      })
    }
  })

  if (hasCostBarrier) {
    medicationQuestions.push({
      id: 'med-cost-barrier',
      category: 'Medication',
      text: 'Have medication costs been a concern for you? We may be able to connect you with assistance programs.',
    })
  }

  if (hasTransportationBarrier) {
    medicationQuestions.push({
      id: 'med-transport-barrier',
      category: 'Medication',
      text: 'Are you having trouble getting to the pharmacy? We can look into mail-order delivery for your prescriptions.',
    })
  }

  const labQuestions: SuggestedQuestion[] = []
  labs.forEach((lab) => {
    if (lab.result_flag === 'Critical High' || lab.result_flag === 'Critical Low') {
      labQuestions.push({
        id: `lab-critical-${lab.lab_id}`,
        category: 'Labs',
        text: `Your recent ${lab.test_name} result was ${lab.result_value} ${lab.unit}, which is outside the safe range. Have you been feeling any different lately - ${symptomHint(lab)}?`,
        isCritical: true,
      })
    }

    if (lab.result_flag === 'High' && lab.test_name.toLowerCase() === 'hba1c') {
      labQuestions.push({
        id: `lab-a1c-high-${lab.lab_id}`,
        category: 'Labs',
        text: `Your A1C was ${lab.result_value}%, which tells us your blood sugar has been running higher than our goal. How has your diet and exercise been recently?`,
      })
    }

    if (lab.result_flag !== 'Normal') {
      const age = daysSince(lab.draw_date)
      if (age > 90) {
        labQuestions.push({
          id: `lab-recheck-${lab.lab_id}`,
          category: 'Labs',
          text: `Your ${lab.test_name} hasn't been rechecked in ${age} days. We'd like to get an updated reading - would you be able to go to a lab this week?`,
        })
      }
    }
  })

  const careGapQuestions: SuggestedQuestion[] = []
  gaps.filter((gap) => gap.gap_status === 'Open').forEach((gap) => {
    if (gap.priority === 'Critical') {
      careGapQuestions.push({
        id: `gap-critical-${gap.gap_id}`,
        category: 'Care Gaps',
        text: `One of our highest priorities for you right now is ${gap.gap_description}. ${gap.recommended_action}. Is there anything making it hard to get this done?`,
        isCritical: true,
      })
    }

    if (gap.priority === 'High') {
      careGapQuestions.push({
        id: `gap-high-${gap.gap_id}`,
        category: 'Care Gaps',
        text: `We also want to make sure we address ${gap.gap_description}. When did you last ${gap.recommended_action.toLowerCase()}?`,
      })
    }

    if (/preventive|screening|mammogram|colonoscopy|influenza|flu|eye exam/i.test(gap.gap_description)) {
      careGapQuestions.push({
        id: `gap-screening-${gap.gap_id}`,
        category: 'Care Gaps',
        text: `Have you had your ${screeningType(gap.gap_description)} done recently? It's been ${gap.days_overdue} days since your last one.`,
      })
    }
  })

  const priorAuthQuestions: SuggestedQuestion[] = []
  priorAuths.forEach((auth) => {
    if (auth.decision === 'Denied' && auth.appeal_status === 'N/A') {
      priorAuthQuestions.push({
        id: `auth-denied-${auth.auth_id}`,
        category: 'Prior Auth',
        text: `Your request for ${auth.service_requested} was denied. We may be able to appeal this - would you like us to look into that for you?`,
      })
    }

    if (auth.decision === 'Pending') {
      priorAuthQuestions.push({
        id: `auth-pending-${auth.auth_id}`,
        category: 'Prior Auth',
        text: `We're still waiting on approval for ${auth.service_requested}. Have you had any issues accessing this medication/service in the meantime?`,
      })
    }
  })

  const careGapCritical = careGapQuestions.filter((q) => q.isCritical)
  const careGapNonCritical = careGapQuestions.filter((q) => !q.isCritical)
  const labCritical = labQuestions.filter((q) => q.isCritical)
  const labNonCritical = labQuestions.filter((q) => !q.isCritical)

  return [
    ...socialQuestions,
    ...careGapCritical,
    ...careGapNonCritical,
    ...labCritical,
    ...labNonCritical,
    ...medicationQuestions,
    ...priorAuthQuestions,
  ]
}
