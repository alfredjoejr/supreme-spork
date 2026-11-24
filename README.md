# Ollama Cloud Runner

A light-themed web control plane for running **Ollama** models on **Google Colab GPUs** and communicating directly with the frontend through **ngrok**.

---

## Architecture & Workflow

1. **Google Colab GPU Backend (`colab-backend/`)**:
   - Runs a lightweight FastAPI control agent inside Google Colab exposed via **ngrok**.
   - Reports real-time **Colab Machine Status** (`nvidia-smi` GPU model, VRAM usage, RAM, free disk, Ollama daemon health, and active model).
   - Scrapes `ollama.com/library` dynamically (combined with curated T4-friendly metadata) to list **all Ollama models**.
   - When you choose a model (for example `llama3:8b`) and engine version in the web app and click **OK — Update & Start Server**, the Colab backend:
     1. Rewrites `/content/ollama_runner/start_ollama.sh` and `runner_config.json` on the Colab VM.
     2. Installs or updates the requested **Ollama** version if needed.
     3. Starts (or restarts) `ollama serve` on the Colab GPU.
     4. Pulls the selected model and streams live download progress over ngrok to the frontend.
     5. Pre-loads the model into GPU VRAM and opens streaming chat completions.

2. **Web Frontend (`frontend/`)**:
   - Clean, light-colored React + TypeScript + Vite web application.
   - **Step 1 — Colab Server Status Gate**: Verifies whether the Colab machine is connected (`Connected — Ready to proceed`) and displays live GPU/VRAM telemetry and RTT latency. Includes a built-in **Preview Demo Mode** simulator to test the UI before opening Colab.
   - **Step 2 — Ollama Model Browser & Deployer**: Search and filter across all Ollama models, pick parameter tags (`1b`, `3b`, `7b`, `8b`, `14b`, `70b`) or custom tags, select the Ollama engine version, and click **OK** to update and launch the Colab server.
   - **Chat Playground & Live Server Code Viewer**: Chat with your deployed model over ngrok and inspect the live generated `start_ollama.sh` script and `ollama_server.log` on Colab.

---

## Project Structure

```text
OllamaCloudRunner/
├── README.md
├── .gitignore
├── colab-backend/
│   ├── Ollama_Cloud_Runner.ipynb    # Self-contained Google Colab GPU notebook
│   ├── requirements.txt             # Backend Python dependencies
│   └── server/
│       ├── __init__.py
│       ├── config.py                # Paths & environment settings
│       ├── models.py                # Pydantic request/response schemas
│       ├── gpu_monitor.py           # NVIDIA GPU (nvidia-smi) & VM metrics
│       ├── catalog_scraper.py       # Live Ollama library scraper + curated presets
│       ├── ollama_manager.py        # Script generator, daemon manager, model puller
│       └── main.py                  # FastAPI server + CORS + pyngrok launcher
└── frontend/
    ├── index.html
    ├── package.json
    ├── tsconfig.json
    ├── vite.config.ts
    └── src/
        ├── main.tsx
        ├── App.tsx
        ├── index.css                # Light color palette & layout styles
        ├── types/
        │   └── api.ts
        ├── data/
        │   └── fallbackCatalog.ts
        ├── services/
        │   └── colabApi.ts          # Ngrok client (with ngrok-skip-browser-warning)
        ├── hooks/
        │   └── useColabConnection.ts
        └── components/
            ├── Header.tsx
            ├── ConnectionBanner.tsx
            ├── ModelBrowser.tsx
            ├── DeployModal.tsx
            ├── ChatPlayground.tsx
            └── ServerScriptViewer.tsx
```

---

## Getting Started

### 1. Start the Google Colab Backend
1. Open [Google Colab](https://colab.research.google.com/) and upload `colab-backend/Ollama_Cloud_Runner.ipynb`.
2. Switch runtime to GPU: **Runtime → Change runtime type → T4 GPU**.
3. Copy your free ngrok authtoken from [dashboard.ngrok.com](https://dashboard.ngrok.com/get-started/your-authtoken).
4. Run all 3 cells in the notebook and copy the printed `https://xxxx.ngrok-free.app` URL.

### 2. Run the Web Frontend
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173`, paste your ngrok URL into the **Google Colab Server Status** bar, wait for **Connected — Ready to proceed**, select any Ollama model (e.g., **Llama 3**), and click **OK — Update & Start Server**.

---

## ⚡ One-Click PowerShell Scripts (Windows)

We provide dedicated one-click PowerShell scripts in the root directory:

1. **Start Both (Full Stack)**:
   ```powershell
   .\start-all.ps1
   ```
   *Spawns backend and frontend in separate dedicated PowerShell windows.*

2. **Start Frontend Only**:
   ```powershell
   .\start-frontend.ps1
   ```
   *Auto-installs dependencies if needed and launches the Vite dev server with browser auto-open.*

3. **Start Backend Agent Only**:
   ```powershell
   .\start-backend.ps1
   ```
   *Optional ngrok exposure:*
   ```powershell
   .\start-backend.ps1 -NgrokToken "<your_ngrok_token>"
   ```

