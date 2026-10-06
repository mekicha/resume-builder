import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { createResume, exportResumePdf, fetchTemplates, updateResume } from './api/client';
import type { ResumeRecord } from './types/resume';
import { makeResume } from './test/resume';

vi.mock('./api/client', () => ({
  createResume: vi.fn(),
  exportResumePdf: vi.fn(),
  fetchTemplates: vi.fn(),
  updateResume: vi.fn(),
}));

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

const record: ResumeRecord = { id: 'resume-123', data: makeResume() };

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(fetchTemplates).mockResolvedValue([]);
  vi.mocked(createResume).mockResolvedValue(record);
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

    expect(createResume).toHaveBeenCalledWith(expect.objectContaining({
      basics: expect.objectContaining({ full_name: 'Ada Lovelace' }),
    }));
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

    await waitFor(() => expect(updateResume).toHaveBeenCalledExactlyOnceWith(record.id,
      expect.objectContaining({ summary: 'Updated summary', skills: ['TypeScript', 'React'] })));
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
