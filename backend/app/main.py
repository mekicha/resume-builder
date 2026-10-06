import uuid
from uuid import UUID

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response

from .models import ResumeData, ResumeRecord
from .pdf_export import generate_resume_pdf
from .storage import get_resume, save_resume
from .templates import TEMPLATES

app = FastAPI(title="Resume Builder API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173", "http://127.0.0.1:5173",
        "http://localhost:4173", "http://127.0.0.1:4173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.get("/templates")
def list_templates() -> list[dict]:
    return TEMPLATES


@app.post("/resumes", response_model=ResumeRecord)
def create_resume(data: ResumeData) -> ResumeRecord:
    resume_id = str(uuid.uuid4())
    return save_resume(resume_id, data)


@app.get("/resumes/{resume_id}", response_model=ResumeRecord)
def fetch_resume(resume_id: UUID) -> ResumeRecord:
    record = get_resume(str(resume_id))
    if not record:
        raise HTTPException(status_code=404, detail="Resume not found")
    return record


@app.put("/resumes/{resume_id}", response_model=ResumeRecord)
def update_resume(resume_id: UUID, data: ResumeData) -> ResumeRecord:
    if not get_resume(str(resume_id)):
        raise HTTPException(status_code=404, detail="Resume not found")
    return save_resume(str(resume_id), data)


@app.post("/resumes/{resume_id}/export/pdf")
def export_resume_pdf(resume_id: UUID) -> Response:
    record = get_resume(str(resume_id))
    if not record:
        raise HTTPException(status_code=404, detail="Resume not found")

    pdf_content = generate_resume_pdf(record.data)
    return Response(
        content=pdf_content,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="resume-{resume_id}.pdf"'},
    )
