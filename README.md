# Agent Console V2

A comprehensive Care Coordinator Agent Dashboard for managing patient interactions, care planning, and documentation. Built with React, TypeScript, Tailwind CSS, and Vite.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Running the Application](#running-the-application)
- [Building for Production](#building-for-production)
- [Project Structure](#project-structure)
- [Workflow Views](#workflow-views)
- [Export Functionality](#export-functionality)
- [Data Management](#data-management)
- [API Integration](#api-integration)
- [Development Guidelines](#development-guidelines)
- [Troubleshooting](#troubleshooting)

## Overview

Agent Console V2 is a four-step workflow application designed for care coordinators to:
- Manage patient tickets and call scheduling
- Build comprehensive patient profiles with AI suggestions
- Conduct deep-dive assessments and document call responses
- Generate and export professional care plans in DOCX and PDF formats

The application provides a streamlined interface for coordinating patient care with real-time data sync, AI-powered insights, and exportable clinical documentation.

## Features

### Core Functionality

- **Ticket Queue Management**: View and prioritize patient tickets with severity filtering and search
- **Patient Profiling**: Comprehensive patient demographic, clinical, and social data display
- **AI Insights**: Generate intelligent suggestions including patient summaries, timeline events, alerts, and coordinator questions
- **Deep Dive Assessment**: Structured clinical documentation with section-based questioning and supervisor flags
- **Care Plan Generation**: Create professional DOCX and PDF documents with patient data, care gaps, medications, and call notes
- **Data Persistence**: localStorage-based session management with automatic data merging
- **Responsive Design**: Fully scrollable views optimized for desktop workflows

### Export Formats

- **DOCX Export**: 12-section Word documents with formatted tables, colored cell highlighting, headers/footers
- **PDF Export**: Professional PDFs with blue headers, striped tables, cell color-coding, page numbering, and confidentiality footers

## Tech Stack

- **Frontend Framework**: React 18+ with TypeScript
- **Build Tool**: Vite 6
- **Styling**: Tailwind CSS
- **Component Architecture**: Functional components with hooks
- **State Management**: React hooks (useState, useContext, useCallback, useEffect)
- **Data Persistence**: Browser localStorage
- **Export Libraries**: 
  - `docx` - Word document generation
  - `jspdf` & `jspdf-autotable` - PDF generation
  - `html2canvas` - Screenshot generation
- **Code Quality**: TypeScript strict mode, ESLint

## Prerequisites

- **Node.js**: 20.x or newer
- **npm**: 10.x or newer (comes with Node.js)
- **Modern Browser**: Chrome, Firefox, Safari, or Edge (latest versions)

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd "Agent Console V2"
```

2. Install dependencies:
```bash
npm install
```

3. Verify installation:
```bash
npm run build
```

## Running the Application

### Development Server

Start the local development server with hot reload:

```bash
npm run dev
```

By default, the app runs on `http://localhost:5173`

To run on a specific port:
```bash
npx vite --port 4175
```

### Production Preview

Build and preview the production bundle locally:

```bash
npm run build
npx vite preview --port 4173
```

Then open `http://localhost:4173` in your browser.

## Building for Production

Create an optimized production bundle:

```bash
npm run build
```

Output location: `dist/` directory

The build includes:
- TypeScript compilation and type checking
- CSS minification via Tailwind
- JavaScript bundling and minification via Vite
- HTML asset optimization

## Project Structure

```
src/
├── components/
│   ├── DashboardViews.tsx       # Main view components (Overview, DeepDive, Summary)
│   └── [other components]
├── pages/
│   ├── QueuePage.tsx            # View 1: Ticket Queue
│   ├── OverviewPage.tsx         # View 2: Overview + Questions
│   ├── DeepDivePage.tsx         # View 3: Deep Dive
│   └── SummaryPage.tsx          # View 4: Summary + Care Plan
├── services/
│   └── dashboardApi.ts          # API calls and data loading
├── types/
│   ├── domain.ts                # Domain models (Patient, Member, etc.)
│   ├── dashboard.ts             # Dashboard-specific types
│   ├── questions.ts             # Question types
│   └── callWorkflow.ts          # Call workflow types
├── utils/
│   ├── carePlanDocx.ts          # Word document generation
│   ├── carePlanPdf.ts           # PDF generation
│   ├── ticketBuilder.ts         # Ticket filtering and building
│   └── [other utilities]
├── App.tsx                       # Main app component with routing
└── main.tsx                      # Entry point
```

## Workflow Views

### View 1: Ticket Queue

**Purpose**: Manage and prioritize patient tickets

**Features**:
- Filter by severity (All, Critical, High, Medium, Low)
- Search by patient name or member ID
- Ticket summary showing severity, name, condition, and action
- "Start Call Prep" button to begin workflow
- Active ticket count display

**Data**: Static mock ticket data with patient information

### View 2: Overview + Questions

**Purpose**: Build comprehensive patient profile with AI suggestions

**Left Panel (5-column grid)**:
- Patient demographics (snapshot, identity, address, contact, social profile, clinical info)
- Multiple section tabs: Patient Demographics, Care Gaps, Lab Results, Medications, Prior Auth, EHR Notes
- Independent scrollable content

**Right Panel (7-column grid)**:
- AI Insights generation button
- Patient Summary, Timeline Events, Alerts, Suggested Questions tabs
- Question management: drag-to-reorder, add custom questions, checkbox selection
- Question text editing capability

**Key Features**:
- AI suggestions endpoint integration (`/api/v1/ai/understand_patient_data`)
- Question selection for View 3
- Real-time question reordering
- Manual question creation with category selection

### View 3: Deep Dive

**Purpose**: Conduct structured clinical assessment with call documentation

**Layout**: Left panel (demographics) + Right panel (Call workflow sections)

**Sections**:
- Clinical Assessment
- Psychosocial Evaluation
- Medication Adherence
- Care Gaps Action Plan
- Health Maintenance
- Appointment & Follow-Ups

**Features**:
- Per-section multiple choice and free-text questions
- Answer recording with auto-save
- Supervisor flag capability for escalation
- Section progress tracking (0-100%)
- Call notes accumulation

**Data Persistence**:
- Stores: `deep-dive-session:{memberId}` (questions, call notes, view2 snapshot)
- Auto-save on navigation and 30-second intervals
- Merge strategy: preserves existing view2Data when local state is null

### View 4: Summary + Care Plan

**Purpose**: Edit care plan details and export professional documents

**Left Panel**:
- Editable fields: Patient Name, Primary Conditions, Assigned Coordinator, Risk Tier, Discharge Plan, Call Notes
- Stats grid: Labs count, Medications count, Care Gaps count, Questions count
- Question & Response editor with independent scroll
- Info box with export instructions

**Right Panel**:
- Live Word Document Preview
- Real-time updates as user edits left panel
- Shows Patient Care Plan layout exactly as exported

**Export Options** (Footer):
- **Download Care Plan (.docx)**: 12-section Word document
- **Download Care Plan (.pdf)**: Professionally formatted PDF

**Sections Included in Exports**:
1. Patient Identification (name, conditions, risk tier, coordinator)
2. Discharge Plan (full text)
3. Call Q&A (question-response pairs)
4. Call Notes
5. Medications (table with drug, dosage, frequency, indication, adherence)
6. Lab Results (table with test, date, result, unit, reference range, flag)
7. Care Gaps (table with description, category, priority, action)
8. Prior Authorizations
9. Additional clinical sections

## Export Functionality

### DOCX Export

**File**: `src/utils/carePlanDocx.ts`

**Features**:
- 12-section structured document
- Formatted tables with color-coded adherence status:
  - Green: Adherent
  - Amber: Partially Adherent
  - Red: Non-Adherent
- Lab flag highlighting (Normal, High, Low, Critical)
- NAVY headers and blue accents
- Page breaks between sections
- Headers/footers with insurance company branding
- Filename: `{patient_name}_care_plan.docx`

### PDF Export

**File**: `src/utils/carePlanPdf.ts`

**Features**:
- Professional blue header with patient info
- Striped table formatting with alternating row colors
- Conditional cell highlighting:
  - Adherence flags: Red/Amber/Green backgrounds
  - Lab flags: Critical/High/Low/Normal coloring
- Dynamic page breaks (A4 with 14mm margins)
- Page numbering: "Page X of Y"
- Confidentiality footer: "CONFIDENTIAL - Contains PHI"
- NAVY headers (#1F4E79) and blue text (#2E75B6)
- Filename: `{patient_name}_care_plan.pdf`

## Data Management

### localStorage Keys

```
deep-dive-session:{memberId}
├── selectedQuestions: SuggestedQuestion[]
├── callNotes: string
└── view2Data: StoredView2Data
    ├── memberId: string
    ├── member: MemberProfile
    ├── patientDetail: PatientDetailApiRecord
    ├── notes: EhrNote[]
    ├── labs: LabResult[]
    ├── meds: Medication[]
    ├── gaps: CareGap[]
    └── auths: PriorAuthorization[]
```

### Data Flow

1. **View 1 → View 2**: Selected ticket data loads
2. **View 2 → View 3**: Selected questions saved to session
3. **View 2/3 → View 4**: Full patient snapshot (view2Data) stored during navigation
4. **View 4**: Edits don't persist automatically; export triggers at export time
5. **Session Merge**: Deep Dive auto-save checks for existing view2Data before overwriting

### Merge Strategy

When saving Deep Dive data:
1. Read existing localStorage session
2. Extract current view2Data (if any)
3. Merge new questions/notes with existing view2Data
4. Write merged session back to localStorage
5. Prevents data loss during state transitions

## API Integration

### Current Status

- **Data Source**: Static mock data (dashboardApi.ts)
- **AI Endpoint**: `http://localhost:8000/api/v1/ai/understand_patient_data`
- **Integration Ready**: Backend API can be plugged in without UI changes

### Available API Functions

```typescript
loadDashboardData()          // Load all tickets
loadPatientDetail(memberId)  // Get patient demographics
loadCareGaps(memberId)       // Get care gap reports
loadLabResults(memberId)     // Get lab results
loadMedications(memberId)    // Get medication list
loadPriorAuthorizations()    // Get prior auth history
loadEhrNotes(memberId)       // Get clinical notes
```

### Expected Response Formats

See `src/types/domain.ts` for full interface definitions:
- `PatientDetailApiRecord`
- `LabResult`
- `Medication`
- `CareGap`
- `PriorAuthorization`
- `EhrNote`

## Development Guidelines

### Code Style

- **TypeScript**: Strict mode enabled, all types explicitly defined
- **Component Names**: PascalCase, export as named exports
- **Hooks**: Use `useCallback` for memoized event handlers
- **Props**: Define interfaces for all component props
- **CSS**: Tailwind classes only, no inline styles

### Adding New Views

1. Create page component in `src/pages/`
2. Add route in `src/App.tsx`
3. Add view label in `viewLabels` object
4. Export page component from pages index
5. Update `viewOrder` array if sequential

### Adding Features to Existing Views

1. Update component in `src/components/DashboardViews.tsx`
2. Add types in `src/types/` as needed
3. Update localStorage keys if persisting data
4. Test with multiple navigate cycles to verify data merging

### Window Events for Cross-Component Communication

Two exports use window events to trigger actions:
```typescript
// From View 4 footer buttons
window.dispatchEvent(new Event('summary-export-docx'))
window.dispatchEvent(new Event('summary-export-pdf'))

// Listened to by SummaryView component
window.addEventListener('summary-export-docx', onExportDocx)
window.addEventListener('summary-export-pdf', onExportPdf)
```

## Troubleshooting

### Common Issues

**Export buttons not working**
- Ensure View 2 was opened to load patient data
- Check browser console for error messages
- Verify localStorage contains view2Data for member

**Data not persisting between views**
- Clear browser localStorage: `localStorage.clear()` in console
- Reload page and navigate through views again
- Check Network tab for failed API calls

**Questions not showing in View 3**
- Ensure at least one question is selected in View 2
- Verify checkbox next to question is checked
- Check localStorage key contains selectedQuestions array

**AI Suggestions not generating**
- Verify backend server running at `http://localhost:8000`
- Check API endpoint responds to POST requests
- Verify patient data loaded in View 2 first

**Scrolling issues**
- Check browser zoom level (reset to 100%)
- Verify no CSS conflicts with `overflow-hidden` classes
- Test in different browser to isolate issue

### Debug Mode

To inspect session data:
```javascript
// In browser console
JSON.parse(localStorage.getItem('deep-dive-session:MBR-10002'))
```

To clear session:
```javascript
localStorage.removeItem('deep-dive-session:MBR-10002')
```

To export all localStorage:
```javascript
JSON.stringify(localStorage, null, 2)
```

### Performance Optimization

- Questions with large clinical_context: Consider truncating preview
- Large PDF generation: May take 2-3 seconds for complex patients
- Multiple tab rendering: View 2 left panel updates all tabs on data change (intentional, for data consistency)

## Known Limitations

1. **Export persistence**: View 4 edits are not saved to localStorage; only export triggers document generation
2. **Batch operations**: No bulk question selection/deselection in View 2
3. **Undo/Redo**: No history tracking for View 4 edits or View 3 question answers
4. **Concurrent sessions**: Single browser session per member (no multi-tab support)
5. **Offline mode**: Requires backend connectivity for member reference data

## Future Enhancements

- [ ] localStorage persistence of View 4 edits across sessions
- [ ] Email integration for care plan delivery
- [ ] Template selection for export layout variants
- [ ] Batch PDF/DOCX export as ZIP file
- [ ] Read-only coordinator review mode
- [ ] Audit logging for all view changes
- [ ] Advanced filtering and search in View 2
- [ ] Mobile-responsive design for tablet use

## Support & Contributions

For issues, questions, or contributions, please:
1. Check the Troubleshooting section above
2. Review the code comments in `src/utils/` and `src/components/`
3. Consult type definitions in `src/types/` for data structure questions

## License

Internal Vedara AI project - All rights reserved
