"""Sobe listings normalizados para o Supabase."""

import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

_client: Client | None = None


def get_client() -> Client:
    global _client
    if _client is None:
        url = os.environ["SUPABASE_URL"]
        key = os.environ["SUPABASE_SERVICE_KEY"]
        _client = create_client(url, key)
    return _client


def upsert_listings(listings: list[dict]) -> int:
    """Insere ou atualiza listings. Retorna qtd inserida/atualizada."""
    if not listings:
        return 0

    # Deduplicate by (portal, external_id) — keep last occurrence
    seen = {}
    for item in listings:
        key = (item.get("portal"), item.get("external_id"))
        seen[key] = item
    unique = list(seen.values())

    client = get_client()
    # Upload in batches of 200 to avoid request size limits
    total = 0
    batch_size = 200
    for i in range(0, len(unique), batch_size):
        batch = unique[i:i + batch_size]
        result = (
            client.table("property_listings")
            .upsert(batch, on_conflict="portal,external_id")
            .execute()
        )
        total += len(result.data) if result.data else 0
    return total


def mark_inactive(portal: str, active_ids: list[str]) -> None:
    """Marca como inactive os imóveis do portal que não apareceram no scraping."""
    if not active_ids:
        return
    # Skip if too many IDs (PostgreSQL limit for NOT IN)
    if len(active_ids) > 500:
        return
    try:
        client = get_client()
        client.table("property_listings").update({"status": "inactive"}).eq(
            "portal", portal
        ).not_.in_("external_id", active_ids).execute()
    except Exception as e:
        print(f"[uploader] mark_inactive warning: {e}")
