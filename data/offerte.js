/*
  Offerte di fuoriprezzo.it
  Ogni offerta riporta i dati letti su Amazon.it al momento del controllo ("controllato").
  - prezzoRiferimento: il prezzo di confronto mostrato da Amazon (es. "Prezzo più basso ultimi 30gg")
  - storico: i prezzi registrati da noi giorno per giorno; il grafico compare da 5 rilevazioni in su
  - scadenza: per le offerte a tempo, quando terminano
  - illustrazione: immagine del prodotto disegnata per il sito (cartella img)
  - nota: frase in più mostrata nei post e nella scheda (es. confronto con lo storico prezzi di Amazon)
  - instagramDalle: (facoltativo) post e reel su Instagram non prima di quest'ora
  - icona: disegno mostrato al posto della foto (headphones, laptop, house, pot, dumbbell, gamepad, bottle, wrench, camera)
*/
window.FP_CONFIG = {
  tag: 'marcofirri-21',
  sceltaDelGiorno: 'B0DCFYVR1Z'
};

window.FP_OFFERTE = [
  {
    asin: 'B0DCFYVR1Z',
    categoria: 'bellezza',
    icona: 'bottle',
    illustrazione: 'img/B0DCFYVR1Z.svg',
    titolo: 'Philips OneBlade QP2834/31 - Regolabarba elettrico 360 autentico, per viso e corpo, 3 lame da 360, 4 pettini per barba (1, 2, 3, 5 mm), 1 kit per il corpo',
    titoloBreve: 'Regolabarba Philips OneBlade viso e corpo con 3 lame 360',
    prezzo: 39.99,
    prezzoRiferimento: 64.99,
    tipoRiferimento: 'prezzo mediano',
    riferimentoBreve: 'Mediano',
    badge: 'Sotto il minimo 30 gg',
    nota: 'Costa meno del prezzo più basso degli ultimi 30 giorni indicato da Amazon (50,63 €)',
    etichetta: 'Offerta a tempo',
    instagramDalle: '2026-10-16T19:00:00+02:00',
    controllato: '2026-10-16T11:58:00+02:00',
    valutazione: 4.4,
    recensioni: 4979,
    storico: [
      { data: '2026-10-16', prezzo: 39.99 }
    ]
  },
  {
    asin: 'B0F1G94CQV',
    categoria: 'bellezza',
    icona: 'bottle',
    illustrazione: 'img/B0F1G94CQV.svg',
    titolo: 'Oral-B iO 9 Spazzolino Elettrico, 1 Testina di Ricambio, Custodia, Nero | 1 Testina di Ricambio per Spazzolino Elettrico Ricaricabile, Custodia da Viaggio, Astuccio Magnetico, Pulizia Denti Efficace',
    titoloBreve: 'Spazzolino elettrico Oral-B iO 9 con custodia da viaggio',
    prezzo: 199.88,
    prezzoRiferimento: 399.99,
    tipoRiferimento: 'prezzo consigliato',
    riferimentoBreve: 'Consigliato',
    badge: 'Sotto il minimo 30 gg',
    nota: 'Costa meno del prezzo più basso degli ultimi 30 giorni indicato da Amazon (219,99 €)',
    etichetta: 'Offerta a vendita rapida',
    controllato: '2026-10-15T11:35:00+02:00',
    valutazione: 4.6,
    recensioni: 96,
    storico: [
      { data: '2026-10-15', prezzo: 199.88 }
    ]
  },
  {
    asin: 'B09B8X9RGM',
    categoria: 'elettronica',
    icona: 'headphones',
    illustrazione: 'img/B09B8X9RGM.svg',
    titolo: 'Echo Dot (Ultimo modello) | Altoparlante intelligente Wi-Fi e Bluetooth, suono più potente e dinamico | Antracite, con Accesso Anticipato ad Alexa+',
    titoloBreve: 'Echo Dot (5ª gen.), altoparlante intelligente con Alexa',
    prezzo: 29.99,
    prezzoRiferimento: 89.99,
    tipoRiferimento: 'prezzo consigliato indicato da Amazon',
    riferimentoBreve: 'Consigliato',
    badge: 'Minimo 12 mesi',
    nota: 'È il prezzo più basso degli ultimi 12 mesi su Amazon (di solito costa circa 65 €)',
    controllato: '2026-10-13T08:31:00+02:00',
    valutazione: 4.6,
    recensioni: 193392,
    storico: [
      { data: '2026-10-13', prezzo: 29.99 }
    ]
  },
  {
    asin: 'B0GZQS8P6D',
    categoria: 'elettronica',
    icona: 'camera',
    illustrazione: 'img/B0GZQS8P6D.svg',
    titolo: 'Videocamera esterna 2K+ Blink con Videocitofono 2K+ a pile Blink (ultimo modello), Nero, Modulo di sincronizzazione di base incluso',
    titoloBreve: 'Videocamera esterna Blink 2K+ con Videocitofono 2K+',
    prezzo: 107.99,
    prezzoRiferimento: 379.98,
    tipoRiferimento: 'prezzo più basso degli ultimi 30 giorni su Amazon',
    riferimentoBreve: 'Minimo 30 gg',
    badge: 'Minimo 30 giorni',
    etichetta: 'Offerta lampo',
    scadenza: '2026-10-12T23:59:00+02:00',
    controllato: '2026-10-12T18:11:00+02:00',
    valutazione: 4.6,
    recensioni: 12,
    storico: [
      { data: '2026-10-12', prezzo: 107.99 }
    ]
  }
];
