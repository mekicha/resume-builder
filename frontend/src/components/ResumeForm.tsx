import { ArrayTextInput } from './ArrayTextInput';
import type { CertificationItem, EducationItem, ExperienceItem, ResumeData } from '../types/resume';

type Props = {
  value: ResumeData;
  onChange: (next: ResumeData) => void;
};

export function ResumeForm({ value, onChange }: Props) {
  function updateExperience(index: number, patch: Partial<ExperienceItem>) {
    const next = value.experience.map((item, idx) => (idx === index ? { ...item, ...patch } : item));
    onChange({ ...value, experience: next });
  }

  function updateEducation(index: number, patch: Partial<EducationItem>) {
    const next = value.education.map((item, idx) => (idx === index ? { ...item, ...patch } : item));
    onChange({ ...value, education: next });
  }

  function updateCertification(index: number, patch: Partial<CertificationItem>) {
    const next = value.certifications.map((item, idx) => (idx === index ? { ...item, ...patch } : item));
    onChange({ ...value, certifications: next });
  }

  return (
    <section className="panel">
      <h2>Resume Details</h2>
      <div className="form-grid">
        <label className="form-field">
          <span>Full name</span>
          <input
            placeholder="Full name"
            value={value.basics.full_name}
            onChange={(e) => onChange({ ...value, basics: { ...value.basics, full_name: e.target.value } })}
          />
        </label>
        <label className="form-field">
          <span>Professional title</span>
          <input
            placeholder="Professional title"
            value={value.basics.title}
            onChange={(e) => onChange({ ...value, basics: { ...value.basics, title: e.target.value } })}
          />
        </label>
        <label className="form-field">
          <span>Email</span>
          <input
            type="email"
            placeholder="Email"
            value={value.basics.email}
            onChange={(e) => onChange({ ...value, basics: { ...value.basics, email: e.target.value } })}
          />
        </label>
        <label className="form-field">
          <span>Phone</span>
          <input
            type="tel"
            placeholder="Phone"
            value={value.basics.phone}
            onChange={(e) => onChange({ ...value, basics: { ...value.basics, phone: e.target.value } })}
          />
        </label>
        <label className="form-field">
          <span>Location</span>
          <input
            placeholder="Location"
            value={value.basics.location}
            onChange={(e) => onChange({ ...value, basics: { ...value.basics, location: e.target.value } })}
          />
        </label>
      </div>

      <label className="form-field">
        <span>Professional summary</span>
        <textarea
          rows={4}
          placeholder="Professional summary"
          value={value.summary}
          onChange={(e) => onChange({ ...value, summary: e.target.value })}
        />
      </label>

      <ArrayTextInput
        rows={3}
        label="Skills (comma or newline separated)"
        placeholder="Skills (comma or newline separated)"
        value={value.skills}
        separator="skills"
        onChange={(skills) => onChange({ ...value, skills })}
      />

      <div className="section-header">
        <h3>Experience</h3>
        <button
          type="button"
          onClick={() => onChange({ ...value, experience: [...value.experience, { ...defaultExperience }] })}
        >
          + Add Experience
        </button>
      </div>
      {value.experience.length === 0 && <p className="muted">No experience entries added yet.</p>}
      {value.experience.map((exp, index) => (
        <div className="repeatable-card" key={`exp-${index}`}>
          <div className="row-between">
            <strong>Experience #{index + 1}</strong>
            <button
              type="button"
              onClick={() =>
                onChange({
                  ...value,
                  experience: value.experience.filter((_, idx) => idx !== index),
                })
              }
            >
              Remove
            </button>
          </div>
          <div className="form-grid">
            <label className="form-field">
              <span>Company</span>
              <input
                placeholder="Company"
                value={exp.company}
                onChange={(e) => updateExperience(index, { company: e.target.value })}
              />
            </label>
            <label className="form-field">
              <span>Role</span>
              <input
                placeholder="Role"
                value={exp.role}
                onChange={(e) => updateExperience(index, { role: e.target.value })}
              />
            </label>
            <label className="form-field">
              <span>Start date</span>
              <input
                placeholder="Start date"
                value={exp.start_date}
                onChange={(e) => updateExperience(index, { start_date: e.target.value })}
              />
            </label>
            <label className="form-field">
              <span>End date</span>
              <input
                placeholder="End date"
                value={exp.end_date}
                onChange={(e) => updateExperience(index, { end_date: e.target.value })}
              />
            </label>
          </div>
          <ArrayTextInput
            rows={4}
            label={`Experience ${index + 1} highlights (one per line)`}
            placeholder="Highlights (one per line)"
            value={exp.highlights}
            separator="lines"
            onChange={(highlights) => updateExperience(index, { highlights })}
          />
        </div>
      ))}

      <div className="section-header">
        <h3>Education</h3>
        <button
          type="button"
          onClick={() => onChange({ ...value, education: [...value.education, { ...defaultEducation }] })}
        >
          + Add Education
        </button>
      </div>
      {value.education.map((edu, index) => (
        <div className="repeatable-card" key={`edu-${index}`}>
          <div className="row-between">
            <strong>Education #{index + 1}</strong>
            <button
              type="button"
              onClick={() => onChange({ ...value, education: value.education.filter((_, idx) => idx !== index) })}
            >
              Remove
            </button>
          </div>
          <div className="form-grid">
            <label className="form-field">
              <span>School</span>
              <input
                placeholder="School"
                value={edu.school}
                onChange={(e) => updateEducation(index, { school: e.target.value })}
              />
            </label>
            <label className="form-field">
              <span>Degree</span>
              <input
                placeholder="Degree"
                value={edu.degree}
                onChange={(e) => updateEducation(index, { degree: e.target.value })}
              />
            </label>
            <label className="form-field">
              <span>Field of study</span>
              <input
                placeholder="Field of study"
                value={edu.field_of_study}
                onChange={(e) => updateEducation(index, { field_of_study: e.target.value })}
              />
            </label>
            <label className="form-field">
              <span>Education start date</span>
              <input
                placeholder="Education start date"
                value={edu.start_date}
                onChange={(e) => updateEducation(index, { start_date: e.target.value })}
              />
            </label>
            <label className="form-field">
              <span>Education end date</span>
              <input
                placeholder="Education end date"
                value={edu.end_date}
                onChange={(e) => updateEducation(index, { end_date: e.target.value })}
              />
            </label>
          </div>
        </div>
      ))}

      <div className="section-header">
        <h3>Certifications</h3>
        <button
          type="button"
          onClick={() => onChange({ ...value, certifications: [...value.certifications, { ...defaultCertification }] })}
        >
          + Add Certification
        </button>
      </div>
      {value.certifications.map((cert, index) => (
        <div className="repeatable-card" key={`cert-${index}`}>
          <div className="row-between">
            <strong>Certification #{index + 1}</strong>
            <button
              type="button"
              onClick={() =>
                onChange({
                  ...value,
                  certifications: value.certifications.filter((_, idx) => idx !== index),
                })
              }
            >
              Remove
            </button>
          </div>
          <div className="form-grid">
            <label className="form-field">
              <span>Certification name</span>
              <input
                placeholder="Certification name"
                value={cert.name}
                onChange={(e) => updateCertification(index, { name: e.target.value })}
              />
            </label>
            <label className="form-field">
              <span>Issuer</span>
              <input
                placeholder="Issuer"
                value={cert.issuer}
                onChange={(e) => updateCertification(index, { issuer: e.target.value })}
              />
            </label>
            <label className="form-field">
              <span>Issue date</span>
              <input
                placeholder="Issue date"
                value={cert.issue_date}
                onChange={(e) => updateCertification(index, { issue_date: e.target.value })}
              />
            </label>
          </div>
        </div>
      ))}
    </section>
  );
}

const defaultExperience: ExperienceItem = {
  company: '',
  role: '',
  start_date: '',
  end_date: '',
  highlights: [],
};

const defaultEducation: EducationItem = {
  school: '',
  degree: '',
  field_of_study: '',
  start_date: '',
  end_date: '',
};

const defaultCertification: CertificationItem = {
  name: '',
  issuer: '',
  issue_date: '',
};
