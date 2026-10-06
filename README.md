# Local Resume Builder (MVP)

A local-first resume/CV builder inspired by FlowCV and Resume.io.

## What ships in this repo

- **Frontend**: React + TypeScript + Vite single-page app
  - Choose from multiple templates
  - Edit resume content in structured forms
  - Live visual preview
  - Save resume to backend
  - Export ATS-friendly PDF
- **Backend**: FastAPI service
  - Template catalog endpoint
  - Resume CRUD endpoints (file-backed JSON storage)
  - PDF export endpoint using ReportLab (text-first ATS-friendly output)

---

## Architecture decisions

### Frontend
- **React + TypeScript** for fast iteration and safer domain modeling.
- **Vite** for local developer performance.
- **Component split**:
  - `TemplateSelector`: controls theme selection
  - `ResumeForm`: structured editing (basics, summary, experience, skills, education, certifications)
  - `ResumePreview`: visual approximation before export
- **API boundary** in `src/api/client.ts` so backend URL and transport logic are isolated.

### Backend
- **FastAPI** for typed request/response contracts and easy local APIs.
- **Pydantic models** guarantee resume payload shape.
- **JSON file storage (`backend/data/resumes/*.json`)** for the MVP local-only requirement.
- **ReportLab PDF generation** creates semantic text layout that is ATS-friendly and supports multi-page output by default.

### ATS-safe templates explained
In this project, “ATS-safe” means templates avoid layouts that break parsing:
- no text rendered as images
- predictable linear reading order
- clear section headings
- standard fonts and plain text bullets

---

## Planned roadmap

### Phase 1 (current scaffold)
1. Template selection and local editing UX
2. Save/load a resume from backend
3. Export ATS-oriented PDF with automatic page continuation (multi-page by default)

### Phase 2
1. Multiple entries per section and drag-and-drop ordering
2. Better validation and inline form helpers
3. Better template-specific styling controls

### Phase 3
1. Rich template engine with slot-based styles
2. Import from LinkedIn/JSON
3. AI-assisted phrasing and bullet optimization
4. Print-layout controls (margins, spacing, page breaks)

---

## Run locally

### Backend
```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

## Frontend checks

```bash
cd frontend
npm ci
npm test
npm run build
```

The Vitest/React Testing Library tests cover saving current form data before PDF
export (including failed saves) and preserving comma/newline skills entry while
keeping the parsed skills and external replacements in sync. API calls and the
browser download are mocked; these are frontend regression tests.
