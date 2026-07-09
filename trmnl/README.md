# TRMNL-Tools für Laserstern

Werkzeuge, um ein [TRMNL](https://usetrmnl.com)-E-Ink-Display als
Werkstatt-Dashboard für Laserstern Beschriftungen & Lasergravuren zu nutzen.
TRMNL ist ein Open-Source-Projekt (offene Firmware, offenes Plugin-System) –
eigene Anzeigen lassen sich als **Private Plugin** anlegen.

## Was ist enthalten?

| Datei | Zweck |
| --- | --- |
| `pages/api/trmnl/dashboard.js` | API-Endpoint, den TRMNL per **Polling** abruft |
| `scripts/trmnl-push.js` | Script, das Daten per **Webhook** aktiv an TRMNL schickt |
| `trmnl/views/*.liquid` | Markup-Vorlagen für die vier TRMNL-Layouts |
| `data/trmnl-data.js` | Zentrale, von Hand gepflegte Datenquelle |

Angezeigt werden: Auftragszähler (offen / in Arbeit / abholbereit),
Öffnungsstatus mit Öffnungszeiten, Maschinenstatus (CO2-/Faserlaser) und eine
frei editierbare Tagesnotiz.

## Einrichtung (Variante A: Polling – empfohlen)

1. Website deployen (Netlify). Der Endpoint ist dann erreichbar unter
   `https://<deine-site>.netlify.app/api/trmnl/dashboard` – im Browser testen,
   es muss JSON erscheinen.
2. Bei [usetrmnl.com](https://usetrmnl.com) → **Plugins → Private Plugin →
   Add new** ein Plugin anlegen.
3. Strategie **Polling** wählen und die Endpoint-URL als *Polling URL*
   eintragen.
4. **Edit Markup** öffnen und den Inhalt der passenden Datei aus
   `trmnl/views/` in das jeweilige Layout-Feld kopieren:
   - `full.liquid` → Full
   - `half_horizontal.liquid` → Half Horizontal
   - `half_vertical.liquid` → Half Vertical
   - `quadrant.liquid` → Quadrant
5. Speichern und das Plugin in die Playlist des Geräts aufnehmen.

Daten ändern: `data/trmnl-data.js` anpassen, committen, deployen – TRMNL
holt sich den neuen Stand beim nächsten Abruf automatisch.

## Einrichtung (Variante B: Webhook)

Wenn du die Daten lieber aktiv pushen willst (z. B. per Cronjob oder GitHub
Action), lege das Private Plugin mit Strategie **Webhook** an und kopiere die
**Plugin UUID** aus den Plugin-Einstellungen. Dann:

```bash
TRMNL_PLUGIN_UUID=deine-uuid node scripts/trmnl-push.js
```

Hinweis: TRMNL begrenzt Webhook-Payloads auf ca. 2 KB. Die Variablen
`wochentag`, `datum`, `geoeffnet` und `oeffnung_text` werden nur vom
Polling-Endpoint berechnet; beim Webhook-Weg stehen sie nicht zur Verfügung
(die Vorlagen funktionieren trotzdem, die Felder bleiben dann leer).

## Markup anpassen

Die Vorlagen nutzen das [TRMNL Design Framework](https://usetrmnl.com/framework)
(Klassen wie `layout`, `item`, `value`, `label`, `title_bar`). Alle Schlüssel
aus dem JSON des Endpoints stehen im Liquid-Markup als Variablen bereit,
z. B. `{{ notiz }}` oder `{{ auftraege_offen }}`. Im Markup-Editor von TRMNL
gibt es eine Live-Vorschau zum Ausprobieren.
