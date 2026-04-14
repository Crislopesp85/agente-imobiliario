"""Scraper para ZonaProps (zonap rop.com.ar)."""

import asyncio
import re
import json
from playwright.async_api import async_playwright, Page
from normalizer import normalize_listing

PORTAL = "zonaprop"
BASE_URL = "https://www.zonaprop.com.ar"


async def scrape_search_page(page: Page, url: str) -> list[dict]:
    listings = []
    await page.goto(url, wait_until="domcontentloaded", timeout=30000)
    await page.wait_for_timeout(2000)

    # ZonaProps injeta dados no __NEXT_DATA__ ou em postings JSON
    content = await page.content()

    # Tenta extrair do script __NEXT_DATA__
    match = re.search(r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>', content, re.DOTALL)
    if match:
        try:
            data = json.loads(match.group(1))
            postings = (
                data.get("props", {})
                .get("pageProps", {})
                .get("initialState", {})
                .get("listPostings", {})
                .get("postings", [])
            )
            for p in postings:
                listing = extract_posting(p)
                if listing:
                    listings.append(listing)
            return listings
        except Exception:
            pass

    # Fallback: extrai cards do DOM
    cards = await page.query_selector_all('[data-posting-id]')
    for card in cards:
        try:
            ext_id = await card.get_attribute("data-posting-id")
            title_el = await card.query_selector('[class*="title"]')
            price_el = await card.query_selector('[class*="price"]')
            addr_el = await card.query_selector('[class*="address"]')
            link_el = await card.query_selector("a")

            title = (await title_el.inner_text()).strip() if title_el else ""
            price_raw = (await price_el.inner_text()).strip() if price_el else ""
            address = (await addr_el.inner_text()).strip() if addr_el else ""
            href = await link_el.get_attribute("href") if link_el else ""
            url_full = f"{BASE_URL}{href}" if href and href.startswith("/") else href

            raw = {
                "title": title,
                "price": price_raw,
                "address": address,
                "url": url_full,
                "city": "Buenos Aires",
            }
            listings.append(normalize_listing(PORTAL, ext_id or title[:40], raw))
        except Exception:
            continue

    return listings


def extract_posting(p: dict) -> dict | None:
    try:
        ext_id = str(p.get("postingId") or p.get("id", ""))
        if not ext_id:
            return None

        # Preço
        price_data = p.get("priceOperationTypes", [{}])[0] if p.get("priceOperationTypes") else {}
        prices = price_data.get("prices", [{}])
        price_info = prices[0] if prices else {}
        price_raw = price_info.get("amount")
        currency = "USD" if price_info.get("currency") in ("USD", "U$S") else "ARS"

        # Localização
        geo = p.get("postingAddress", {}).get("geoLocation", {})
        loc = p.get("postingLocation", {})
        neighborhood = (
            loc.get("neighbourhood", {}).get("name") or
            loc.get("location", {}).get("name", "")
        )
        city = loc.get("city", {}).get("name", "Buenos Aires")

        # Atributos
        features = {f.get("label", ""): f.get("value") for f in p.get("mainFeatures", [])}
        m2_total = features.get("Sup. total") or features.get("Superficie total")
        m2_covered = features.get("Sup. cubierta") or features.get("Superficie cubierta")
        rooms = features.get("Amb.") or features.get("Ambientes")
        bathrooms = features.get("Baños")

        raw = {
            "title": p.get("title", ""),
            "description": p.get("description", ""),
            "price": price_raw,
            "currency": currency,
            "m2_total": m2_total,
            "m2_covered": m2_covered,
            "rooms": rooms,
            "bathrooms": bathrooms,
            "address": p.get("postingAddress", {}).get("address", ""),
            "neighborhood": neighborhood,
            "city": city,
            "latitude": geo.get("lat"),
            "longitude": geo.get("lon"),
            "images": [img.get("url", "") for img in p.get("photos", [])[:5]],
            "url": f"{BASE_URL}{p.get('url', '')}",
            "amenities": {},
        }
        return normalize_listing(PORTAL, ext_id, raw)
    except Exception:
        return None


async def scrape(neighborhoods: list[str], operation: str = "venta", max_pages: int = 5) -> list[dict]:
    """
    neighborhoods: lista de bairros ex: ['palermo', 'belgrano']
    operation: 'venta' ou 'alquiler'
    """
    all_listings = []

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        )
        page = await context.new_page()

        for neighborhood in neighborhoods:
            slug = neighborhood.lower().replace(" ", "-")
            for pg in range(1, max_pages + 1):
                url = f"{BASE_URL}/departamentos-{operation}/{slug}-pagina-{pg}.htm"
                print(f"[ZonaProp] Scraping: {url}")
                try:
                    results = await scrape_search_page(page, url)
                    if not results:
                        break
                    all_listings.extend(results)
                    await asyncio.sleep(2)
                except Exception as e:
                    print(f"[ZonaProp] Erro na página {pg}: {e}")
                    break

        await browser.close()

    return all_listings
