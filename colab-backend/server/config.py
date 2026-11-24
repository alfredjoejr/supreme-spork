import os
import sys
from pathlib import Path

IS_LINUX = sys.platform.startswith("linux")
IS_COLAB = (
    "COLAB_GPU" in os.environ
    or "COLAB_RELEASE_TAG" in os.environ
    or Path("/content").exists()
)

DEFAULT_RUNNER_DIR = (
    Path("/content/ollama_runner")
    if IS_COLAB
    else Path(os.getcwd()) / ".ollama_runner"
)

RUNNER_DIR = Path(os.environ.get("OLLAMA_RUNNER_DIR", str(DEFAULT_RUNNER_DIR)))
RUNNER_DIR.mkdir(parents=True, exist_ok=True)

RUNNER_SCRIPT_PATH = RUNNER_DIR / "start_ollama.sh"
RUNNER_CONFIG_PATH = RUNNER_DIR / "runner_config.json"
OLLAMA_LOG_PATH = RUNNER_DIR / "ollama_server.log"

OLLAMA_HOST = os.environ.get("OLLAMA_INTERNAL_HOST", "http://127.0.0.1:11434")
BACKEND_PORT = int(os.environ.get("PORT", "8000"))
