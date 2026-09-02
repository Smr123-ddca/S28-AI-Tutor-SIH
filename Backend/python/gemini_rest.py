import os
import requests
import json
import sys
import re


def _redact_api_key(message):
    return re.sub(r"key=[A-Za-z0-9._-]+", "key=[REDACTED]", str(message))


def generate_content_openrouter(prompt):
    openrouter_key = os.getenv("OPENROUTER_API_KEY")
    if not openrouter_key:
        raise RuntimeError("OPENROUTER_API_KEY is missing; fallback cannot run.")

    fallback_model = os.getenv("OPENROUTER_FALLBACK_MODEL", "openrouter/free")
    headers = {
        "Authorization": f"Bearer {openrouter_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://learning-app.local",
        "X-Title": "AI Tutor S28",
    }

    payload = {
        "model": fallback_model,
        "messages": [{"role": "user", "content": prompt}],
    }

    try:
        resp = requests.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers=headers,
            json=payload,
            timeout=90,
        )
        print(f"OpenRouter fallback HTTP status: {resp.status_code}", file=sys.stderr)
        if resp.status_code != 200:
            raise RuntimeError(f"OpenRouter HTTP {resp.status_code}: {resp.text[:300]}")

        data = resp.json()
        if "choices" not in data or not data["choices"]:
            raise RuntimeError("OpenRouter response missing choices array.")

        content = data["choices"][0]["message"]["content"]
        if not content or not str(content).strip():
            raise RuntimeError("OpenRouter response returned empty content.")

        return str(content)
    except Exception as e:
        cleaned = _redact_api_key(e)
        print(f"OpenRouter fallback failed: {cleaned}", file=sys.stderr)
        raise RuntimeError(f"OpenRouter fallback failed: {cleaned}") from e


def generate_content(prompt):
    force_fallback = str(os.getenv("FORCE_LLM_FALLBACK", "false")).lower() == "true"
    if force_fallback:
        print("Forcing LLM fallback to OpenRouter...", file=sys.stderr)
        return generate_content_openrouter(prompt)

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("GEMINI_API_KEY is missing, attempting fallback...", file=sys.stderr)
        return generate_content_openrouter(prompt)

    candidate_models = []
    env_models = os.getenv("GEMINI_MODEL")
    if env_models:
        candidate_models.extend([m.strip() for m in env_models.split(",") if m.strip()])
    candidate_models.extend([
        "gemini-2.5-flash",
        "gemini-2.0-flash",
        "gemini-1.5-flash",
    ])

    seen_models = set()
    ordered_models = []
    for model in candidate_models:
        if model not in seen_models:
            seen_models.add(model)
            ordered_models.append(model)

    last_error = None
    response = None
    for model in ordered_models:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"response_mime_type": "application/json"},
        }

        try:
            response = requests.post(url, json=payload, timeout=60)
            if response.status_code == 404:
                last_error = RuntimeError(f"Gemini model '{model}' unavailable (HTTP 404).")
                print(f"Gemini model '{model}' unavailable (HTTP 404). Trying next provider/model...", file=sys.stderr)
                continue
            response.raise_for_status()
            data = response.json()
            try:
                text = data["candidates"][0]["content"]["parts"][0]["text"]
            except (KeyError, IndexError, TypeError):
                msg = json.dumps(data, ensure_ascii=True)[:400]
                raise RuntimeError(f"Unexpected Gemini response structure: {msg}")

            if text is None or str(text).strip() == "":
                raise RuntimeError(f"Gemini model '{model}' returned empty content.")

            print(f"Gemini model '{model}' succeeded.", file=sys.stderr)
            return text
        except Exception as e:
            cleaned = _redact_api_key(e)
            last_error = e
            status = getattr(response, "status_code", None) if response is not None else None
            if status == 429:
                print(f"Gemini quota failure on '{model}'.", file=sys.stderr)
            else:
                print(f"Direct REST request failed for '{model}': {cleaned}", file=sys.stderr)

    if last_error is not None:
        print("Attempting OpenRouter fallback...", file=sys.stderr)
    return generate_content_openrouter(prompt)
