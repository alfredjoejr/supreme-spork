import React from 'react';
import { Cloud, Code2, Cpu, MessageSquare, Layers } from 'lucide-react';
import { ConnectionPhase } from '../hooks/useColabConnection';

export type ActiveTab = 'models' | 'chat' | 'server';

interface HeaderProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  phase: ConnectionPhase;
  latencyMs: number | null;
  activeModel?: string | null;
  isDemo: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onSelectTab,
  phase,
  latencyMs,
  activeModel,
  isDemo,
}) => {
  const isConnected = phase === 'connected';

  return (
    <header className="top-header">
      <div className="container header-inner">
        <div className="brand">
          <div className="brand-icon">
            <Cloud size={20} strokeWidth={2.2} />
          </div>
          <div>
            <div className="brand-title">Ollama Cloud Runner</div>
            <div className="brand-subtitle">Google Colab GPU Control Plane · Ngrok Bridge</div>
          </div>
        </div>

        <nav className="nav-tabs" aria-label="Primary sections">
          <button
            type="button"
            className={`nav-tab ${activeTab === 'models' ? 'active' : ''}`}
            onClick={() => onSelectTab('models')}
          >
            <Layers size={15} />
            Models & Deploy
          </button>
          <button
            type="button"
            className={`nav-tab ${activeTab === 'chat' ? 'active' : ''}`}
            onClick={() => onSelectTab('chat')}
          >
            <MessageSquare size={15} />
            Chat Playground
            {activeModel && (
              <span className="badge badge-green" style={{ marginLeft: 4 }}>
                {activeModel}
              </span>
            )}
          </button>
          <button
            type="button"
            className={`nav-tab ${activeTab === 'server' ? 'active' : ''}`}
            onClick={() => onSelectTab('server')}
          >
            <Code2 size={15} />
            Colab Server Code
          </button>
        </nav>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className={`status-pill ${isConnected ? 'connected' : 'disconnected'}`}>
            <span className={`status-dot ${isConnected ? 'connected' : 'disconnected'}`} />
            {phase === 'connecting' && 'Connecting to Colab...'}
            {isConnected && (
              <>
                {isDemo ? 'Colab Demo Connected' : 'Colab Connected'}
                {latencyMs !== null && (
                  <span style={{ opacity: 0.78, fontWeight: 500 }}>· {latencyMs}ms</span>
                )}
              </>
            )}
            {(phase === 'disconnected' || phase === 'error') && (
              <>
                <Cpu size={14} />
                Colab Disconnected
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
