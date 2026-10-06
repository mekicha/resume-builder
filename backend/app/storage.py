import os
from pathlib import Path
from tempfile import NamedTemporaryFile
from typing import Optional
from uuid import UUID

from .models import ResumeData, ResumeRecord


DATA_DIR = Path(os.environ.get("RESUME_DATA_DIR", Path(__file__).resolve().parent.parent / "data" / "resumes"))


def _resume_path(resume_id: str) -> Path:
    # Validate even for internal callers; identifiers must never be file paths.
    return DATA_DIR / f"{UUID(resume_id)}.json"


def save_resume(resume_id: str, data: ResumeData) -> ResumeRecord:
    path = _resume_path(resume_id)
    record = ResumeRecord(id=str(UUID(resume_id)), data=data)
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    temporary_path = None
    try:
        with NamedTemporaryFile(mode="w", encoding="utf-8", dir=DATA_DIR, suffix=".tmp", delete=False) as temporary:
            temporary_path = Path(temporary.name)
            temporary.write(record.model_dump_json(indent=2))
            temporary.flush()
            os.fsync(temporary.fileno())
        # Readers see either the previous complete file or the new complete file.
        os.replace(temporary_path, path)
    finally:
        if temporary_path is not None:
            temporary_path.unlink(missing_ok=True)
    return record


def get_resume(resume_id: str) -> Optional[ResumeRecord]:
    path = _resume_path(resume_id)
    try:
        return ResumeRecord.model_validate_json(path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        return None
