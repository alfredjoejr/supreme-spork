from typing import List, Optional, Literal
from pydantic import BaseModel, Field


class GpuMetrics(BaseModel):
    available: bool = False
    name: str = "No GPU Detected (CPU Runtime)"
    vram_total_mb: int = 0
    vram_used_mb: int = 0
    utilization_percent: int = 0
    driver_version: Optional[str] = None


class SystemMetrics(BaseModel):
    cpu_percent: float = 0.0
    ram_total_gb: float = 0.0
    ram_used_gb: float = 0.0
    disk_free_gb: float = 0.0
    disk_total_gb: float = 0.0
    platform_name: str = ""
    is_colab: bool = False


class InstalledModel(BaseModel):
    name: str
    size_bytes: int = 0
    size_gb: float = 0.0
    modified_at: Optional[str] = None
    family: Optional[str] = None
    parameter_size: Optional[str] = None
    quantization_level: Optional[str] = None


class ServerStatusResponse(BaseModel):
    connected: bool = True
    state: Literal["idle", "configuring", "starting", "pulling", "ready", "error"] = "idle"
    state_message: str = "Colab agent connected and awaiting configuration"
    ollama_installed: bool = False
    ollama_running: bool = False
    ollama_version: Optional[str] = None
    configured_ollama_version: str = "latest"
    active_model: Optional[str] = None
    loaded_models: List[str] = Field(default_factory=list)
    installed_models: List[InstalledModel] = Field(default_factory=list)
    gpu: GpuMetrics
    system: SystemMetrics
    ngrok_url: Optional[str] = None
    uptime_seconds: int = 0
    last_updated_script_at: Optional[str] = None


class DeployRequest(BaseModel):
    model: str = Field(..., description="Ollama model name and tag, e.g., llama3:8b")
    ollama_version: str = Field(
        default="latest",
        description="Ollama version to install/run (e.g. 'latest', '0.6.2', '0.5.7')",
    )
    num_ctx: int = Field(default=4096, ge=512, le=131072)
    keep_alive: str = Field(default="15m")
    flash_attention: bool = Field(default=True)
    restart_server: bool = Field(default=True)


class ChatMessage(BaseModel):
    role: Literal["system", "user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    model: Optional[str] = None
    messages: List[ChatMessage]
    temperature: float = Field(default=0.7, ge=0.0, le=2.0)
    num_ctx: int = Field(default=4096, ge=512, le=131072)
    stream: bool = True
