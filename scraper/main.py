"""Script principal do scraper. Roda todos os portais e sobe para o Supabase."""

import asyncio
import sys
from scrapers import zonaprop, argenprop, mercadolibre
from uploader import upsert_listings, mark_inactive

# Bairros/cidades a scraper (personalize aqui)
NEIGHBORHOODS = [
    "palermo", "belgrano", "recoleta", "san telmo",
    "caballito", "villa crespo", "nunez", "colegiales",
    "almagro", "flores", "villa urquiza",
]


async def run_portal(name: str, scrape_fn, neighborhoods: list[str]) -> list[str]:
    print(f"\n{'='*50}")
    print(f"Iniciando scraping: {name.upper()}")
    print(f"{'='*50}")
    try:
        listings = await scrape_fn(neighborhoods)
        print(f"[{name}] {len(listings)} imóveis encontrados")

        if listings:
            saved = upsert_listings(listings)
            print(f"[{name}] {saved} imóveis salvos no Supabase")

        return [l["external_id"] for l in listings if l.get("external_id")]
    except Exception as e:
        print(f"[{name}] ERRO: {e}")
        return []


async def main():
    print("Agente Imobiliário — Scraper iniciado")
    print(f"Bairros: {', '.join(NEIGHBORHOODS)}\n")

    # Roda scrapers em paralelo (cuidado com rate limits)
    results = await asyncio.gather(
        run_portal("zonaprop", zonaprop.scrape, NEIGHBORHOODS),
        run_portal("argenprop", argenprop.scrape, NEIGHBORHOODS),
        run_portal("mercadolibre", mercadolibre.scrape, NEIGHBORHOODS),
        return_exceptions=True,
    )

    zonaprop_ids, argenprop_ids, ml_ids = (
        r if isinstance(r, list) else [] for r in results
    )

    # Marca como inativo o que não apareceu mais
    if zonaprop_ids:
        mark_inactive("zonaprop", zonaprop_ids)
    if argenprop_ids:
        mark_inactive("argenprop", argenprop_ids)
    if ml_ids:
        mark_inactive("mercadolibre", ml_ids)

    total = len(zonaprop_ids) + len(argenprop_ids) + len(ml_ids)
    print(f"\nScraping concluído. Total: {total} imóveis processados.")


if __name__ == "__main__":
    asyncio.run(main())
