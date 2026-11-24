import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import "./index.css";
import { APITester } from "./APITester";
import { TodoList } from "./TodoList";

const STATUSES = ["Saved", "Applied", "Interviewing", "Offer", "Rejected"] as const;
type Status = (typeof STATUSES)[number];

interface Job {
  id: string;
  company: string;
  role: string;
  status: Status;
  link: string;
  notes: string;
  added: string;
}

const STORAGE_KEY = "job-tracker:v1";

function loadJobs(): Job[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Job[]) : [];
  } catch {
    return [];
  }
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });

const styles = `
.jt {
  --jt-surface: #ffffff;
  --jt-ink: #17262e;
  --jt-muted: #5c6e77;
  --jt-line: #cfd9dd;
  --jt-accent: #0e5a64;
  --jt-accent-ink: #ffffff;
  --jt-saved: #8a98a0;
  --jt-applied: #2f6fa3;
  --jt-interviewing: #b7791f;
  --jt-offer: #2e7d4f;
  --jt-rejected: #a8483e;

  width: 100%;
  margin: 32px 0;
  text-align: left;
  color: var(--jt-ink);

  @media (prefers-color-scheme: dark) {
    --jt-surface: #1a252b;
    --jt-ink: #e6eef1;
    --jt-muted: #93a5ad;
    --jt-line: #2c3b43;
    --jt-accent: #4fb3bf;
    --jt-accent-ink: #0b1316;
  }

  input, select, button { font: inherit; color: inherit; }
  input, select {
    background: var(--jt-surface);
    border: 1px solid var(--jt-line);
    border-radius: 6px;
    padding: 9px 11px;
    min-width: 0;
  }
  :is(input, select, button, a):focus-visible {
    outline: 2px solid var(--jt-accent);
    outline-offset: 2px;
  }
  button { cursor: pointer; }

  .jt-top {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    gap: 16px;
    flex-wrap: wrap;
    margin-bottom: 20px;
  }
  .jt-top h2 { margin: 0; font-size: 1.8rem; }
  .jt-sub { margin: 4px 0 0; color: var(--jt-muted); }
  .jt-search { width: min(320px, 100%); }

  .jt-add {
    display: grid;
    grid-template-columns: 1fr 1fr 1.2fr 1.2fr auto auto;
    gap: 8px;
    padding: 14px;
    background: var(--jt-surface);
    border: 1px solid var(--jt-line);
    border-radius: 10px;
    margin-bottom: 28px;
  }
  .jt-primary {
    background: var(--jt-accent);
    color: var(--jt-accent-ink);
    border: 0;
    border-radius: 6px;
    padding: 9px 18px;
    font-weight: 600;
  }
  .jt-primary:hover { filter: brightness(1.1); }
  .jt-ghost {
    background: none;
    border: 0;
    padding: 0;
    color: var(--jt-muted);
    font-size: 0.8rem;
  }
  .jt-ghost:hover { color: var(--jt-rejected); text-decoration: underline; }

  .jt-board {
    display: grid;
    grid-template-columns: repeat(5, minmax(230px, 1fr));
    gap: 14px;
    overflow-x: auto;
    padding-bottom: 8px;
  }
  .jt-col { border-top: 4px solid var(--stage, var(--jt-saved)); padding-top: 10px; }
  .jt-saved { --stage: var(--jt-saved); }
  .jt-applied { --stage: var(--jt-applied); }
  .jt-interviewing { --stage: var(--jt-interviewing); }
  .jt-offer { --stage: var(--jt-offer); }
  .jt-rejected { --stage: var(--jt-rejected); }

  .jt-col h3 {
    margin: 0 0 10px;
    font-size: 1.05rem;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .jt-count {
    font-size: 0.78rem;
    font-weight: 600;
    color: var(--jt-muted);
    background: var(--jt-surface);
    border: 1px solid var(--jt-line);
    border-radius: 999px;
    padding: 1px 8px;
  }
  .jt-col ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .jt-empty { color: var(--jt-muted); font-size: 0.9rem; margin: 6px 0; }

  .jt-card {
    background: var(--jt-surface);
    border: 1px solid var(--jt-line);
    border-radius: 8px;
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .jt-card-head { display: flex; justify-content: space-between; gap: 8px; }
  .jt-role { margin: 0; }
  .jt-notes { margin: 0; color: var(--jt-muted); font-size: 0.88rem; }
  .jt-card-foot { display: flex; justify-content: space-between; font-size: 0.8rem; color: var(--jt-muted); }
  .jt-card-foot a { color: var(--jt-accent); }
  .jt-card select { font-size: 0.85rem; padding: 6px 8px; margin-top: 4px; }

  @media (max-width: 900px) {
    .jt-add { grid-template-columns: 1fr 1fr; }
    .jt-add .jt-primary { grid-column: span 2; }
  }
  @media (max-width: 520px) {
    .jt-add { grid-template-columns: 1fr; }
    .jt-add .jt-primary { grid-column: auto; }
  }
}
`;

function JobTracker() {
  const [jobs, setJobs] = useState<Job[]>(loadJobs);
  const [query, setQuery] = useState("");
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [link, setLink] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<Status>("Applied");

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(jobs));
    } catch {
      /* storage unavailable: keep working in memory */
    }
  }, [jobs]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return jobs;
    return jobs.filter((j) => `${j.company} ${j.role} ${j.notes}`.toLowerCase().includes(q));
  }, [jobs, query]);

  const active = jobs.filter((j) => j.status === "Applied" || j.status === "Interviewing").length;

  function addJob(e: FormEvent) {
    e.preventDefault();
    if (!company.trim() || !role.trim()) return;
    setJobs((prev) => [
      {
        id: crypto.randomUUID(),
        company: company.trim(),
        role: role.trim(),
        status,
        link: link.trim(),
        notes: notes.trim(),
        added: new Date().toISOString(),
      },
      ...prev,
    ]);
    setCompany("");
    setRole("");
    setLink("");
    setNotes("");
  }

  const moveJob = (id: string, next: Status) =>
    setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, status: next } : j)));

  const removeJob = (id: string) => setJobs((prev) => prev.filter((j) => j.id !== id));

  return (
    <section className="jt">
      <style>{styles}</style>

      <header className="jt-top">
        <div>
          <h2>Job tracker</h2>
          <p className="jt-sub">
            {jobs.length === 0
              ? "Add your first application below."
              : `${jobs.length} saved, ${active} in progress`}
          </p>
        </div>
        <input
          className="jt-search"
          type="search"
          placeholder="Search company, role or notes"
          aria-label="Search jobs"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </header>

      <form className="jt-add" onSubmit={addJob}>
        <input placeholder="Company" aria-label="Company" value={company} onChange={(e) => setCompany(e.target.value)} required />
        <input placeholder="Role" aria-label="Role" value={role} onChange={(e) => setRole(e.target.value)} required />
        <input placeholder="Job post link (optional)" aria-label="Job post link" type="url" value={link} onChange={(e) => setLink(e.target.value)} />
        <input placeholder="Notes (optional)" aria-label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
        <select aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value as Status)}>
          {STATUSES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <button type="submit" className="jt-primary">Add job</button>
      </form>

      <div className="jt-board">
        {STATUSES.map((s) => {
          const items = visible.filter((j) => j.status === s);
          return (
            <section key={s} className={`jt-col jt-${s.toLowerCase()}`} aria-label={s}>
              <h3>
                {s} <span className="jt-count">{items.length}</span>
              </h3>
              {items.length === 0 && <p className="jt-empty">Nothing here</p>}
              <ul>
                {items.map((j) => (
                  <li key={j.id} className="jt-card">
                    <div className="jt-card-head">
                      <strong>{j.company}</strong>
                      <button type="button" className="jt-ghost" onClick={() => removeJob(j.id)} aria-label={`Delete ${j.role} at ${j.company}`}>
                        Delete
                      </button>
                    </div>
                    <p className="jt-role">{j.role}</p>
                    {j.notes && <p className="jt-notes">{j.notes}</p>}
                    <div className="jt-card-foot">
                      <span>Added {formatDate(j.added)}</span>
                      {j.link && (
                        <a href={j.link} target="_blank" rel="noreferrer">
                          View post
                        </a>
                      )}
                    </div>
                    <select aria-label={`Move ${j.company} to another stage`} value={j.status} onChange={(e) => moveJob(j.id, e.target.value as Status)}>
                      {STATUSES.map((opt) => (
                        <option key={opt}>{opt}</option>
                      ))}
                    </select>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </section>
  );
}

export function App() {
  return (
    <div className="app">
      <h1>Welcome to my first Bun app!</h1>
      <JobTracker />
      <TodoList />
      <APITester />
    </div>
  );
}

export default App;

