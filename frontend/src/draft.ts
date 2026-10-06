import { createEmptyResume, type ResumeData } from './types/resume';

export const DRAFT_KEY = 'resume-builder-draft-v1';
export type Draft = { id: string | null; data: ResumeData };

function stringFields(value: unknown, fields: string[]): boolean {
  return (
    typeof value === 'object' &&
    value !== null &&
    fields.every((field) => typeof (value as Record<string, unknown>)[field] === 'string')
  );
}
function stringList(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}
function isResumeData(value: unknown): value is ResumeData {
  if (!stringFields(value, ['template_id', 'summary'])) return false;
  const data = value as ResumeData;
  return (
    ['classic', 'modern', 'compact'].includes(data.template_id) &&
    stringFields(data.basics, ['full_name', 'email', 'phone', 'location', 'title']) &&
    stringList(data.skills) &&
    Array.isArray(data.experience) &&
    data.experience.every(
      (item) => stringFields(item, ['company', 'role', 'start_date', 'end_date']) && stringList(item.highlights),
    ) &&
    Array.isArray(data.education) &&
    data.education.every((item) =>
      stringFields(item, ['school', 'degree', 'field_of_study', 'start_date', 'end_date']),
    ) &&
    Array.isArray(data.certifications) &&
    data.certifications.every((item) => stringFields(item, ['name', 'issuer', 'issue_date']))
  );
}

export function readDraft(): Draft & { recovered: boolean } {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (raw) {
      const draft = JSON.parse(raw);
      if (draft && (draft.id === null || typeof draft.id === 'string') && isResumeData(draft.data)) {
        return { id: draft.id, data: draft.data, recovered: true };
      }
    }
  } catch {
    // Unavailable browser storage or an invalid draft must not prevent editing.
  }
  return { id: null, data: createEmptyResume(), recovered: false };
}
