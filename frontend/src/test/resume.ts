import type { ResumeData } from '../types/resume';

export function makeResume(): ResumeData {
  return {
    template_id: 'classic',
    basics: { full_name: '', email: '', phone: '', location: '', title: '' },
    summary: '',
    experience: [],
    education: [],
    certifications: [],
    skills: [],
  };
}
