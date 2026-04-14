"""Normaliza dados brutos dos portais para o schema do Supabase."""

from typing import Optional
import re


def normalize_price(raw: str | int | float | None) -> tuple[Optional[float], Optional[str]]:
    """Retorna (price, currency)."""
    if raw is None:
        return None, None
    text = str(raw).upper().strip()
    currency = "USD" if "USD" in text or "U$S" in text or "U$D" in text else "ARS"
    digits = re.sub(r"[^\d]", "", text)
    if not digits:
        return None, None
    return float(digits), currency


def normalize_m2(raw: str | int | float | None) -> Optional[float]:
    if raw is None:
        return None
    text = str(raw).replace(",", ".").strip()
    match = re.search(r"[\d.]+", text)
    return float(match.group()) if match else None


def normalize_int(raw: str | int | None) -> Optional[int]:
    if raw is None:
        return None
    text = str(raw).strip()
    match = re.search(r"\d+", text)
    return int(match.group()) if match else None


def normalize_listing(portal: str, external_id: str, raw: dict) -> dict:
    """Converte dados brutos de qualquer portal para o formato da tabela property_listings."""
    price, currency = normalize_price(raw.get("price"))

    return {
        "portal": portal,
        "external_id": str(external_id),
        "title": (raw.get("title") or "")[:500],
        "description": raw.get("description"),
        "price": price,
        "currency": currency,
        "m2_total": normalize_m2(raw.get("m2_total")),
        "m2_covered": normalize_m2(raw.get("m2_covered")),
        "rooms": normalize_int(raw.get("rooms")),
        "bathrooms": normalize_int(raw.get("bathrooms")),
        "parking": normalize_int(raw.get("parking")),
        "address": raw.get("address"),
        "neighborhood": raw.get("neighborhood"),
        "city": raw.get("city", "Buenos Aires"),
        "latitude": raw.get("latitude"),
        "longitude": raw.get("longitude"),
        "amenities": raw.get("amenities", {}),
        "images": raw.get("images", [])[:5],
        "url": raw.get("url", ""),
        "listed_date": raw.get("listed_date"),
        "status": "active",
        "raw_data": raw,
    }
