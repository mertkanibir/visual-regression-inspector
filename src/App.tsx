import { useCallback, useEffect, useState } from 'react';
import {
  Plus,
  Layers3,
  History,
  Bookmark,
  ArrowUpRight,
  ChevronRight,
  CheckCircle2,
  CircleAlert,
  X,
  Monitor,
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
  const pageTitle =
    page === 'workspace'
      ? 'Visual comparisons'
      : page === 'history'
        ? 'Run history'
        : page === 'baselines'
          ? 'Saved baselines'
          : 'Capture settings';
  return (
    <div className="app-shell">
      <header className="app-toolbar">
        <a
          className="brand"
          href="#"
          onClick={(event) => {
            event.preventDefault();
            setPage('workspace');
          }}
        >
          Prism
        </a>
        <nav aria-label="Main navigation">
          {[
            { id: 'workspace', name: 'Compare', label: 'Compare' },
            { id: 'history', name: 'Runs', label: 'Run history' },
            { id: 'baselines', name: 'Baselines', label: 'Baselines' },
            { id: 'guide', name: 'Help', label: 'Help' },
          ].map((item) => (
            <button
              key={item.id}
              aria-label={item.label}
              aria-current={page === item.id ? 'page' : undefined}
              className={page === item.id ? 'nav-active' : ''}
              onClick={() => setPage(item.id as Page)}
            >
              {item.name}
              {item.id === 'history' ? (
                <span className="nav-count">{jobs.length}</span>
              ) : item.id === 'baselines' ? (
                <span className="nav-count">{baselines.length}</span>
              ) : null}
            </button>
          ))}
        </nav>
        <div className="toolbar-status">
          <span className={`connection-dot ${online ? 'online' : ''}`} />
          {online ? 'Local server connected' : 'Connecting to server'}
        </div>
        <a
          className="source-link"
          href="https://github.com/mertkanibir/visual-regression-inspector"
          target="_blank"
          rel="noreferrer"
        >
          Source
          <ArrowUpRight size={13} />
        </a>
      </header>
      <main className="main-content">
        <div className="page-heading">
          <h1>{pageTitle}</h1>
          <button className="primary-button" onClick={newComparison}>
            <Plus size={15} />
            New comparison
          </button>
        </div>
        {error ? (
          <div className="error-banner" role="alert">
            <CircleAlert size={16} />
            <span>{error}</span>
            <button className="icon-button" onClick={() => setError('')} aria-label="Dismiss error">
              <X size={15} />
            </button>
          </div>
        ) : null}
        {toast ? (
          <div className="toast" role="status">
            <CheckCircle2 size={16} />
            {toast}
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
              <section className="progress-panel" role="status">
                <h2>
                  {selected.status === 'queued'
                    ? 'Comparison queued'
                    : selected.mode === 'upload'
                      ? 'Comparing PNGs'
                      : 'Capturing web pages'}
                </h2>
                <p>
                  {selected.status === 'queued'
                    ? 'Waiting for a worker. Up to two comparisons run at once.'
                    : selected.mode === 'upload'
                      ? 'Decoding images and comparing pixels.'
                      : 'Loading the baseline and candidate in Chromium; waiting for fonts and images.'}
                </p>
                <code>
                  {selected.name} · {selected.viewport.width} × {selected.viewport.height} ·{' '}
                  {selected.id.slice(0, 8)}
                </code>
              </section>
            ) : selected?.status === 'error' ? (
              <section className="empty-panel">
                <h2>Comparison failed</h2>
                <p>{selected.error}</p>
                <button className="secondary-button" onClick={newComparison}>
                  New comparison
                </button>
              </section>
            ) : !showForm ? (
              <section className="empty-panel">
                <h2>No comparison selected</h2>
                <p>Create a comparison from two URLs or matching PNG files.</p>
                <button className="secondary-button" onClick={newComparison}>
                  Capture settings
                  <ArrowRight size={14} />
                </button>
              </section>
            ) : (
              <div className="demo-note">
                <p>
                  The demo changes form alignment, button styling, and build-row spacing. Use the
                  default URLs to inspect the difference.
                </p>
                <a href="/demo/baseline" target="_blank" rel="noreferrer">
                  Open baseline
                  <ArrowUpRight size={13} />
                </a>
              </div>
            )}
            {jobs.length ? (
              <section className="recent-section">
                <div className="section-header">
                  <h2>Recent runs</h2>
                  <button className="text-button" onClick={() => setPage('history')}>
                    All runs
                    <ArrowRight size={14} />
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
              <p className="history-counts">
                {jobs.length} runs <span>·</span> {changed.length} changed <span>·</span>{' '}
                {completed.length - changed.length} passed <span>·</span> {busy.length} pending
              </p>
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
                    aria-pressed={filter === value}
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
                <History size={20} />
                <p>No runs match this filter.</p>
              </div>
            )}
          </section>
        ) : null}
        {page === 'baselines' ? (
          <div className="baseline-list">
            {baselines.length ? (
              baselines.map((baseline) => (
                <article className="baseline-row" key={baseline.id}>
                  <div className="baseline-image">
                    <img
                      src={artifact(baseline.id, 'baseline')}
                      alt={`Accepted image for ${baseline.name}`}
                    />
                  </div>
                  <div className="baseline-details">
                    <h2>{baseline.name}</h2>
                    <p title={baseline.sourceUrl}>{baseline.sourceUrl}</p>
                    <div>
                      <code>
                        {baseline.viewport.width} × {baseline.viewport.height}
                      </code>
                      <span>{new Date(baseline.createdAt).toLocaleString()}</span>
                    </div>
                    <p className="baseline-id">Reference {baseline.id.slice(0, 8)}</p>
                    <button className="secondary-button" onClick={() => useBaseline(baseline)}>
                      Use this baseline
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </article>
              ))
            ) : (
              <section className="empty-panel">
                <h2>No saved baselines</h2>
                <p>
                  Accept a completed candidate to save a fixed reference for future comparisons.
                </p>
                <button className="secondary-button" onClick={newComparison}>
                  New comparison
                </button>
              </section>
            )}
          </div>
        ) : null}
        {page === 'guide' ? (
          <div className="guide-panel">
            <section>
              <h2>Capture environment</h2>
              <p>
                HTTP(S) pages open in isolated Chromium contexts. Captures use device scale 1, light
                mode, locale en-US, and time zone UTC. Fonts and images receive bounded readiness
                waits. Animations and transitions are disabled. Screenshots cover the selected
                viewport.
              </p>
              <h2>Comparison thresholds</h2>
              <p>
                Pixelmatch uses a fixed 0.1 perceptual sensitivity and ignores detected antialiasing
                edges. Allowed change is the percentage of changed pixels permitted before a run
                fails. The decision uses the unrounded percentage.
              </p>
              <h2>Baselines</h2>
              <p>
                Accept candidate saves an immutable PNG reference. The original report stays intact.
                Future captures against that reference use its dimensions.
              </p>
            </section>
            <section>
              <h2>Local development</h2>
              <p>
                Prism binds to loopback. URLs can reach local services: capture trusted pages only.
                Public hosting requires authentication, destination restrictions, network isolation,
                quotas, and private artifact storage.
              </p>
              <h2>Reproducible input</h2>
              <p>
                Dynamic timestamps, random content, slow widgets, and platform fonts can change
                screenshots. Use deterministic fixtures and identical capture environments.
              </p>
              <pre>
                npm ci{'\n'}npx playwright install chromium{'\n'}npm run dev
              </pre>
              <p>
                History and PNGs live in <code>.prism/</code>. Stop the server before backing up or
                deleting this directory.
              </p>
            </section>
          </div>
        ) : null}
      </main>
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
