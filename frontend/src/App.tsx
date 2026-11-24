import React, { useEffect, useState } from 'react';
import { Header, ActiveTab } from './components/Header';
import { ConnectionBanner } from './components/ConnectionBanner';
import { ModelBrowser } from './components/ModelBrowser';
import { DeployModal } from './components/DeployModal';
import { ChatPlayground } from './components/ChatPlayground';
import { ServerScriptViewer } from './components/ServerScriptViewer';
import { useColabConnection } from './hooks/useColabConnection';
import { FALLBACK_CATALOG } from './data/fallbackCatalog';
import { fetchModelCatalog } from './services/colabApi';
import { CatalogModel } from './types/api';

export const App: React.FC = () => {
  const {
    ngrokUrl,
    phase,
    isConnected,
    isDemo,
    status,
    latencyMs,
    errorMsg,
    connectToUrl,
    activateDemoSimulator,
    disconnect,
    refreshStatus,
  } = useColabConnection();

  const [activeTab, setActiveTab] = useState<ActiveTab>('models');
  const [catalog, setCatalog] = useState<CatalogModel[]>(FALLBACK_CATALOG);
  const [selectedOllamaVersion, setSelectedOllamaVersion] = useState<string>('latest');
  const [pendingDeploy, setPendingDeploy] = useState<{
    modelTag: string;
    modelTitle: string;
  } | null>(null);

  useEffect(() => {
    if (!isConnected || !ngrokUrl) {
      setCatalog(FALLBACK_CATALOG);
      return;
    }
    let cancelled = false;
    fetchModelCatalog(ngrokUrl)
      .then((models) => {
        if (!cancelled) setCatalog(models);
      })
      .catch(() => {
        if (!cancelled) setCatalog(FALLBACK_CATALOG);
      });
    return () => {
      cancelled = true;
    };
  }, [isConnected, ngrokUrl]);

  return (
    <div className="app-shell">
      <Header
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        phase={phase}
        latencyMs={latencyMs}
        activeModel={status?.active_model}
        isDemo={isDemo}
      />

      <main className="container main-content">
        <ConnectionBanner
          ngrokUrl={ngrokUrl}
          phase={phase}
          isDemo={isDemo}
          status={status}
          latencyMs={latencyMs}
          errorMsg={errorMsg}
          onConnect={connectToUrl}
          onStartDemo={activateDemoSimulator}
          onDisconnect={disconnect}
          onRefresh={refreshStatus}
        />

        {activeTab === 'models' && (
          <ModelBrowser
            models={catalog}
            installedModels={status?.installed_models ?? []}
            activeModel={status?.active_model}
            isConnected={isConnected}
            selectedOllamaVersion={selectedOllamaVersion}
            onChangeOllamaVersion={setSelectedOllamaVersion}
            onRequestDeploy={(modelTag, modelTitle) =>
              setPendingDeploy({ modelTag, modelTitle })
            }
          />
        )}

        {activeTab === 'chat' && (
          <ChatPlayground
            ngrokUrl={ngrokUrl}
            isConnected={isConnected}
            activeModel={status?.active_model}
            installedModels={status?.installed_models ?? []}
            onGoToModels={() => setActiveTab('models')}
          />
        )}

        {activeTab === 'server' && (
          <ServerScriptViewer
            ngrokUrl={ngrokUrl}
            isConnected={isConnected}
            installedModels={status?.installed_models ?? []}
            ollamaRunning={Boolean(status?.ollama_running)}
            onChanged={refreshStatus}
          />
        )}
      </main>

      {pendingDeploy && (
        <DeployModal
          ngrokUrl={ngrokUrl}
          modelTag={pendingDeploy.modelTag}
          modelTitle={pendingDeploy.modelTitle}
          initialOllamaVersion={selectedOllamaVersion}
          onClose={() => {
            setPendingDeploy(null);
            refreshStatus();
          }}
          onDeployedReady={() => {
            setPendingDeploy(null);
            refreshStatus();
            setActiveTab('chat');
          }}
        />
      )}
    </div>
  );
};

export default App;
