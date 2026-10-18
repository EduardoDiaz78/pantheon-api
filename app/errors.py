"""One error shape for every failure: {"error": {"code", "message", "details"}}."""
from __future__ import annotations

from typing import Any

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from .i18n import lang_from_header, t


class ApiError(Exception):
    def __init__(self, status: int, code: str, message_key: str | None = None, details: Any = None, **kw):
        self.status, self.code = status, code
        self.message_key = message_key or code
        self.details, self.kw = details, kw


def _body(code: str, message: str, details: Any = None) -> dict:
    err: dict[str, Any] = {"code": code, "message": message}
    if details is not None:
        err["details"] = details
    return {"error": err}


def install(app: FastAPI) -> None:
    @app.exception_handler(ApiError)
    async def _api(request: Request, exc: ApiError):
        lang = lang_from_header(request.headers.get("accept-language"))
        return JSONResponse(status_code=exc.status, content=_body(exc.code, t(exc.message_key, lang, **exc.kw), exc.details))

    @app.exception_handler(RequestValidationError)
    async def _validation(request: Request, exc: RequestValidationError):
        lang = lang_from_header(request.headers.get("accept-language"))
        details = [{"field": ".".join(str(p) for p in e.get("loc", [])), "problem": e.get("msg")} for e in exc.errors()]
        return JSONResponse(status_code=422, content=_body("invalid_request", t("invalid_request", lang), details))

    @app.exception_handler(StarletteHTTPException)
    async def _http(request: Request, exc: StarletteHTTPException):
        return JSONResponse(status_code=exc.status_code, content=_body("http_error", str(exc.detail)))
