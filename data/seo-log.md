# Registro SEO settimanale

- 2026-10-18: Search Console (dal 12/10): 0 clic, 2 impressioni, posizione media 5; 1 pagina indicizzata; sitemap letta il 17/10 (15 pagine). Nessuna query ancora visibile, quindi solo correzioni tecniche:
  1. `tools/build.mjs`: titoli delle pagine offerta entro ~60 caratteri (tolto " | FuoriPrezzo" quando il nome del prodotto è lungo) e descrizioni entro ~155 (la nota si aggiunge solo se c'è spazio; data breve). Prima erano 84-88 e 175-274 caratteri, e Google li tagliava.
  2. `data/seo.json`: titolo categoria Cucina accorciato (86 → 67 caratteri).
  3. `data/seo.json`: descrizione pagina Black Friday accorciata (168 → 148 caratteri), stessi contenuti.
