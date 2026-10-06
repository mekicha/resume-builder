# Local Resume Builder (MVP)

A local-first resume/CV builder inspired by FlowCV and Resume.io.

## What ships in this repo

- **Frontend**: React + TypeScript + Vite single-page app
  - Choose from multiple templates
  - Edit resume content in structured forms
  - Live visual preview
  - Recover the local draft after refresh
  - Save and reopen resumes by ID
  - Export ATS-friendly PDF
- **Backend**: FastAPI service
  - Template catalog endpoint
  - Resume create/read/update endpoints with atomic JSON file storage
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

### Shipped foundation
1. Template selection, multiple entries, and live preview
2. Local draft recovery plus save/open by backend resume ID
3. ATS-oriented PDF export with wrapping and automatic page continuation

### Phase 2
1. Drag-and-drop section/entry ordering
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
npm ci
npm run dev
```

Open http://localhost:5173

## Saving, reopening, and export

Edits are automatically kept in this browser's local storage. Refresh restores the
latest draft and its backend resume ID. This is one draft per browser; saving to
the backend is a separate action. The status indicates when edits are still unsaved.

Copy the resume ID after saving and use **Open Resume** to reopen that file,
including from a different browser on this machine. Opening replaces the current
local draft. Failed loads leave the current content intact.

Save and Export cannot overlap. The editor remains usable while a save runs;
edits made after clicking Save remain unsaved. Export first persists the snapshot
that existed when clicked, then downloads its PDF. Further edits are kept for the
next save/export.

Classic exports use a neutral single-column layout, Modern adds blue headings,
and Compact uses smaller typography and spacing. All export text remains
extractable. The on-screen preview is an approximation of the PDF.

## Configuration

Vite development and preview servers proxy `/api` to `http://127.0.0.1:8000`, so the
frontend works on both `localhost` and `127.0.0.1`. For another backend, set
`VITE_API_BASE_URL` before starting/building the frontend. A separately served
production build needs a reverse proxy for `/api` or this explicit API URL.

The backend accepts UUID resume IDs and only the three listed template IDs.
Updating an unknown ID returns 404. Set `RESUME_DATA_DIR` to choose a different
storage directory; otherwise JSON files live in `backend/data/resumes/`.

## Checks

Frontend:

```bash
cd frontend
npm ci
npm test
npm run build
```

Backend (after activating the virtual environment):

```bash
cd backend
pip install -r requirements-dev.txt
python -m pytest -q
```

Frontend tests cover export ordering, recovery, reopening, pending actions,
API configuration, and skills/highlight/date editing. API calls and downloads
are mocked in component tests. Backend tests exercise real HTTP endpoints via
FastAPI's test client, isolate storage in temporary directories, validate PDF
text and pagination, and simulate interrupted writes.

For an additional live HTTP check, install the backend development requirements
in `backend/.venv`, then run `npm run test:integration` from `frontend/`. It starts
isolated FastAPI/Vite servers, checks create/update/reopen through the frontend
proxy, and verifies that the exported PDF contains the edited text. `PYTHON_BIN`
can point to another Python environment with those dependencies installed.
