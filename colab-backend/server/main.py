import argparse
import os
import time
from typing import Optional
import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from .catalog_scraper import fetch_ollama_library_catalog
from .config import BACKEND_PORT
from .gpu_monitor import get_gpu_metrics, get_system_metrics
from .models import ChatRequest, DeployRequest, ServerStatusResponse
from .ollama_manager import OllamaManager

app = FastAPI(
    title="Ollama Cloud Runner - Google Colab Backend",
    description="Control agent and API gateway bridging Google Colab GPUs to the Ollama Cloud Runner frontend via ngrok.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

manager = OllamaManager()
PUBLIC_NGROK_URL: Optional[str] = os.environ.get("PUBLIC_NGROK_URL")


@app.get("/")
async def root():
    return {
        "service": "Ollama Cloud Runner (Google Colab Backend)",
        "connected": True,
        "ngrok_url": PUBLIC_NGROK_URL,
        "active_model": manager.active_model,
    }


@app.get("/api/status", response_model=ServerStatusResponse)
async def get_server_status():
    ollama_running = await manager.is_ollama_running()
    ollama_version = await manager.get_ollama_version()
    installed = await manager.get_installed_models() if ollama_running else []
    loaded = await manager.get_loaded_models() if ollama_running else []

    active = manager.active_model
    if not active and loaded:
        active = loaded[0]

    state = manager.state
    if ollama_running and state == "idle" and active:
        state = "ready"

    return ServerStatusResponse(
        connected=True,
        state=state,  # type: ignore[arg-type]
        state_message=manager.state_message,
        ollama_installed=manager.is_ollama_installed(),
        ollama_running=ollama_running,
        ollama_version=ollama_version,
        configured_ollama_version=manager.configured_ollama_version,
        active_model=active,
        loaded_models=loaded,
        installed_models=installed,
        gpu=get_gpu_metrics(),
        system=get_system_metrics(),
        ngrok_url=PUBLIC_NGROK_URL,
        uptime_seconds=int(time.time() - manager.started_at),
        last_updated_script_at=manager.last_updated_script_at,
    )


@app.get("/api/models/catalog")
async def list_catalog():
    catalog = await fetch_ollama_library_catalog()
    installed = await manager.get_installed_models()
    installed_names = {m.name for m in installed}
    installed_bases = {m.name.split(":")[0] for m in installed}

    enriched = []
    for item in catalog:
        copy_item = dict(item)
        copy_item["is_installed"] = (
            item["name"] in installed_bases or f"{item['name']}:{item['default_tag']}" in installed_names
        )
        enriched.append(copy_item)

    return {
        "count": len(enriched),
        "installed": [m.model_dump() for m in installed],
        "models": enriched,
    }


@app.get("/api/models/installed")
async def list_installed_models():
    installed = await manager.get_installed_models()
    loaded = await manager.get_loaded_models()
    return {
        "installed": [m.model_dump() for m in installed],
        "loaded": loaded,
    }


@app.delete("/api/models/{model_name:path}")
async def remove_model(model_name: str):
    if not await manager.is_ollama_running():
        raise HTTPException(status_code=400, detail="Ollama server is not currently running.")
    return await manager.delete_model(model_name)


@app.get("/api/server/code")
async def inspect_server_code():
    return manager.get_runner_code_and_logs()


@app.post("/api/server/deploy")
async def deploy_server(req: DeployRequest):
    return StreamingResponse(
        manager.deploy_and_start(req),
        media_type="application/x-ndjson",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@app.post("/api/server/stop")
async def stop_server():
    await manager.unload_vram_models(exclude_model=None)
    return await manager.stop_ollama()


@app.post("/api/server/unload")
async def unload_vram():
    unloaded = await manager.unload_vram_models(exclude_model=None)
    manager.active_model = None
    return {"unloaded_models": unloaded}


@app.post("/api/models/switch")
async def switch_model(payload: dict):
    target = payload.get("model")
    num_ctx = int(payload.get("num_ctx", 4096))
    if not target:
        raise HTTPException(status_code=400, detail="Missing 'model' field.")
    return await manager.switch_active_model(target, num_ctx=num_ctx)


@app.post("/api/chat")
async def chat_completion(req: ChatRequest):
    return StreamingResponse(
        manager.stream_chat(req),
        media_type="application/x-ndjson",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


def start_with_ngrok(port: int = BACKEND_PORT, ngrok_token: Optional[str] = None) -> None:
    global PUBLIC_NGROK_URL
    token = ngrok_token or os.environ.get("NGROK_AUTHTOKEN")
    if token:
        from pyngrok import conf, ngrok

        conf.get_default().auth_token = token
        ngrok.kill()
        tunnel = ngrok.connect(addr=port, proto="http")
        PUBLIC_NGROK_URL = tunnel.public_url
        os.environ["PUBLIC_NGROK_URL"] = PUBLIC_NGROK_URL
        print("\n" + "=" * 72)
        print("  OLLAMA CLOUD RUNNER - GOOGLE COLAB BACKEND IS LIVE!")
        print(f"  Ngrok URL (Paste into Web App): {PUBLIC_NGROK_URL}")
        print(f"  Health Check                  : {PUBLIC_NGROK_URL}/api/status")
        print("=" * 72 + "\n")
    else:
        print("\n" + "=" * 72)
        print(f"  Running locally without ngrok at: http://127.0.0.1:{port}")
        print("  (Pass --ngrok-token or set NGROK_AUTHTOKEN to expose via ngrok)")
        print("=" * 72 + "\n")

    uvicorn.run(app, host="0.0.0.0", port=port, log_level="info")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Start Ollama Cloud Runner Backend")
    parser.add_argument("--port", type=int, default=BACKEND_PORT)
    parser.add_argument("--ngrok-token", type=str, default=None)
    args = parser.parse_args()
    start_with_ngrok(port=args.port, ngrok_token=args.ngrok_token)
