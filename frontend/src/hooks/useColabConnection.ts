import { useCallback, useEffect, useRef, useState } from 'react';
import { DEMO_MODE_URL, fetchColabStatus } from '../services/colabApi';
import { ServerStatusResponse } from '../types/api';

const STORAGE_KEY = 'ollama_cloud_runner_ngrok_url';

export type ConnectionPhase = 'disconnected' | 'connecting' | 'connected' | 'error';

export function useColabConnection() {
  const [ngrokUrl, setNgrokUrl] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEY) || '';
  });
  const [phase, setPhase] = useState<ConnectionPhase>('disconnected');
  const [status, setStatus] = useState<ServerStatusResponse | null>(null);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const activeUrlRef = useRef<string>(ngrokUrl);
  activeUrlRef.current = ngrokUrl;

  const checkStatus = useCallback(async (targetUrl?: string, silent = false) => {
    const urlToUse = (targetUrl ?? activeUrlRef.current).trim();
    if (!urlToUse) {
      setPhase('disconnected');
      setStatus(null);
      setLatencyMs(null);
      setErrorMsg(null);
      return false;
    }

    if (!silent) {
      setPhase('connecting');
      setErrorMsg(null);
    }

    try {
      const res = await fetchColabStatus(urlToUse);
      setStatus(res.status);
      setLatencyMs(res.latencyMs);
      setPhase('connected');
      setErrorMsg(null);
      localStorage.setItem(STORAGE_KEY, urlToUse);
      return true;
    } catch (err) {
      const message =
        err instanceof Error
          ? err.name === 'AbortError'
            ? 'Connection timed out reaching Colab ngrok tunnel.'
            : err.message
          : 'Unable to reach Google Colab backend.';
      setPhase('error');
      setStatus(null);
      setLatencyMs(null);
      setErrorMsg(message);
      return false;
    }
  }, []);

  const connectToUrl = useCallback(
    async (newUrl: string) => {
      const cleaned = newUrl.trim().replace(/\/+$/, '');
      setNgrokUrl(cleaned);
      activeUrlRef.current = cleaned;
      return checkStatus(cleaned, false);
    },
    [checkStatus]
  );

  const activateDemoSimulator = useCallback(async () => {
    return connectToUrl(DEMO_MODE_URL);
  }, [connectToUrl]);

  const disconnect = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setNgrokUrl('');
    activeUrlRef.current = '';
    setPhase('disconnected');
    setStatus(null);
    setLatencyMs(null);
    setErrorMsg(null);
  }, []);

  // Auto-connect if stored URL exists on mount
  useEffect(() => {
    if (ngrokUrl) {
      checkStatus(ngrokUrl, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Poll every 6 seconds while connected
  useEffect(() => {
    if (phase !== 'connected' || !ngrokUrl) return;
    const id = window.setInterval(() => {
      checkStatus(ngrokUrl, true);
    }, 6000);
    return () => window.clearInterval(id);
  }, [phase, ngrokUrl, checkStatus]);

  return {
    ngrokUrl,
    phase,
    isConnected: phase === 'connected' && Boolean(status?.connected),
    isDemo: ngrokUrl === DEMO_MODE_URL,
    status,
    latencyMs,
    errorMsg,
    connectToUrl,
    activateDemoSimulator,
    disconnect,
    refreshStatus: () => checkStatus(ngrokUrl, true),
  };
}
