from typing import List, Literal
from pydantic import BaseModel, Field


class Basics(BaseModel):
    full_name: str = ""
    email: str = ""
    phone: str = ""
    location: str = ""
    title: str = ""


class ExperienceItem(BaseModel):
    company: str = ""
    role: str = ""
    start_date: str = ""
    end_date: str = ""
    highlights: List[str] = Field(default_factory=list)


class EducationItem(BaseModel):
    school: str = ""
    degree: str = ""
    field_of_study: str = ""
    start_date: str = ""
    end_date: str = ""


class CertificationItem(BaseModel):
    name: str = ""
    issuer: str = ""
    issue_date: str = ""


class ResumeData(BaseModel):
    template_id: Literal["classic", "modern", "compact"] = "classic"
    basics: Basics = Field(default_factory=Basics)
    summary: str = ""
    experience: List[ExperienceItem] = Field(default_factory=list)
    education: List[EducationItem] = Field(default_factory=list)
    certifications: List[CertificationItem] = Field(default_factory=list)
    skills: List[str] = Field(default_factory=list)


class ResumeRecord(BaseModel):
    id: str
    data: ResumeData
