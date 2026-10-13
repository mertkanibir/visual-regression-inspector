import { useCallback, useEffect, useState } from 'react';
import {
  Triangle,
  Plus,
  Layers3,
  History,
  Bookmark,
  ArrowUpRight,
  ChevronRight,
  Code2,
  CheckCircle2,
  Scan,
  Clock3,
  CircleAlert,
  X,
  Monitor,
  TerminalSquare,
  Zap,
  ArrowRight,
} from 'lucide-react';
import RunForm from './RunForm';
import ComparisonViewer from './ComparisonViewer';
import { api, artifact, type Baseline, type Job } from './types';
type Page = 'workspace' | 'history' | 'baselines' | 'guide';
export default function App() {
  const [page, setPage] = useState<Page>('workspace');
  const [jobs, setJobs] = useState<Job[]>([]);
  const [baselines, setBaselines] = useState<Baseline[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [showForm, setShowForm] = useState(true);
  const [baselineId, setBaselineId] = useState('');
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [online, setOnline] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [filter, setFilter] = useState('all');
  const selected = jobs.find((job) => job.id === selectedId);
  const completed = jobs.filter((job) => job.status === 'complete');
  const changed = completed.filter((job) => !job.result?.passed);
  const busy = jobs.filter((job) => ['running', 'queued'].includes(job.status));
  const refresh = useCallback(async () => {
    try {
      const data = await api<{ jobs: Job[]; baselines: Baseline[] }>('/api/jobs');
      setJobs(data.jobs);
      setBaselines(data.baselines);
      setOnline(true);
      setError('');
    } catch (issue) {
      setOnline(false);
      setError(issue instanceof Error ? issue.message : 'Cannot connect to the server.');
    }
  }, []);
  useEffect(() => {
    void refresh();
    const timer = setInterval(() => {
      void refresh();
    }, 1600);
    return () => clearInterval(timer);
  }, [refresh]);
  useEffect(() => {
    if (!selectedId && jobs.length) {
      setSelectedId(jobs[0].id);
      setShowForm(false);
    }
  }, [jobs, selectedId]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(''), 5000);
    return () => clearTimeout(timer);
  }, [toast]);
  function openJob(job: Job) {
    setSelectedId(job.id);
    setShowForm(false);
    setPage('workspace');
  }
  function newComparison() {
    setBaselineId('');
    setShowForm(true);
    setPage('workspace');
  }
  function created(job: Job) {
    setJobs((previous) => [job, ...previous]);
    setSelectedId(job.id);
    setShowForm(false);
    setPage('workspace');
  }
  function useBaseline(baseline: Baseline) {
    setBaselineId(baseline.id);
    setShowForm(true);
    setPage('workspace');
  }
  async function accept() {
    if (!selected) return;
    setAccepting(true);
    try {
      await api<Baseline>(`/api/jobs/${selected.id}/accept`, {});
      await refresh();
      setToast('Candidate saved as an immutable baseline. Find it in Baselines.');
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : 'Could not save baseline.');
    } finally {
      setAccepting(false);
    }
  }
  const history = jobs.filter(
    (job) =>
      filter === 'all' ||
      (filter === 'changed' && job.status === 'complete' && !job.result?.passed) ||
      (filter === 'passed' && job.result?.passed) ||
      (filter === 'errors' && job.status === 'error'),
  );
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a
          className="brand"
          href="#"
          onClick={(event) => {
            event.preventDefault();
            setPage('workspace');
          }}
        >
          <span className="brand-symbol">
            <Triangle size={23} strokeWidth={2.3} />
          </span>
          <span>
            prism<span className="brand-caption">VISUAL INSPECTOR</span>
          </span>
        </a>
        <div className="workspace-label">
          <span className="workspace-avatar">MK</span>
          <div>
            Local workspace<small>Personal / Development</small>
          </div>
        </div>
        <div className="nav-heading">WORKSPACE</div>
        <nav aria-label="Main navigation">
          {[
            { id: 'workspace', name: 'Compare', icon: Layers3 },
            { id: 'history', name: 'Run history', icon: History },
            { id: 'baselines', name: 'Baselines', icon: Bookmark },
          ].map((item) => (
            <button
              key={item.id}
              aria-label={item.name}
              className={page === item.id ? 'nav-active' : ''}
              onClick={() => setPage(item.id as Page)}
            >
              <item.icon size={18} />
              <span>{item.name}</span>
              {item.id === 'history' && jobs.length ? (
                <span className="nav-count">{jobs.length}</span>
              ) : item.id === 'baselines' && baselines.length ? (
                <span className="nav-count">{baselines.length}</span>
              ) : null}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="engine-card">
            <span className={`engine-light ${online ? 'online' : ''}`} />
            <strong>{online ? 'Local server connected' : 'Connecting to server'}</strong>
            <p>
              Chromium · pixelmatch
              <br />
              Everything stays on this machine.
            </p>
          </div>
          <button className="guide-link" onClick={() => setPage('guide')}>
            <TerminalSquare size={17} />
            How it works
            <ArrowUpRight size={15} />
          </button>
          <a
            className="github-link"
            href="https://github.com/mertkanibir/visual-regression-inspector"
            target="_blank"
            rel="noreferrer"
          >
            <Code2 size={17} /> View source <ArrowUpRight size={14} />
          </a>
          <div className="sidebar-version">
            PRISM 1.0 <span>LOCAL FIRST</span>
          </div>
        </div>
      </aside>
      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumb">
            Workspace <ChevronRight size={13} />
            <span>
              {page === 'workspace'
                ? 'Compare'
                : page === 'history'
                  ? 'Run history'
                  : page === 'baselines'
                    ? 'Baselines'
                    : 'How it works'}
            </span>
          </div>
          <span className="local-badge">
            <i /> Local session
          </span>
        </header>
        <div className="page-content">
          <div className="page-heading">
            <div>
              <div className="eyebrow">SEE WHAT CHANGED</div>
              <h1>
                {page === 'workspace'
                  ? 'Small changes. Full clarity.'
                  : page === 'history'
                    ? 'Every run, on record.'
                    : page === 'baselines'
                      ? 'A reference you can trust.'
                      : 'From browser to evidence.'}
              </h1>
              <p>
                {page === 'workspace'
                  ? 'Capture, compare, and catch visual regressions before they ship.'
                  : page === 'history'
                    ? 'Your comparisons and their artifacts, saved between sessions.'
                    : page === 'baselines'
                      ? 'Accepted screenshots stay fixed while your application evolves.'
                      : 'A focused local workbench for real visual regression testing.'}
              </p>
            </div>
            <button className="primary-button" onClick={newComparison}>
              <Plus size={17} /> New comparison
            </button>
          </div>
          {error ? (
            <div className="error-banner" role="alert">
              <CircleAlert size={18} />
              <span>{error}</span>
              <button
                className="icon-button"
                onClick={() => setError('')}
                aria-label="Dismiss error"
              >
                <X size={16} />
              </button>
            </div>
          ) : null}
          {toast ? (
            <div className="toast" role="status">
              <CheckCircle2 size={18} />
              {toast}
            </div>
          ) : null}
          {page === 'workspace' || page === 'history' ? (
            <div className="summary-strip">
              <Summary label="Total comparisons" value={jobs.length} icon={<Layers3 size={18} />} />
              <Summary
                label="Changes detected"
                value={changed.length}
                icon={<Scan size={18} />}
                accent="pink"
              />
              <Summary
                label="Within tolerance"
                value={completed.length - changed.length}
                icon={<CheckCircle2 size={18} />}
                accent="green"
              />
              <Summary
                label="In progress"
                value={busy.length}
                icon={<Clock3 size={18} />}
                accent="purple"
              />
            </div>
          ) : null}
          {page === 'workspace' ? (
            <>
              {showForm ? (
                <RunForm
                  key={baselineId}
                  baselines={baselines}
                  initialBaseline={baselineId}
                  onCreated={created}
                  onClose={() => setShowForm(false)}
                />
              ) : null}
              {selected?.status === 'complete' ? (
                <ComparisonViewer
                  key={selected.id}
                  job={selected}
                  onAccept={accept}
                  accepting={accepting}
                />
              ) : selected?.status === 'running' || selected?.status === 'queued' ? (
                <div className="progress-panel" role="status">
                  <div className="capture-animation">
                    <Monitor size={32} />
                    <span />
                  </div>
                  <span className="step-label">REAL BROWSER CAPTURE</span>
                  <h2>
                    {selected.status === 'queued'
                      ? 'Your comparison is in the queue.'
                      : 'Getting the full picture.'}
                  </h2>
                  <p>
                    {selected.status === 'queued'
                      ? 'Up to two comparisons run at once. Yours will start shortly.'
                      : 'Opening isolated Chromium sessions, waiting for fonts and images, then comparing every pixel.'}
                  </p>
                  <div className="progress-steps">
                    <span>01 Capture</span>
                    <ChevronRight size={15} />
                    <span>02 Compare</span>
                    <ChevronRight size={15} />
                    <span>03 Report</span>
                  </div>
                  <small>
                    {selected.name} · {selected.viewport.width} × {selected.viewport.height}
                  </small>
                </div>
              ) : selected?.status === 'error' ? (
                <div className="empty-panel">
                  <CircleAlert size={32} className="red-text" />
                  <h2>Comparison couldn’t finish.</h2>
                  <p>{selected.error}</p>
                  <button className="primary-button" onClick={newComparison}>
                    Try a new comparison
                    <ArrowRight size={16} />
                  </button>
                </div>
              ) : !showForm ? (
                <div className="empty-panel">
                  <div className="empty-prism">
                    <Triangle size={37} />
                  </div>
                  <h2>Your next release, in focus.</h2>
                  <p>
                    Compare two web pages or PNGs. Start with the included Orbit demo to see a real
                    visual regression in action.
                  </p>
                  <button className="primary-button" onClick={newComparison}>
                    Set up a comparison
                    <ArrowRight size={16} />
                  </button>
                </div>
              ) : (
                <div className="demo-note">
                  <div className="demo-icon">
                    <Zap size={20} />
                  </div>
                  <div>
                    <strong>A real demo. A deliberate regression.</strong>
                    <p>
                      The included Orbit page changes its heading, button, and chart. Run the
                      comparison above to inspect the evidence.
                    </p>
                  </div>
                  <a href="/demo/baseline" target="_blank" rel="noreferrer">
                    Preview baseline
                    <ArrowUpRight size={15} />
                  </a>
                </div>
              )}
              {jobs.length ? (
                <section className="recent-section">
                  <div className="section-header">
                    <h2>Recent comparisons</h2>
                    <button className="text-button" onClick={() => setPage('history')}>
                      View all
                      <ArrowRight size={15} />
                    </button>
                  </div>
                  <JobTable jobs={jobs.slice(0, 4)} selectedId={selectedId} onSelect={openJob} />
                </section>
              ) : null}
            </>
          ) : null}
          {page === 'history' ? (
            <section className="history-panel">
              <div className="section-header">
                <h2>
                  Comparison history <span className="muted">/ {jobs.length}</span>
                </h2>
                <div className="history-filters">
                  {[
                    ['all', 'All runs'],
                    ['changed', 'Changed'],
                    ['passed', 'Passed'],
                    ['errors', 'Errors'],
                  ].map(([value, label]) => (
                    <button
                      key={value}
                      className={filter === value ? 'active' : ''}
                      onClick={() => setFilter(value)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              {history.length ? (
                <JobTable jobs={history} selectedId={selectedId} onSelect={openJob} />
              ) : (
                <div className="compact-empty">
                  <History size={28} />
                  <p>No comparisons here yet.</p>
                </div>
              )}
            </section>
          ) : null}
          {page === 'baselines' ? (
            <div className="baseline-grid">
              {baselines.length ? (
                baselines.map((baseline) => (
                  <article className="baseline-card" key={baseline.id}>
                    <div className="baseline-image">
                      <img
                        src={artifact(baseline.id, 'baseline')}
                        alt={`Accepted screenshot for ${baseline.name}`}
                      />
                    </div>
                    <div className="baseline-details">
                      <span className="status-pill pass">
                        <Bookmark size={13} />
                        Accepted reference
                      </span>
                      <h2>{baseline.name}</h2>
                      <p title={baseline.sourceUrl}>{baseline.sourceUrl}</p>
                      <div>
                        <span>
                          {baseline.viewport.width} × {baseline.viewport.height}
                        </span>
                        <span>{new Date(baseline.createdAt).toLocaleDateString()}</span>
                      </div>
                      <button className="secondary-button" onClick={() => useBaseline(baseline)}>
                        Use this baseline
                        <ArrowRight size={15} />
                      </button>
                    </div>
                  </article>
                ))
              ) : (
                <div className="empty-panel">
                  <Bookmark size={32} />
                  <h2>Make the right changes official.</h2>
                  <p>
                    After reviewing a completed comparison, accept the candidate. Prism saves an
                    immutable screenshot for future runs.
                  </p>
                  <button className="primary-button" onClick={newComparison}>
                    Start a comparison
                    <ArrowRight size={16} />
                  </button>
                </div>
              )}
            </div>
          ) : null}
          {page === 'guide' ? (
            <div className="guide-panel">
              <div className="guide-flow">
                {[
                  {
                    n: '01',
                    title: 'Capture in Chromium',
                    text: 'Each URL opens in an isolated browser context. Prism fixes the viewport, locale, time zone, and device scale. It waits for fonts and images and disables animations.',
                  },
                  {
                    n: '02',
                    title: 'Compare every pixel',
                    text: 'Pixelmatch compares equally sized PNGs with 0.1 perceptual sensitivity. Antialiasing edges are ignored. Your allowed-change percentage determines pass or fail.',
                  },
                  {
                    n: '03',
                    title: 'Review and decide',
                    text: 'Side-by-side, difference, overlay, and swipe views help you inspect changes. Accepting a candidate saves a new fixed reference without rewriting old reports.',
                  },
                ].map((item) => (
                  <article key={item.n}>
                    <span>{item.n}</span>
                    <h2>{item.title}</h2>
                    <p>{item.text}</p>
                  </article>
                ))}
              </div>
              <div className="guide-detail">
                <h2>Designed for local development</h2>
                <p>
                  URLs can reach your machine and local services. Capture trusted pages only. Prism
                  binds to loopback and has no shared-user authentication. Deploying it publicly
                  requires network isolation, authentication, destination restrictions, and storage
                  controls.
                </p>
                <h2>Keep comparisons stable</h2>
                <p>
                  Dynamic timestamps, random content, delayed widgets, and platform font differences
                  can change screenshots. Use deterministic fixtures, identical capture
                  environments, and review the actual image before accepting a baseline.
                </p>
                <code>
                  npm ci
                  <br />
                  npx playwright install chromium
                  <br />
                  npm run dev
                </code>
                <p>
                  Data and PNG artifacts live in <code>.prism/</code> on this machine. They are
                  excluded from Git. Stop the server before backing up or deleting this directory.
                </p>
              </div>
            </div>
          ) : null}
          <footer className="main-footer">
            <span>
              <Triangle size={12} /> Built for changes worth seeing.
            </span>
            <span>Real captures. Reproducible evidence.</span>
          </footer>
        </div>
      </main>
    </div>
  );
}
function Summary({
  label,
  value,
  icon,
  accent = '',
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  accent?: string;
}) {
  return (
    <div className="summary-card">
      <div className={`summary-icon ${accent}`}>{icon}</div>
      <div>
        <span>{label}</span>
        <strong>{value.toString().padStart(2, '0')}</strong>
      </div>
    </div>
  );
}
function JobTable({
  jobs,
  selectedId,
  onSelect,
}: {
  jobs: Job[];
  selectedId: string;
  onSelect: (job: Job) => void;
}) {
  return (
    <div className="job-table" role="table" aria-label="Comparison runs">
      <div className="job-table-head" role="row">
        <span role="columnheader">COMPARISON</span>
        <span role="columnheader">VIEWPORT</span>
        <span role="columnheader">PIXEL CHANGE</span>
        <span role="columnheader">STATUS</span>
        <span role="columnheader">CREATED</span>
      </div>
      {jobs.map((job) => (
        <div
          className={`job-row ${selectedId === job.id ? 'row-selected' : ''}`}
          key={job.id}
          onClick={() => onSelect(job)}
          role="row"
        >
          <span role="cell">
            <button
              className="job-name job-open-button"
              aria-label={`Open ${job.name}`}
              onClick={(event) => {
                event.stopPropagation();
                onSelect(job);
              }}
            >
              <span className="job-mini-icon">
                {job.mode === 'upload' ? <Layers3 size={17} /> : <Monitor size={17} />}
              </span>
              <span>
                <strong>{job.name}</strong>
                <small>
                  {job.mode === 'upload'
                    ? 'PNG comparison'
                    : (() => {
                        try {
                          return new URL(job.candidateUrl!).hostname;
                        } catch {
                          return job.candidateUrl;
                        }
                      })()}
                </small>
              </span>
            </button>
          </span>
          <span role="cell">
            {job.viewport.width} × {job.viewport.height}
          </span>
          <span role="cell" className={job.result && !job.result.passed ? 'red-text' : ''}>
            {job.result ? `${job.result.changedPercent.toFixed(3)}%` : '—'}
          </span>
          <span role="cell">
            <span
              className={`status-pill ${job.status === 'complete' ? (job.result?.passed ? 'pass' : 'changed') : job.status === 'error' ? 'changed' : 'pending'}`}
            >
              <i />
              {job.status === 'complete'
                ? job.result?.passed
                  ? 'Passed'
                  : 'Changed'
                : job.status === 'error'
                  ? 'Error'
                  : job.status === 'running'
                    ? 'Running'
                    : 'Queued'}
            </span>
          </span>
          <span role="cell" className="row-time">
            {new Date(job.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            <ChevronRight size={15} />
          </span>
        </div>
      ))}
    </div>
  );
}
