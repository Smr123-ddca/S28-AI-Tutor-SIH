import os
import requests
import json
import sys

def generate_content_openrouter(prompt):
    openrouter_key = os.getenv("OPENROUTER_API_KEY")
    if not openrouter_key:
        return ""
        
    fallback_model = os.getenv("OPENROUTER_FALLBACK_MODEL", "openrouter/free")
    
    headers = {
        "Authorization": f"Bearer {openrouter_key}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": fallback_model,
        "messages": [
            {"role": "user", "content": prompt}
        ]
    }
    
    try:
        resp = requests.post("https://openrouter.ai/api/v1/chat/completions", headers=headers, json=payload, timeout=90)
        resp.raise_for_status()
        data = resp.json()
        return data["choices"][0]["message"]["content"]
    except Exception as e:
        print(f"OpenRouter Fallback Failed: {e}", file=sys.stderr)
        return ""

def generate_content(prompt):
    force_fallback = str(os.getenv("FORCE_LLM_FALLBACK", "false")).lower() == "true"
    
    if force_fallback:
        print("Forcing LLM fallback to OpenRouter...", file=sys.stderr)
        return generate_content_openrouter(prompt)

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("GEMINI_API_KEY is missing, attempting fallback...", file=sys.stderr)
        return generate_content_openrouter(prompt)
        
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
    payload = {
        "contents": [{"parts": [{"text": prompt}]}]
    }
    
    try:
        response = requests.post(url, json=payload, timeout=60)
        response.raise_for_status()
        data = response.json()
        
        try:
            return data["candidates"][0]["content"]["parts"][0]["text"]
        except (KeyError, IndexError):
            print(f"Unexpected API Response Structure: {json.dumps(data)}", file=sys.stderr)
            return ""
    except Exception as e:
        err_msg = str(e)
        if "429" in err_msg:
            print("GEMINI QUOTA FAILURE", file=sys.stderr)
        else:
            print(f"Direct REST Request Failed: {e}", file=sys.stderr)
            
        print("Attempting OpenRouter Fallback...", file=sys.stderr)
        return generate_content_openrouter(prompt)
