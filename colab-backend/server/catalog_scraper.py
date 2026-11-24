import re
import time
from typing import Any, Dict, List
import httpx
from bs4 import BeautifulSoup

_CATALOG_CACHE: Dict[str, Any] = {"timestamp": 0.0, "models": []}
CACHE_TTL_SECONDS = 900  # 15 minutes

CURATED_MODELS: List[Dict[str, Any]] = [
    {
        "name": "dolphin-llama3",
        "title": "Dolphin 2.9 Llama 3 (Uncensored)",
        "provider": "Eric Hartford / Cognitive Computations",
        "category": "uncensored",
        "featured": True,
        "uncensored": True,
        "high_vram": True,
        "description": "Flagship uncensored Llama 3 fine-tune with alignment and refusal guardrails removed. Available in 8B and full 70B for A100 GPUs.",
        "tags": ["8b", "70b", "8b-256k"],
        "default_tag": "70b",
        "vram_hint": "42 GB (70b A100) / 5.5 GB (8b)",
        "pulls": "4.8M+",
        "capabilities": ["uncensored", "chat", "coding"],
    },
    {
        "name": "huihui_ai/llama3.3-abliterated",
        "title": "Llama 3.3 70B Abliterated (Uncensored A100)",
        "provider": "Huihui AI (Meta Base)",
        "category": "uncensored",
        "featured": True,
        "uncensored": True,
        "high_vram": True,
        "description": "State-of-the-art 70B Llama 3.3 with refusal vectors surgically removed via weight abliteration while keeping full 70B intelligence.",
        "tags": ["70b", "latest"],
        "default_tag": "70b",
        "vram_hint": "43 GB VRAM (A100)",
        "pulls": "Community Top",
        "capabilities": ["uncensored", "chat", "tools"],
    },
    {
        "name": "huihui_ai/deepseek-r1-abliterated",
        "title": "DeepSeek-R1 Abliterated (Uncensored Reasoning)",
        "provider": "Huihui AI (DeepSeek Base)",
        "category": "uncensored",
        "featured": True,
        "uncensored": True,
        "high_vram": True,
        "description": "Uncensored DeepSeek-R1 chain-of-thought reasoning model with refusal triggers abliterated across 8B, 14B, 32B, and 70B A100 sizes.",
        "tags": ["8b", "14b", "32b", "70b"],
        "default_tag": "32b",
        "vram_hint": "20 GB (32b) / 43 GB (70b)",
        "pulls": "Community Top",
        "capabilities": ["uncensored", "reasoning"],
    },
    {
        "name": "dolphin-mixtral",
        "title": "Dolphin 2.7 Mixtral MoE (8x7B & 8x22B Uncensored)",
        "provider": "Eric Hartford",
        "category": "uncensored",
        "featured": True,
        "uncensored": True,
        "high_vram": True,
        "description": "Uncensored Mixture-of-Experts powerhouse trained on coding, roleplay, and unfiltered instruction datasets. Built for high-VRAM A100s.",
        "tags": ["8x7b", "8x22b"],
        "default_tag": "8x7b",
        "vram_hint": "27 GB (8x7b) / 80 GB (8x22b)",
        "pulls": "3.6M+",
        "capabilities": ["uncensored", "MoE", "coding"],
    },
    {
        "name": "hermes3",
        "title": "Nous Hermes 3 (8B / 70B Unfiltered)",
        "provider": "Nous Research",
        "category": "uncensored",
        "featured": True,
        "uncensored": True,
        "high_vram": True,
        "description": "Nous Research flagship unfiltered Llama 3.1 model engineered for neutral compliance, deep roleplay, function calling, and reasoning.",
        "tags": ["3b", "8b", "70b"],
        "default_tag": "70b",
        "vram_hint": "42 GB (70b A100) / 5.5 GB (8b)",
        "pulls": "2.4M+",
        "capabilities": ["uncensored", "chat", "tools"],
    },
    {
        "name": "huihui_ai/qwen2.5-abliterated",
        "title": "Qwen 2.5 Abliterated (Up to 72B Uncensored)",
        "provider": "Huihui AI (Alibaba Base)",
        "category": "uncensored",
        "featured": True,
        "uncensored": True,
        "high_vram": True,
        "description": "Uncensored Qwen 2.5 series with refusal directions removed from activation space. Available up to massive 32B and 72B checkpoints.",
        "tags": ["7b", "14b", "32b", "72b"],
        "default_tag": "32b",
        "vram_hint": "20 GB (32b) / 45 GB (72b)",
        "pulls": "Community Top",
        "capabilities": ["uncensored", "chat"],
    },
    {
        "name": "huihui_ai/qwen2.5-coder-abliterated",
        "title": "Qwen 2.5 Coder Abliterated (Uncensored Code)",
        "provider": "Huihui AI",
        "category": "uncensored",
        "featured": True,
        "uncensored": True,
        "high_vram": True,
        "description": "Uncensored coding, reverse-engineering, and security auditing model without code-generation refusals. Up to 32B parameters.",
        "tags": ["7b", "14b", "32b"],
        "default_tag": "32b",
        "vram_hint": "20 GB (32b A100) / 9.5 GB (14b)",
        "pulls": "Community Top",
        "capabilities": ["uncensored", "coding"],
    },
    {
        "name": "openhermes",
        "title": "OpenHermes 2.5 Mistral (Uncensored)",
        "provider": "Teknium / Nous Research",
        "category": "uncensored",
        "featured": True,
        "uncensored": True,
        "high_vram": False,
        "description": "Highly acclaimed uncensored Mistral 7B fine-tune by Teknium trained on unfiltered code, roleplay, and general instruction data.",
        "tags": ["latest", "v2.5"],
        "default_tag": "latest",
        "vram_hint": "4.8 GB VRAM (7b)",
        "pulls": "2.8M+",
        "capabilities": ["uncensored", "chat", "coding"],
    },
    {
        "name": "dolphin3",
        "title": "Dolphin 3.0 (Llama 3.1 8B Uncensored)",
        "provider": "Cognitive Computations",
        "category": "uncensored",
        "featured": True,
        "uncensored": True,
        "description": "Latest generation Dolphin 3.0 steering-controlled uncensored model giving full system-prompt control to the user.",
        "tags": ["8b", "latest"],
        "default_tag": "8b",
        "vram_hint": "5.5 GB VRAM (8b)",
        "pulls": "1.1M+",
        "capabilities": ["uncensored", "chat", "coding"],
    },
    {
        "name": "wizard-vicuna-uncensored",
        "title": "Wizard Vicuna Uncensored (7B / 13B / 30B)",
        "provider": "Eric Hartford",
        "category": "uncensored",
        "featured": True,
        "uncensored": True,
        "high_vram": True,
        "description": "Classic Evol-Instruct uncensored model trained against a dataset stripped of alignment lectures and refusals.",
        "tags": ["7b", "13b", "30b"],
        "default_tag": "30b",
        "vram_hint": "19 GB (30b A100) / 8.5 GB (13b)",
        "pulls": "2.9M+",
        "capabilities": ["uncensored", "chat"],
    },
    {
        "name": "nous-hermes2-mixtral",
        "title": "Nous Hermes 2 Mixtral 8x7B (Unfiltered MoE)",
        "provider": "Nous Research",
        "category": "uncensored",
        "featured": True,
        "uncensored": True,
        "high_vram": True,
        "description": "High-VRAM 8x7B Mixture-of-Experts model by Nous Research trained on 1M+ primarily synthetic unfiltered instructions.",
        "tags": ["8x7b", "dpo"],
        "default_tag": "8x7b",
        "vram_hint": "27 GB VRAM (A100)",
        "pulls": "1.7M+",
        "capabilities": ["uncensored", "MoE"],
    },
    {
        "name": "dolphin-mistral",
        "title": "Dolphin 2.8 Mistral 7B (Uncensored)",
        "provider": "Eric Hartford",
        "category": "uncensored",
        "featured": False,
        "uncensored": True,
        "description": "Fast, uninhibited Mistral 7B fine-tune that obeys any system prompt without refusals.",
        "tags": ["7b", "latest"],
        "default_tag": "7b",
        "vram_hint": "4.8 GB VRAM (7b)",
        "pulls": "3.4M+",
        "capabilities": ["uncensored", "chat"],
    },
    {
        "name": "llama2-uncensored",
        "title": "Llama 2 Uncensored (7B & 70B)",
        "provider": "George Sung / Eric Hartford",
        "category": "uncensored",
        "featured": False,
        "uncensored": True,
        "high_vram": True,
        "description": "Uncensored Llama 2 7B and 70B models fine-tuned on unfiltered conversation datasets.",
        "tags": ["7b", "70b"],
        "default_tag": "70b",
        "vram_hint": "40 GB (70b A100) / 4.5 GB (7b)",
        "pulls": "4.2M+",
        "capabilities": ["uncensored", "chat"],
    },
    {
        "name": "wizardlm-uncensored",
        "title": "WizardLM Uncensored 13B",
        "provider": "Eric Hartford",
        "category": "uncensored",
        "featured": False,
        "uncensored": True,
        "description": "Uncensored 13B WizardLM variant for unrestricted complex instruction following.",
        "tags": ["13b", "latest"],
        "default_tag": "13b",
        "vram_hint": "8.5 GB VRAM (13b)",
        "pulls": "1.5M+",
        "capabilities": ["uncensored", "chat"],
    },
    {
        "name": "samantha-mistral",
        "title": "Samantha Mistral (Uncensored Companion)",
        "provider": "Eric Hartford",
        "category": "uncensored",
        "featured": False,
        "uncensored": True,
        "description": "Uncensored philosophy, psychology, and personal companion model trained on Mistral 7B.",
        "tags": ["7b", "latest"],
        "default_tag": "7b",
        "vram_hint": "4.8 GB VRAM (7b)",
        "pulls": "950K+",
        "capabilities": ["uncensored", "chat"],
    },
    {
        "name": "llama3.3",
        "title": "Llama 3.3 70B",
        "provider": "Meta",
        "category": "general",
        "featured": True,
        "high_vram": True,
        "description": "High-efficiency 70B instruction-tuned model approaching 405B performance on A100 Colab.",
        "tags": ["70b"],
        "default_tag": "70b",
        "vram_hint": "43 GB (70b)",
        "pulls": "3.1M+",
        "capabilities": ["chat", "tools"],
    },
    {
        "name": "llama3",
        "title": "Llama 3",
        "provider": "Meta",
        "category": "general",
        "featured": True,
        "high_vram": True,
        "description": "Meta Llama 3 — flagship open weights LLM optimized for dialogue, reasoning, and general tasks.",
        "tags": ["8b", "70b", "instruct"],
        "default_tag": "8b",
        "vram_hint": "5.5 GB (8b) / 42 GB (70b)",
        "pulls": "12M+",
        "capabilities": ["chat", "instruct"],
    },
    {
        "name": "deepseek-r1",
        "title": "DeepSeek-R1",
        "provider": "DeepSeek",
        "category": "reasoning",
        "featured": True,
        "high_vram": True,
        "description": "Open reasoning models across 1.5B, 7B, 8B, 14B, 32B, and 70B sizes.",
        "tags": ["1.5b", "7b", "8b", "14b", "32b", "70b"],
        "default_tag": "32b",
        "vram_hint": "20 GB (32b) / 43 GB (70b)",
        "pulls": "22M+",
        "capabilities": ["reasoning", "chat"],
    },
    {
        "name": "qwen2.5",
        "title": "Qwen 2.5",
        "provider": "Alibaba",
        "category": "general",
        "featured": True,
        "high_vram": True,
        "description": "Dense multilingual instruction models from 3B up to 72B with structured JSON and tool support.",
        "tags": ["3b", "7b", "14b", "32b", "72b"],
        "default_tag": "32b",
        "vram_hint": "20 GB (32b) / 45 GB (72b)",
        "pulls": "11M+",
        "capabilities": ["chat", "tools"],
    },
]


async def fetch_ollama_library_catalog() -> List[Dict[str, Any]]:
    """Fetch all available models from ollama.com/library and merge with curated uncensored metadata."""
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
                        if re.match(r"^\d+(x\d+)?(\.\d+)?[bm]$|^e\d+b$", b.lower())
                    ]
                    capabilities = [
                        b.lower()
                        for b in badge_texts
                        if b.lower() in {"vision", "tools", "thinking", "embedding", "code"}
                    ]
                    if not size_tags:
                        size_tags = ["latest"]

                    is_uncensored = any(
                        kw in slug.lower() or kw in description.lower()
                        for kw in ("uncensored", "dolphin", "abliterated", "hermes", "samantha")
                    )
                    is_high_vram = any(
                        t in size_tags for t in ("27b", "30b", "32b", "34b", "70b", "72b", "8x7b", "8x22b")
                    )

                    category = "uncensored" if is_uncensored else "general"
                    if not is_uncensored:
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
                            "uncensored": is_uncensored,
                            "high_vram": is_high_vram,
                            "description": description,
                            "tags": size_tags[:8],
                            "default_tag": size_tags[-1] if is_high_vram else size_tags[0],
                            "vram_hint": "Auto",
                            "pulls": "Library",
                            "capabilities": (["uncensored"] if is_uncensored else []) + (capabilities or ["chat"]),
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
