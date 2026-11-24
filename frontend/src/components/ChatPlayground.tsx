import React, { useEffect, useRef, useState } from 'react';
import { Bot, Eraser, Layers, Send, Sliders } from 'lucide-react';
import { streamColabChat } from '../services/colabApi';
import { ChatMessage, InstalledModel } from '../types/api';

interface ChatPlaygroundProps {
  ngrokUrl: string;
  isConnected: boolean;
  activeModel?: string | null;
  installedModels: InstalledModel[];
  onGoToModels: () => void;
}

export const ChatPlayground: React.FC<ChatPlaygroundProps> = ({
  ngrokUrl,
  isConnected,
  activeModel,
  installedModels,
  onGoToModels,
}) => {
  const [selectedModel, setSelectedModel] = useState<string>(activeModel || '');
  const [systemPrompt, setSystemPrompt] = useState('You are a helpful, concise AI assistant.');
  const [temperature, setTemperature] = useState(0.7);
  const [numCtx, setNumCtx] = useState(4096);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [prompt, setPrompt] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (activeModel) {
      setSelectedModel(activeModel);
    } else if (!selectedModel && installedModels.length > 0) {
      setSelectedModel(installedModels[0].name);
    }
  }, [activeModel, installedModels, selectedModel]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e?: React.FormEvent, overridePrompt?: string) => {
    e?.preventDefault();
    const text = (overridePrompt ?? prompt).trim();
    if (!text || !selectedModel || isStreaming) return;

    const userMsg: ChatMessage = { role: 'user', content: text };
    const nextHistory: ChatMessage[] = [...messages, userMsg];
    setMessages([...nextHistory, { role: 'assistant', content: '' }]);
    setPrompt('');
    setChatError(null);
    setIsStreaming(true);

    const apiPayload: ChatMessage[] = systemPrompt.trim()
      ? [{ role: 'system', content: systemPrompt.trim() }, ...nextHistory]
      : nextHistory;

    try {
      await streamColabChat(ngrokUrl, selectedModel, apiPayload, temperature, numCtx, (chunk) => {
        setMessages((prev) => {
          const updated = [...prev];
          const lastIdx = updated.length - 1;
          if (lastIdx >= 0 && updated[lastIdx].role === 'assistant') {
            updated[lastIdx] = {
              ...updated[lastIdx],
              content: updated[lastIdx].content + chunk,
            };
          }
          return updated;
        });
      });
    } catch (err) {
      setChatError(err instanceof Error ? err.message : 'Chat stream failed.');
    } finally {
      setIsStreaming(false);
    }
  };

  if (!isConnected || (!activeModel && installedModels.length === 0)) {
    return (
      <div className="card card-padding" style={{ textAlign: 'center', padding: '52px 24px' }}>
        <Bot size={34} color="var(--accent)" style={{ marginBottom: 10 }} />
        <h3 style={{ fontSize: '1.08rem', fontWeight: 700 }}>
          {!isConnected
            ? 'Connect Your Google Colab Server First'
            : 'No Active Ollama Model Running Yet'}
        </h3>
        <p
          style={{
            fontSize: '0.88rem',
            color: 'var(--text-secondary)',
            maxWidth: 480,
            margin: '8px auto 18px',
          }}
        >
          {!isConnected
            ? 'Paste your ngrok URL in the Colab Server Status bar above so we can communicate with your Colab GPU.'
            : 'Select a model (such as Llama 3) in the Models tab and click OK to update and start the Colab server.'}
        </p>
        <button type="button" className="btn btn-primary" onClick={onGoToModels}>
          <Layers size={15} />
          Browse Ollama Models
        </button>
      </div>
    );
  }

  const modelChoices = Array.from(
    new Set([
      ...(activeModel ? [activeModel] : []),
      ...installedModels.map((m) => m.name),
    ])
  );

  return (
    <div className="card card-padding">
      <div className="chat-layout">
        {/* Sidebar Controls */}
        <aside
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
            background: 'var(--bg-page)',
            border: '1px solid var(--border-light)',
            borderRadius: 12,
            padding: 16,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              fontSize: '0.85rem',
              fontWeight: 700,
            }}
          >
            <Sliders size={15} color="var(--accent)" />
            Inference Settings
          </div>

          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.76rem',
                fontWeight: 600,
                color: 'var(--text-secondary)',
                marginBottom: 4,
              }}
            >
              Active Colab Model
            </label>
            <select
              className="select-input mono"
              style={{ width: '100%', fontSize: '0.82rem' }}
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
            >
              {modelChoices.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.76rem',
                fontWeight: 600,
                color: 'var(--text-secondary)',
                marginBottom: 4,
              }}
            >
              Temperature ({temperature.toFixed(1)})
            </label>
            <input
              type="range"
              min="0"
              max="1.5"
              step="0.1"
              value={temperature}
              onChange={(e) => setTemperature(Number(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>

          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.76rem',
                fontWeight: 600,
                color: 'var(--text-secondary)',
                marginBottom: 4,
              }}
            >
              Context Window
            </label>
            <select
              className="select-input"
              style={{ width: '100%' }}
              value={numCtx}
              onChange={(e) => setNumCtx(Number(e.target.value))}
            >
              <option value={2048}>2,048 tokens</option>
              <option value={4096}>4,096 tokens</option>
              <option value={8192}>8,192 tokens</option>
              <option value={16384}>16,384 tokens</option>
            </select>
          </div>

          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.76rem',
                fontWeight: 600,
                color: 'var(--text-secondary)',
                marginBottom: 4,
              }}
            >
              System Prompt
            </label>
            <textarea
              className="text-input"
              style={{ width: '100%', height: 92, padding: 10, resize: 'vertical' }}
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
            />
          </div>

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setMessages([])}
            disabled={messages.length === 0 || isStreaming}
          >
            <Eraser size={14} />
            Clear Conversation
          </button>
        </aside>

        {/* Main Chat Area */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="chat-messages">
            {messages.length === 0 ? (
              <div
                style={{
                  margin: 'auto',
                  textAlign: 'center',
                  maxWidth: 440,
                  color: 'var(--text-secondary)',
                }}
              >
                <div style={{ fontWeight: 700, fontSize: '0.98rem', color: 'var(--text-primary)' }}>
                  Connected to <code>{selectedModel}</code> via Ngrok
                </div>
                <p style={{ fontSize: '0.84rem', marginTop: 6 }}>
                  Send a message below to run GPU-accelerated Ollama inference on your Google Colab backend.
                </p>
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'center',
                    gap: 8,
                    marginTop: 14,
                  }}
                >
                  {[
                    'Explain how Flash Attention speeds up GPU inference.',
                    'Write a clean Python FastAPI health check endpoint.',
                    'Summarize 3 tips for optimizing Google Colab VRAM.',
                  ].map((sample) => (
                    <button
                      key={sample}
                      type="button"
                      className="chip"
                      onClick={() => handleSend(undefined, sample)}
                    >
                      {sample}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((m, idx) => (
                <div key={idx} className={`chat-bubble ${m.role}`}>
                  {m.content || (isStreaming && idx === messages.length - 1 ? 'Thinking...' : '')}
                </div>
              ))
            )}
            <div ref={endRef} />
          </div>

          {chatError && (
            <div
              style={{
                padding: '8px 12px',
                borderRadius: 8,
                background: 'var(--bg-rose-soft)',
                border: '1px solid #fecdd3',
                color: 'var(--rose)',
                fontSize: '0.82rem',
              }}
            >
              {chatError}
            </div>
          )}

          <form onSubmit={handleSend} style={{ display: 'flex', gap: 10 }}>
            <input
              type="text"
              className="text-input"
              style={{ flex: 1, height: 44 }}
              placeholder={`Message ${selectedModel} on Google Colab GPU...`}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={isStreaming}
            />
            <button
              type="submit"
              className="btn btn-primary"
              style={{ height: 44, padding: '0 20px' }}
              disabled={isStreaming || !prompt.trim()}
            >
              <Send size={16} />
              {isStreaming ? 'Streaming...' : 'Send'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
