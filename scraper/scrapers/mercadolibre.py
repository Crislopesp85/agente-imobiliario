"""Scraper para MercadoLibre Inmuebles usando a API pública deles."""

import asyncio
import httpx
from normalizer import normalize_listing

PORTAL = "mercadolibre"
API_URL = "https://api.mercadolibre.com/sites/MLA/search"


async def scrape(neighborhoods: list[str], max_results: int = 200) -> list[dict]:
    all_listings = []

    async with httpx.AsyncClient(timeout=20) as client:
        for neighborhood in neighborhoods:
            offset = 0
            while offset < max_results:
                params = {
                    "category": "MLA1459",   # Inmuebles > Departamentos
                    "q": neighborhood,
                    "operation": "sale",
                    "offset": offset,
                    "limit": 50,
                }
                print(f"[MercadoLibre] {neighborhood} offset={offset}")
                try:
                    resp = await client.get(API_URL, params=params)
                    resp.raise_for_status()
                    data = resp.json()
                    results = data.get("results", [])
                    if not results:
                        break

                    for item in results:
                        listing = extract_item(item)
                        if listing:
                            all_listings.append(listing)

                    offset += 50
                    if offset >= data.get("paging", {}).get("total", 0):
                        break

                    await asyncio.sleep(1)
                except Exception as e:
                    print(f"[MercadoLibre] Erro: {e}")
                    break

    return all_listings


def extract_item(item: dict) -> dict | None:
    try:
        ext_id = str(item.get("id", ""))
        if not ext_id:
            return None

        attrs = {a["id"]: a.get("value_name") or a.get("values", [{}])[0].get("name")
                 for a in item.get("attributes", []) if a.get("id")}

        price_raw = item.get("price")
        currency = item.get("currency_id", "ARS")

        location = item.get("location", {})
        neighborhood = (
            location.get("neighborhood", {}).get("name") or
            location.get("city", {}).get("name", "")
        )
        city = location.get("state", {}).get("name") or "Buenos Aires"

        raw = {
            "title": item.get("title", ""),
            "price": price_raw,
            "currency": currency,
            "m2_total": attrs.get("TOTAL_AREA") or attrs.get("COVERED_AREA"),
            "m2_covered": attrs.get("COVERED_AREA"),
            "rooms": attrs.get("ROOMS"),
            "bathrooms": attrs.get("FULL_BATHROOMS"),
            "parking": attrs.get("PARKING_LOTS"),
            "address": location.get("address_line", ""),
            "neighborhood": neighborhood,
            "city": city,
            "latitude": item.get("seller_address", {}).get("latitude"),
            "longitude": item.get("seller_address", {}).get("longitude"),
            "images": [img.get("url", "") for img in item.get("pictures", [])[:5]],
            "url": item.get("permalink", ""),
            "amenities": {},
        }
        return normalize_listing(PORTAL, ext_id, raw)
    except Exception:
        return None
