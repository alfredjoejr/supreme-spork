export interface GpuMetrics {
  available: boolean;
  name: string;
  vram_total_mb: number;
  vram_used_mb: number;
  utilization_percent: number;
  driver_version?: string | null;
}

export interface SystemMetrics {
  cpu_percent: number;
  ram_total_gb: number;
  ram_used_gb: number;
  disk_free_gb: number;
  disk_total_gb: number;
  platform_name: string;
  is_colab: boolean;
}

export interface DriveStatus {
  mounted: boolean;
  folder_path: string;
  models_on_drive: boolean;
  drive_free_gb: number;
  drive_total_gb: number;
}

export interface InstalledModel {
  name: string;
  size_bytes: number;
  size_gb: number;
  modified_at?: string | null;
  family?: string | null;
  parameter_size?: string | null;
  quantization_level?: string | null;
}

export type ServerState = 'idle' | 'configuring' | 'starting' | 'pulling' | 'ready' | 'error';

export interface ServerStatusResponse {
  connected: boolean;
  state: ServerState;
  state_message: string;
  ollama_installed: boolean;
  ollama_running: boolean;
  ollama_version?: string | null;
  configured_ollama_version: string;
  active_model?: string | null;
  loaded_models: string[];
  installed_models: InstalledModel[];
  gpu: GpuMetrics;
  system: SystemMetrics;
  drive?: DriveStatus;
  ngrok_url?: string | null;
  uptime_seconds: number;
  last_updated_script_at?: string | null;
}

export interface CatalogModel {
  name: string;
  title: string;
  provider: string;
  category: 'uncensored' | 'general' | 'reasoning' | 'coding' | 'vision' | 'embedding' | string;
  featured: boolean;
  uncensored?: boolean;
  high_vram?: boolean;
  description: string;
  tags: string[];
  default_tag: string;
  vram_hint: string;
  pulls: string;
  capabilities: string[];
  is_installed?: boolean;
}

export interface DeployRequest {
  model: string;
  ollama_version: string;
  num_ctx: number;
  keep_alive: string;
  flash_attention: boolean;
  restart_server: boolean;
  store_models_on_drive?: boolean;
}

export interface MemoryStatePayload {
  memory_notes: string;
  system_prompt: string;
  messages: ChatMessage[];
  updated_at?: string | null;
  storage_location: string;
  on_google_drive: boolean;
}

export interface DeployStreamEvent {
  step: string;
  message: string;
  progress?: number;
  download_percent?: number;
  active_model?: string;
  config?: Record<string, unknown>;
}

export interface RunnerCodeResponse {
  script_path: string;
  config_path: string;
  log_path: string;
  script: string;
  config: Record<string, unknown>;
  logs: string;
  last_updated_at?: string | null;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}
