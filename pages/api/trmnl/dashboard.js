// TRMNL Polling-Endpoint
//
// Ein TRMNL Private Plugin mit Strategie "Polling" ruft diese URL per GET ab
// und bekommt ein flaches JSON-Objekt zurück. Alle Schlüssel stehen im
// Liquid-Markup des Plugins als Variablen zur Verfügung, z. B. {{ notiz }}.
//
// URL nach dem Deploy: https://<deine-site>.netlify.app/api/trmnl/dashboard

const { dashboard, oeffnungszeiten } = require('../../../data/trmnl-data')

function berlinJetzt() {
  const teile = new Intl.DateTimeFormat('de-DE', {
    timeZone: 'Europe/Berlin',
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date())

  const t = Object.fromEntries(teile.map((p) => [p.type, p.value]))
  const wochentagIndex = [
    'Sonntag',
    'Montag',
    'Dienstag',
    'Mittwoch',
    'Donnerstag',
    'Freitag',
    'Samstag',
  ].indexOf(t.weekday)

  return {
    wochentag: t.weekday,
    wochentagIndex,
    datum: `${t.day}.${t.month}.${t.year}`,
    uhrzeit: `${t.hour}:${t.minute}`,
  }
}

function oeffnungsStatus(jetzt) {
  const heute = oeffnungszeiten[jetzt.wochentagIndex]
  if (!heute) return { geoeffnet: false, text: 'Heute geschlossen' }

  const geoeffnet = jetzt.uhrzeit >= heute.von && jetzt.uhrzeit < heute.bis
  return {
    geoeffnet,
    text: geoeffnet
      ? `Geöffnet bis ${heute.bis} Uhr`
      : `Geschlossen · heute ${heute.von}–${heute.bis} Uhr`,
  }
}

export default function handler(req, res) {
  const jetzt = berlinJetzt()
  const status = oeffnungsStatus(jetzt)

  res.setHeader('Cache-Control', 'no-store')
  res.status(200).json({
    firma: dashboard.firma,
    kurzname: dashboard.kurzname,
    notiz: dashboard.notiz,

    wochentag: jetzt.wochentag,
    datum: jetzt.datum,
    stand: `${jetzt.uhrzeit} Uhr`,

    geoeffnet: status.geoeffnet,
    oeffnung_text: status.text,

    auftraege_offen: dashboard.auftraege.offen,
    auftraege_in_arbeit: dashboard.auftraege.inArbeit,
    auftraege_abholbereit: dashboard.auftraege.abholbereit,
    auftraege_gesamt:
      dashboard.auftraege.offen +
      dashboard.auftraege.inArbeit +
      dashboard.auftraege.abholbereit,

    maschinen: dashboard.maschinen,
  })
}
