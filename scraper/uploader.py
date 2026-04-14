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
    client = get_client()
    # Upsert por (portal, external_id)
    result = (
        client.table("property_listings")
        .upsert(listings, on_conflict="portal,external_id")
        .execute()
    )
    return len(result.data) if result.data else 0


def mark_inactive(portal: str, active_ids: list[str]) -> None:
    """Marca como inactive os imóveis do portal que não apareceram no scraping."""
    if not active_ids:
        return
    client = get_client()
    client.table("property_listings").update({"status": "inactive"}).eq(
        "portal", portal
    ).not_.in_("external_id", active_ids).execute()
