# FuoriPrezzo — manuale operativo

Sito di offerte Amazon di **Marco** (MarcoFirri). Questo file è la fonte unica delle regole: chi lavora sul repository (persone, agenti, compiti programmati) lo segue. Se un'istruzione esterna lo contraddice, vale questo file, salvo richiesta esplicita di Marco.

Scrivi a Marco sempre in **italiano semplice**: non è un tecnico.

## Canali
- **Sito**: https://fuoriprezzo.it — GitHub Pages da questo repository (ramo `main`). Dominio su Hostinger (DNS: 4 record A di GitHub Pages + CNAME `www` → `marcofirri.github.io`).
- **Telegram**: canale pubblico `@fuoriprezzo3` (https://t.me/fuoriprezzo3), bot amministratore.
- **Instagram**: `@fuoriprezzo`, account Creator. Pubblicazione via app Meta "FuoriPrezzo Pubblicazioni".
- **Amazon Affiliati**: tag `marcofirri-21`. Keepa: solo versione gratuita (nessuna API).
- **Google Search Console**: proprietà `https://fuoriprezzo.it/` (verifica col file `google246512021bf6032c.html`: **non cancellarlo**).
- **Facebook**: pagina in preparazione, nessuna automazione per ora. **TikTok**: solo video preparati per pubblicazione manuale.

## File importanti
| File | A cosa serve |
|---|---|
| `data/offerte.js` | Tutte le offerte (`FP_OFFERTE`) e la configurazione (`FP_CONFIG`: tag, `sceltaDelGiorno`). Ogni push che lo modifica avvia Telegram e Instagram. |
| `data/seo.json` | Titoli, descrizioni e testi di home e categorie. |
| `tools/build.mjs` | Genera `index.html`, `offerta/<asin>/`, `categoria/<slug>/`, `sitemap.xml`, `robots.txt`. **Eseguirlo a ogni modifica** di `data/` o `templates/`. |
| `templates/index.html` | Modello della home (non modificare `index.html` a mano). |
| `tools/render_post.py ASIN` | Crea le immagini social: `img/<ASIN>.png` (Telegram) e `img/<ASIN>-ig.jpg` (Instagram). Richiede `img/<ASIN>.svg`. |
| `tools/render_reel.py ASIN` | Crea il reel `img/<ASIN>-reel.mp4` (12 secondi, senza musica) e la storia `img/<ASIN>-story.jpg`. Richiede `img/<ASIN>.svg` e ffmpeg. |
| `data/instagram-strategia.json` | Strategia Instagram (formato, orari, prima riga delle didascalie, storie al giorno). La aggiorna da sola ogni mattina il workflow `instagram-strategia.yml`. |
| `img/<ASIN>.svg` | Illustrazione del prodotto disegnata da noi. |
| `assets/app.js`, `assets/style.css` | Sito interattivo (home, ricerca, schede). |
| `.github/workflows/` | `telegram.yml`, `instagram.yml` (ogni ora decide se pubblicare), `instagram-strategia.yml` (ogni mattina), `instagram-insights.yml`. |

## Come si pubblica un'offerta
1. Leggere la pagina Amazon `https://www.amazon.it/dp/<ASIN>` nel Chrome di Marco: titolo, prezzo, prezzo di riferimento mostrato da Amazon e il suo nome esatto ("Prezzo più basso ultimi 30gg", "Prezzo consigliato"…), eventuale scadenza dell'offerta lampo, valutazione e numero di recensioni. Se c'è, aprire anche "Cronologia dei prezzi" per lo storico.
2. Aggiungere l'offerta in cima a `FP_OFFERTE` con i campi: `asin, categoria, icona, illustrazione, titolo, titoloBreve, prezzo, prezzoRiferimento, tipoRiferimento, riferimentoBreve, badge, nota?, etichetta?, scadenza?, controllato, valutazione, recensioni, storico`.
   - `controllato` = data e ora reali della lettura (ISO con fuso di Roma, es. `2026-10-13T08:31:00+02:00`).
   - `tipoRiferimento` = il nome che usa Amazon, in minuscolo. Lo sconto si calcola **solo** su quel prezzo.
   - `nota` = un'informazione vera dallo storico di Amazon (es. "È il prezzo più basso degli ultimi 12 mesi su Amazon").
3. Disegnare `img/<ASIN>.svg` (prodotto generico, senza loghi né marchi), poi `python3 tools/render_post.py <ASIN>` e `python3 tools/render_reel.py <ASIN>`.
4. Se è la nuova scelta del giorno: `FP_CONFIG.sceltaDelGiorno = '<ASIN>'`.
5. `node --check data/offerte.js`, poi `node tools/build.mjs` (aggiorna da solo anche i numeri di versione dei file), commit e push su `main` con autore `MarcoFirri <MarcoFirri@users.noreply.github.com>`.
6. Verificare che siano partiti i workflow "pages build and deployment", "Pubblica su Telegram" e "Pubblica su Instagram".

## Regole che non si cambiano
- **Mai prezzi inventati o stimati.** Si pubblica solo ciò che si legge su Amazon, con data e ora del controllo. Nessun prodotto di esempio online.
- **Mai foto di Amazon o dei produttori**, nemmeno modificate o senza logo: solo illustrazioni nostre (o foto fatte da Marco). Le foto vere arriveranno solo dall'API ufficiale Amazon.
- Lo sconto indica sempre **con quale prezzo è calcolato**. Il sito non promette "minimo 30 giorni" se Amazon non lo dice.
- I link Amazon hanno sempre il tag `marcofirri-21` e `rel="nofollow sponsored"`. Ogni canale dichiara che i link sono affiliati.
- Prezzi più vecchi di 24 ore: il sito li nasconde da solo ("Da verificare"); le offerte scadute risultano "Terminata".
- Nessuna cancellazione di messaggi, post o account da parte degli agenti: lo fa Marco.
- Credenziali e token (Telegram, Instagram) stanno solo nei secrets di GitHub: mai nel codice, nei commit o nei messaggi.

## Instagram: l'agente social
Il workflow `instagram.yml` gira ogni ora e a ogni modifica delle offerte; `.github/scripts/instagram-piano.mjs` decide se pubblicare adesso, cosa (foto, reel, storia) e con quale prima riga di didascalia, seguendo `data/instagram-strategia.json`. Ogni mattina `instagram-strategia.yml` rilegge i risultati dei post (copertura, salvataggi, condivisioni, interazioni) e sposta i pesi verso ciò che rende di più, lasciando sempre una parte di prove. Ogni lunedì l'agente insight può ritoccare `postAlGiorno`, `storieAlGiorno` e `orarioStoriaRicordo`.

Limiti fissi nel codice (la strategia non può superarli):
- solo offerte vere, controllate da meno di 24 ore e non scadute; mai tra mezzanotte e le 8;
- **fino all'11/11/2026** (account limitato il 12/10/2026, "non puoi condividere link"): solo la scelta del giorno, al massimo **un contenuto ogni 12 ore**, **nessuna storia** (deciso da Marco il 13/10/2026);
- dal 12/11/2026: al massimo 2 post o reel al giorno a 6 ore di distanza e 3 storie al giorno;
- nelle didascalie nessun indirizzo web, solo "link in bio"; ogni didascalia contiene "Codice Amazon: <ASIN>" (serve a riconoscere cosa è già stato pubblicato);
- niente modifiche frequenti a bio e profilo. Se arriva un nuovo avviso da Instagram: mettere in pausa i workflow `instagram.yml` e `instagram-strategia.yml` e avvisare Marco.

## Compiti programmati (girano da soli)
| Nome | Quando | Cosa fa |
|---|---|---|
| Ricontrollo prezzi FuoriPrezzo | ogni giorno 20:46, col computer di Marco acceso | Ricontrolla su Amazon le offerte controllate da più di 20 ore. Prezzo uguale → resta e si aggiorna lo storico; prezzo diverso o finita → `scadenza` = ora, e se era la scelta del giorno `sceltaDelGiorno: ''`. Rigenera le pagine e avvisa Marco. |
| Agente SEO FuoriPrezzo | domenica 21:24, col computer acceso | Legge Search Console, controlla le pagine, al massimo 3 piccoli miglioramenti in `data/seo.json` (registrati in `data/seo-log.md`), resoconto a Marco. |
| Strategia Instagram (workflow GitHub) | ogni giorno 7:40 | `instagram-strategia.yml`: aggiorna `data/instagram-strategia.json` dai risultati e fa commit su `main` (prima di ogni push fare `git pull`). |
| Agente insight Instagram | lunedì 8:52, nel cloud | Avvia `instagram-insights.yml` (resoconto cifrato nel ramo `report`), lo analizza, può ritoccare post e storie al giorno in `data/instagram-strategia.json` e manda consigli a Marco. |

## Quando Marco scrive…
- **un link Amazon** → pubblicare l'offerta come sopra (diventa la scelta del giorno se non ce n'è una valida).
- **"aggiorna"** → ricontrollare subito tutte le offerte attive con le stesse regole del ricontrollo serale.
- **"video TikTok"** → creare un video verticale della scelta del giorno e mandarglielo con didascalia e hashtag, senza pubblicarlo.
