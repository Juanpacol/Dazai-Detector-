from fastapi import APIRouter, Query
from fastapi.responses import StreamingResponse

from backend.schemas.models import ChatRequest, ChatResponse
from backend.services.chat_service import ChatService

router = APIRouter(prefix="/chat", tags=["chat"])
_service = ChatService()


@router.post("", response_model=ChatResponse)
def ask(request: ChatRequest):
    return _service.ask(request.question)


@router.get("/stream")
def ask_stream(question: str = Query(min_length=1, max_length=500)):
    return StreamingResponse(
        _service.stream(question),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
