import type { ResumeData, ResumeRecord, TemplateInfo } from '../types/resume';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');

export async function fetchTemplates(): Promise<TemplateInfo[]> {
  const response = await fetch(`${API_BASE_URL}/templates`);
  if (!response.ok) throw new Error('Failed to load templates');
  return response.json();
}

export async function fetchResume(id: string): Promise<ResumeRecord> {
  const response = await fetch(`${API_BASE_URL}/resumes/${encodeURIComponent(id)}`);
  if (!response.ok) throw new Error('Failed to load resume');
  return response.json();
}

export async function createResume(data: ResumeData): Promise<ResumeRecord> {
  const response = await fetch(`${API_BASE_URL}/resumes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to create resume');
  return response.json();
}

export async function updateResume(id: string, data: ResumeData): Promise<ResumeRecord> {
  const response = await fetch(`${API_BASE_URL}/resumes/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to update resume');
  return response.json();
}

export async function exportResumePdf(id: string): Promise<Blob> {
  const response = await fetch(`${API_BASE_URL}/resumes/${encodeURIComponent(id)}/export/pdf`, {
    method: 'POST',
  });
  if (!response.ok) throw new Error('Failed to export PDF');
  return response.blob();
}
