import React, { useMemo, useState } from 'react';
import { Check, Cpu, Download, Rocket, Search, Sparkles } from 'lucide-react';
import { CatalogModel, InstalledModel } from '../types/api';
import { OLLAMA_ENGINE_VERSIONS } from '../data/fallbackCatalog';

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
  { id: 'all', label: 'All Models' },
  { id: 'featured', label: 'Featured for Colab' },
  { id: 'general', label: 'General / Chat' },
  { id: 'reasoning', label: 'Reasoning' },
  { id: 'coding', label: 'Coding' },
  { id: 'vision', label: 'Vision' },
  { id: 'embedding', label: 'Embeddings' },
  { id: 'installed', label: 'Installed on Colab' },
];

export const ModelBrowser: React.FC<ModelBrowserProps> = ({
  models,
  installedModels,
  activeModel,
  isConnected,
  selectedOllamaVersion,
  onChangeOllamaVersion,
  onRequestDeploy,
}) => {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [selectedTags, setSelectedTags] = useState<Record<string, string>>({});
  const [customModelInput, setCustomModelInput] = useState('');

  const installedSet = useMemo(() => {
    return new Set(installedModels.map((m) => m.name));
  }, [installedModels]);

  const installedBaseSet = useMemo(() => {
    return new Set(installedModels.map((m) => m.name.split(':')[0]));
  }, [installedModels]);

  const filteredModels = useMemo(() => {
    const q = search.trim().toLowerCase();
    return models.filter((m) => {
      if (category === 'featured' && !m.featured) return false;
      if (category === 'installed' && !m.is_installed && !installedBaseSet.has(m.name)) {
        return false;
      }
      if (
        category !== 'all' &&
        category !== 'featured' &&
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

  const handleCustomDeploy = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = customModelInput.trim();
    if (!cleaned) return;
    onRequestDeploy(cleaned, cleaned);
  };

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Step 2 Header & Global Ollama Engine Selector + Custom Model Tag Bar */}
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="badge badge-blue">Step 2 · Choose Ollama Model & Version</span>
              <span style={{ fontSize: '0.81rem', color: 'var(--text-muted)' }}>
                {models.length} library models available
              </span>
            </div>
            <h2 style={{ fontSize: '1.14rem', fontWeight: 700, marginTop: 8 }}>
              Select an Ollama Model to Update & Start Your Colab Server
            </h2>
            <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', marginTop: 2 }}>
              Pick any Ollama model (such as <code>llama3:8b</code>) and engine version below, then click{' '}
              <strong>OK / Deploy</strong> to update the Colab server script and start serving via ngrok.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div>
              <label
                htmlFor="ollama-ver-select"
                style={{
                  display: 'block',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                  marginBottom: 4,
                }}
              >
                Ollama Engine Version
              </label>
              <select
                id="ollama-ver-select"
                className="select-input"
                value={selectedOllamaVersion}
                onChange={(e) => onChangeOllamaVersion(e.target.value)}
              >
                {OLLAMA_ENGINE_VERSIONS.map((v) => (
                  <option key={v.value} value={v.value}>
                    {v.label}
                  </option>
                ))}
              </select>
            </div>

            <form onSubmit={handleCustomDeploy} style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
              <div>
                <label
                  htmlFor="custom-tag-input"
                  style={{
                    display: 'block',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: 'var(--text-muted)',
                    marginBottom: 4,
                  }}
                >
                  Or Any Custom Ollama Tag
                </label>
                <input
                  id="custom-tag-input"
                  type="text"
                  className="text-input mono"
                  style={{ width: 210, fontSize: '0.83rem' }}
                  placeholder="e.g. llama3:8b or mistral"
                  value={customModelInput}
                  onChange={(e) => setCustomModelInput(e.target.value)}
                />
              </div>
              <button
                type="submit"
                className="btn btn-soft"
                disabled={!isConnected || !customModelInput.trim()}
                title={!isConnected ? 'Connect to Colab first to proceed' : 'Configure & launch custom model'}
              >
                <Rocket size={15} />
                Launch Tag
              </button>
            </form>
          </div>
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

          <div style={{ position: 'relative', minWidth: 260 }}>
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
              placeholder="Search Llama 3, DeepSeek, Gemma, Qwen..."
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                      <h3 style={{ fontSize: '1.02rem', fontWeight: 700 }}>{model.title}</h3>
                      {model.featured && (
                        <span className="badge badge-blue">
                          <Sparkles size={11} /> Popular
                        </span>
                      )}
                    </div>
                    <div
                      className="mono"
                      style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}
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
                    fontSize: '0.85rem',
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
                    <span>Parameter Tag:</span>
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
                  <code style={{ fontSize: '0.79rem', color: 'var(--text-secondary)' }}>
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
