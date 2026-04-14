# Incasso Check NL — V1 Setup

## Wat zit er in dit pakket

| Bestand | Wat het is |
|---------|------------|
| index.html | Volledige landingspagina, klaar om online te zetten |

---

## Hoe v1 werkt

De flow is bewust eenvoudig en volledig handmatig:

1. Bezoeker betaalt €49 via Stripe
2. Bezoeker ontvangt een bevestigingsmail (via Stripe)
3. Jij stuurt de klant een mail met een uploadlink (WeTransfer of Google Form)
4. Klant levert zijn brief aan
5. Jij analyseert de brief met de AI-prompt (zie het Word-document)
6. Jij stuurt het rapport + conceptbezwaarbrief per e-mail terug
7. Klant ontvangt resultaat binnen 24 uur

Geen automatisering nodig. Dit werkt direct.

---

## Stap 1 — Stripe betaallink aanmaken

1. Ga naar https://dashboard.stripe.com en maak een gratis account aan
2. Ga naar **Products** → **Add product**
   - Naam: Incasso Analyse
   - Prijs: €49 (eenmalig)
3. Ga naar **Payment Links** → **Create link**
4. Kopieer de betaallink (ziet eruit als: `https://buy.stripe.com/xxxxx`)
5. Open `index.html` in een teksteditor
6. Zoek naar: `https://buy.stripe.com/JOUW_STRIPE_LINK`
7. Vervang dit door jouw echte Stripe-link
8. Sla het bestand op

Tip: zet in Stripe de bevestigingsmail aan zodat klanten automatisch een betaalbewijs ontvangen.

---

## Stap 2 — Online zetten

### Optie A — Netlify (gratis, aanbevolen)
1. Ga naar https://netlify.com → maak gratis account aan
2. Sleep de map met `index.html` naar het Netlify-dashboard
3. Je site is direct live op een gratis `.netlify.app`-URL
4. Optioneel: koppel je eigen domeinnaam

### Optie B — Vercel (gratis)
1. Ga naar https://vercel.com
2. Upload via de interface of koppel je GitHub-repository

### Optie C — Eigen hosting
Upload `index.html` naar je webserver via FTP of het hostingpaneel.

---

## Stap 3 — Domein (optioneel)

Koop een domein bij Transip, GoDaddy of Namecheap.

Suggesties:
- incassocheckn1.nl
- briefcheck.nl
- aanmaningcheck.nl

Koppel het domein aan Netlify via de DNS-instellingen.

---

## Stap 4 — Na elke betaling

Bij elke betaling ontvang je een melding van Stripe.

**Jouw actie:**
1. Stuur de klant een korte mail met een uploadlink voor zijn brief
   (gebruik WeTransfer, Google Drive of een Google Form)
2. Ontvang de brief van de klant
3. Analyseer de brief met de AI-prompt uit het Word-document
4. Stuur het rapport + conceptbezwaarbrief per e-mail terug
5. Doe dit binnen 24 uur na aanlevering

Dit is v1 — simpel, geen automatisering nodig.

---

## Stap 5 — Verkeer genereren (optioneel)

### Google Ads — start klein
Budget: €10–€20 per dag om te testen.

Zoekwoorden om op te bieden:
- aanmaning ontvangen wat doen
- incassobrief onterecht
- incassokosten te hoog
- bezwaar aanmaning
- aanmaning controleren

Match type: Phrase Match of Broad Match Modified.
Stuur verkeer direct naar `index.html`.

---

## Wat je nog moet aanpassen in index.html

| Zoek naar | Vervangen door |
|-----------|----------------|
| `JOUW_STRIPE_LINK` | Jouw echte Stripe betaallink |
| `© 2025 Incasso Check NL` | Jouw bedrijfsnaam indien gewenst |

---

## V2 uitbreidingen (later)

- Automatisch uploadformulier na betaling (via Typeform of eigen form)
- AI-analyse direct verwerkt via Anthropic API
- Automatische bezorging van rapport per e-mail
- Upsell checkout voor aangetekend versturen en monitoring

---

## Vragen of complexe gevallen?

Gebruik de AI-prompt uit het Word-document voor alle analyses.
Juridisch Loket voor complexe gevallen: 0900-8020
