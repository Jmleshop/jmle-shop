# jmle — Luxuriöser E-Commerce Shop

Moderne, luxuriöse E-Commerce-Webseite für die Marke **jmle** mit arabischer RTL-Oberfläche, Supabase-Authentifizierung, persistentem Warenkorb und Stripe-Zahlungen.

## Tech-Stack

| Bereich | Technologie |
|---------|-------------|
| Frontend | Next.js 15 (App Router) + React 19 |
| Styling | Tailwind CSS |
| Auth & DB | Supabase |
| Zahlungen | Stripe |
| Bilder | next/image |
| Sprache | Arabisch (RTL) |

## Schnellstart

### 1. Node.js installieren

Installieren Sie [Node.js 18+](https://nodejs.org/) falls noch nicht vorhanden.

### 2. Abhängigkeiten installieren

```bash
 
```

### 3. Umgebungsvariablen konfigurieren

```bash
cp .env.example .env.local
```

Tragen Sie Ihre echten Werte ein:

- **Supabase**: Erstellen Sie ein Projekt auf [supabase.com](https://supabase.com)
- **Stripe**: Erstellen Sie ein Konto auf [stripe.com](https://stripe.com)

### 4. Supabase-Datenbank einrichten

1. Öffnen Sie den **SQL Editor** in Ihrem Supabase-Dashboard
2. Führen Sie den Inhalt von `supabase/schema.sql` aus
3. Aktivieren Sie unter **Authentication → Providers → Email** die E-Mail-Bestätigung
4. Setzen Sie die **Site URL** auf `http://localhost:3000`
5. Fügen Sie `http://localhost:3000/auth/callback` als Redirect URL hinzu

### 5. Entwicklungsserver starten

```bash

```

Öffnen Sie [http://localhost:3000]( ).

---

## Inhalte bearbeiten (Produkte, Bilder, Preise)

Alle Shop-Inhalte werden zentral in **`data/products.json`** verwaltet. Sie müssen keinen Code anfassen.

### Struktur der Konfigurationsdatei

```json
{
  "site": {
    "name": "jmle",
    "tagline": "أناقة لا تُضاهى",
    "currency": "EUR",
    "locale": "ar"
  },
  "slider": [ ... ],
  "categories": [ ... ],
  "products": [ ... ]
}
```

### Produkt hinzufügen oder ändern

```json
{
  "id": "prod-009",
  "name": "اسم المنتج بالعربية",
  "description": "وصف المنتج",
  "price": 199.99,
  "categoryId": "women",
  "image": "https://ihre-bild-url.de/bild.jpg",
  "featured": true
}
```

| Feld | Beschreibung |
|------|-------------|
| `id` | Eindeutige ID (z.B. `prod-009`) |
| `name` | Produktname auf Arabisch |
| `description` | Produktbeschreibung |
| `price` | Preis in Euro (Dezimalzahl) |
| `categoryId` | ID einer Kategorie (`women`, `men`, etc.) |
| `image` | URL zum Produktbild |
| `featured` | `true` = auf Startseite anzeigen |

### Slider-Bilder ändern

Bearbeiten Sie den `slider`-Abschnitt in `data/products.json`:

```json
{
  "id": "slide-1",
  "image": "https://...",
  "title": "عنوان الشريحة",
  "subtitle": "وصف قصير"
}
```

### Kategorien verwalten

```json
{
  "id": "women",
  "name": "نساء",
  "nameEn": "Women",
  "image": "https://..."
}
```

### Bilder hochladen

1. **Einfach**: Bilder auf einen Cloud-Dienst hochladen (z.B. Cloudinary, Supabase Storage) und die URL in `products.json` eintragen
2. **Lokal**: Bilder in `public/images/` ablegen und `"image": "/images/mein-bild.jpg"` verwenden

> **Tipp**: Für den luxuriösen Look sollten alle Produktfotos den gleichen Hintergrund haben.

---

## Headless CMS (optional, für später)

Wenn Sie Inhalte ohne JSON-Datei bearbeiten möchten, empfehlen wir:

| CMS | Vornpm run devteil | Integration |
|-----|---------|-------------|
| [Sanity.io](https://sanity.io) | Kostenloser Plan, visueller Editor | `@sanity/client` npm-Paket |
| [Contentful](https://contentful.com) | Enterprise-ready | `contentful` npm-Paket |
| [Strapi](https://strapi.io) | Self-hosted, Open Source | REST/GraphQL API |

Die Migration ist einfach: Ersetzen Sie die Funktionen in `src/lib/catalog.ts`, sodass sie Daten vom CMS statt aus `products.json` laden.

---

## Projektstruktur

```
Jomlah/
├── data/
│   └── products.json          ← Alle Shop-Inhalte hier bearbeiten
├── src/
│   ├── app/                   ← Seiten (App Router)
│   │   ├── auth/              ← Login, Registrierung, Verifizierung
│   │   ├── cart/              ← Warenkorb
│   │   ├── checkout/          ← Stripe Checkout
│   │   ├── legal/             ← Impressum, Datenschutz, Widerruf
│   │   └── ...
│   ├── components/            ← UI-Komponenten
│   ├── context/               ← Warenkorb-State
│   └── lib/                   ← Supabase, Stripe, Katalog
├── supabase/
│   └── schema.sql             ← Datenbank-Schema
└── .env.example               ← Umgebungsvariablen-Vorlage
```

---

## Rechtliche Seiten (Deutschland)

Folgende Seiten sind als Vorlagen enthalten — **ersetzen Sie die Platzhalterdaten** bevor Sie live gehen:

- `/legal/impressum` — Impressum (§ 5 TMG)
- `/legal/datenschutz` — Datenschutzerklärung (DSGVO)
- `/legal/widerruf` — Widerrufsbelehrung

> Lassen Sie diese Texte von einem Rechtsanwalt prüfen.

---

## Stripe einrichten

1. Erstellen Sie ein Stripe-Konto
2. Kopieren Sie die Test-Keys in `.env.local`
3. Testkarte: `4242 4242 4242 4242` (beliebiges Datum + CVC)
4. Für Produktion: Live-Keys verwenden und Webhook einrichten

---

## Deployment

Empfohlen: [Vercel](https://vercel.com)

```bash
npm run build
```

Setzen Sie alle Umgebungsvariablen in den Vercel-Projekteinstellungen und aktualisieren Sie die Supabase Redirect URLs auf Ihre Produktions-Domain.
