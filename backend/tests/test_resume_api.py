from io import BytesIO
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from pypdf import PdfReader

from app.main import app
from app import storage
from app.models import ResumeData


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setattr(storage, "DATA_DIR", tmp_path / "resumes")
    with TestClient(app) as test_client:
        yield test_client


def test_create_reopen_update_and_export_current_content(client):
    response = client.post("/resumes", json={"basics": {"full_name": "Ada Lovelace"}, "summary": "Original summary"})
    assert response.status_code == 200
    record = response.json()
    resume_id = record["id"]
    assert client.get(f"/resumes/{resume_id}").json() == record

    data = record["data"]
    data.update(summary="Updated summary", skills=["TypeScript", "React"], template_id="modern")
    data["experience"] = [{"company": "Example", "role": "Engineer", "highlights": ["First achievement", "Second achievement"]}]
    data["education"] = [{"school": "Example College", "degree": "BSc", "start_date": "2020", "end_date": "2024"}]
    assert client.put(f"/resumes/{resume_id}", json=data).status_code == 200
    assert client.get(f"/resumes/{resume_id}").json()["data"]["summary"] == "Updated summary"
    pdf = client.post(f"/resumes/{resume_id}/export/pdf")
    assert pdf.status_code == 200
    assert pdf.headers["content-type"] == "application/pdf"
    assert resume_id in pdf.headers["content-disposition"]
    text = "\n".join(page.extract_text() for page in PdfReader(BytesIO(pdf.content)).pages)
    for expected in ["Ada Lovelace", "Updated summary", "TypeScript, React", "First achievement", "Second achievement", "2020 - 2024"]:
        assert expected in text
    assert "Original summary" not in text


@pytest.mark.parametrize("method,suffix", [("get", ""), ("put", ""), ("post", "/export/pdf")])
def test_missing_resume_returns_404_without_creating_a_file(client, method, suffix):
    response = getattr(client, method)(f"/resumes/{uuid4()}{suffix}", **({"json": {}} if method == "put" else {}))
    assert response.status_code == 404
    assert not storage.DATA_DIR.exists()


@pytest.mark.parametrize("method,suffix", [("get", ""), ("put", ""), ("post", "/export/pdf")])
def test_invalid_identifiers_are_rejected(client, method, suffix):
    response = getattr(client, method)(f"/resumes/not-a-uuid{suffix}", **({"json": {}} if method == "put" else {}))
    assert response.status_code == 422
    assert not storage.DATA_DIR.exists()


def test_unknown_template_is_rejected(client):
    assert client.post("/resumes", json={"template_id": "missing"}).status_code == 422


@pytest.mark.parametrize("identifier", ["../outside", "not-a-uuid", "/tmp/resume"])
def test_storage_also_validates_internal_identifiers(tmp_path, monkeypatch, identifier):
    monkeypatch.setattr(storage, "DATA_DIR", tmp_path)
    with pytest.raises(ValueError):
        storage.save_resume(identifier, ResumeData())
    assert list(tmp_path.iterdir()) == []


def test_failed_atomic_replace_preserves_existing_record_and_cleans_temporary_file(tmp_path, monkeypatch):
    monkeypatch.setattr(storage, "DATA_DIR", tmp_path)
    identifier = str(uuid4())
    storage.save_resume(identifier, ResumeData(summary="Original"))

    def fail_replace(*args):
        raise OSError("Simulated interrupted write")

    monkeypatch.setattr(storage.os, "replace", fail_replace)
    with pytest.raises(OSError):
        storage.save_resume(identifier, ResumeData(summary="Changed"))
    assert storage.get_resume(identifier).data.summary == "Original"
    assert [path.name for path in tmp_path.iterdir()] == [f"{identifier}.json"]
