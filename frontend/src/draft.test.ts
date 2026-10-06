import { beforeEach, describe, expect, it } from 'vitest';
import { DRAFT_KEY, readDraft } from './draft';
import { makeResume } from './test/resume';

beforeEach(() => localStorage.clear());

describe('local draft validation', () => {
  it('recovers a valid resume and its backend identity', () => {
    const draft = { id: 'resume-id', data: { ...makeResume(), skills: ['TypeScript'], summary: 'Saved locally' } };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    expect(readDraft()).toEqual({ ...draft, recovered: true });
  });

  it.each([
    'not json',
    'null',
    JSON.stringify({ id: null, data: { ...makeResume(), skills: null } }),
    JSON.stringify({ id: null, data: { ...makeResume(), experience: [null] } }),
    JSON.stringify({ id: null, data: { ...makeResume(), template_id: 'invalid' } }),
  ])('ignores corrupt or incompatible drafts (%s)', (text) => {
    localStorage.setItem(DRAFT_KEY, text);
    expect(readDraft()).toEqual({ id: null, data: makeResume(), recovered: false });
  });
});
