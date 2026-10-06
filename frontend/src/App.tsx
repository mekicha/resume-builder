import { useEffect, useState } from 'react';
import { createResume, exportResumePdf, fetchTemplates, updateResume } from './api/client';
import { ResumeForm } from './components/ResumeForm';
import { ResumePreview } from './components/ResumePreview';
import { TemplateSelector } from './components/TemplateSelector';
import type { ResumeData, TemplateInfo } from './types/resume';

const initialResume: ResumeData = {
  template_id: 'classic',
  basics: {
    full_name: '',
    email: '',
    phone: '',
    location: '',
    title: '',
  },
  summary: '',
  experience: [],
  education: [],
  certifications: [],
  skills: [],
};

export default function App() {
  const [templates, setTemplates] = useState<TemplateInfo[]>([]);
  const [resume, setResume] = useState<ResumeData>(initialResume);
  const [resumeId, setResumeId] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('Ready');

  useEffect(() => {
    fetchTemplates().then(setTemplates).catch(() => setStatus('Failed to load templates'));
  }, []);

  async function saveResume(): Promise<string | null> {
    try {
      setStatus('Saving...');
      if (!resumeId) {
        const created = await createResume(resume);
        setResumeId(created.id);
        setStatus('Saved');
        return created.id;
      }
      await updateResume(resumeId, resume);
      setStatus('Saved');
      return resumeId;
    } catch {
      setStatus('Save failed');
      return null;
    }
  }

  async function downloadPdf() {
    try {
      const id = await saveResume();
      if (!id) {
        return;
      }
      setStatus('Preparing PDF...');
      const blob = await exportResumePdf(id);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'resume.pdf';
      anchor.click();
      URL.revokeObjectURL(url);
      setStatus('PDF downloaded');
    } catch {
      setStatus('Export failed');
    }
  }

  return (
    <main>
      <header className="app-header panel">
        <div>
          <h1>Resume Builder</h1>
          <p className="muted">Professional resume editor with ATS-friendly PDF export.</p>
        </div>
        <div className="action-row">
          <button type="button" onClick={saveResume}>
            Save Resume
          </button>
          <button type="button" onClick={downloadPdf}>
            Export PDF
          </button>
        </div>
      </header>

      <TemplateSelector
        templates={templates}
        selectedTemplate={resume.template_id}
        onSelect={(template_id) => setResume({ ...resume, template_id })}
      />

      <div className="workspace-grid">
        <ResumeForm value={resume} onChange={setResume} />
        <ResumePreview data={resume} />
      </div>

      <footer className="panel footer-row">
        <span className="muted">Status: {status}</span>
        {resumeId && <span className="muted">Resume ID: {resumeId}</span>}
      </footer>
    </main>
  );
}
