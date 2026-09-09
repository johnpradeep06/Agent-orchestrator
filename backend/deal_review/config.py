"""LLM client factory — provider-agnostic so a rate-limited free model is a one-env-var swap."""
import os
from langchain_groq import ChatGroq
from langchain_openai import ChatOpenAI

LLM_PROVIDER = os.getenv("LLM_PROVIDER", "groq")  # groq | openrouter | anthropic | openai
LLM_MODEL = os.getenv("LLM_MODEL", "")  # empty -> provider default below

_DEFAULT_MODELS = {
    "groq": "llama-3.3-70b-versatile",
    "openrouter": "meta-llama/llama-3.3-70b-instruct:free",
    "anthropic": "claude-sonnet-5",
    "openai": "gpt-4o-mini",
}

VISION_MODEL = os.getenv("VISION_MODEL", "meta-llama/llama-4-scout-17b-16e-instruct")


def get_llm(temperature: float = 0.0):
    provider = LLM_PROVIDER
    model = LLM_MODEL or _DEFAULT_MODELS[provider]

    if provider == "groq":
        return ChatGroq(model=model, temperature=temperature, api_key=os.environ["GROQ_API_KEY"])
    if provider == "openrouter":
        return ChatOpenAI(
            model=model,
            temperature=temperature,
            api_key=os.environ["OPENROUTER_API_KEY"],
            base_url="https://openrouter.ai/api/v1",
        )
    if provider == "anthropic":
        from langchain_anthropic import ChatAnthropic
        return ChatAnthropic(model=model, temperature=temperature, api_key=os.environ["ANTHROPIC_API_KEY"])
    if provider == "openai":
        return ChatOpenAI(model=model, temperature=temperature, api_key=os.environ["OPENAI_API_KEY"])
    raise ValueError(f"Unknown LLM_PROVIDER: {provider}")


def get_vision_llm(temperature: float = 0.0):
    """Fallback OCR path for low-confidence/scanned pages — needs a vision-capable model."""
    if LLM_PROVIDER == "groq":
        return ChatGroq(model=VISION_MODEL, temperature=temperature, api_key=os.environ["GROQ_API_KEY"])
    return get_llm(temperature)
