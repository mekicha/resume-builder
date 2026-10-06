export type ResumeBasics = {
  full_name: string;
  email: string;
  phone: string;
  location: string;
  title: string;
};

export type ExperienceItem = {
  company: string;
  role: string;
  start_date: string;
  end_date: string;
  highlights: string[];
};

export type EducationItem = {
  school: string;
  degree: string;
  field_of_study: string;
  start_date: string;
  end_date: string;
};

export type CertificationItem = {
  name: string;
  issuer: string;
  issue_date: string;
};

export type ResumeData = {
  template_id: string;
  basics: ResumeBasics;
  summary: string;
  experience: ExperienceItem[];
  education: EducationItem[];
  certifications: CertificationItem[];
  skills: string[];
};

export type ResumeRecord = {
  id: string;
  data: ResumeData;
};

export type TemplateInfo = {
  id: string;
  name: string;
  description: string;
};

export function createEmptyResume(): ResumeData {
  return {
    template_id: 'classic',
    basics: { full_name: '', email: '', phone: '', location: '', title: '' },
    summary: '', experience: [], education: [], certifications: [], skills: [],
  };
}
