import React, { useState } from 'react';
import { CheckCircle2, Loader2, MessageSquare, Server, Terminal, X } from 'lucide-react';
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

  const [isDeploying, setIsDeploying] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [progress, setProgress] = useState(0);
  const [events, setEvents] = useState<DeployStreamEvent[]>([]);
  const [deployError, setDeployError] = useState<string | null>(null);

  const handleConfirmOk = async () => {
    setIsDeploying(true);
    setDeployError(null);
    setEvents([]);
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
        },
        (evt) => {
          setEvents((prev) => [...prev.slice(-18), evt]);
          if (typeof evt.progress === 'number') {
            setProgress(evt.progress);
          }
          if (evt.step === 'error') {
            setDeployError(evt.message);
            setIsDeploying(false);
          }
          if (evt.step === 'ready') {
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

        {/* Body */}
        <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {!isDeploying && !isFinished && (
            <>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                Clicking <strong>OK — Update & Start Server</strong> will rewrite{' '}
                <code>/content/ollama_runner/start_ollama.sh</code> on your Google Colab machine,
                verify the Ollama engine version, start <code>ollama serve</code>, pull{' '}
                <code>{modelTag}</code> onto the Colab GPU, and connect it to this frontend via ngrok.
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
                    <option value={2048}>2,048 tokens (Low VRAM)</option>
                    <option value={4096}>4,096 tokens (Balanced T4)</option>
                    <option value={8192}>8,192 tokens</option>
                    <option value={16384}>16,384 tokens</option>
                    <option value={32768}>32,768 tokens (High VRAM)</option>
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

                <div style={{ display: 'flex', alignItems: 'center', paddingTop: 22 }}>
                  <label
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      fontSize: '0.85rem',
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
                <pre className="light-code-block" style={{ maxHeight: 150 }}>{`export OLLAMA_HOST="127.0.0.1:11434"
export OLLAMA_ORIGINS="*"
export OLLAMA_NUM_CTX="${numCtx}"
export OLLAMA_KEEP_ALIVE="${keepAlive}"
export OLLAMA_FLASH_ATTENTION="${flashAttention ? '1' : '0'}"
ollama serve &
ollama pull "${modelTag}"`}</pre>
              </div>
            </>
          )}

          {/* Streaming Progress View */}
          {(isDeploying || isFinished || events.length > 0) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: '0.88rem',
                    fontWeight: 600,
                    color: isFinished ? 'var(--emerald)' : 'var(--accent)',
                  }}
                >
                  {isDeploying && <Loader2 size={16} className="spin" />}
                  {isFinished && <CheckCircle2 size={17} />}
                  {isFinished
                    ? `Colab Server Live with ${modelTag}!`
                    : 'Updating Colab backend & pulling model...'}
                </span>
                <span className="mono" style={{ fontSize: '0.82rem', fontWeight: 600 }}>
                  {progress}%
                </span>
              </div>

              <div className="progress-track" style={{ height: 9 }}>
                <div
                  className={`progress-fill ${isFinished ? 'emerald' : ''}`}
                  style={{ width: `${progress}%` }}
                />
              </div>

              <div className="light-code-block" style={{ maxHeight: 210 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    color: 'var(--text-muted)',
                    marginBottom: 6,
                    fontSize: '0.75rem',
                  }}
                >
                  <Terminal size={13} /> Live Colab Ngrok Stream
                </div>
                {events.map((ev, i) => (
                  <div key={i} style={{ padding: '2px 0' }}>
                    <span style={{ color: 'var(--accent)', fontWeight: 600 }}>[{ev.step}]</span>{' '}
                    <span>{ev.message}</span>
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

        {/* Footer */}
        <div
          style={{
            padding: '14px 22px',
            borderTop: '1px solid var(--border-light)',
            background: 'var(--bg-page)',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 10,
          }}
        >
          {!isDeploying && !isFinished && (
            <>
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary" onClick={handleConfirmOk}>
                OK — Update & Start Server
              </button>
            </>
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
