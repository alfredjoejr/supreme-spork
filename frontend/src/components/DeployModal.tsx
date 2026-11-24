import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  DownloadCloud,
  Loader2,
  MessageSquare,
  Server,
  X,
} from 'lucide-react';
import { deployModelToColab } from '../services/colabApi';
import { DeployStreamEvent } from '../types/api';
import { OLLAMA_ENGINE_VERSIONS } from '../data/fallbackCatalog';

interface DeployModalProps {
  ngrokUrl: string;
  modelTag: string;
  modelTitle: string;
  initialOllamaVersion: string;
  onClose: () => void;
  onDeployedReady: (deployedModel: string) => void;
}

interface PullLayerState {
  label: string;
  sizeDetail: string;
  percent: number;
}

function parsePullMessage(evt: DeployStreamEvent): PullLayerState {
  const pct =
    typeof evt.download_percent === 'number'
      ? evt.download_percent
      : (() => {
          const m = evt.message.match(/\(([\d.]+)%\)/);
          return m ? parseFloat(m[1]) : 0;
        })();

  // Expected format: "pulling 1eee69535308: 4642.8 MB / 4692.8 MB (98.9%)"
  const colonIdx = evt.message.indexOf(':');
  if (colonIdx !== -1) {
    const label = evt.message.slice(0, colonIdx).trim();
    const rest = evt.message
      .slice(colonIdx + 1)
      .replace(/\([\d.]+%\)/, '')
      .trim();
    return {
      label,
      sizeDetail: rest,
      percent: Math.min(100, Math.max(0, pct)),
    };
  }

  return {
    label: 'Downloading model weights',
    sizeDetail: evt.message,
    percent: Math.min(100, Math.max(0, pct)),
  };
}

export const DeployModal: React.FC<DeployModalProps> = ({
  ngrokUrl,
  modelTag,
  modelTitle,
  initialOllamaVersion,
  onClose,
  onDeployedReady,
}) => {
  const [ollamaVersion, setOllamaVersion] = useState(initialOllamaVersion);
  const [numCtx, setNumCtx] = useState(4096);
  const [keepAlive, setKeepAlive] = useState('15m');
  const [flashAttention, setFlashAttention] = useState(true);
  const [storeModelsOnDrive, setStoreModelsOnDrive] = useState(true);

  const [isDeploying, setIsDeploying] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [progress, setProgress] = useState(0);
  const [milestones, setMilestones] = useState<DeployStreamEvent[]>([]);
  const [pullState, setPullState] = useState<PullLayerState | null>(null);
  const [deployError, setDeployError] = useState<string | null>(null);

  const handleConfirmOk = async () => {
    setIsDeploying(true);
    setDeployError(null);
    setMilestones([]);
    setPullState(null);
    setProgress(5);

    try {
      await deployModelToColab(
        ngrokUrl,
        {
          model: modelTag,
          ollama_version: ollamaVersion,
          num_ctx: numCtx,
          keep_alive: keepAlive,
          flash_attention: flashAttention,
          restart_server: true,
          store_models_on_drive: storeModelsOnDrive,
        },
        (evt) => {
          if (typeof evt.progress === 'number') {
            setProgress(evt.progress);
          }

          if (evt.step === 'pull_progress') {
            setPullState(parsePullMessage(evt));
          } else if (evt.step === 'pull_status') {
            setPullState((prev) => ({
              label: evt.message,
              sizeDetail: prev?.sizeDetail || '',
              percent: prev?.percent ?? 100,
            }));
          } else {
            // Deduplicate milestone steps in-place instead of flooding new lines
            setMilestones((prev) => {
              const existingIdx = prev.findIndex((item) => item.step === evt.step);
              if (existingIdx !== -1) {
                const updated = [...prev];
                updated[existingIdx] = evt;
                return updated;
              }
              return [...prev, evt];
            });
          }

          if (evt.step === 'error') {
            setDeployError(evt.message);
            setIsDeploying(false);
          }
          if (evt.step === 'ready') {
            setPullState((prev) =>
              prev ? { ...prev, label: 'Download complete', percent: 100 } : null
            );
            setIsFinished(true);
            setIsDeploying(false);
          }
        }
      );
    } catch (err) {
      setDeployError(err instanceof Error ? err.message : 'Failed to deploy on Colab.');
      setIsDeploying(false);
    }
  };

  const activeStageText = useMemo(() => {
    if (isFinished) return `Colab Server Live with ${modelTag}!`;
    if (milestones.some((m) => m.step === 'warming_up')) {
      return `Loading ${modelTag} weights into Colab GPU VRAM...`;
    }
    if (pullState) {
      return `Pulling ${modelTag} onto Google Colab...`;
    }
    return 'Updating Colab backend & starting Ollama daemon...';
  }, [isFinished, milestones, modelTag, pullState]);

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-panel">
        {/* Header */}
        <div
          style={{
            padding: '18px 22px',
            borderBottom: '1px solid var(--border-light)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg-page)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Server size={19} color="var(--accent)" />
            <div>
              <h3 style={{ fontSize: '1.02rem', fontWeight: 700 }}>
                Update & Start Google Colab Server
              </h3>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Target: <code style={{ color: 'var(--accent)' }}>{modelTag}</code> ({modelTitle})
              </div>
            </div>
          </div>

          {!isDeploying && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={onClose}
              aria-label="Close modal"
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* Body (Scrollable so it never clips off screen) */}
        <div className="modal-body-scroll">
          {!isDeploying && !isFinished && milestones.length === 0 && !deployError && (
            <>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                Clicking <strong>OK — Update & Start Server</strong> will rewrite{' '}
                <code>/content/ollama_runner/start_ollama.sh</code> on your Google Colab machine,
                start <code>ollama serve</code>, pull <code>{modelTag}</code> onto the Colab GPU,
                and connect it to this frontend via ngrok.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      color: 'var(--text-secondary)',
                      marginBottom: 5,
                    }}
                  >
                    Ollama Engine Version
                  </label>
                  <select
                    className="select-input"
                    style={{ width: '100%' }}
                    value={ollamaVersion}
                    onChange={(e) => setOllamaVersion(e.target.value)}
                  >
                    {OLLAMA_ENGINE_VERSIONS.map((v) => (
                      <option key={v.value} value={v.value}>
                        {v.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      color: 'var(--text-secondary)',
                      marginBottom: 5,
                    }}
                  >
                    Context Length (num_ctx)
                  </label>
                  <select
                    className="select-input"
                    style={{ width: '100%' }}
                    value={numCtx}
                    onChange={(e) => setNumCtx(Number(e.target.value))}
                  >
                    <option value={2048}>2,048 tokens (Fastest)</option>
                    <option value={4096}>4,096 tokens (Balanced)</option>
                    <option value={8192}>8,192 tokens</option>
                    <option value={16384}>16,384 tokens (A100 Recommended)</option>
                    <option value={32768}>32,768 tokens (High VRAM A100)</option>
                  </select>
                </div>

                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      color: 'var(--text-secondary)',
                      marginBottom: 5,
                    }}
                  >
                    GPU Keep-Alive Duration
                  </label>
                  <select
                    className="select-input"
                    style={{ width: '100%' }}
                    value={keepAlive}
                    onChange={(e) => setKeepAlive(e.target.value)}
                  >
                    <option value="5m">5 minutes</option>
                    <option value="15m">15 minutes</option>
                    <option value="60m">60 minutes</option>
                    <option value="-1">Keep loaded indefinitely (-1)</option>
                  </select>
                </div>

                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    gap: 6,
                    paddingTop: 14,
                  }}
                >
                  <label
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      fontSize: '0.83rem',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={flashAttention}
                      onChange={(e) => setFlashAttention(e.target.checked)}
                    />
                    Enable CUDA Flash Attention
                  </label>
                  <label
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      fontSize: '0.83rem',
                      cursor: 'pointer',
                      color: 'var(--emerald)',
                      fontWeight: 600,
                    }}
                    title="Saves downloaded model blobs in /content/drive/MyDrive/OllamaCloudRunner/models on Google Drive (0 MB local disk/bandwidth)"
                  >
                    <input
                      type="checkbox"
                      checked={storeModelsOnDrive}
                      onChange={(e) => setStoreModelsOnDrive(e.target.checked)}
                    />
                    Persist in Google Drive (0 MB local)
                  </label>
                </div>
              </div>

              <div>
                <div
                  style={{
                    fontSize: '0.76rem',
                    fontWeight: 600,
                    color: 'var(--text-muted)',
                    marginBottom: 6,
                  }}
                >
                  Colab Server Script Preview (<code>start_ollama.sh</code>):
                </div>
                <pre className="light-code-block" style={{ maxHeight: 140 }}>{`export OLLAMA_HOST="127.0.0.1:11434"
export OLLAMA_ORIGINS="*"
export OLLAMA_NUM_CTX="${numCtx}"
export OLLAMA_KEEP_ALIVE="${keepAlive}"
export OLLAMA_FLASH_ATTENTION="${flashAttention ? '1' : '0'}"
ollama serve &
ollama pull "${modelTag}"`}</pre>
              </div>
            </>
          )}

          {/* Clean In-Place Progress View (No multi-line spam) */}
          {(isDeploying || isFinished || milestones.length > 0 || pullState) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Overall Deployment Progress Bar */}
              <div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 6,
                  }}
                >
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      fontSize: '0.9rem',
                      fontWeight: 600,
                      color: isFinished ? 'var(--emerald)' : 'var(--accent)',
                    }}
                  >
                    {isDeploying && <Loader2 size={16} className="spin" />}
                    {isFinished && <CheckCircle2 size={17} />}
                    {activeStageText}
                  </span>
                  <span className="mono" style={{ fontSize: '0.82rem', fontWeight: 700 }}>
                    {progress}%
                  </span>
                </div>

                <div className="progress-track" style={{ height: 10 }}>
                  <div
                    className={`progress-fill ${isFinished ? 'emerald' : ''}`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              {/* Dedicated In-Place Layer Download Progress Bar */}
              {pullState && (
                <div
                  style={{
                    background: 'var(--bg-accent-soft)',
                    border: '1px solid #bfdbfe',
                    borderRadius: 10,
                    padding: '12px 14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 10,
                      fontSize: '0.81rem',
                    }}
                  >
                    <span
                      className="mono"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        fontWeight: 600,
                        color: 'var(--accent)',
                      }}
                    >
                      <DownloadCloud size={15} />
                      {pullState.label}
                    </span>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {pullState.sizeDetail && (
                        <span className="mono" style={{ color: 'var(--text-secondary)' }}>
                          {pullState.sizeDetail}
                        </span>
                      )}
                      <span
                        className="badge badge-blue mono"
                        style={{ minWidth: 54, justifyContent: 'center' }}
                      >
                        {pullState.percent.toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  <div
                    className="progress-track"
                    style={{ height: 7, background: '#dbeafe', marginTop: 0 }}
                  >
                    <div
                      className={`progress-fill ${pullState.percent >= 100 ? 'emerald' : ''}`}
                      style={{ width: `${pullState.percent}%`, transition: 'width 0.2s ease' }}
                    />
                  </div>
                </div>
              )}

              {/* Compact Step Checklist (1 line per stage, no duplicate lines) */}
              <div
                style={{
                  background: 'var(--bg-page)',
                  border: '1px solid var(--border-light)',
                  borderRadius: 10,
                  padding: '10px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                }}
              >
                {milestones.map((ev) => (
                  <div
                    key={ev.step}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      fontSize: '0.81rem',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    <CheckCircle2
                      size={14}
                      color={ev.step === 'error' ? 'var(--rose)' : 'var(--emerald)'}
                      style={{ flexShrink: 0 }}
                    />
                    <span className="mono" style={{ fontSize: '0.75rem', color: 'var(--accent)' }}>
                      [{ev.step}]
                    </span>
                    <span style={{ color: 'var(--text-primary)' }}>{ev.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {deployError && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: 8,
                background: 'var(--bg-rose-soft)',
                border: '1px solid #fecdd3',
                color: 'var(--rose)',
                fontSize: '0.84rem',
              }}
            >
              {deployError}
            </div>
          )}
        </div>

        {/* Footer (Always pinned at bottom of modal) */}
        <div
          style={{
            padding: '14px 22px',
            borderTop: '1px solid var(--border-light)',
            background: 'var(--bg-page)',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 10,
            flexShrink: 0,
          }}
        >
          {!isDeploying && !isFinished && milestones.length === 0 && !deployError && (
            <>
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary" onClick={handleConfirmOk}>
                OK — Update & Start Server
              </button>
            </>
          )}

          {!isDeploying && !isFinished && (milestones.length > 0 || deployError) && (
            <>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setMilestones([]);
                  setPullState(null);
                  setDeployError(null);
                }}
              >
                Edit Settings
              </button>
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Close
              </button>
              <button type="button" className="btn btn-primary" onClick={handleConfirmOk}>
                Retry Deploy
              </button>
            </>
          )}

          {isDeploying && (
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Hide (Runs in Background)
            </button>
          )}

          {isFinished && (
            <>
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Stay on Models
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => onDeployedReady(modelTag)}
              >
                <MessageSquare size={15} />
                Open Chat Playground
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
