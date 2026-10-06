from io import BytesIO

from reportlab.lib.pagesizes import LETTER
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.pdfgen import canvas

from .models import ResumeData


TOP_Y = 760
BOTTOM_Y = 60
X_MARGIN = 50
MAX_WIDTH = 510


def wrap_text(text: str, font_name: str, font_size: float, max_width: float) -> list[str]:
    if max_width <= 0:
        raise ValueError("max_width must be positive")
    lines: list[str] = []
    current = ""
    for word in text.split():
        candidate = f"{current} {word}" if current else word
        if stringWidth(candidate, font_name, font_size) <= max_width:
            current = candidate
            continue
        if current:
            lines.append(current)
            current = ""
        # Long URLs or uninterrupted text must also fit within the page margins.
        for character in word:
            candidate = current + character
            if current and stringWidth(candidate, font_name, font_size) > max_width:
                lines.append(current)
                current = character
            else:
                current = candidate
    if current:
        lines.append(current)
    return lines


def generate_resume_pdf(data: ResumeData) -> bytes:
    """Generate a multi-page ATS-friendly PDF by default."""
    buffer = BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=LETTER)
    y = TOP_Y
    scale = 0.88 if data.template_id == "compact" else 1.0
    accent = (0.176, 0.424, 0.875) if data.template_id == "modern" else (0.067, 0.094, 0.153)
    pdf.setTitle(f"{data.basics.full_name or 'Resume'} - Resume")

    def ensure_space(required_gap: float = 16):
        nonlocal y
        if y - required_gap < BOTTOM_Y:
            pdf.showPage()
            y = TOP_Y

    def write_wrapped(text: str, size: int = 11, gap: int = 16, bold: bool = False):
        nonlocal y
        if not text:
            return
        font = "Helvetica-Bold" if bold else "Helvetica"
        size *= scale
        gap *= scale
        for line in wrap_text(text, font, size, MAX_WIDTH):
            ensure_space(gap)
            pdf.setFillColorRGB(*(accent if bold else (0.067, 0.094, 0.153)))
            pdf.setFont(font, size)
            pdf.drawString(X_MARGIN, y, line)
            y -= gap

    def write_section(title: str):
        # Keep each section heading with at least the first line of its content.
        ensure_space(34 * scale)
        write_wrapped(title, size=12, gap=18, bold=True)

    basics = data.basics

    write_wrapped(basics.full_name or "Your Name", size=18, gap=24, bold=True)
    write_wrapped(
        " | ".join(part for part in [basics.title, basics.location, basics.email, basics.phone] if part),
        size=10,
        gap=18,
    )

    if data.summary:
        write_section("PROFESSIONAL SUMMARY")
        for segment in data.summary.split("\n"):
            write_wrapped(segment.strip(), size=11, gap=14)
        y -= 6

    if data.skills:
        write_section("SKILLS")
        write_wrapped(", ".join(skill.strip() for skill in data.skills if skill.strip()), size=10, gap=14)
        y -= 6

    if data.experience:
        write_section("EXPERIENCE")
        for item in data.experience:
            heading = f"{item.role} — {item.company}".strip(" —")
            write_wrapped(heading, size=11, gap=14, bold=True)
            if item.start_date or item.end_date:
                write_wrapped(f"{item.start_date} - {item.end_date}".strip(" -"), size=10, gap=14)
            for h in item.highlights:
                write_wrapped(f"- {h.strip()}", size=10, gap=13)
            y -= 4

    if data.education:
        write_section("EDUCATION")
        for item in data.education:
            degree_line = f"{item.degree} {f'in {item.field_of_study}' if item.field_of_study else ''}".strip()
            write_wrapped(degree_line, size=11, gap=14, bold=True)
            write_wrapped(item.school, size=10, gap=14)
            if item.start_date or item.end_date:
                write_wrapped(f"{item.start_date} - {item.end_date}".strip(" -"), size=10, gap=14)
            y -= 4

    if data.certifications:
        write_section("CERTIFICATIONS")
        for item in data.certifications:
            write_wrapped(item.name, size=11, gap=14, bold=True)
            write_wrapped(" | ".join(part for part in [item.issuer, item.issue_date] if part), size=10, gap=13)

    pdf.showPage()
    pdf.save()
    buffer.seek(0)
    return buffer.read()
