import httpx
import json
import time
from typing import Optional
from app.config import settings

_sentence_model = None

def _get_sentence_model():
    global _sentence_model
    if _sentence_model is None:
        from sentence_transformers import SentenceTransformer
        _sentence_model = SentenceTransformer("all-MiniLM-L6-v2")
    return _sentence_model

class LLMClient:
    def __init__(self):
        self.provider = settings.LLM_PROVIDER
        self.api_url = settings.LLM_API_URL.rstrip("/")
        self.model = settings.LLM_MODEL
        self.embedding_model = settings.EMBEDDING_MODEL

    async def generate(self, prompt: str, system_prompt: Optional[str] = None, max_tokens: Optional[int] = None) -> str:
        if self.provider == "ollama":
            return await self._ollama_generate(prompt, system_prompt, max_tokens)
        return await self._openai_generate(prompt, system_prompt, max_tokens)

    async def _ollama_generate(self, prompt: str, system_prompt: Optional[str] = None, max_tokens: Optional[int] = None) -> str:
        payload = {
            "model": self.model,
            "prompt": prompt,
            "stream": False,
            "options": {
                "temperature": settings.TEMPERATURE,
                "num_predict": max_tokens or settings.MAX_TOKENS,
            }
        }
        if system_prompt:
            payload["system"] = system_prompt

        async with httpx.AsyncClient(timeout=120) as client:
            try:
                resp = await client.post(f"{self.api_url}/api/generate", json=payload)
                resp.raise_for_status()
                data = resp.json()
                return data.get("response", "")
            except Exception as e:
                return f"Error generating response: {str(e)}"

    async def _openai_generate(self, prompt: str, system_prompt: Optional[str] = None, max_tokens: Optional[int] = None) -> str:
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": settings.TEMPERATURE,
            "max_tokens": max_tokens or settings.MAX_TOKENS,
        }

        async with httpx.AsyncClient(timeout=120) as client:
            try:
                resp = await client.post(f"{self.api_url}/v1/chat/completions", json=payload)
                resp.raise_for_status()
                data = resp.json()
                return data["choices"][0]["message"]["content"]
            except Exception as e:
                return f"Error generating response: {str(e)}"

    async def embed(self, text: str) -> list[float]:
        if self.provider == "ollama":
            result = await self._ollama_embed(text)
            if result:
                return result
        elif self.provider == "openai":
            result = await self._openai_embed(text)
            if result:
                return result
        return self._local_embed(text)

    def _local_embed(self, text: str) -> list[float]:
        try:
            model = _get_sentence_model()
            emb = model.encode(text, normalize_embeddings=True)
            return emb.tolist()
        except Exception:
            return []

    async def _ollama_embed(self, text: str) -> list[float]:
        async with httpx.AsyncClient(timeout=60) as client:
            try:
                resp = await client.post(f"{self.api_url}/api/embeddings", json={
                    "model": self.embedding_model,
                    "prompt": text,
                })
                resp.raise_for_status()
                data = resp.json()
                return data.get("embedding", [])
            except Exception:
                return []

    async def _openai_embed(self, text: str) -> list[float]:
        async with httpx.AsyncClient(timeout=60) as client:
            try:
                resp = await client.post(f"{self.api_url}/v1/embeddings", json={
                    "model": self.embedding_model,
                    "input": text,
                })
                resp.raise_for_status()
                data = resp.json()
                return data["data"][0]["embedding"]
            except Exception:
                return []

    async def embed_batch(self, texts: list[str]) -> list[list[float]]:
        results = []
        for text in texts:
            emb = await self.embed(text)
            results.append(emb)
        return results

llm = LLMClient()
