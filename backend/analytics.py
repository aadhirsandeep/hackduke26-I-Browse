from __future__ import annotations

import logging
import os
from functools import lru_cache
from typing import Any
from urllib.parse import urlparse

from supabase import Client, create_client

logger = logging.getLogger("ibrowse.analytics")

TEMP_AUTH_PROVIDER = "temporary_local"


@lru_cache(maxsize=1)
def get_supabase_client() -> Client | None:
    supabase_url = os.getenv("SUPABASE_URL")
    service_role_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not supabase_url or not service_role_key:
        return None
    return create_client(supabase_url, service_role_key)


def analytics_enabled() -> bool:
    return get_supabase_client() is not None


def parse_domain(page_url: str | None) -> str:
    if not page_url:
        return "unknown"
    parsed = urlparse(page_url)
    return (parsed.netloc or "unknown").lower()


def summarize_ops(ops: dict[str, Any]) -> dict[str, int]:
    hide_count = len(ops.get("hide", []))
    remove_count = len(ops.get("remove", []))
    restyle_count = len(ops.get("restyle", {}))
    inject_count = len(ops.get("inject", []))
    return {
        "hide_count": hide_count,
        "remove_count": remove_count,
        "restyle_count": restyle_count,
        "inject_count": inject_count,
        "total_affected_count": hide_count + remove_count + restyle_count + inject_count,
    }


def extract_token_count(response: Any) -> int | None:
    usage = getattr(response, "usage_metadata", None)
    if usage is None:
        return None
    for field_name in ("total_token_count", "total_tokens"):
        value = getattr(usage, field_name, None)
        if value is not None:
            return int(value)
    return None


def estimate_api_cost(token_count: int | None) -> float | None:
    if token_count is None:
        return None
    cost_per_1k_tokens = os.getenv("GEMINI_ESTIMATED_COST_PER_1K_TOKENS_USD") or os.getenv(
        "GEMINI_FLASH_COST_PER_1K_TOKENS_USD"
    )
    if not cost_per_1k_tokens:
        return None
    return round((token_count / 1000) * float(cost_per_1k_tokens), 6)


def _ensure_user(
    client: Client,
    temporary_user_id: str,
) -> str:
    existing = (
        client.table("users")
        .select("id")
        .eq("external_auth_id", temporary_user_id)
        .limit(1)
        .execute()
    )
    if existing.data:
        return existing.data[0]["id"]

    inserted = (
        client.table("users")
        .insert(
            {
                "auth_provider": TEMP_AUTH_PROVIDER,
                "external_auth_id": temporary_user_id,
            }
        )
        .execute()
    )
    return inserted.data[0]["id"]


def _ensure_browser_session(
    client: Client,
    *,
    session_id: str,
    user_id: str,
    client_instance_id: str,
    browser_info: str | None,
) -> None:
    client.table("browser_sessions").upsert(
        {
            "id": session_id,
            "user_id": user_id,
            "client_instance_id": client_instance_id,
            "browser_info": browser_info,
        },
        on_conflict="id",
    ).execute()


def safe_start_session(
    *,
    temporary_user_id: str,
    client_instance_id: str,
    session_id: str,
    browser_info: str | None = None,
) -> None:
    client = get_supabase_client()
    if client is None:
        logger.info("analytics session skipped: supabase disabled")
        return

    try:
        logger.info(
            "analytics session persist start temporary_user_id=%s session_id=%s client_instance_id=%s",
            temporary_user_id,
            session_id,
            client_instance_id,
        )
        user_id = _ensure_user(client, temporary_user_id)
        _ensure_browser_session(
            client,
            session_id=session_id,
            user_id=user_id,
            client_instance_id=client_instance_id,
            browser_info=browser_info,
        )
        logger.info(
            "analytics session persist success temporary_user_id=%s user_id=%s session_id=%s",
            temporary_user_id,
            user_id,
            session_id,
        )
    except Exception:
        logger.exception("Failed to start analytics browser session")


def safe_record_transform_event(
    *,
    temporary_user_id: str,
    client_instance_id: str,
    session_id: str,
    page_url: str | None,
    prompt: str,
    preset_used: str | None,
    status: str,
    hide_count: int,
    remove_count: int,
    restyle_count: int,
    inject_count: int,
    total_affected_count: int,
    snapshot_node_count: int | None = None,
    estimated_tokens: int | None = None,
    estimated_api_cost: float | None = None,
    latency_ms: int | None = None,
    error_message: str | None = None,
    browser_info: str | None = None,
) -> None:
    client = get_supabase_client()
    if client is None:
        logger.info("analytics transform skipped: supabase disabled")
        return

    try:
        logger.info(
            "analytics transform persist start temporary_user_id=%s session_id=%s status=%s domain=%s",
            temporary_user_id,
            session_id,
            status,
            parse_domain(page_url),
        )
        user_id = _ensure_user(client, temporary_user_id)
        _ensure_browser_session(
            client,
            session_id=session_id,
            user_id=user_id,
            client_instance_id=client_instance_id,
            browser_info=browser_info,
        )
        client.table("transform_events").insert(
            {
                "user_id": user_id,
                "session_id": session_id,
                "domain": parse_domain(page_url),
                "prompt": prompt,
                "preset_used": preset_used,
                "status": status,
                "hide_count": hide_count,
                "remove_count": remove_count,
                "restyle_count": restyle_count,
                "inject_count": inject_count,
                "total_affected_count": total_affected_count,
                "snapshot_node_count": snapshot_node_count,
                "estimated_tokens": estimated_tokens,
                "estimated_api_cost": estimated_api_cost,
                "latency_ms": latency_ms,
                "error_message": error_message,
            }
        ).execute()
        logger.info(
            "analytics transform persist success temporary_user_id=%s user_id=%s session_id=%s",
            temporary_user_id,
            user_id,
            session_id,
        )
    except Exception:
        logger.exception("Failed to persist analytics transform event")
