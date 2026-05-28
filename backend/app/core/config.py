"""Application settings loaded from environment variables.

See `backend/.env.example` for the full list. Pydantic-settings reads `.env`
in dev and the process environment in prod (Render).
"""

from __future__ import annotations

from functools import lru_cache

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    env: str = "local"
    #: ``DEV=1`` — unlimited roasts/quizzes, notes renew enabled (local only; never set in prod).
    dev: bool = False
    #: When true, enables ``POST /api/v1/notes/renew`` even if ``dev`` is false (legacy).
    allow_notes_renew: bool = False
    log_level: str = "INFO"

    database_url: str = Field(
        default="postgresql+asyncpg://postgres:postgres@localhost:5432/cooked"
    )

    gemini_api_key: str | None = None
    groq_api_key: str | None = None

    #: Override head of Google chain; unset = use ``services/llm/models.py`` ``GOOGLE_MODEL_CHAIN``.
    gemini_model: str | None = None
    #: Appended after chain if not already listed; unset = no extra model.
    gemini_fallback_model: str | None = None
    #: Retries **per Google model** on 429 / documented quota backoff.
    gemini_429_max_retries: int = Field(default=4, ge=1, le=12)
    #: Override ``models.py`` ``GROQ_MODEL`` when set.
    groq_model: str | None = None

    r2_access_key_id: str | None = None
    r2_secret_access_key: str | None = None
    r2_bucket: str | None = None
    r2_endpoint: str | None = None
    # R2 uses "auto"; Backblaze B2 / MinIO need the real region (e.g. eu-central-003)
    r2_region: str = "auto"
    # Backblaze B2 only: explicit AES256 on PutObject often triggers IncompleteBody with boto —
    # default off; set true only if your bucket policy requires it.
    r2_b2_put_sse_aes256: bool = False

    @field_validator("r2_access_key_id", "r2_secret_access_key", mode="before")
    @classmethod
    def strip_s3_secrets(cls, v: object) -> object:
        if isinstance(v, str):
            return v.strip()
        return v

    @field_validator("gemini_api_key", "groq_api_key", mode="before")
    @classmethod
    def strip_llm_keys(cls, v: object) -> object:
        if isinstance(v, str):
            s = v.strip()
            return s or None
        return v

    @field_validator("gemini_fallback_model", mode="before")
    @classmethod
    def gemini_fallback_strip(cls, v: object) -> object:
        if v is None:
            return None
        if isinstance(v, str):
            s = v.strip()
            return s if s else None
        return v

    @field_validator("gemini_model", mode="before")
    @classmethod
    def gemini_model_strip(cls, v: object) -> object:
        if v is None:
            return None
        if isinstance(v, str):
            s = v.strip()
            return s if s else None
        return v

    @field_validator("groq_model", mode="before")
    @classmethod
    def groq_model_strip(cls, v: object) -> object:
        if v is None:
            return None
        if isinstance(v, str):
            s = v.strip()
            return s if s else None
        return v

    @field_validator("dev", mode="before")
    @classmethod
    def parse_dev_flag(cls, v: object) -> bool:
        if isinstance(v, bool):
            return v
        if isinstance(v, (int, float)):
            return int(v) == 1
        if isinstance(v, str):
            return v.strip().lower() in ("1", "true", "yes", "on")
        return False

    allowed_origins: str = (
        "http://localhost:3000,http://127.0.0.1:3000,"
        "http://localhost:3002,http://127.0.0.1:3002"
    )

    clerk_secret_key: str | None = None
    clerk_jwt_issuer: str | None = None

    posthog_api_key: str | None = None

    prompt_version: str = "roast-v3-json-contract"

    #: Roasts per user per day when ``dev`` is false (unlimited when ``dev`` is true).
    daily_analysis_cap: int = 2
    #: Completed quizzes per user per day when ``dev`` is false.
    daily_quiz_cap: int = 2
    resume_word_cap: int = 4000
    min_roast_words: int = 30
    llm_max_output_tokens: int = 1500
    llm_interview_max_output_tokens: int = Field(default=5000, ge=512, le=8192)
    llm_resume_text_token_soft_limit: int = 1500
    #: When true, the daily APScheduler job scrubs ``raw_text`` + R2 PDFs older than
    #: ``raw_text_retention_hours``. Default **false** — text stays until user re-uploads
    #: or you opt in (see D-017).
    raw_text_retention_enabled: bool = False
    raw_text_retention_hours: int = 24

    #: Static batch quiz: how many resume-grounded questions to generate and score together.
    interview_batch_question_count: int = Field(default=3, ge=1, le=20)

    #: When True, SSE error events may include LLM failure debug (raw model text). Off in prod by default.
    expose_llm_debug: bool = False
    #: Log **verbatim** model response (full string from API before JSON parsing). Dangerous in prod (PII).
    #: Default off unless `expose_llm_debug` or local/dev env — see `should_log_llm_raw_completion`.
    llm_log_raw_completion: bool = False

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",") if o.strip()]

    @property
    def unlimited_daily_roasts(self) -> bool:
        return self.dev

    @property
    def unlimited_daily_quizzes(self) -> bool:
        return self.dev

    @property
    def sse_includes_llm_failure_debug(self) -> bool:
        env_l = (self.env or "").lower()
        if self.expose_llm_debug:
            return True
        return env_l in ("local", "dev", "development", "test")

    @property
    def should_log_llm_raw_completion(self) -> bool:
        """Emit verbatim LLM text to logs when True (see `llm_log_raw_completion`, local env)."""
        if self.llm_log_raw_completion:
            return True
        return self.sse_includes_llm_failure_debug


@lru_cache
def get_settings() -> Settings:
    return Settings()
