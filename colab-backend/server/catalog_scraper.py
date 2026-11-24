import re
import time
from typing import Any, Dict, List
import httpx
from bs4 import BeautifulSoup

_CATALOG_CACHE: Dict[str, Any] = {"timestamp": 0.0, "models": []}
CACHE_TTL_SECONDS = 900  # 15 minutes

CURATED_MODELS: List[Dict[str, Any]] = [
    {
        "name": "llama3",
        "title": "Llama 3",
        "provider": "Meta",
        "category": "general",
        "featured": True,
        "description": "Meta Llama 3 — flagship open weights LLM optimized for dialogue, reasoning, and general tasks.",
        "tags": ["8b", "70b", "instruct"],
        "default_tag": "8b",
        "vram_hint": "5.5 GB (8b)",
        "pulls": "12M+",
        "capabilities": ["chat", "instruct"],
    },
    {
        "name": "llama3.2",
        "title": "Llama 3.2",
        "provider": "Meta",
        "category": "general",
        "featured": True,
        "description": "Lightweight 1B and 3B Llama models tailored for ultra-fast inference on Google Colab GPUs.",
        "tags": ["1b", "3b"],
        "default_tag": "3b",
        "vram_hint": "2.4 GB (3b)",
        "pulls": "9.5M+",
        "capabilities": ["chat", "tools"],
    },
    {
        "name": "llama3.1",
        "title": "Llama 3.1",
        "provider": "Meta",
        "category": "general",
        "featured": True,
        "description": "Long-context 128K Llama 3.1 model with strong tool calling and multilingual support.",
        "tags": ["8b", "70b"],
        "default_tag": "8b",
        "vram_hint": "5.5 GB (8b)",
        "pulls": "18M+",
        "capabilities": ["chat", "tools"],
    },
    {
        "name": "llama3.3",
        "title": "Llama 3.3",
        "provider": "Meta",
        "category": "general",
        "featured": False,
        "description": "High-efficiency 70B instruction-tuned model approaching 405B performance (requires A100 Colab).",
        "tags": ["70b"],
        "default_tag": "70b",
        "vram_hint": "43 GB (70b)",
        "pulls": "3.1M+",
        "capabilities": ["chat", "tools"],
    },
    {
        "name": "deepseek-r1",
        "title": "DeepSeek-R1",
        "provider": "DeepSeek",
        "category": "reasoning",
        "featured": True,
        "description": "Open reasoning models distilled into Colab-friendly 1.5B, 7B, 8B, and 14B sizes.",
        "tags": ["1.5b", "7b", "8b", "14b", "32b"],
        "default_tag": "8b",
        "vram_hint": "5.5 GB (8b)",
        "pulls": "22M+",
        "capabilities": ["reasoning", "chat"],
    },
    {
        "name": "gemma3",
        "title": "Gemma 3",
        "provider": "Google",
        "category": "vision",
        "featured": True,
        "description": "Google's multimodal Gemma 3 family running smoothly on a single Colab T4 GPU.",
        "tags": ["1b", "4b", "12b", "27b"],
        "default_tag": "4b",
        "vram_hint": "3.4 GB (4b)",
        "pulls": "5.8M+",
        "capabilities": ["chat", "vision"],
    },
    {
        "name": "gemma2",
        "title": "Gemma 2",
        "provider": "Google",
        "category": "general",
        "featured": False,
        "description": "High-performing 2B, 9B, and 27B open models designed by Google DeepMind.",
        "tags": ["2b", "9b", "27b"],
        "default_tag": "9b",
        "vram_hint": "6.2 GB (9b)",
        "pulls": "7.4M+",
        "capabilities": ["chat"],
    },
    {
        "name": "qwen2.5",
        "title": "Qwen 2.5",
        "provider": "Alibaba",
        "category": "general",
        "featured": True,
        "description": "Dense multilingual instruction models from 0.5B to 72B with structured JSON and tool support.",
        "tags": ["0.5b", "1.5b", "3b", "7b", "14b", "32b"],
        "default_tag": "7b",
        "vram_hint": "5.2 GB (7b)",
        "pulls": "11M+",
        "capabilities": ["chat", "tools"],
    },
    {
        "name": "qwen2.5-coder",
        "title": "Qwen 2.5 Coder",
        "provider": "Alibaba",
        "category": "coding",
        "featured": True,
        "description": "Code-specific Qwen 2.5 model excelling at code generation, debugging, and refactoring.",
        "tags": ["1.5b", "3b", "7b", "14b", "32b"],
        "default_tag": "7b",
        "vram_hint": "5.2 GB (7b)",
        "pulls": "6.3M+",
        "capabilities": ["coding", "tools"],
    },
    {
        "name": "mistral",
        "title": "Mistral 7B",
        "provider": "Mistral AI",
        "category": "general",
        "featured": True,
        "description": "Fast, reliable 7B model updated to v0.3 with function calling and 32K context.",
        "tags": ["7b", "latest"],
        "default_tag": "7b",
        "vram_hint": "4.8 GB (7b)",
        "pulls": "14M+",
        "capabilities": ["chat", "tools"],
    },
    {
        "name": "phi4",
        "title": "Phi-4",
        "provider": "Microsoft",
        "category": "reasoning",
        "featured": True,
        "description": "Microsoft's 14B state-of-the-art compact model for math, STEM, and analytical reasoning.",
        "tags": ["14b", "latest"],
        "default_tag": "14b",
        "vram_hint": "9.5 GB (14b)",
        "pulls": "3.9M+",
        "capabilities": ["reasoning", "chat"],
    },
    {
        "name": "codellama",
        "title": "Code Llama",
        "provider": "Meta",
        "category": "coding",
        "featured": False,
        "description": "Code generation and explanation model trained across Python, TypeScript, C++, Java, and Bash.",
        "tags": ["7b", "13b", "34b", "python"],
        "default_tag": "7b",
        "vram_hint": "4.6 GB (7b)",
        "pulls": "6.1M+",
        "capabilities": ["coding"],
    },
    {
        "name": "llava",
        "title": "LLaVA",
        "provider": "Haotian Liu",
        "category": "vision",
        "featured": False,
        "description": "Large Language and Vision Assistant connecting visual encoders with Vicuna/Mistral.",
        "tags": ["7b", "13b", "34b"],
        "default_tag": "7b",
        "vram_hint": "5.1 GB (7b)",
        "pulls": "5.2M+",
        "capabilities": ["vision", "chat"],
    },
    {
        "name": "nomic-embed-text",
        "title": "Nomic Embed Text",
        "provider": "Nomic AI",
        "category": "embedding",
        "featured": False,
        "description": "High-performing long-context text embedding model for RAG and semantic search.",
        "tags": ["latest", "v1.5"],
        "default_tag": "latest",
        "vram_hint": "0.6 GB",
        "pulls": "19M+",
        "capabilities": ["embedding"],
    },
]


async def fetch_ollama_library_catalog() -> List[Dict[str, Any]]:
    """Fetch all available models from ollama.com/library and merge with curated metadata."""
    now = time.time()
    if _CATALOG_CACHE["models"] and (now - _CATALOG_CACHE["timestamp"]) < CACHE_TTL_SECONDS:
        return _CATALOG_CACHE["models"]

    curated_by_name = {m["name"]: dict(m) for m in CURATED_MODELS}
    discovered: List[Dict[str, Any]] = []

    try:
        async with httpx.AsyncClient(timeout=8.0, follow_redirects=True) as client:
            resp = await client.get(
                "https://ollama.com/library",
                headers={"User-Agent": "Mozilla/5.0 OllamaCloudRunner/1.0"},
            )
            if resp.status_code == 200:
                soup = BeautifulSoup(resp.text, "html.parser")
                for link in soup.select('a[href^="/library/"]'):
                    href = link.get("href", "")
                    slug = href.replace("/library/", "").strip("/").split("/")[0]
                    if not slug or ":" in slug:
                        continue

                    if slug in curated_by_name:
                        discovered.append(curated_by_name.pop(slug))
                        continue

                    desc_el = link.find("p")
                    description = (
                        desc_el.get_text(" ", strip=True)
                        if desc_el
                        else f"Official {slug} model from the Ollama library."
                    )

                    badge_texts = [
                        s.get_text(strip=True)
                        for s in link.find_all("span")
                        if s.get_text(strip=True)
                    ]
                    size_tags = [
                        b.lower()
                        for b in badge_texts
                        if re.match(r"^\d+(\.\d+)?[bm]$|^e\d+b$", b.lower())
                    ]
                    capabilities = [
                        b.lower()
                        for b in badge_texts
                        if b.lower() in {"vision", "tools", "thinking", "embedding", "code"}
                    ]
                    if not size_tags:
                        size_tags = ["latest"]

                    category = "general"
                    if "embedding" in capabilities or "embed" in slug:
                        category = "embedding"
                    elif "vision" in capabilities or "vl" in slug:
                        category = "vision"
                    elif "thinking" in capabilities or "r1" in slug:
                        category = "reasoning"
                    elif "coder" in slug or "code" in slug:
                        category = "coding"

                    discovered.append(
                        {
                            "name": slug,
                            "title": slug.replace("-", " ").title(),
                            "provider": "Ollama Library",
                            "category": category,
                            "featured": False,
                            "description": description,
                            "tags": size_tags[:8],
                            "default_tag": size_tags[0],
                            "vram_hint": "Auto",
                            "pulls": "Library",
                            "capabilities": capabilities or ["chat"],
                        }
                    )
    except Exception:
        pass

    merged = list(CURATED_MODELS)
    seen = {m["name"] for m in merged}
    for item in discovered:
        if item["name"] not in seen:
            merged.append(item)
            seen.add(item["name"])

    _CATALOG_CACHE["timestamp"] = now
    _CATALOG_CACHE["models"] = merged
    return merged
