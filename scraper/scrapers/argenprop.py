"""Scraper para Argenprop (argenprop.com)."""

import asyncio
import re
import json
from playwright.async_api import async_playwright, Page
from normalizer import normalize_listing

PORTAL = "argenprop"
BASE_URL = "https://www.argenprop.com"


async def scrape_search_page(page: Page, url: str) -> list[dict]:
    listings = []
    await page.goto(url, wait_until="domcontentloaded", timeout=30000)
    await page.wait_for_timeout(2000)

    # Argenprop injeta dados como JSON em window.__INITIAL_STATE__ ou similar
    content = await page.content()

    # Tenta extrair JSON de script
    match = re.search(r'window\.__INITIAL_STATE__\s*=\s*({.*?});', content, re.DOTALL)
    if match:
        try:
            data = json.loads(match.group(1))
            props = (
                data.get("listings", {}).get("data", {}).get("listings", [])
            )
            for p in props:
                listing = extract_listing(p)
                if listing:
                    listings.append(listing)
            return listings
        except Exception:
            pass

    # Fallback DOM
    cards = await page.query_selector_all(".listing__item, [class*='listing-card']")
    for card in cards:
        try:
            link_el = await card.query_selector("a")
            href = await link_el.get_attribute("href") if link_el else ""
            ext_id = re.search(r"-(\d+)$", href or "")
            ext_id = ext_id.group(1) if ext_id else href

            title_el = await card.query_selector("h2, .listing__title")
            price_el = await card.query_selector(".listing__price, [class*='price']")
            location_el = await card.query_selector(".listing__location, [class*='location']")

            raw = {
                "title": (await title_el.inner_text()).strip() if title_el else "",
                "price": (await price_el.inner_text()).strip() if price_el else "",
                "address": (await location_el.inner_text()).strip() if location_el else "",
                "url": f"{BASE_URL}{href}" if href and href.startswith("/") else href or "",
                "city": "Buenos Aires",
            }
            listings.append(normalize_listing(PORTAL, ext_id or href, raw))
        except Exception:
            continue

    return listings


def extract_listing(p: dict) -> dict | None:
    try:
        ext_id = str(p.get("id") or p.get("postingId", ""))
        if not ext_id:
            return None

        price_info = p.get("price", {})
        price_raw = price_info.get("amount") or price_info.get("value")
        currency = "USD" if str(price_info.get("currency", "")).upper() in ("USD", "U$S") else "ARS"

        loc = p.get("location", {})
        neighborhood = loc.get("neighborhood") or loc.get("barrio", "")
        city = loc.get("city") or loc.get("ciudad", "Buenos Aires")

        attrs = {a.get("id", ""): a.get("value") for a in p.get("attributes", [])}

        raw = {
            "title": p.get("title") or p.get("description", "")[:200],
            "description": p.get("description", ""),
            "price": price_raw,
            "currency": currency,
            "m2_total": attrs.get("surfaceTotal") or attrs.get("superficie_total"),
            "m2_covered": attrs.get("surfaceCovered") or attrs.get("superficie_cubierta"),
            "rooms": attrs.get("rooms") or attrs.get("ambientes"),
            "bathrooms": attrs.get("bathrooms") or attrs.get("banos"),
            "parking": attrs.get("garages") or attrs.get("cocheras"),
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


async def scrape(neighborhoods: list[str], operation: str = "venta", max_pages: int = 5) -> list[dict]:
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
                url = f"{BASE_URL}/departamentos-{operation}/{slug}--pagina-{pg}"
                print(f"[Argenprop] Scraping: {url}")
                try:
                    results = await scrape_search_page(page, url)
                    if not results:
                        break
                    all_listings.extend(results)
                    await asyncio.sleep(2)
                except Exception as e:
                    print(f"[Argenprop] Erro: {e}")
                    break

        await browser.close()

    return all_listings
