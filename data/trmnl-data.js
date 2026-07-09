// Zentrale Datenquelle für das TRMNL-Dashboard.
// Solange es kein Backend gibt, werden die Werte hier von Hand gepflegt.
// Nach einer Änderung committen + deployen (Netlify), TRMNL holt sich die
// Daten dann beim nächsten Polling-Intervall automatisch.

const oeffnungszeiten = {
  // 0 = Sonntag ... 6 = Samstag, Zeiten in "HH:MM" (Europe/Berlin)
  1: { von: '08:00', bis: '17:00' },
  2: { von: '08:00', bis: '17:00' },
  3: { von: '08:00', bis: '17:00' },
  4: { von: '08:00', bis: '17:00' },
  5: { von: '08:00', bis: '15:00' },
}

const dashboard = {
  firma: 'Laserstern Beschriftungen & Lasergravuren',
  kurzname: 'Laserstern',

  // Tagesnotiz, erscheint prominent auf dem Display
  notiz: 'Willkommen! Dieses Dashboard wird über die Website gepflegt.',

  // Auftragsübersicht (Beispielwerte – von Hand pflegen oder später
  // an eine echte Quelle wie einen Shop / eine Auftragsliste anbinden)
  auftraege: {
    offen: 4,
    inArbeit: 2,
    abholbereit: 1,
  },

  // Maschinen-/Werkstattstatus
  maschinen: [
    { name: 'CO2-Laser', status: 'frei' },
    { name: 'Faserlaser', status: 'belegt' },
  ],
}

module.exports = { dashboard, oeffnungszeiten }
