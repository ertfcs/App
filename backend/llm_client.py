"""Claude client used by the app (replaces the old emergentintegrations package).

Same small interface the rest of the backend already uses:
    chat = LlmChat(api_key=..., session_id=..., system_message=...).with_model(p, m)
    text = await chat.send_message(UserMessage(text=..., file_contents=[ImageContent(b64)]))
    async for ev in chat.stream_message(UserMessage(text=...)):  # TextDelta / StreamDone

Every call goes to Anthropic with the key in ANTHROPIC_API_KEY. The model is
CLAUDE_MODEL (default claude-opus-5-5); the provider/model passed to
with_model() is ignored, so old "openai"/"gemini" choices also run on Claude.
History is kept per LlmChat instance, as before.
"""
from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Any, AsyncIterator, Dict, List, Optional

import anthropic

DEFAULT_MODEL = "claude-opus-5-5"
_FALLBACK_BETA = "server-side-fallback-2026-07-01"
_client: Optional[anthropic.AsyncAnthropic] = None


def ai_configured() -> bool:
    return bool(os.environ.get("ANTHROPIC_API_KEY", "").strip())


def _get_client() -> anthropic.AsyncAnthropic:
    global _client
    if not ai_configured():
        raise ChatError("AI non configurata: imposta ANTHROPIC_API_KEY nel file .env del backend.")
    if _client is None:
        _client = anthropic.AsyncAnthropic()
    return _client


class ChatError(Exception):
    pass


@dataclass
class TextDelta:
    content: str


@dataclass
class StreamDone:
    content: Optional[str]
    finish_reason: str
    raw: Any = None
    tool_calls: Any = None
    usage: Any = None


class FileContent:
    def __init__(self, content_type: str, file_content_base64: str) -> None:
        self.content_type = content_type
        self.file_content_base64 = file_content_base64


class ImageContent(FileContent):
    def __init__(self, image_base64: str) -> None:
        super().__init__("image", image_base64)

    @staticmethod
    def get_mime_type(b64: str) -> str:
        if b64.startswith("iVBORw0KGgo"):
            return "image/png"
        if b64.startswith("R0lGOD"):
            return "image/gif"
        if b64.startswith("UklGR"):
            return "image/webp"
        return "image/jpeg"


class UserMessage:
    def __init__(self, text: Optional[str] = None, file_contents: Optional[List[FileContent]] = None) -> None:
        self.text = text
        self.file_contents = file_contents or []


class LlmChat:
    def __init__(self, api_key: str = "", session_id: str = "", system_message: str = "",
                 initial_messages: Optional[List[Dict[str, Any]]] = None, **_ignored: Any) -> None:
        self.session_id = session_id
        self.system_message = system_message or ""
        self.messages: List[Dict[str, Any]] = [
            m for m in (initial_messages or []) if m.get("role") in ("user", "assistant")
        ]
        self.model = os.environ.get("CLAUDE_MODEL", "").strip() or DEFAULT_MODEL
        self.max_tokens = 16000

    def with_model(self, provider: str, model: str) -> "LlmChat":
        return self  # always Claude (CLAUDE_MODEL)

    def with_params(self, **params: Any) -> "LlmChat":
        if params.get("max_tokens"):
            self.max_tokens = max(int(params["max_tokens"]), 1024)
        return self

    def _user_content(self, msg: UserMessage) -> List[Dict[str, Any]]:
        content: List[Dict[str, Any]] = []
        for fc in msg.file_contents:
            if fc.content_type == "image":
                content.append({"type": "image", "source": {
                    "type": "base64",
                    "media_type": ImageContent.get_mime_type(fc.file_content_base64),
                    "data": fc.file_content_base64,
                }})
        content.append({"type": "text", "text": msg.text or ""})
        return content

    def _params(self) -> Dict[str, Any]:
        p: Dict[str, Any] = dict(
            model=self.model,
            max_tokens=self.max_tokens,
            messages=self.messages,
            betas=[_FALLBACK_BETA],
            fallbacks="default",
        )
        if self.system_message:
            p["system"] = self.system_message
        return p

    @staticmethod
    def _text_of(message: Any) -> str:
        return "".join(b.text for b in message.content if getattr(b, "type", "") == "text")

    async def stream_message(self, msg: UserMessage) -> AsyncIterator[Any]:
        client = _get_client()
        self.messages.append({"role": "user", "content": self._user_content(msg)})
        try:
            async with client.beta.messages.stream(**self._params()) as stream:
                async for text in stream.text_stream:
                    yield TextDelta(content=text)
                final = await stream.get_final_message()
        except anthropic.APIError as e:
            self.messages.pop()
            raise ChatError(f"Errore Claude: {e}") from e
        if final.stop_reason == "refusal":
            self.messages.pop()
            raise ChatError("Claude ha rifiutato questa richiesta.")
        text = self._text_of(final)
        self.messages.append({"role": "assistant", "content": text or "(vuoto)"})
        yield StreamDone(content=text, finish_reason=final.stop_reason or "end_turn", raw=final)

    async def send_message(self, msg: UserMessage) -> str:
        text = ""
        async for ev in self.stream_message(msg):
            if isinstance(ev, StreamDone):
                text = ev.content or ""
        return text

    async def send_message_multimodal_response(self, msg: UserMessage):
        raise ChatError("La generazione di immagini AI non è disponibile (l'app usa solo Claude).")
