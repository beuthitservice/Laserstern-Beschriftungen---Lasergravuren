#!/usr/bin/env node
// TRMNL Webhook-Push
//
// Alternative zur Polling-Strategie: schickt die Dashboard-Daten aktiv an
// TRMNL (Private Plugin mit Strategie "Webhook").
//
// Verwendung:
//   TRMNL_PLUGIN_UUID=<uuid-aus-den-plugin-einstellungen> node scripts/trmnl-push.js
//
// Die UUID steht in den Einstellungen des Private Plugins bei usetrmnl.com.
// Hinweis: TRMNL begrenzt Webhook-Payloads auf ca. 2 KB.

const https = require('https')
const { dashboard, oeffnungszeiten } = require('../data/trmnl-data')

const uuid = process.env.TRMNL_PLUGIN_UUID
if (!uuid) {
  console.error('Fehler: Umgebungsvariable TRMNL_PLUGIN_UUID ist nicht gesetzt.')
  process.exit(1)
}

const jetzt = new Date()
const uhrzeit = new Intl.DateTimeFormat('de-DE', {
  timeZone: 'Europe/Berlin',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
}).format(jetzt)

const gesamt =
  dashboard.auftraege.offen +
  dashboard.auftraege.inArbeit +
  dashboard.auftraege.abholbereit

const payload = JSON.stringify({
  merge_variables: {
    firma: dashboard.firma,
    kurzname: dashboard.kurzname,
    notiz: dashboard.notiz,
    stand: `${uhrzeit} Uhr`,
    auftraege_offen: dashboard.auftraege.offen,
    auftraege_in_arbeit: dashboard.auftraege.inArbeit,
    auftraege_abholbereit: dashboard.auftraege.abholbereit,
    auftraege_gesamt: gesamt,
    maschinen: dashboard.maschinen,
  },
})

const req = https.request(
  {
    hostname: 'usetrmnl.com',
    path: `/api/custom_plugins/${uuid}`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload),
    },
  },
  (res) => {
    let body = ''
    res.on('data', (chunk) => (body += chunk))
    res.on('end', () => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        console.log(`OK (${res.statusCode}): Daten an TRMNL übertragen.`)
      } else {
        console.error(`Fehler (${res.statusCode}): ${body}`)
        process.exit(1)
      }
    })
  }
)

req.on('error', (err) => {
  console.error(`Netzwerkfehler: ${err.message}`)
  process.exit(1)
})

req.write(payload)
req.end()
