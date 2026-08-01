import os
import json
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware

# Patch dotenv to prevent it from crashing on a UTF-16 .env file higher in the directory tree
import dotenv
dotenv.load_dotenv = lambda *args, **kwargs: None

# Manually load .env.local
env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), ".env.local")
if os.path.exists(env_path):
    try:
        with open(env_path, "r", encoding="utf-16") as f:
            lines = f.readlines()
    except UnicodeError:
        with open(env_path, "r", encoding="utf-8", errors="ignore") as f:
            lines = f.readlines()
            
    for line in lines:
        if "=" in line and not line.startswith("#"):
            k, v = line.strip().split("=", 1)
            os.environ[k.strip()] = v.strip()

import litellm

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    context: str
    message: str

@app.post("/api/oracle/chat")
async def oracle_chat(request: ChatRequest):
    messages = [
        {"role": "system", "content": request.context},
        {"role": "user", "content": request.message}
    ]
    
    schema = {
        "type": "object",
        "properties": {
            "verdict": {"type": "string", "enum": ["correct", "partial", "wrong", "evasive", "insulting"]},
            "reasoning": {"type": "string"},
            "speech": {"type": "string"},
            "nextState": {"type": "string", "enum": ["cocky", "irritated", "enraged", "weakened", "defeated"]},
            "damageToBoss": {"type": "integer"},
            "damageToPlayer": {"type": "integer"}
        },
        "required": ["verdict", "reasoning", "speech", "nextState", "damageToBoss", "damageToPlayer"]
    }
    
    try:
        # Route through LiteLLM.
        # Ensure GOOGLE_GENERATIVE_AI_API_KEY is in your environment or .env.local
        google_api_key = os.environ.get("GOOGLE_GENERATIVE_AI_API_KEY")
        if not google_api_key:
            raise HTTPException(status_code=500, detail="GOOGLE_GENERATIVE_AI_API_KEY is not set.")
            
        # LiteLLM looks for GEMINI_API_KEY
        os.environ["GEMINI_API_KEY"] = google_api_key
            
        response = await litellm.acompletion(
            model="gemini/gemini-3.5-flash",
            messages=messages,
            response_format={"type": "json_schema", "json_schema": {"name": "judgement", "strict": True, "schema": schema}}
        )
        
        content = response.choices[0].message.content
        return json.loads(content)
        
    except Exception as e:
        print(f"Error in oracle_chat: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
