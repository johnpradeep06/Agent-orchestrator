"""LLM client factory — provider-agnostic and self-healing: the primary provider automatically
falls back to the next configured one (via LangChain's Runnable.with_fallbacks) if a call fails,
so a rate-limited/quota-exhausted provider degrades to a working one instead of the whole node."""
import os
from langchain_groq import ChatGroq
from langchain_openai import ChatOpenAI

LLM_PROVIDER = os.getenv("LLM_PROVIDER", "gemini")  # primary: gemini | groq | openrouter | anthropic | openai
LLM_MODEL = os.getenv("LLM_MODEL", "")  # empty -> provider default below

# Tried in this order after the primary (LLM_PROVIDER), skipping any without a key configured.
FALLBACK_ORDER = ["gemini", "groq", "openrouter"]

_DEFAULT_MODELS = {
    "groq": "openai/gpt-oss-120b",  # Groq's model lineup rotates; check GET /openai/v1/models if this 404s
    "gemini": "gemini-2.5-flash",  # free tier: 250k tokens/min — the primary, Groq's 8k/min is the fallback
    "openrouter": "meta-llama/llama-3.3-70b-instruct:free",
    "anthropic": "claude-sonnet-5",
    "openai": "gpt-4o-mini",
}

_KEY_ENV = {
    "groq": "GROQ_API_KEY",
    "gemini": "GEMINI_API_KEY",
    "openrouter": "OPENROUTER_API_KEY",
    "anthropic": "ANTHROPIC_API_KEY",
    "openai": "OPENAI_API_KEY",
}

# ponytail: no vision-capable model in Groq's current free lineup, so the OCR fallback below
# degrades to a normal (failed) LLM call rather than actually reading the image on that path.
# Gemini's default model is natively multimodal, so this only matters when Groq is primary.
VISION_MODEL = os.getenv("VISION_MODEL", "openai/gpt-oss-120b")


def _build(provider: str, temperature: float, max_tokens: int):
    model = LLM_MODEL if provider == LLM_PROVIDER and LLM_MODEL else _DEFAULT_MODELS[provider]
    key = os.environ[_KEY_ENV[provider]]

    if provider == "groq":
        # Groq's per-minute token quota is charged against max_tokens (the reservation), not
        # actual output length — callers should pass a budget sized to what the call needs.
        return ChatGroq(model=model, temperature=temperature, max_tokens=max_tokens, api_key=key)
    if provider == "gemini":
        from langchain_google_genai import ChatGoogleGenerativeAI
        return ChatGoogleGenerativeAI(model=model, temperature=temperature, max_output_tokens=max_tokens, google_api_key=key)
    if provider == "openrouter":
        return ChatOpenAI(model=model, temperature=temperature, api_key=key, base_url="https://openrouter.ai/api/v1")
    if provider == "anthropic":
        from langchain_anthropic import ChatAnthropic
        return ChatAnthropic(model=model, temperature=temperature, api_key=key)
    if provider == "openai":
        return ChatOpenAI(model=model, temperature=temperature, api_key=key)
    raise ValueError(f"Unknown provider: {provider}")


def _configured_providers() -> list[str]:
    order = [LLM_PROVIDER] + [p for p in FALLBACK_ORDER if p != LLM_PROVIDER]
    return [p for p in order if os.getenv(_KEY_ENV[p])]


def get_llm(temperature: float = 0.0, max_tokens: int = 4000):
    """A single client for the primary provider — used where fallback isn't wired (e.g. vision)."""
    return _build(LLM_PROVIDER, temperature, max_tokens)


def get_structured_llm(schema, temperature: float = 0.0, max_tokens: int = 4000):
    """Primary provider's structured-output call, automatically falling back to the next
    configured provider (in FALLBACK_ORDER) if the primary raises — e.g. Gemini's quota is
    exhausted mid-run, so the node retries on Groq instead of degrading to needs_human_review."""
    providers = _configured_providers()
    if not providers:
        raise RuntimeError(f"No LLM provider configured — set one of {list(_KEY_ENV.values())}")
    chained = [_build(p, temperature, max_tokens).with_structured_output(schema) for p in providers]
    return chained[0].with_fallbacks(chained[1:]) if len(chained) > 1 else chained[0]


def get_vision_llm(temperature: float = 0.0):
    """Fallback OCR path for low-confidence/scanned pages — needs a vision-capable model."""
    if LLM_PROVIDER == "groq":
        return ChatGroq(model=VISION_MODEL, temperature=temperature, api_key=os.environ["GROQ_API_KEY"])
    return get_llm(temperature)  # gemini-2.5-flash (the other default) is natively multimodal
