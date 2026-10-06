import { useEffect, useState } from 'react';

type Props = {
  value: string[];
  onChange: (value: string[]) => void;
  separator: 'skills' | 'lines';
  label: string;
  placeholder: string;
  rows: number;
};

function parse(text: string, separator: Props['separator']): string[] {
  return text
    .split(separator === 'skills' ? /[\n,]/ : /\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

// Keep the user's text, including unfinished separators, separate from parsed data.
export function ArrayTextInput({ value, onChange, separator, label, placeholder, rows }: Props) {
  const joiner = separator === 'skills' ? ', ' : '\n';
  const [text, setText] = useState(() => value.join(joiner));
  useEffect(() => {
    const parsed = parse(text, separator);
    if (parsed.length !== value.length || parsed.some((item, index) => item !== value[index])) {
      setText(value.join(joiner));
    }
  }, [value, text, separator, joiner]);

  return (
    <label className="form-field">
      <span>{label}</span>
      <textarea
        rows={rows}
        placeholder={placeholder}
        value={text}
        onChange={(event) => {
          const next = event.target.value;
          setText(next);
          onChange(parse(next, separator));
        }}
      />
    </label>
  );
}
