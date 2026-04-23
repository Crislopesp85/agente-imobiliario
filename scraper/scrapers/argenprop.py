"""Scraper para Argenprop (argenprop.com) — parse HTML direto."""

import asyncio
import re
import json
import httpx
from normalizer import normalize_listing

PORTAL = "argenprop"
BASE_URL = "https://www.argenprop.com"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "es-AR,es;q=0.9,en;q=0.8",
}


def parse_listings_html(content: str, neighborhood: str) -> list[dict]:
    """Parse listings from Argenprop HTML page."""
    listings = []

    # Try to find embedded JSON first (window.__INITIAL_STATE__ or similar)
    for pattern in [
        r'window\.__INITIAL_STATE__\s*=\s*(\{.*?\});\s*(?:</script>|window\.)',
        r'window\.__STATE__\s*=\s*(\{.*?\});\s*(?:</script>|window\.)',
    ]:
        m = re.search(pattern, content, re.DOTALL)
        if m:
            try:
                data = json.loads(m.group(1))
                raw_listings = (
                    data.get("listings", {}).get("data", {}).get("listings") or
                    data.get("listingData", {}).get("listings") or
                    []
                )
                if raw_listings:
                    for p in raw_listings:
                        listing = extract_listing_json(p)
                        if listing:
                            listings.append(listing)
                    return listings
            except Exception:
                pass

    # Fallback: parse HTML cards
    # Each listing card has class "listing-card" or similar
    # Extract hrefs + price + details
    card_pattern = re.compile(
        r'<(?:article|div)[^>]*class="[^"]*listing[^"]*"[^>]*>(.*?)</(?:article|div)>',
        re.DOTALL | re.IGNORECASE
    )

    # Simpler: find all property links and associated prices
    # Pattern: <a href="/propiedad/...">
    prop_blocks = re.findall(
        r'<a[^>]+href="(/[^"]*(?:departamento|ph|casa)[^"]*)"[^>]*>(.*?)</a>',
        content,
        re.DOTALL | re.IGNORECASE
    )

    seen = set()
    for href, inner in prop_blocks:
        if href in seen or len(href) < 10:
            continue
        seen.add(href)

        # Extract ID from URL (last number in path)
        id_match = re.search(r'(\d{5,})', href)
        ext_id = id_match.group(1) if id_match else href[-20:]

        # Try to find price near this block
        title = re.sub(r'<[^>]+>', '', inner).strip()[:200]

        raw = {
            "title": title,
            "price": None,
            "currency": "USD",
            "neighborhood": neighborhood,
            "city": "Buenos Aires",
            "url": f"{BASE_URL}{href}",
            "amenities": {},
        }
        listings.append(normalize_listing(PORTAL, ext_id, raw))

    return listings


def extract_listing_json(p: dict) -> dict | None:
    try:
        ext_id = str(p.get("id") or p.get("postingId", ""))
        if not ext_id:
            return None

        price_info = p.get("price", {})
        if isinstance(price_info, (int, float)):
            price_raw, currency = price_info, "USD"
        elif isinstance(price_info, dict):
            price_raw = price_info.get("amount") or price_info.get("value")
            currency = "USD" if str(price_info.get("currency", "")).upper() in ("USD", "U$S") else "ARS"
        else:
            price_raw, currency = None, "USD"

        loc = p.get("location", {}) or {}
        neighborhood = loc.get("neighborhood") or loc.get("barrio", "")
        city = loc.get("city") or loc.get("ciudad", "Buenos Aires")

        attrs = {}
        for a in p.get("attributes", []):
            if isinstance(a, dict):
                attrs[a.get("id", "")] = a.get("value")

        raw = {
            "title": p.get("title") or p.get("description", "")[:200],
            "description": p.get("description", ""),
            "price": price_raw,
            "currency": currency,
            "m2_total": attrs.get("surfaceTotal"),
            "m2_covered": attrs.get("surfaceCovered"),
            "rooms": attrs.get("rooms"),
            "bathrooms": attrs.get("bathrooms"),
            "parking": attrs.get("garages"),
            "address": p.get("address") or loc.get("address", ""),
            "neighborhood": neighborhood,
            "city": city,
            "latitude": loc.get("lat"),
            "longitude": loc.get("lng"),
            "images": [img if isinstance(img, str) else img.get("url", "") for img in p.get("photos", [])[:5]],
            "url": f"{BASE_URL}{p.get('url', '')}",
            "amenities": {},
        }
        return normalize_listing(PORTAL, ext_id, raw)
    except Exception:
        return None


async def scrape_url(client: httpx.AsyncClient, url: str, neighborhood: str) -> list[dict]:
    try:
        resp = await client.get(url, headers=HEADERS, follow_redirects=True, timeout=30)
        if resp.status_code != 200:
            print(f"[argenprop] HTTP {resp.status_code}: {url}")
            return []
        return parse_listings_html(resp.text, neighborhood)
    except Exception as e:
        print(f"[argenprop] Erro: {e}")
        return []


async def scrape(neighborhoods: list[str], operation: str = "venta", max_pages: int = 3) -> list[dict]:
    all_listings = []

    async with httpx.AsyncClient() as client:
        for neighborhood in neighborhoods:
            slug = neighborhood.lower().replace(" ", "-")
            for pg in range(1, max_pages + 1):
                base = f"{BASE_URL}/departamentos/venta/{slug}"
                url = base if pg == 1 else f"{base}?pagina={pg}"
                print(f"[argenprop] {neighborhood} página {pg}")
                results = await scrape_url(client, url, neighborhood)
                if not results:
                    break
                all_listings.extend(results)
                await asyncio.sleep(2)

    print(f"[argenprop] {len(all_listings)} imóveis encontrados")
    return all_listings
