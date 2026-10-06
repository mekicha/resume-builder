import { useState } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ResumeForm } from './ResumeForm';
import { makeResume } from '../test/resume';
import type { ResumeData } from '../types/resume';

afterEach(cleanup);

function renderControlledForm() {
  const onChange = vi.fn();
  function ControlledForm() {
    const [value, setValue] = useState(makeResume);
    function handleChange(next: ResumeData) {
      onChange(next);
      // Echo a fresh array as a controlled parent may do when saving/loading data.
      setValue({ ...next, skills: [...next.skills] });
    }
    return (
      <>
        <ResumeForm value={value} onChange={handleChange} />
        <button onClick={() => setValue({ ...value, skills: ['Go', 'Rust'] })}>Load skills</button>
        <button onClick={() => setValue({ ...value, skills: [] })}>Clear skills</button>
      </>
    );
  }
  render(<ControlledForm />);
  return {
    user: userEvent.setup(),
    input: screen.getByPlaceholderText('Skills (comma or newline separated)') as HTMLTextAreaElement,
    onChange,
  };
}

describe('skills entry', () => {
  it.each([
    { separator: ', ', keys: ', ', name: 'comma' },
    { separator: '\n', keys: '{Enter}', name: 'newline' },
  ])(
    'preserves a trailing $name and partial skills during character-by-character entry',
    async ({ separator, keys }) => {
      const { user, input, onChange } = renderControlledForm();
      await user.type(input, `TypeScript${keys}`);
      expect(input.value).toBe(`TypeScript${separator}`);
      expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ skills: ['TypeScript'] }));

      await user.type(input, 'Rea');
      expect(input.value).toBe(`TypeScript${separator}Rea`);
      await user.type(input, 'ct');
      expect(input.value).toBe(`TypeScript${separator}React`);
      expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ skills: ['TypeScript', 'React'] }));

      await user.type(screen.getByPlaceholderText('Full name'), 'Ada');
      expect(input.value).toBe(`TypeScript${separator}React`);
    },
  );

  it('keeps pasted text intact while parsing mixed separators, whitespace, and empty entries', async () => {
    const { user, input, onChange } = renderControlledForm();
    const text = '  TypeScript, , React\n\n CSS, ';
    await user.click(input);
    await user.paste(text);
    expect(input.value).toBe(text);
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ skills: ['TypeScript', 'React', 'CSS'] }));

    await user.clear(input);
    expect(input.value).toBe('');
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ skills: [] }));
  });

  it('synchronizes genuinely replaced or cleared skills from the parent', async () => {
    const { user, input } = renderControlledForm();
    await user.type(input, 'TypeScript, ');
    await user.click(screen.getByRole('button', { name: 'Load skills' }));
    expect(input.value).toBe('Go, Rust');
    await user.click(screen.getByRole('button', { name: 'Clear skills' }));
    expect(input.value).toBe('');
  });
});

describe('repeatable resume sections', () => {
  it('preserves newlines while entering multiple experience highlights', async () => {
    const { user, onChange } = renderControlledForm();
    await user.click(screen.getByRole('button', { name: '+ Add Experience' }));
    const input = screen.getByLabelText('Experience 1 highlights (one per line)') as HTMLTextAreaElement;
    await user.type(input, 'First achievement{Enter}');
    expect(input.value).toBe('First achievement\n');
    await user.type(input, 'Second achievement');
    expect(input.value).toBe('First achievement\nSecond achievement');
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        experience: [expect.objectContaining({ highlights: ['First achievement', 'Second achievement'] })],
      }),
    );
  });

  it('lets education start and end dates be typed independently without rewriting either', async () => {
    const { user, onChange } = renderControlledForm();
    await user.click(screen.getByRole('button', { name: '+ Add Education' }));
    await user.type(screen.getByLabelText('Education start date'), '2020-09');
    await user.type(screen.getByLabelText('Education end date'), '2024-06');
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        education: [expect.objectContaining({ start_date: '2020-09', end_date: '2024-06' })],
      }),
    );
    expect((screen.getByLabelText('Education start date') as HTMLInputElement).value).toBe('2020-09');
  });
});
