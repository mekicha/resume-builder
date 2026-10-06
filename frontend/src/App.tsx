import { useEffect, useRef, useState } from 'react';
import { createResume, exportResumePdf, fetchResume, fetchTemplates, updateResume } from './api/client';
import { ResumeForm } from './components/ResumeForm';
import { ResumePreview } from './components/ResumePreview';
import { TemplateSelector } from './components/TemplateSelector';
import { DRAFT_KEY, readDraft } from './draft';
import type { ResumeData, TemplateInfo } from './types/resume';

type Operation = 'save' | 'export' | 'load';

export default function App() {
  const [initialDraft] = useState(readDraft);
  const [templates, setTemplates] = useState<TemplateInfo[]>([]);
  const [templateError, setTemplateError] = useState(false);
  const [resume, setResume] = useState<ResumeData>(initialDraft.data);
  const [resumeId, setResumeId] = useState<string | null>(initialDraft.id);
  const [savedResume, setSavedResume] = useState<ResumeData | null>(initialDraft.recovered ? null : initialDraft.data);
  const [status, setStatus] = useState(initialDraft.recovered ? 'Recovered local draft' : 'Ready');
  const [draftUnavailable, setDraftUnavailable] = useState(false);
  const [operation, setOperation] = useState<Operation | null>(null);
  const operationPending = useRef(false);
  const [loadId, setLoadId] = useState(initialDraft.id ?? '');
  const [loadedVersion, setLoadedVersion] = useState(0);

  useEffect(() => {
    let active = true;
    fetchTemplates()
      .then((items) => {
        if (active) setTemplates(items);
      })
      .catch(() => {
        if (active) setTemplateError(true);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ id: resumeId, data: resume }));
      setDraftUnavailable(false);
    } catch {
      setDraftUnavailable(true);
    }
  }, [resume, resumeId]);

  async function performOperation(next: Operation, work: () => Promise<void>) {
    // The ref also guards clicks arriving before React updates disabled buttons.
    if (operationPending.current) return;
    operationPending.current = true;
    setOperation(next);
    try {
      await work();
    } finally {
      operationPending.current = false;
      setOperation(null);
    }
  }

  async function persistResume(): Promise<string | null> {
    const snapshot = resume;
    try {
      setStatus('Saving...');
      const record = resumeId ? await updateResume(resumeId, snapshot) : await createResume(snapshot);
      setResumeId(record.id);
      setLoadId(record.id);
      // Later edits remain in the editor and are still marked as unsaved.
      setSavedResume(snapshot);
      setStatus('Saved');
      return record.id;
    } catch {
      setStatus('Save failed');
      return null;
    }
  }

  async function downloadPdf() {
    try {
      const id = await persistResume();
      if (!id) return;
      setStatus('Preparing PDF...');
      const blob = await exportResumePdf(id);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'resume.pdf';
      document.body.appendChild(anchor);
      try {
        anchor.click();
      } finally {
        anchor.remove();
        URL.revokeObjectURL(url);
      }
      setStatus('PDF downloaded');
    } catch {
      setStatus('Export failed');
    }
  }

  async function loadResume() {
    setStatus('Loading...');
    try {
      const record = await fetchResume(loadId.trim());
      setResume(record.data);
      setSavedResume(record.data);
      setResumeId(record.id);
      setLoadId(record.id);
      setLoadedVersion((version) => version + 1);
      setStatus('Loaded');
    } catch {
      setStatus('Load failed. Check the resume ID and try again.');
    }
  }

  const busy = operation !== null;
  const dirty = resume !== savedResume;
  return (
    <main>
      <header className="app-header panel">
        <div>
          <h1>Resume Builder</h1>
          <p className="muted">Professional resume editor with ATS-friendly PDF export.</p>
        </div>
        <div className="action-row">
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              performOperation('save', async () => {
                await persistResume();
              })
            }
          >
            Save Resume
          </button>
          <button type="button" disabled={busy} onClick={() => performOperation('export', downloadPdf)}>
            Export PDF
          </button>
        </div>
      </header>

      <section className="panel">
        <h2>Open a saved resume</h2>
        <form
          className="load-row"
          onSubmit={(event) => {
            event.preventDefault();
            if (loadId.trim()) void performOperation('load', loadResume);
          }}
        >
          <label className="form-field">
            <span>Resume ID</span>
            <input
              placeholder="Paste a saved resume ID"
              value={loadId}
              disabled={busy}
              onChange={(event) => setLoadId(event.target.value)}
            />
          </label>
          <button type="submit" disabled={busy || !loadId.trim()}>
            Open Resume
          </button>
        </form>
        <p className="muted">Opening a saved resume replaces the current draft on this device.</p>
      </section>

      <fieldset className="editor-fieldset" disabled={operation === 'load'}>
        {templateError && (
          <p role="alert">Templates could not be loaded. The current template is still available for export.</p>
        )}
        <TemplateSelector
          templates={templates}
          selectedTemplate={resume.template_id}
          onSelect={(template_id) => setResume({ ...resume, template_id })}
        />
        <div className="workspace-grid">
          <ResumeForm key={loadedVersion} value={resume} onChange={setResume} />
          <ResumePreview data={resume} />
        </div>
      </fieldset>

      <footer className="panel footer-row">
        <span className="muted" role="status">
          Status: {status}
        </span>
        <span>{dirty ? 'Unsaved changes' : 'Up to date'}</span>
        <span className="muted">
          {draftUnavailable ? 'Local draft storage unavailable. Save to keep your work.' : 'Draft saved on this device'}
        </span>
        {resumeId && <span className="muted">Resume ID: {resumeId}</span>}
      </footer>
    </main>
  );
}
