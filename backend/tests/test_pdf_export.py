from io import BytesIO

import pytest
from pypdf import PdfReader
from reportlab.pdfbase.pdfmetrics import stringWidth

from app.models import ResumeData, Basics
from app.pdf_export import generate_resume_pdf, wrap_text, MAX_WIDTH


def test_long_unbroken_text_wraps_within_the_page_width_without_losing_characters():
    text = "https://example.com/" + "abcdefgh" * 80
    lines = wrap_text(text, "Helvetica", 11, MAX_WIDTH)
    assert "".join(lines) == text
    assert all(stringWidth(line, "Helvetica", 11) <= MAX_WIDTH for line in lines)
    assert len(lines) > 1


@pytest.mark.parametrize("template", ["classic", "modern", "compact"])
def test_templates_export_all_content_as_extractable_text_on_multiple_pages(template):
    data = ResumeData(template_id=template, basics=Basics(full_name="Ada Lovelace"),
                      summary="\n".join(f"Achievement number {index}" for index in range(180)), skills=["Python", "TypeScript"])
    reader = PdfReader(BytesIO(generate_resume_pdf(data)))
    assert len(reader.pages) > 1
    text = "\n".join(page.extract_text() for page in reader.pages)
    assert "Ada Lovelace" in text
    assert "Achievement number 179" in text
    assert "Python, TypeScript" in text


def test_compact_template_uses_fewer_pages_and_modern_uses_its_accent():
    data = ResumeData(summary="\n".join(f"Achievement {index}" for index in range(220)))
    classic = PdfReader(BytesIO(generate_resume_pdf(data)))
    data.template_id = "compact"
    compact = PdfReader(BytesIO(generate_resume_pdf(data)))
    assert len(compact.pages) < len(classic.pages)
    data.template_id = "modern"
    modern = PdfReader(BytesIO(generate_resume_pdf(data)))
    assert b".176 .424 .875 rg" in modern.pages[0].get_contents().get_data()
    assert b".176 .424 .875 rg" not in classic.pages[0].get_contents().get_data()
