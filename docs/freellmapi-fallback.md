# FreeLLMAPI fallback

AI Study Agent can use a local [FreeLLMAPI](https://github.com/tashfeenahmed/freellmapi) server as the last fallback provider.

The app does not vendor the whole FreeLLMAPI repository. It calls its OpenAI-compatible endpoint:

```text
POST http://127.0.0.1:3001/v1/chat/completions
```

## Setup

1. Run FreeLLMAPI locally on port `3001`.
2. Add provider keys inside the FreeLLMAPI dashboard.
3. Copy the unified `freellmapi-...` key.
4. Add these variables to `.env.local` or Vercel:

```env
FREELLMAPI_BASE_URL=http://127.0.0.1:3001/v1
FREELLMAPI_API_KEY=freellmapi-your-unified-key
FREELLMAPI_MODEL=auto
```

## Routing order

The fallback is used after the primary providers fail or hit limits:

```text
fast:    Groq -> NVIDIA -> FreeLLMAPI
heavy:   NVIDIA -> Groq -> FreeLLMAPI
chat:    NVIDIA -> Groq -> FreeLLMAPI
agentic: NVIDIA -> Groq -> FreeLLMAPI
```

For Vercel, `FREELLMAPI_BASE_URL` must point to a reachable hosted FreeLLMAPI instance, not `127.0.0.1`.
