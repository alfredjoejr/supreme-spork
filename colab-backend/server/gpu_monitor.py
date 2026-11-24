import platform
import shutil
import subprocess
import psutil

from .config import DRIVE_APP_DIR, IS_COLAB, RUNNER_DIR, get_active_storage_dirs
from .models import DriveStatus, GpuMetrics, SystemMetrics


def get_gpu_metrics() -> GpuMetrics:
    """Query NVIDIA GPU telemetry on Google Colab using nvidia-smi."""
    try:
        result = subprocess.run(
            [
                "nvidia-smi",
                "--query-gpu=name,memory.total,memory.used,utilization.gpu,driver_version",
                "--format=csv,noheader,nounits",
            ],
            capture_output=True,
            text=True,
            timeout=3,
            check=False,
        )
        if result.returncode == 0 and result.stdout.strip():
            first_line = result.stdout.strip().splitlines()[0]
            parts = [p.strip() for p in first_line.split(",")]
            if len(parts) >= 5:
                return GpuMetrics(
                    available=True,
                    name=parts[0],
                    vram_total_mb=int(float(parts[1])),
                    vram_used_mb=int(float(parts[2])),
                    utilization_percent=int(float(parts[3])),
                    driver_version=parts[4],
                )
    except Exception:
        pass

    return GpuMetrics(available=False)


def get_system_metrics() -> SystemMetrics:
    """Collect RAM, CPU, and Disk metrics for the Colab VM."""
    vm = psutil.virtual_memory()
    disk_target = str(RUNNER_DIR) if RUNNER_DIR.exists() else "/"
    disk = shutil.disk_usage(disk_target)

    return SystemMetrics(
        cpu_percent=round(psutil.cpu_percent(interval=None), 1),
        ram_total_gb=round(vm.total / (1024**3), 2),
        ram_used_gb=round(vm.used / (1024**3), 2),
        disk_free_gb=round(disk.free / (1024**3), 2),
        disk_total_gb=round(disk.total / (1024**3), 2),
        platform_name=f"{platform.system()} {platform.release()}",
        is_colab=IS_COLAB,
    )


def get_drive_status(models_on_drive: bool = False) -> DriveStatus:
    """Report Google Drive mount status and free space for /content/drive/MyDrive/OllamaCloudRunner."""
    _, _, _, using_drive = get_active_storage_dirs()
    if using_drive:
        try:
            usage = shutil.disk_usage(str(DRIVE_APP_DIR))
            return DriveStatus(
                mounted=True,
                folder_path=DRIVE_APP_DIR.as_posix(),
                models_on_drive=models_on_drive,
                drive_free_gb=round(usage.free / (1024**3), 2),
                drive_total_gb=round(usage.total / (1024**3), 2),
            )
        except Exception:
            pass
    return DriveStatus(
        mounted=False,
        folder_path=DRIVE_APP_DIR.as_posix(),
        models_on_drive=False,
        drive_free_gb=0.0,
        drive_total_gb=0.0,
    )
