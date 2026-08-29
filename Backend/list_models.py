import os
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv(os.path.abspath(os.path.join(os.path.dirname(__file__), ".env")))
api_key = os.getenv("GEMINI_API_KEY")

genai.configure(api_key=api_key)
try:
    models = genai.list_models()
    for m in models:
        print(f"Model: {m.name} | Methods: {m.supported_generation_methods}")
except Exception as e:
    print(f"Error: {e}")
