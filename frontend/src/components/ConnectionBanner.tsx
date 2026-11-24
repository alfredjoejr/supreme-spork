import React, { useEffect, useState } from 'react';
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Cpu,
  HardDrive,
  Link2,
  PlayCircle,
  RefreshCw,
  Server,
  Unplug,
} from 'lucide-react';
import { ConnectionPhase } from '../hooks/useColabConnection';
import { ServerStatusResponse } from '../types/api';

interface ConnectionBannerProps {
  ngrokUrl: string;
  phase: ConnectionPhase;
  isDemo: boolean;
  status: ServerStatusResponse | null;
  latencyMs: number | null;
  errorMsg: string | null;
  onConnect: (url: string) => Promise<boolean>;
  onStartDemo: () => Promise<boolean>;
  onDisconnect: () => void;
  onRefresh: () => void;
}

export const ConnectionBanner: React.FC<ConnectionBannerProps> = ({
  ngrokUrl,
  phase,
  isDemo,
  status,
  latencyMs,
  errorMsg,
  onConnect,
  onStartDemo,
  onDisconnect,
  onRefresh,
}) => {
  const [urlInput, setUrlInput] = useState(ngrokUrl);

  useEffect(() => {
    setUrlInput(ngrokUrl);
  }, [ngrokUrl]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;
    await onConnect(urlInput);
  };

  const isConnected = phase === 'connected' && status !== null;
  const vramPct =
    status && status.gpu.vram_total_mb > 0
      ? Math.min(100, Math.round((status.gpu.vram_used_mb / status.gpu.vram_total_mb) * 100))
      : 0;
  const ramPct =
    status && status.system.ram_total_gb > 0
      ? Math.min(100, Math.round((status.system.ram_used_gb / status.system.ram_total_gb) * 100))
      : 0;

  return (
    <section className="card card-padding">
      <div className="connection-grid">
        {/* Left: Connection Control & Readiness Gate */}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span className={`badge ${isConnected ? 'badge-green' : 'badge-blue'}`}>
                Step 1 · Google Colab Server Status
              </span>
              {isConnected ? (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: '0.84rem',
                    fontWeight: 600,
                    color: 'var(--emerald)',
                  }}
                >
                  <CheckCircle2 size={16} />
                  Connected — Ready to proceed
                </span>
              ) : (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: '0.84rem',
                    fontWeight: 500,
                    color: 'var(--amber)',
                  }}
                >
                  <AlertCircle size={15} />
                  Connect Colab machine via ngrok to deploy models
                </span>
              )}
            </div>

            <h2 style={{ fontSize: '1.16rem', fontWeight: 700, marginTop: 10 }}>
              {isConnected
                ? `Google Colab Machine Online${isDemo ? ' (Simulator Mode)' : ''}`
                : 'Connect to Your Google Colab GPU Backend'}
            </h2>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginTop: 4 }}>
              {isConnected
                ? status.state_message
                : 'Open colab-backend/Ollama_Cloud_Runner.ipynb in Google Colab with a T4 GPU, run the cells, and paste your generated ngrok URL below.'}
            </p>

            <form onSubmit={handleSubmit} className="input-row">
              <div style={{ position: 'relative', flex: '1 1 280px' }}>
                <Link2
                  size={16}
                  style={{
                    position: 'absolute',
                    left: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-muted)',
                  }}
                />
                <input
                  type="text"
                  className="text-input mono"
                  style={{ width: '100%', paddingLeft: 36, fontSize: '0.84rem' }}
                  placeholder="https://xxxx-xx-xx.ngrok-free.app"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={phase === 'connecting' || !urlInput.trim()}
              >
                {phase === 'connecting' ? 'Checking...' : isConnected ? 'Reconnect' : 'Connect'}
              </button>

              {isConnected ? (
                <>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={onRefresh}
                    title="Refresh Colab telemetry"
                  >
                    <RefreshCw size={15} />
                  </button>
                  <button type="button" className="btn btn-danger-soft" onClick={onDisconnect}>
                    <Unplug size={15} />
                    Disconnect
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="btn btn-soft"
                  onClick={onStartDemo}
                  title="Simulate a connected Colab T4 server locally to preview the workflow"
                >
                  <PlayCircle size={16} />
                  Preview Demo Mode
                </button>
              )}
            </form>

            {errorMsg && (
              <div
                style={{
                  marginTop: 12,
                  padding: '9px 12px',
                  borderRadius: 8,
                  background: 'var(--bg-rose-soft)',
                  border: '1px solid #fecdd3',
                  color: 'var(--rose)',
                  fontSize: '0.83rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <AlertCircle size={15} />
                <span>{errorMsg}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right: Live Colab GPU & Ollama Daemon Telemetry */}
        <div className="telemetry-box">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                fontSize: '0.83rem',
                fontWeight: 600,
                color: 'var(--text-secondary)',
              }}
            >
              <Server size={15} color="var(--accent)" />
              Colab Machine Telemetry
            </span>
            {isConnected && (
              <span className="badge badge-green">
                {status.ollama_running
                  ? `Ollama Running (v${status.ollama_version || 'latest'})`
                  : 'Ollama Standby'}
              </span>
            )}
          </div>

          {isConnected ? (
            <div className="metric-grid">
              <div className="metric-item">
                <div className="metric-label" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Cpu size={12} /> GPU Accelerator
                </div>
                <div className="metric-value" style={{ fontSize: '0.85rem' }}>
                  {status.gpu.name}
                </div>
                {status.gpu.available && (
                  <>
                    <div className="progress-track">
                      <div className="progress-fill emerald" style={{ width: `${vramPct}%` }} />
                    </div>
                    <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)', marginTop: 4 }}>
                      VRAM: {(status.gpu.vram_used_mb / 1024).toFixed(1)} /{' '}
                      {(status.gpu.vram_total_mb / 1024).toFixed(1)} GB ({vramPct}%)
                    </div>
                  </>
                )}
              </div>

              <div className="metric-item">
                <div className="metric-label" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Activity size={12} /> System RAM & Disk
                </div>
                <div className="metric-value" style={{ fontSize: '0.85rem' }}>
                  {status.system.ram_used_gb} / {status.system.ram_total_gb} GB RAM
                </div>
                <div className="progress-track">
                  <div className="progress-fill" style={{ width: `${ramPct}%` }} />
                </div>
                <div
                  style={{
                    fontSize: '0.73rem',
                    color: 'var(--text-muted)',
                    marginTop: 4,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <HardDrive size={11} /> {status.system.disk_free_gb} GB free on Colab disk
                </div>
              </div>

              <div className="metric-item">
                <div className="metric-label">Active Model</div>
                <div className="metric-value mono" style={{ fontSize: '0.84rem', color: 'var(--accent)' }}>
                  {status.active_model || 'None deployed yet'}
                </div>
              </div>

              <div className="metric-item">
                <div className="metric-label">Tunnel Health</div>
                <div className="metric-value" style={{ fontSize: '0.84rem', color: 'var(--emerald)' }}>
                  Online · {latencyMs ?? '—'} ms RTT
                </div>
              </div>
            </div>
          ) : (
            <div
              style={{
                padding: '22px 14px',
                textAlign: 'center',
                color: 'var(--text-muted)',
                fontSize: '0.85rem',
                border: '1px dashed var(--border-hover)',
                borderRadius: 8,
                background: '#ffffff',
              }}
            >
              No Colab machine connected yet. Connect via ngrok above to inspect GPU VRAM, Ollama daemon health, and proceed with model deployment.
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
