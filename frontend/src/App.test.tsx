import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { createResume, exportResumePdf, fetchResume, fetchTemplates, updateResume } from './api/client';
import type { ResumeRecord } from './types/resume';
import { makeResume } from './test/resume';
import { DRAFT_KEY } from './draft';

vi.mock('./api/client', () => ({
  createResume: vi.fn(),
  exportResumePdf: vi.fn(),
  fetchTemplates: vi.fn(),
  fetchResume: vi.fn(),
  updateResume: vi.fn(),
}));

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

const record: ResumeRecord = { id: 'resume-123', data: makeResume() };

beforeEach(() => {
  vi.resetAllMocks();
  localStorage.clear();
  vi.mocked(fetchTemplates).mockResolvedValue([]);
  vi.mocked(createResume).mockResolvedValue(record);
  vi.mocked(fetchResume).mockResolvedValue(record);
  vi.mocked(updateResume).mockResolvedValue(record);
  vi.mocked(exportResumePdf).mockResolvedValue(new Blob(['PDF']));
  vi.stubGlobal('URL', {
    createObjectURL: vi.fn(() => 'blob:resume-pdf'),
    revokeObjectURL: vi.fn(),
  });
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

async function saveExistingResume() {
  const user = userEvent.setup();
  render(<App />);
  await user.click(screen.getByRole('button', { name: 'Save Resume' }));
  await screen.findByText('Status: Saved');
  return user;
}

describe('PDF export persistence', () => {
  it('waits for creation and exports using the returned ID on the first export', async () => {
    const pending = deferred<ResumeRecord>();
    vi.mocked(createResume).mockReturnValue(pending.promise);
    const user = userEvent.setup();
    render(<App />);
    await user.type(screen.getByPlaceholderText('Full name'), 'Ada Lovelace');
    await user.click(screen.getByRole('button', { name: 'Export PDF' }));

    expect(createResume).toHaveBeenCalledWith(
      expect.objectContaining({
        basics: expect.objectContaining({ full_name: 'Ada Lovelace' }),
      }),
    );
    expect(exportResumePdf).not.toHaveBeenCalled();
    expect(HTMLAnchorElement.prototype.click).not.toHaveBeenCalled();

    pending.resolve(record);
    await screen.findByText('Status: PDF downloaded');
    expect(exportResumePdf).toHaveBeenCalledExactlyOnceWith(record.id);
    expect(updateResume).not.toHaveBeenCalled();
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalledOnce();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:resume-pdf');
  });

  it('persists edits to an existing resume before requesting its PDF', async () => {
    const user = await saveExistingResume();
    const pending = deferred<ResumeRecord>();
    vi.mocked(updateResume).mockReturnValue(pending.promise);
    await user.type(screen.getByPlaceholderText('Professional summary'), 'Updated summary');
    await user.type(screen.getByPlaceholderText('Skills (comma or newline separated)'), 'TypeScript, React');
    await user.click(screen.getByRole('button', { name: 'Export PDF' }));

    await waitFor(() =>
      expect(updateResume).toHaveBeenCalledExactlyOnceWith(
        record.id,
        expect.objectContaining({ summary: 'Updated summary', skills: ['TypeScript', 'React'] }),
      ),
    );
    expect(exportResumePdf).not.toHaveBeenCalled();

    pending.resolve(record);
    await screen.findByText('Status: PDF downloaded');
    expect(exportResumePdf).toHaveBeenCalledExactlyOnceWith(record.id);
    expect(createResume).toHaveBeenCalledOnce();
  });

  it.each(['create', 'update'] as const)('does not export if %s fails', async (operation) => {
    let user;
    if (operation === 'update') {
      user = await saveExistingResume();
      vi.mocked(updateResume).mockRejectedValue(new Error('Save failed'));
    } else {
      user = userEvent.setup();
      vi.mocked(createResume).mockRejectedValue(new Error('Save failed'));
      render(<App />);
    }
    await user.click(screen.getByRole('button', { name: 'Export PDF' }));

    await screen.findByText('Status: Save failed');
    expect(exportResumePdf).not.toHaveBeenCalled();
    expect(URL.createObjectURL).not.toHaveBeenCalled();
    expect(HTMLAnchorElement.prototype.click).not.toHaveBeenCalled();
  });

  it('reports an export failure after a successful save without downloading', async () => {
    vi.mocked(exportResumePdf).mockRejectedValue(new Error('Export failed'));
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Export PDF' }));

    await screen.findByText('Status: Export failed');
    expect(createResume).toHaveBeenCalledOnce();
    expect(URL.createObjectURL).not.toHaveBeenCalled();
    expect(HTMLAnchorElement.prototype.click).not.toHaveBeenCalled();
  });
});

describe('draft recovery and saved resumes', () => {
  it('recovers edits and the saved ID after remounting and updates the same resume', async () => {
    const user = await saveExistingResume();
    await user.type(screen.getByLabelText('Full name'), 'Ada Lovelace');
    await user.type(screen.getByLabelText('Professional summary'), 'Work in progress');
    cleanup();
    render(<App />);
    expect((screen.getByLabelText('Full name') as HTMLInputElement).value).toBe('Ada Lovelace');
    expect((screen.getByLabelText('Professional summary') as HTMLTextAreaElement).value).toBe('Work in progress');
    expect(screen.getByText('Status: Recovered local draft')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Export PDF' }));
    await screen.findByText('Status: PDF downloaded');
    expect(createResume).toHaveBeenCalledOnce();
    expect(updateResume).toHaveBeenCalledWith(record.id, expect.objectContaining({ summary: 'Work in progress' }));
  });

  it('opens saved backend content and subsequently updates that resume', async () => {
    const loaded = {
      id: 'loaded-id',
      data: { ...makeResume(), template_id: 'modern', summary: 'Saved summary', skills: ['Go', 'Rust'] },
    };
    vi.mocked(fetchResume).mockResolvedValue(loaded);
    vi.mocked(updateResume).mockResolvedValue(loaded);
    const user = userEvent.setup();
    render(<App />);
    await user.type(screen.getByLabelText('Resume ID'), ' loaded-id ');
    await user.click(screen.getByRole('button', { name: 'Open Resume' }));
    await screen.findByText('Status: Loaded');
    expect(fetchResume).toHaveBeenCalledExactlyOnceWith('loaded-id');
    expect((screen.getByLabelText('Professional summary') as HTMLTextAreaElement).value).toBe('Saved summary');
    expect((screen.getByLabelText('Skills (comma or newline separated)') as HTMLTextAreaElement).value).toBe(
      'Go, Rust',
    );
    expect(screen.getByText('Up to date')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Save Resume' }));
    await screen.findByText('Status: Saved');
    expect(updateResume).toHaveBeenCalledWith('loaded-id', loaded.data);
    expect(createResume).not.toHaveBeenCalled();
  });

  it('keeps the current draft if loading fails', async () => {
    vi.mocked(fetchResume).mockRejectedValue(new Error('Not found'));
    const user = userEvent.setup();
    render(<App />);
    await user.type(screen.getByLabelText('Full name'), 'Ada');
    await user.type(screen.getByLabelText('Resume ID'), 'missing-id');
    await user.click(screen.getByRole('button', { name: 'Open Resume' }));
    await screen.findByText('Status: Load failed. Check the resume ID and try again.');
    expect((screen.getByLabelText('Full name') as HTMLInputElement).value).toBe('Ada');
    expect(JSON.parse(localStorage.getItem(DRAFT_KEY)!).data.basics.full_name).toBe('Ada');
    await user.click(screen.getByRole('button', { name: 'Save Resume' }));
    await screen.findByText('Status: Saved');
    expect(createResume).toHaveBeenCalledOnce();
  });

  it('continues editing when browser draft storage is unavailable', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Quota exceeded');
    });
    const user = userEvent.setup();
    render(<App />);
    expect(screen.getByText('Local draft storage unavailable. Save to keep your work.')).toBeTruthy();
    await user.type(screen.getByLabelText('Full name'), 'Ada');
    await user.click(screen.getByRole('button', { name: 'Save Resume' }));
    await screen.findByText('Status: Saved');
    expect(createResume).toHaveBeenCalledWith(
      expect.objectContaining({ basics: expect.objectContaining({ full_name: 'Ada' }) }),
    );
  });
});

describe('pending operations', () => {
  it('prevents duplicate creations and overlapping save/export requests', async () => {
    const pending = deferred<ResumeRecord>();
    vi.mocked(createResume).mockReturnValue(pending.promise);
    const user = userEvent.setup();
    render(<App />);
    const save = screen.getByRole('button', { name: 'Save Resume' }) as HTMLButtonElement;
    const exportButton = screen.getByRole('button', { name: 'Export PDF' }) as HTMLButtonElement;
    await user.dblClick(save);
    expect(save.disabled).toBe(true);
    expect(exportButton.disabled).toBe(true);
    await user.click(exportButton);
    expect(createResume).toHaveBeenCalledOnce();
    expect(exportResumePdf).not.toHaveBeenCalled();
    pending.resolve(record);
    await screen.findByText('Status: Saved');
    expect(save.disabled).toBe(false);
    expect(exportButton.disabled).toBe(false);
  });

  it('preserves edits made during saving and marks them as unsaved', async () => {
    const pending = deferred<ResumeRecord>();
    vi.mocked(createResume).mockReturnValue(pending.promise);
    const user = userEvent.setup();
    render(<App />);
    await user.type(screen.getByLabelText('Professional summary'), 'First');
    await user.click(screen.getByRole('button', { name: 'Save Resume' }));
    await user.type(screen.getByLabelText('Professional summary'), ' then edited');
    pending.resolve(record);
    await screen.findByText('Status: Saved');
    expect(createResume).toHaveBeenCalledWith(expect.objectContaining({ summary: 'First' }));
    expect((screen.getByLabelText('Professional summary') as HTMLTextAreaElement).value).toBe('First then edited');
    expect(screen.getByText('Unsaved changes')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Save Resume' }));
    await screen.findByText('Up to date');
    expect(updateResume).toHaveBeenCalledWith(record.id, expect.objectContaining({ summary: 'First then edited' }));
  });
});
