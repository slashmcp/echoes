import asyncio
import threading
import janus

class LLMBridge:
    """
    Safely bridges the synchronous Textual UI thread with an asynchronous LLM processing loop.
    Uses janus to prevent the UI from blocking while waiting for network responses.
    """
    def __init__(self, loop=None):
        self.loop = loop or asyncio.get_event_loop()
        self.queue = janus.Queue()
        self._thread = None
        
    def start(self, handler_coro):
        """Starts the background processing thread."""
        def run_loop():
            asyncio.set_event_loop(self.loop)
            self.loop.run_until_complete(self._process(handler_coro))
            
        self._thread = threading.Thread(target=run_loop, daemon=True)
        self._thread.start()

    async def _process(self, handler_coro):
        """Asynchronous worker that consumes from the async side of the Janus queue."""
        while True:
            message = await self.queue.async_q.get()
            if message is None:
                break
            await handler_coro(message)
            self.queue.async_q.task_done()

    def send_to_llm(self, message):
        """Called by the sync UI thread to queue a message for the LLM."""
        self.queue.sync_q.put(message)
        
    def shutdown(self):
        """Shuts down the bridge."""
        self.queue.sync_q.put(None)
        if self._thread:
            self._thread.join()
