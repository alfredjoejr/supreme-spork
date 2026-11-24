import React, { useMemo, useState } from 'react';
import { Check, Cpu, Download, Flame, Rocket, Search, Sparkles, Zap } from 'lucide-react';
import { CatalogModel, InstalledModel } from '../types/api';

interface ModelBrowserProps {
  models: CatalogModel[];
  installedModels: InstalledModel[];
  activeModel?: string | null;
  isConnected: boolean;
  selectedOllamaVersion: string;
  onChangeOllamaVersion: (ver: string) => void;
  onRequestDeploy: (fullModelTag: string, modelTitle: string) => void;
}

const CATEGORIES = [
  { id: 'uncensored', label: '🔥 Uncensored & Abliterated' },
  { id: 'high_vram', label: '⚡ A100 High-VRAM (27B–72B+)' },
  { id: 'all', label: 'All Models' },
  { id: 'reasoning', label: 'Reasoning' },
  { id: 'coding', label: 'Coding' },
  { id: 'vision', label: 'Vision' },
  { id: 'installed', label: 'Installed on Colab' },
];

export const ModelBrowser: React.FC<ModelBrowserProps> = ({
  models,
  installedModels,
  activeModel,
  isConnected,
  onRequestDeploy,
}) => {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('uncensored');
  const [selectedTags, setSelectedTags] = useState<Record<string, string>>({});
  const [quickPickModel, setQuickPickModel] = useState<string>('dolphin-llama3:70b');
  const [customModelInput, setCustomModelInput] = useState('');

  const installedSet = useMemo(() => {
    return new Set(installedModels.map((m) => m.name));
  }, [installedModels]);

  const installedBaseSet = useMemo(() => {
    return new Set(installedModels.map((m) => m.name.split(':')[0]));
  }, [installedModels]);

  // Quick-launch dropdown options covering top uncensored & A100 models
  const quickLaunchOptions = useMemo(() => {
    const opts: { tag: string; label: string }[] = [];
    for (const m of models) {
      const defTag = m.default_tag === 'latest' ? m.name : `${m.name}:${m.default_tag}`;
      const prefix = m.uncensored ? '🔥 [Uncensored] ' : '';
      opts.push({
        tag: defTag,
        label: `${prefix}${m.title} (${defTag})`,
      });
    }
    return opts;
  }, [models]);

  const filteredModels = useMemo(() => {
    const q = search.trim().toLowerCase();
    return models.filter((m) => {
      if (category === 'uncensored' && !m.uncensored && m.category !== 'uncensored') {
        return false;
      }
      if (category === 'high_vram' && !m.high_vram) {
        return false;
      }
      if (category === 'installed' && !m.is_installed && !installedBaseSet.has(m.name)) {
        return false;
      }
      if (
        category !== 'all' &&
        category !== 'uncensored' &&
        category !== 'high_vram' &&
        category !== 'installed' &&
        m.category !== category
      ) {
        return false;
      }
      if (!q) return true;
      return (
        m.name.toLowerCase().includes(q) ||
        m.title.toLowerCase().includes(q) ||
        m.description.toLowerCase().includes(q) ||
        m.provider.toLowerCase().includes(q)
      );
    });
  }, [models, search, category, installedBaseSet]);

  const getTagForModel = (m: CatalogModel) => selectedTags[m.name] || m.default_tag || 'latest';

  // Effective target for the top Quick Launch bar: either the typed custom tag OR the selected dropdown model
  const activeQuickLaunchTarget = customModelInput.trim() || quickPickModel;

  const handleQuickLaunch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeQuickLaunchTarget) return;
    const matched = models.find(
      (m) =>
        m.name === activeQuickLaunchTarget ||
        `${m.name}:${m.default_tag}` === activeQuickLaunchTarget
    );
    onRequestDeploy(
      activeQuickLaunchTarget,
      matched ? matched.title : activeQuickLaunchTarget
    );
  };

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Step 2 Header & Working Quick-Select Dropdown + Custom Tag Launcher */}
      <div className="card card-padding">
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span className="badge badge-blue">Step 2 · Choose Uncensored / A100 Model</span>
              <span
                className="badge"
                style={{
                  background: '#fff1f2',
                  color: '#e11d48',
                  borderColor: '#fecdd3',
                }}
              >
                <Flame size={12} /> Uncensored & 70B+ A100 Ready
              </span>
            </div>
            <h2 style={{ fontSize: '1.14rem', fontWeight: 700, marginTop: 8 }}>
              Select an Uncensored or High-VRAM Ollama Model to Deploy on Colab
            </h2>
            <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', marginTop: 2 }}>
              Choose a model from the quick-launch dropdown below (or type any custom tag like{' '}
              <code>dolphin-llama3:70b</code>) and click <strong>Launch Model</strong>.
            </p>
          </div>

          <form
            onSubmit={handleQuickLaunch}
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              gap: 10,
              flexWrap: 'wrap',
              background: 'var(--bg-page)',
              padding: '12px 14px',
              borderRadius: 12,
              border: '1px solid var(--border-light)',
            }}
          >
            <div>
              <label
                htmlFor="quick-model-select"
                style={{
                  display: 'block',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  marginBottom: 4,
                }}
              >
                Quick-Select Model (Uncensored & A100)
              </label>
              <select
                id="quick-model-select"
                className="select-input"
                style={{ minWidth: 280 }}
                value={quickPickModel}
                onChange={(e) => {
                  setQuickPickModel(e.target.value);
                  setCustomModelInput('');
                }}
              >
                {quickLaunchOptions.map((opt) => (
                  <option key={opt.tag} value={opt.tag}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="custom-tag-input"
                style={{
                  display: 'block',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  marginBottom: 4,
                }}
              >
                Or Override With Custom Tag
              </label>
              <input
                id="custom-tag-input"
                type="text"
                className="text-input mono"
                style={{ width: 230, fontSize: '0.82rem' }}
                placeholder="e.g. huihui_ai/qwen2.5-abliterated:72b"
                value={customModelInput}
                onChange={(e) => setCustomModelInput(e.target.value)}
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={!isConnected || !activeQuickLaunchTarget}
              title={
                !isConnected
                  ? 'Connect to your Colab ngrok URL in Step 1 first'
                  : `Deploy ${activeQuickLaunchTarget} on Colab GPU`
              }
            >
              <Rocket size={15} />
              Launch {activeQuickLaunchTarget.split('/').pop()}
            </button>
          </form>
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid var(--border-light)', margin: '18px 0' }} />

        {/* Search & Category Filter Row */}
        <div className="toolbar" style={{ marginBottom: 0 }}>
          <div className="category-pills">
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`chip ${category === c.id ? 'active' : ''}`}
                onClick={() => setCategory(c.id)}
              >
                {c.label}
              </button>
            ))}
          </div>

          <div style={{ position: 'relative', minWidth: 270 }}>
            <Search
              size={15}
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
              className="text-input"
              style={{ width: '100%', paddingLeft: 35 }}
              placeholder="Search Dolphin, Abliterated, Hermes, 70B..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Model Cards Grid */}
      <div className="model-grid">
        {filteredModels.map((model) => {
          const chosenTag = getTagForModel(model);
          const fullModelTag = chosenTag === 'latest' ? model.name : `${model.name}:${chosenTag}`;
          const isCurrentlyActive =
            activeModel === fullModelTag ||
            (chosenTag === 'latest' && activeModel === `${model.name}:latest`);
          const isTagInstalled =
            installedSet.has(fullModelTag) ||
            (chosenTag === 'latest' && installedSet.has(`${model.name}:latest`));

          return (
            <article
              key={model.name}
              className={`model-card ${isCurrentlyActive ? 'active-card' : ''}`}
            >
              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: 8,
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <h3 style={{ fontSize: '1.01rem', fontWeight: 700 }}>{model.title}</h3>
                      {model.uncensored && (
                        <span
                          className="badge"
                          style={{
                            background: '#fff1f2',
                            color: '#e11d48',
                            borderColor: '#fecdd3',
                          }}
                        >
                          <Flame size={11} /> Uncensored
                        </span>
                      )}
                      {model.high_vram && (
                        <span className="badge badge-blue">
                          <Zap size={11} /> A100 Ready
                        </span>
                      )}
                      {!model.uncensored && model.featured && (
                        <span className="badge badge-blue">
                          <Sparkles size={11} /> Featured
                        </span>
                      )}
                    </div>
                    <div
                      className="mono"
                      style={{ fontSize: '0.77rem', color: 'var(--text-muted)', marginTop: 3 }}
                    >
                      {model.name} · {model.provider}
                    </div>
                  </div>

                  {isCurrentlyActive ? (
                    <span className="badge badge-green">
                      <Check size={12} /> Running
                    </span>
                  ) : isTagInstalled ? (
                    <span className="badge badge-green">
                      <Download size={11} /> Pulled
                    </span>
                  ) : (
                    <span className="badge">{model.pulls}</span>
                  )}
                </div>

                <p
                  style={{
                    fontSize: '0.84rem',
                    color: 'var(--text-secondary)',
                    marginTop: 10,
                    minHeight: 40,
                  }}
                >
                  {model.description}
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '0.75rem',
                      color: 'var(--text-muted)',
                      marginBottom: 6,
                    }}
                  >
                    <span>Parameter Size Tag:</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <Cpu size={12} /> {model.vram_hint}
                    </span>
                  </div>
                  <div className="tag-selector">
                    {model.tags.map((t) => (
                      <button
                        key={t}
                        type="button"
                        className={`tag-btn ${chosenTag === t ? 'selected' : ''}`}
                        onClick={() =>
                          setSelectedTags((prev) => ({
                            ...prev,
                            [model.name]: t,
                          }))
                        }
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingTop: 10,
                    borderTop: '1px solid var(--border-light)',
                  }}
                >
                  <code style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    {fullModelTag}
                  </code>

                  <button
                    type="button"
                    className={`btn btn-sm ${isCurrentlyActive ? 'btn-secondary' : 'btn-primary'}`}
                    disabled={!isConnected}
                    onClick={() => onRequestDeploy(fullModelTag, model.title)}
                    title={
                      !isConnected
                        ? 'Connect to your Google Colab machine above so we can proceed'
                        : `Configure & start ${fullModelTag} on Colab`
                    }
                  >
                    <Rocket size={14} />
                    {!isConnected
                      ? 'Connect Colab First'
                      : isCurrentlyActive
                        ? 'Reconfigure'
                        : 'Select & OK'}
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
};
