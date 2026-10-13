import { useState, type FormEvent } from 'react';
import {
  ArrowRight,
  ChevronDown,
  Globe2,
  ImagePlus,
  Monitor,
  Smartphone,
  FlaskConical,
  X,
} from 'lucide-react';
import { api, type Baseline, type Job } from './types';

interface Props {
  baselines: Baseline[];
  initialBaseline: string;
  onCreated: (job: Job) => void;
  onClose: () => void;
}
const DEMO_ORIGIN =
  window.location.port === '5174' ? 'http://127.0.0.1:4174' : window.location.origin;
async function encode(file: File | null) {
  if (!file) throw new Error('Choose both PNG files.');
  if (file.size > 5_000_000) throw new Error('Each PNG must be 5 MB or less.');
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1]);
    reader.onerror = () => reject(new Error('Could not read the file.'));
    reader.readAsDataURL(file);
  });
}
export default function RunForm({ baselines, initialBaseline, onCreated, onClose }: Props) {
  const [mode, setMode] = useState<'url' | 'upload'>('url');
  const [name, setName] = useState('Orbit · homepage');
  const [baselineUrl, setBaselineUrl] = useState(`${DEMO_ORIGIN}/demo/baseline`);
  const [candidateUrl, setCandidateUrl] = useState(`${DEMO_ORIGIN}/demo/candidate`);
  const [baselineId, setBaselineId] = useState(initialBaseline);
  const [preset, setPreset] = useState('desktop');
  const [width, setWidth] = useState(1280);
  const [height, setHeight] = useState(800);
  const [allowedPercent, setAllowedPercent] = useState(0.5);
  const [baselineFile, setBaselineFile] = useState<File | null>(null);
  const [candidateFile, setCandidateFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const saved = baselines.find((item) => item.id === baselineId);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setPending(true);
    try {
      const body =
        mode === 'url'
          ? {
              name,
              mode,
              ...(baselineId ? { baselineId } : { baselineUrl }),
              candidateUrl,
              viewport: { width, height },
              allowedPercent,
            }
          : {
              name,
              mode,
              baselinePng: await encode(baselineFile),
              candidatePng: await encode(candidateFile),
              allowedPercent,
            };
      onCreated(await api<Job>('/api/jobs', body));
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : 'Could not start comparison.');
    } finally {
      setPending(false);
    }
  }
  function choosePreset(value: string) {
    setPreset(value);
    if (value === 'desktop') {
      setWidth(1280);
      setHeight(800);
    }
    if (value === 'mobile') {
      setWidth(390);
      setHeight(844);
    }
  }
  function demo() {
    setMode('url');
    setBaselineId('');
    setName('Orbit · homepage');
    setBaselineUrl(`${DEMO_ORIGIN}/demo/baseline`);
    setCandidateUrl(`${DEMO_ORIGIN}/demo/candidate`);
    choosePreset('desktop');
  }
  return (
    <section className="run-panel" aria-labelledby="run-heading">
      <div className="panel-title">
        <div>
          <span className="step-label">01 / SET UP</span>
          <h2 id="run-heading">New comparison</h2>
        </div>
        <button className="icon-button" onClick={onClose} aria-label="Close new comparison">
          <X size={19} />
        </button>
      </div>
      <form onSubmit={submit}>
        <div className="form-top">
          <div className="segmented" aria-label="Comparison source">
            <button
              type="button"
              className={mode === 'url' ? 'active' : ''}
              onClick={() => setMode('url')}
            >
              <Globe2 size={15} /> Web pages
            </button>
            <button
              type="button"
              className={mode === 'upload' ? 'active' : ''}
              onClick={() => setMode('upload')}
            >
              <ImagePlus size={15} /> PNG files
            </button>
          </div>
          <button type="button" className="text-button" onClick={demo}>
            <FlaskConical size={15} /> Load demo
          </button>
        </div>
        <label className="field name-field">
          Comparison name
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={80}
            required
            placeholder="Checkout · desktop"
          />
        </label>
        {mode === 'url' ? (
          <>
            {baselines.length > 0 ? (
              <label className="field">
                Baseline source
                <div className="select-wrap">
                  <select
                    value={baselineId}
                    onChange={(event) => setBaselineId(event.target.value)}
                  >
                    <option value="">Capture a URL</option>
                    {baselines.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={15} />
                </div>
              </label>
            ) : null}
            <div className="source-fields">
              <label className="field">
                <span>
                  <i className="source-dot baseline-dot" />
                  Baseline {saved ? 'snapshot' : 'URL'}
                </span>
                <input
                  type={saved ? 'text' : 'url'}
                  required
                  value={saved ? saved.sourceUrl : baselineUrl}
                  readOnly={Boolean(saved)}
                  onChange={(event) => setBaselineUrl(event.target.value)}
                  placeholder="https://your-site.com"
                />
              </label>
              <ArrowRight className="source-arrow" size={19} />
              <label className="field">
                <span>
                  <i className="source-dot candidate-dot" />
                  Candidate URL
                </span>
                <input
                  type="url"
                  required
                  value={candidateUrl}
                  onChange={(event) => setCandidateUrl(event.target.value)}
                  placeholder="https://preview.your-site.com"
                />
              </label>
            </div>
          </>
        ) : (
          <div className="upload-fields">
            <label className="upload-zone">
              <ImagePlus size={24} />
              <strong>Baseline PNG</strong>
              <span>{baselineFile?.name || 'Select an image · up to 5 MB'}</span>
              <input
                type="file"
                accept="image/png,.png"
                required
                onChange={(event) => setBaselineFile(event.target.files?.[0] || null)}
              />
            </label>
            <label className="upload-zone">
              <ImagePlus size={24} />
              <strong>Candidate PNG</strong>
              <span>{candidateFile?.name || 'Select an image · up to 5 MB'}</span>
              <input
                type="file"
                accept="image/png,.png"
                required
                onChange={(event) => setCandidateFile(event.target.files?.[0] || null)}
              />
            </label>
          </div>
        )}
        <div className="options-row">
          {mode === 'url' ? (
            <label className="field viewport-field">
              Viewport
              <div className="select-wrap">
                <select
                  value={saved ? 'saved' : preset}
                  disabled={Boolean(saved)}
                  onChange={(event) => choosePreset(event.target.value)}
                >
                  {saved ? (
                    <option value="saved">
                      Saved · {saved.viewport.width} × {saved.viewport.height}
                    </option>
                  ) : (
                    <>
                      <option value="desktop">Desktop · 1280 × 800</option>
                      <option value="mobile">Mobile · 390 × 844</option>
                      <option value="custom">Custom size</option>
                    </>
                  )}
                </select>
                {preset === 'mobile' ? <Smartphone size={16} /> : <Monitor size={16} />}
              </div>
            </label>
          ) : (
            <p className="upload-limit">Matching dimensions · up to 3 million pixels</p>
          )}
          {mode === 'url' && preset === 'custom' && !saved ? (
            <div className="custom-size">
              <label className="field">
                Width
                <input
                  type="number"
                  min={320}
                  max={1920}
                  value={width}
                  onChange={(event) => setWidth(Number(event.target.value))}
                  required
                />
              </label>
              <label className="field">
                Height
                <input
                  type="number"
                  min={240}
                  max={1200}
                  value={height}
                  onChange={(event) => setHeight(Number(event.target.value))}
                  required
                />
              </label>
            </div>
          ) : null}
          <label className="field tolerance-field">
            Allowed change
            <div className="unit-input">
              <input
                type="number"
                min={0}
                max={100}
                step="0.01"
                value={allowedPercent}
                onChange={(event) => setAllowedPercent(Number(event.target.value))}
                required
              />
              <span>%</span>
            </div>
          </label>
          <button className="primary-button run-button" disabled={pending} type="submit">
            {pending ? 'Starting…' : 'Run comparison'}
            <ArrowRight size={16} />
          </button>
        </div>
        {error ? (
          <p className="inline-error" role="alert">
            {error}
          </p>
        ) : null}
        <p className="form-hint">
          {saved
            ? 'A saved baseline stays fixed. The candidate is captured at the same dimensions.'
            : mode === 'url'
              ? 'Real Chromium captures. Fixed viewport. Animations paused. No account required.'
              : 'Pixel comparison runs on the server. Your original files stay unchanged.'}
        </p>
      </form>
    </section>
  );
}
