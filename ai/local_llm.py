import os
import json
import time
import requests
from dotenv import load_dotenv

load_dotenv()

CONFIG_FILE = os.path.join(os.path.dirname(__file__), 'local_llm_config.json')

DEFAULT_CONFIG = {
    "provider": "ollama",          # "ollama", "local_openai", "gemini"
    "ollama_url": "http://localhost:11434",
    "openai_url": "http://localhost:1234/v1",
    "model": "llama3.2",
    "temperature": 0.2,
    "timeout": 45
}

def get_llm_config():
    merged = dict(DEFAULT_CONFIG)
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
                cfg = json.load(f)
                merged.update(cfg)
        except Exception:
            pass
    prov = merged.get("provider", "ollama")
    merged["base_url"] = merged.get("ollama_url") if prov == "ollama" else merged.get("openai_url")
    merged["model_name"] = merged.get("model", "llama3.2")
    return merged

def save_llm_config(cfg_updates):
    current = get_llm_config()
    prov = cfg_updates.get("provider", current.get("provider", "ollama"))
    if "base_url" in cfg_updates:
        if prov == "ollama":
            current["ollama_url"] = cfg_updates["base_url"]
        else:
            current["openai_url"] = cfg_updates["base_url"]
    if "model_name" in cfg_updates:
        current["model"] = cfg_updates["model_name"]
    current.update(cfg_updates)
    current["base_url"] = current.get("ollama_url") if prov == "ollama" else current.get("openai_url")
    current["model_name"] = current.get("model", "llama3.2")
    try:
        with open(CONFIG_FILE, 'w', encoding='utf-8') as f:
            json.dump(current, f, indent=2)
    except Exception as e:
        print(f"Error saving local LLM config: {e}")
    return current

def detect_local_models():
    """
    Auto-detects running local model instances (Ollama, LM Studio / LocalAI / vLLM)
    and queries available models.
    """
    config = get_llm_config()
    results = {
        "ollama": {"connected": False, "models": [], "url": config.get("ollama_url", "http://localhost:11434")},
        "local_openai": {"connected": False, "models": [], "url": config.get("openai_url", "http://localhost:1234/v1")},
        "gemini": {"connected": bool(os.getenv("GEMINI_API_KEY", "").strip())},
        "active_provider": config.get("provider", "ollama"),
        "active_model": config.get("model", "llama3.2")
    }

    # 1. Check Ollama
    try:
        ollama_base = config.get("ollama_url", "http://localhost:11434").rstrip('/')
        r = requests.get(f"{ollama_base}/api/tags", timeout=3)
        if r.status_code == 200:
            data = r.json()
            models = [m.get("name") for m in data.get("models", []) if m.get("name")]
            results["ollama"]["connected"] = True
            results["ollama"]["models"] = models
    except Exception:
        pass

    # 2. Check OpenAI Compatible (LM Studio / vLLM / Jan / LocalAI)
    try:
        openai_base = config.get("openai_url", "http://localhost:1234/v1").rstrip('/')
        r = requests.get(f"{openai_base}/models", timeout=3)
        if r.status_code == 200:
            data = r.json()
            models = [m.get("id") for m in data.get("data", []) if m.get("id")]
            results["local_openai"]["connected"] = True
            results["local_openai"]["models"] = models
    except Exception:
        pass

    return results

def query_ollama(prompt, system_prompt=None, model=None, json_mode=False, timeout=None):
    config = get_llm_config()
    base_url = config.get("ollama_url", "http://localhost:11434").rstrip('/')
    target_model = model or config.get("model", "llama3.2")
    timeout = timeout or config.get("timeout", 45)

    payload = {
        "model": target_model,
        "prompt": prompt,
        "stream": False,
        "options": {
            "temperature": config.get("temperature", 0.2)
        }
    }
    if system_prompt:
        payload["system"] = system_prompt
    if json_mode:
        payload["format"] = "json"

    t0 = time.time()
    resp = requests.post(f"{base_url}/api/generate", json=payload, timeout=timeout)
    elapsed_ms = int((time.time() - t0) * 1000)

    if resp.status_code == 200:
        data = resp.json()
        return {
            "success": True,
            "text": data.get("response", "").strip(),
            "model": target_model,
            "provider": "ollama",
            "latency_ms": elapsed_ms
        }
    else:
        raise Exception(f"Ollama error {resp.status_code}: {resp.text}")

def query_local_openai(prompt, system_prompt=None, model=None, json_mode=False, timeout=None):
    config = get_llm_config()
    base_url = config.get("openai_url", "http://localhost:1234/v1").rstrip('/')
    target_model = model or config.get("model", "local-model")
    timeout = timeout or config.get("timeout", 45)

    messages = []
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})
    messages.append({"role": "user", "content": prompt})

    payload = {
        "model": target_model,
        "messages": messages,
        "temperature": config.get("temperature", 0.2)
    }
    if json_mode:
        payload["response_format"] = {"type": "json_object"}

    t0 = time.time()
    resp = requests.post(f"{base_url}/chat/completions", json=payload, timeout=timeout)
    elapsed_ms = int((time.time() - t0) * 1000)

    if resp.status_code == 200:
        data = resp.json()
        content = data["choices"][0]["message"]["content"]
        return {
            "success": True,
            "text": content.strip(),
            "model": target_model,
            "provider": "local_openai",
            "latency_ms": elapsed_ms
        }
    else:
        raise Exception(f"Local OpenAI endpoint error {resp.status_code}: {resp.text}")

def query_gemini(prompt, system_prompt=None):
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key:
        raise Exception("GEMINI_API_KEY not set")
    import google.generativeai as genai
    genai.configure(api_key=api_key)
    try:
        model = genai.GenerativeModel("gemini-1.5-flash")
    except Exception:
        model = genai.GenerativeModel("gemini-pro")

    full_prompt = f"{system_prompt}\n\n{prompt}" if system_prompt else prompt
    t0 = time.time()
    response = model.generate_content(full_prompt)
    elapsed_ms = int((time.time() - t0) * 1000)
    return {
        "success": True,
        "text": response.text.strip(),
        "model": "gemini",
        "provider": "gemini",
        "latency_ms": elapsed_ms
    }

def query_llm(prompt, system_prompt=None, json_mode=False, timeout=None):
    """
    Main entrypoint: executes the prompt against the user's selected Local Model
    (Ollama, LM Studio / Local OpenAI, or Gemini), with automatic fallback.
    """
    config = get_llm_config()
    provider = config.get("provider", "ollama")

    errors = []

    # Try configured provider first
    if provider == "ollama":
        try:
            return query_ollama(prompt, system_prompt=system_prompt, json_mode=json_mode, timeout=timeout)
        except Exception as e:
            errors.append(f"Ollama: {e}")
    elif provider == "local_openai":
        try:
            return query_local_openai(prompt, system_prompt=system_prompt, json_mode=json_mode, timeout=timeout)
        except Exception as e:
            errors.append(f"Local OpenAI: {e}")
    elif provider == "gemini":
        try:
            return query_gemini(prompt, system_prompt=system_prompt)
        except Exception as e:
            errors.append(f"Gemini: {e}")

    # Fallback attempt 1: if Ollama failed or not set, try Local OpenAI (LM Studio)
    if provider != "local_openai":
        try:
            return query_local_openai(prompt, system_prompt=system_prompt, json_mode=json_mode, timeout=6)
        except Exception as e:
            errors.append(f"Local OpenAI fallback: {e}")

    # Fallback attempt 2: if local failed, try Gemini if key exists
    if provider != "gemini" and os.getenv("GEMINI_API_KEY", "").strip():
        try:
            return query_gemini(prompt, system_prompt=system_prompt)
        except Exception as e:
            errors.append(f"Gemini fallback: {e}")

    # If all LLM calls failed, return clean error payload so heuristics take over
    return {
        "success": False,
        "text": "",
        "error": " | ".join(errors) or "Local LLM unreachable. Please launch Ollama or LM Studio.",
        "provider": "none"
    }
