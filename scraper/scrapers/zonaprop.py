"""Scraper para ZonaProp (zonaprop.com.ar) — urllib + asyncio.to_thread."""

import asyncio
import re
import json
import urllib.request
import urllib.error
from normalizer import normalize_listing

PORTAL = "zonaprop"
BASE_URL = "https://www.zonaprop.com.ar"

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
        print(f"[zonaprop] HTTP {e.code}: {url}")
        return None
    except Exception as e:
        print(f"[zonaprop] Erro: {e}")
        return None


def extract_list_postings(content: str) -> list:
    m = re.search(r'"listPostings"\s*:\s*(\[)', content)
    if not m:
        return []
    try:
        decoder = json.JSONDecoder()
        result, _ = decoder.raw_decode(content, m.start(1))
        return result if isinstance(result, list) else []
    except Exception:
        return []


def extract_posting(p: dict) -> dict | None:
    try:
        ext_id = str(p.get("postingId") or p.get("id", ""))
        if not ext_id:
            return None

        price_ops = p.get("priceOperationTypes", [])
        price_info = {}
        if price_ops:
            prices = price_ops[0].get("prices", [])
            if prices:
                price_info = prices[0]
        price_raw = price_info.get("amount")
        currency = "USD" if price_info.get("currency") in ("USD", "U$S") else "ARS"

        loc = p.get("postingLocation", {}) or {}
        neighborhood = (
            loc.get("neighbourhood", {}).get("name") or
            loc.get("location", {}).get("name", "")
        ) if isinstance(loc, dict) else ""
        city = loc.get("city", {}).get("name", "Buenos Aires") if isinstance(loc, dict) else "Buenos Aires"

        features_dict = p.get("mainFeatures", {})
        features = {}
        if isinstance(features_dict, dict):
            for v in features_dict.values():
                if isinstance(v, dict):
                    features[v.get("label", "")] = v.get("value")
        elif isinstance(features_dict, list):
            for f in features_dict:
                if isinstance(f, dict):
                    features[f.get("label", "")] = f.get("value")

        m2_total = features.get("Sup. total") or features.get("Superficie total") or features.get("Sup. Tot.")
        m2_covered = features.get("Sup. cubierta") or features.get("Superficie cubierta") or features.get("Sup. Cub.")
        rooms = features.get("Amb.") or features.get("Ambientes")
        bathrooms = features.get("Baños") or features.get("Banos")

        addr_data = p.get("postingAddress", {}) or {}
        geo = addr_data.get("geoLocation", {}) or {} if isinstance(addr_data, dict) else {}

        raw = {
            "title": p.get("title", ""),
            "description": p.get("description", ""),
            "price": price_raw,
            "currency": currency,
            "m2_total": m2_total,
            "m2_covered": m2_covered,
            "rooms": rooms,
            "bathrooms": bathrooms,
            "address": addr_data.get("address", "") if isinstance(addr_data, dict) else "",
            "neighborhood": neighborhood,
            "city": city,
            "latitude": geo.get("lat"),
            "longitude": geo.get("lon"),
            "images": [img.get("url", "") for img in p.get("photos", [])[:5] if isinstance(img, dict)],
            "url": f"{BASE_URL}{p.get('url', '')}",
            "amenities": {},
        }
        return normalize_listing(PORTAL, ext_id, raw)
    except Exception:
        return None


async def scrape(neighborhoods: list[str], operation: str = "venta", max_pages: int = 3) -> list[dict]:
    all_listings = []

    for neighborhood in neighborhoods:
        slug = neighborhood.lower().replace(" ", "-")
        for pg in range(1, max_pages + 1):
            if pg == 1:
                url = f"{BASE_URL}/departamentos-en-{operation}-en-{slug}.htm"
            else:
                url = f"{BASE_URL}/departamentos-en-{operation}-en-{slug}-pagina-{pg}.htm"
            print(f"[zonaprop] {neighborhood} página {pg}")

            content = await asyncio.to_thread(fetch_url, url)
            if not content:
                break

            postings_raw = extract_list_postings(content)
            if not postings_raw:
                print(f"[zonaprop] nenhum posting em: {url}")
                break

            listings = [extract_posting(p) for p in postings_raw]
            listings = [l for l in listings if l]
            all_listings.extend(listings)
            await asyncio.sleep(1)

    print(f"[zonaprop] {len(all_listings)} imóveis encontrados")
    return all_listings
