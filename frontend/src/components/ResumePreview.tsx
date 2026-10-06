import type { ResumeData } from '../types/resume';

type Props = {
  data: ResumeData;
};

export function ResumePreview({ data }: Props) {
  return (
    <section className="panel sticky-preview">
      <h2>Live Preview ({data.template_id})</h2>
      <article className={`preview ${data.template_id}`}>
        <h1>{data.basics.full_name || 'Your Name'}</h1>
        <p className="subhead">
          {[data.basics.title, data.basics.location, data.basics.email, data.basics.phone].filter(Boolean).join(' | ')}
        </p>

        <h3>Summary</h3>
        <p className="summary-text">{data.summary || 'Your summary will appear here.'}</p>

        <h3>Skills</h3>
        <p>{data.skills.length ? data.skills.join(', ') : 'Add skills to preview them here.'}</p>

        <h3>Experience</h3>
        {data.experience.length ? (
          data.experience.map((exp, idx) => (
            <div key={`exp-${idx}`} className="preview-block">
              <strong>
                {exp.role} {exp.company ? `— ${exp.company}` : ''}
              </strong>
              <div className="muted">
                {exp.start_date} {exp.end_date ? `- ${exp.end_date}` : ''}
              </div>
              <ul>
                {exp.highlights.map((h, i) => (
                  <li key={`${h}-${i}`}>{h}</li>
                ))}
              </ul>
            </div>
          ))
        ) : (
          <p className="muted">Add experience to preview it here.</p>
        )}

        <h3>Education</h3>
        {data.education.length ? (
          data.education.map((edu, idx) => (
            <p key={`edu-${idx}`} className="preview-block">
              <strong>{edu.degree}</strong> {edu.field_of_study ? `in ${edu.field_of_study}` : ''} — {edu.school}
              <br />
              <span className="muted">
                {edu.start_date} {edu.end_date ? `- ${edu.end_date}` : ''}
              </span>
            </p>
          ))
        ) : (
          <p className="muted">Add education to preview it here.</p>
        )}

        <h3>Certifications</h3>
        {data.certifications.length ? (
          data.certifications.map((cert, idx) => (
            <p key={`cert-${idx}`} className="preview-block">
              <strong>{cert.name}</strong> — {cert.issuer} {cert.issue_date ? `(${cert.issue_date})` : ''}
            </p>
          ))
        ) : (
          <p className="muted">Add certifications to preview them here.</p>
        )}
      </article>
    </section>
  );
}
