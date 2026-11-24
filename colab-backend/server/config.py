import os
import sys
from pathlib import Path
from typing import Tuple

IS_LINUX = sys.platform.startswith("linux")
IS_COLAB = (
    "COLAB_GPU" in os.environ
    or "COLAB_RELEASE_TAG" in os.environ
    or Path("/content").exists()
)

DRIVE_MOUNT_BASE = Path(os.environ.get("COLAB_DRIVE_MOUNT", "/content/drive/MyDrive"))
DRIVE_APP_FOLDER_NAME = "OllamaCloudRunner"
DRIVE_APP_DIR = DRIVE_MOUNT_BASE / DRIVE_APP_FOLDER_NAME

DEFAULT_RUNNER_DIR = (
    Path("/content/ollama_runner")
    if IS_COLAB
    else Path(os.getcwd()) / ".ollama_runner"
)

LOCAL_RUNNER_DIR = Path(os.environ.get("OLLAMA_RUNNER_DIR", str(DEFAULT_RUNNER_DIR)))
LOCAL_RUNNER_DIR.mkdir(parents=True, exist_ok=True)


def is_drive_mounted() -> bool:
    """Return True if Google Drive is mounted in the Colab runtime."""
    return DRIVE_MOUNT_BASE.exists() and DRIVE_MOUNT_BASE.is_dir()


def get_active_storage_dirs() -> Tuple[Path, Path, Path, bool]:
    """
    Return (config_dir, memory_dir, models_dir, using_drive).
    When Google Drive is mounted at /content/drive/MyDrive, automatically creates and uses:
      /content/drive/MyDrive/OllamaCloudRunner/{config,memory,models}
    so zero local bandwidth is used and all state persists across Colab restarts.
    """
    if is_drive_mounted():
        config_dir = DRIVE_APP_DIR / "config"
        memory_dir = DRIVE_APP_DIR / "memory"
        models_dir = DRIVE_APP_DIR / "models"
        for d in (config_dir, memory_dir, models_dir):
            d.mkdir(parents=True, exist_ok=True)
        return config_dir, memory_dir, models_dir, True

    config_dir = LOCAL_RUNNER_DIR / "config"
    memory_dir = LOCAL_RUNNER_DIR / "memory"
    models_dir = LOCAL_RUNNER_DIR / "models"
    for d in (config_dir, memory_dir, models_dir):
        d.mkdir(parents=True, exist_ok=True)
    return config_dir, memory_dir, models_dir, False


RUNNER_DIR = LOCAL_RUNNER_DIR
RUNNER_SCRIPT_PATH = LOCAL_RUNNER_DIR / "start_ollama.sh"
RUNNER_CONFIG_PATH = LOCAL_RUNNER_DIR / "runner_config.json"
OLLAMA_LOG_PATH = LOCAL_RUNNER_DIR / "ollama_server.log"

OLLAMA_HOST = os.environ.get("OLLAMA_INTERNAL_HOST", "http://127.0.0.1:11434")
BACKEND_PORT = int(os.environ.get("PORT", "8000"))
