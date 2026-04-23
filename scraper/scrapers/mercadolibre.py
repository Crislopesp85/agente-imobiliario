"""Scraper para MercadoLibre Inmuebles — urllib + asyncio.to_thread."""

import asyncio
import re
import json
import urllib.request
import urllib.error
from normalizer import normalize_listing

PORTAL = "mercadolibre"
BASE_URL = "https://inmuebles.mercadolibre.com.ar"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "es-AR,es;q=0.9,en;q=0.8",
}


def fetch_url(url: str) -> str | None:
    try:
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=30) as r:
            raw = r.read()
            try:
                return raw.decode("utf-8")
            except Exception:
                return raw.decode("latin-1")
    except urllib.error.HTTPError as e:
        print(f"[mercadolibre] HTTP {e.code}: {url}")
        return None
    except Exception as e:
        print(f"[mercadolibre] Erro: {e}")
        return None


def extract_results(content: str) -> list:
    decoder = json.JSONDecoder()
    for m in re.finditer(r'"results"\s*:\s*(\[)', content):
        start = m.start(1)
        if content[start:start+3] != '[{"':
            continue
        try:
            result, _ = decoder.raw_decode(content, start)
            if isinstance(result, list) and result and isinstance(result[0], dict):
                return result
        except Exception:
            continue
    return []


def extract_item(item: dict) -> dict | None:
    try:
        if item.get("type") != "ITEM":
            return None
        ext_id = str(item.get("id", ""))
        if not ext_id:
            return None

        attrs = {}
        for a in item.get("attributes", []):
            if isinstance(a, dict):
                val = a.get("value_name") or (a.get("values") or [{}])[0].get("name")
                attrs[a.get("id", "")] = val

        price_raw = item.get("price")
        currency = item.get("currency_id", "USD")

        location = item.get("location", {}) or {}
        neighborhood = (
            location.get("neighborhood", {}).get("name") or
            location.get("city", {}).get("name", "")
        )
        city = location.get("state", {}).get("name") or "Buenos Aires"

        thumbnail = item.get("thumbnail", "")
        images = [thumbnail] if thumbnail else []

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
            "latitude": None,
            "longitude": None,
            "images": images,
            "url": item.get("permalink", ""),
            "amenities": {},
        }
        return normalize_listing(PORTAL, ext_id, raw)
    except Exception:
        return None


async def scrape(neighborhoods: list[str], operation: str = "venta", max_pages: int = 3) -> list[dict]:
    all_listings = []
    op_path = "venta" if operation == "venta" else "alquiler"

    for neighborhood in neighborhoods:
        slug = neighborhood.lower().replace(" ", "-")
        for pg in range(1, max_pages + 1):
            if pg == 1:
                url = f"{BASE_URL}/departamentos/{op_path}/{slug}/"
            else:
                offset = (pg - 1) * 48 + 1
                url = f"{BASE_URL}/departamentos/{op_path}/{slug}/_Desde_{offset}_NoIndex_True"
            print(f"[mercadolibre] {neighborhood} página {pg}")

            content = await asyncio.to_thread(fetch_url, url)
            if not content:
                break

            items_raw = extract_results(content)
            if not items_raw:
                print(f"[mercadolibre] nenhum resultado em: {url}")
                break

            listings = [extract_item(i) for i in items_raw if isinstance(i, dict)]
            listings = [l for l in listings if l]
            all_listings.extend(listings)
            await asyncio.sleep(1)

    print(f"[mercadolibre] {len(all_listings)} imóveis encontrados")
    return all_listings
