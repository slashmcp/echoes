import litellm
import os

# Configure LiteLLM for fallback routing
# Primary: OpenAI / Anthropic (Using a generic placeholder for demo)
# Fallback: Local Ollama

litellm.set_verbose = False

router = litellm.Router(
    model_list=[
        {
            "model_name": "oracle-model",
            "litellm_params": {
                "model": "gpt-4o-mini",
                "api_key": os.environ.get("OPENAI_API_KEY", "dummy"),
            },
            "tpm": 100000,
            "rpm": 1000,
        },
        {
            "model_name": "oracle-model",
            "litellm_params": {
                "model": "ollama/llama3",
                "api_base": "http://localhost:11434"
            }
        }
    ],
    routing_strategy="latency-based-routing",
    fallbacks=[{"oracle-model": ["ollama/llama3"]}]
)

async def get_oracle_response(messages, tools=None):
    """
    Sends a message to the Oracle model via LiteLLM router.
    Automatically falls back to local Ollama if the cloud model fails/rate limits.
    """
    response = await router.acompletion(
        model="oracle-model",
        messages=messages,
        tools=tools,
    )
    return response
