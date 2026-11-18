"""Stub of emergentintegrations for local preview (AI features disabled)."""
class _Msg:
    def __init__(self, *a, **k):
        self.__dict__.update(k)
        self.args = a
UserMessage = ImageContent = TextDelta = StreamDone = _Msg

class LlmChat:
    def __init__(self, *a, **k): pass
    def with_model(self, *a, **k): return self
    def with_params(self, *a, **k): return self
    async def send_message(self, *a, **k):
        raise RuntimeError("AI non disponibile in anteprima locale (manca EMERGENT_LLM_KEY)")
    async def stream_message(self, *a, **k):
        raise RuntimeError("AI non disponibile in anteprima locale (manca EMERGENT_LLM_KEY)")
        yield
