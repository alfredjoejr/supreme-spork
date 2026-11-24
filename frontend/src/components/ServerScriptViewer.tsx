import React, { useCallback, useEffect, useState } from 'react';
import { FileCode, Power, RefreshCw, Trash2 } from 'lucide-react';
import {
  deleteInstalledModel,
  fetchRunnerCode,
  stopColabOllama,
} from '../services/colabApi';
import { InstalledModel, RunnerCodeResponse } from '../types/api';

interface ServerScriptViewerProps {
  ngrokUrl: string;
  isConnected: boolean;
  installedModels: InstalledModel[];
  ollamaRunning: boolean;
  onChanged: () => void;
}

export const ServerScriptViewer: React.FC<ServerScriptViewerProps> = ({
  ngrokUrl,
  isConnected,
  installedModels,
  ollamaRunning,
  onChanged,
}) => {
  const [codeInfo, setCodeInfo] = useState<RunnerCodeResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const loadCode = useCallback(async () => {
    if (!isConnected || !ngrokUrl) return;
    setLoading(true);
    try {
      const data = await fetchRunnerCode(ngrokUrl);
      setCodeInfo(data);
    } catch {
      // Ignore transient errors
    } finally {
      setLoading(false);
    }
  }, [isConnected, ngrokUrl]);

  useEffect(() => {
    loadCode();
  }, [loadCode]);

  const handleStopDaemon = async () => {
    await stopColabOllama(ngrokUrl);
    onChanged();
    loadCode();
  };

  const handleDeleteModel = async (name: string) => {
    await deleteInstalledModel(ngrokUrl, name);
    onChanged();
  };

  if (!isConnected) {
    return (
      <div className="card card-padding" style={{ textAlign: 'center', padding: '48px 24px' }}>
        <FileCode size={32} color="var(--text-muted)" style={{ marginBottom: 10 }} />
        <h3 style={{ fontSize: '1.05rem', fontWeight: 600 }}>Colab Machine Not Connected</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: 6 }}>
          Connect to your Google Colab ngrok URL above to inspect the live generated runner script,
          JSON config, and Ollama daemon logs.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="card card-padding">
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            marginBottom: 16,
          }}
        >
          <div>
            <h3 style={{ fontSize: '1.06rem', fontWeight: 700 }}>
              Generated Google Colab Runner Script
            </h3>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
              Automatically updated on Colab whenever you select a model and click OK:{' '}
              <code>{codeInfo?.script_path || '/content/ollama_runner/start_ollama.sh'}</code>
            </p>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={loadCode}>
              <RefreshCw size={14} />
              {loading ? 'Refreshing...' : 'Refresh Files'}
            </button>
            {ollamaRunning && (
              <button type="button" className="btn btn-danger-soft btn-sm" onClick={handleStopDaemon}>
                <Power size={14} />
                Stop Ollama Server
              </button>
            )}
          </div>
        </div>

        <pre className="light-code-block">{codeInfo?.script || '# Loading script...'}</pre>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 18 }}>
          <div>
            <div
              style={{
                fontSize: '0.79rem',
                fontWeight: 600,
                color: 'var(--text-secondary)',
                marginBottom: 6,
              }}
            >
              Active Configuration (<code>runner_config.json</code>)
            </div>
            <pre className="light-code-block">
              {JSON.stringify(codeInfo?.config ?? {}, null, 2)}
            </pre>
          </div>

          <div>
            <div
              style={{
                fontSize: '0.79rem',
                fontWeight: 600,
                color: 'var(--text-secondary)',
                marginBottom: 6,
              }}
            >
              Recent Colab Ollama Logs (<code>ollama_server.log</code>)
            </div>
            <pre className="light-code-block">
              {codeInfo?.logs || 'No log output recorded yet.'}
            </pre>
          </div>
        </div>
      </div>

      {/* Pulled Models on Colab Disk */}
      <div className="card card-padding">
        <h3 style={{ fontSize: '1.02rem', fontWeight: 700, marginBottom: 12 }}>
          Downloaded Models on Colab Disk ({installedModels.length})
        </h3>
        {installedModels.length === 0 ? (
          <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)' }}>
            No models downloaded yet. Select a model in the Models tab and click OK to pull it onto Colab.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {installedModels.map((m) => (
              <div
                key={m.name}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  borderRadius: 8,
                  border: '1px solid var(--border-light)',
                  background: 'var(--bg-page)',
                }}
              >
                <div>
                  <span className="mono" style={{ fontWeight: 600, fontSize: '0.88rem' }}>
                    {m.name}
                  </span>
                  <span style={{ marginLeft: 10, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {m.size_gb} GB {m.quantization_level ? `· ${m.quantization_level}` : ''}
                  </span>
                </div>
                <button
                  type="button"
                  className="btn btn-danger-soft btn-sm"
                  onClick={() => handleDeleteModel(m.name)}
                >
                  <Trash2 size={13} />
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
