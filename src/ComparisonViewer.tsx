import { useState } from 'react';
import {
  Columns2,
  Blend,
  Scan,
  SlidersHorizontal,
  Download,
  Check,
  ArrowUpRight,
  ShieldCheck,
} from 'lucide-react';
import { artifact, type Job } from './types';
interface Props {
  job: Job;
  onAccept: () => void;
  accepting: boolean;
}
type View = 'split' | 'diff' | 'overlay' | 'swipe';
export default function ComparisonViewer({ job, onAccept, accepting }: Props) {
  const [view, setView] = useState<View>('split');
  const [blend, setBlend] = useState(50);
  const [zoom, setZoom] = useState('fit');
  const result = job.result!;
  const options = [
    { id: 'split', label: 'Side by side', icon: Columns2 },
    { id: 'diff', label: 'Difference', icon: Scan },
    { id: 'overlay', label: 'Overlay', icon: Blend },
    { id: 'swipe', label: 'Swipe', icon: SlidersHorizontal },
  ] as const;
  const baselineImage = artifact(job.id, 'baseline');
  const candidateImage = artifact(job.id, 'candidate');
  return (
    <section className="review-panel" aria-label="Visual comparison report" data-job-id={job.id}>
      <div className="review-heading">
        <div>
          <span className="step-label">02 / INSPECT</span>
          <h2>{job.name}</h2>
          <p>
            {job.viewport.width} × {job.viewport.height} · Chromium ·{' '}
            {new Date(job.createdAt).toLocaleString(undefined, {
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            })}
          </p>
        </div>
        <span className={`status-pill ${result.passed ? 'pass' : 'changed'}`}>
          {result.passed ? <ShieldCheck size={14} /> : <Scan size={14} />}
          {result.passed ? 'Within tolerance' : 'Changes detected'}
        </span>
      </div>
      <div className="report-metrics">
        <div>
          <span>Changed pixels</span>
          <strong className={result.passed ? 'green-text' : 'red-text'}>
            {result.changedPercent.toFixed(3)}
            <small>%</small>
          </strong>
        </div>
        <div>
          <span>Pixels affected</span>
          <strong>
            {result.changedPixels.toLocaleString()}
            <small> / {result.totalPixels.toLocaleString()}</small>
          </strong>
        </div>
        <div>
          <span>Allowed change</span>
          <strong>
            {job.allowedPercent}
            <small>%</small>
          </strong>
        </div>
        <div>
          <span>Capture + compare</span>
          <strong>
            {((job.durationMs || 0) / 1000).toFixed(1)}
            <small>s</small>
          </strong>
        </div>
      </div>
      <div className="viewer-toolbar">
        <div
          className="view-tabs"
          role="tablist"
          aria-label="Image view"
          onKeyDown={(event) => {
            const keys = ['ArrowLeft', 'ArrowRight', 'Home', 'End'];
            if (!keys.includes(event.key)) return;
            event.preventDefault();
            const current = options.findIndex((item) => item.id === view);
            const next =
              event.key === 'Home'
                ? 0
                : event.key === 'End'
                  ? options.length - 1
                  : (current + (event.key === 'ArrowRight' ? 1 : -1) + options.length) %
                    options.length;
            setView(options[next].id);
            document.getElementById(`view-${options[next].id}`)?.focus();
          }}
        >
          {options.map((option) => (
            <button
              key={option.id}
              role="tab"
              tabIndex={view === option.id ? 0 : -1}
              id={`view-${option.id}`}
              aria-controls="image-view"
              aria-selected={view === option.id}
              className={view === option.id ? 'selected' : ''}
              onClick={() => setView(option.id)}
            >
              <option.icon size={15} />
              <span>{option.label}</span>
            </button>
          ))}
        </div>
        <label className="zoom-label">
          Zoom
          <select
            aria-label="Image zoom"
            value={zoom}
            onChange={(event) => setZoom(event.target.value)}
          >
            <option value="fit">Fit</option>
            <option value="100">100%</option>
          </select>
        </label>
      </div>
      <div
        className={`image-workbench ${view} ${zoom === '100' ? 'actual-size' : ''}`}
        id="image-view"
        role="tabpanel"
        aria-labelledby={`view-${view}`}
        aria-label={`${options.find((item) => item.id === view)?.label} images`}
      >
        {view === 'split' ? (
          <div className="split-images">
            <figure>
              <figcaption>
                <i className="source-dot baseline-dot" /> BASELINE <span>Reference</span>
              </figcaption>
              <img
                src={baselineImage}
                alt="Baseline browser screenshot"
                style={zoom === '100' ? { width: result.width } : undefined}
              />
            </figure>
            <figure>
              <figcaption>
                <i className="source-dot candidate-dot" /> CANDIDATE <span>Current</span>
              </figcaption>
              <img
                src={candidateImage}
                alt="Candidate browser screenshot"
                style={zoom === '100' ? { width: result.width } : undefined}
              />
            </figure>
          </div>
        ) : view === 'diff' ? (
          <figure className="single-image">
            <figcaption>
              <span>
                <i className="source-dot difference-dot" /> PIXEL DIFFERENCE
              </span>
              <span>Pink pixels changed · yellow edges ignored</span>
            </figcaption>
            <img
              src={artifact(job.id, 'diff')}
              alt="Difference map: changed pixels in pink, ignored antialiasing edges in yellow"
              style={zoom === '100' ? { width: result.width } : undefined}
            />
          </figure>
        ) : (
          <div className="blend-wrapper">
            <div className="blend-labels">
              <span>BASELINE</span>
              <span>CANDIDATE</span>
            </div>
            <div
              className="blend-images"
              style={zoom === '100' ? { width: result.width } : undefined}
            >
              <img
                className="blend-base"
                src={baselineImage}
                alt="Baseline screenshot behind candidate"
              />
              <img
                className="blend-top"
                src={candidateImage}
                alt="Candidate screenshot overlay"
                style={
                  view === 'overlay'
                    ? { opacity: blend / 100 }
                    : { clipPath: `inset(0 0 0 ${blend}%)` }
                }
              />
              {view === 'swipe' ? (
                <div className="swipe-line" style={{ left: `${blend}%` }}>
                  <span>↔</span>
                </div>
              ) : null}
            </div>
            <label className="blend-control">
              {view === 'overlay' ? 'Candidate opacity' : 'Comparison divider'}
              <input
                aria-label={view === 'overlay' ? 'Candidate opacity' : 'Comparison divider'}
                type="range"
                min={0}
                max={100}
                value={blend}
                onChange={(event) => setBlend(Number(event.target.value))}
              />
              <span>{blend}%</span>
            </label>
          </div>
        )}
      </div>
      <div className="review-footer">
        <p>
          <span className="legend-dot" />{' '}
          {result.passed
            ? 'Change is within your configured tolerance.'
            : 'Review highlighted changes before accepting a new baseline.'}
        </p>
        <div className="artifact-actions">
          <a
            href={artifact(job.id, 'diff')}
            download={`${job.name.replace(/[^a-z0-9]/gi, '-')}-diff.png`}
          >
            <Download size={15} /> Diff PNG
          </a>
          <a
            href={candidateImage}
            target="_blank"
            rel="noreferrer"
            aria-label="Open candidate screenshot"
          >
            <ArrowUpRight size={16} />
          </a>
          <button
            className="accept-button"
            disabled={accepting || Boolean(job.acceptedBaselineId)}
            onClick={onAccept}
          >
            <Check size={15} />
            {job.acceptedBaselineId
              ? 'Baseline accepted'
              : accepting
                ? 'Saving…'
                : 'Accept candidate'}
          </button>
        </div>
      </div>
    </section>
  );
}
