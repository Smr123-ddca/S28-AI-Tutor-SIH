import os
import requests
import json
import sys

def generate_content(prompt):
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("GEMINI_API_KEY is missing.", file=sys.stderr)
        return ""
        
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key={api_key}"
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
        print(f"Direct REST Request Failed: {e}", file=sys.stderr)
        return ""
