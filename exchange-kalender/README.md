# Exchange-365-Kalender – Einrichtung

Eigenständige HTML-Seite (`index.html`), die anzeigt:

- **Exchange-365-Termine** (blau) – live über Microsoft Graph, inkl. Login und einem Formular zum Anlegen neuer Termine
- **Bayerische Feiertage** (rot) – über die kostenlose [OpenHolidaysAPI](https://www.openholidaysapi.org)
- **Bayerische Schulferien** (grün) – ebenfalls über die OpenHolidaysAPI

Ansicht: Monatsraster mit Kalenderwochen-Spalte (KW) links, Wochenstart Montag.

Kein Build-Prozess, kein Node/npm-Projekt nötig – die Datei läuft direkt im Browser
(MSAL.js wird per CDN geladen). Es wird lediglich ein einfacher lokaler Webserver
benötigt, da Microsoft-Login (MSAL) **nicht über `file://` funktioniert**, sondern
eine echte `http://`/`https://`-Adresse braucht.

---

## 1. Azure-AD-App-Registrierung erstellen

Das ist einmalig nötig, damit sich die Seite bei deinem Microsoft-365-Konto anmelden
und auf deinen Kalender zugreifen darf.

1. Gehe zu <https://portal.azure.com> und melde dich mit deinem Microsoft-365-Konto an
   (dem Konto, dessen Exchange-Kalender du anzeigen willst, bzw. einem Admin-Konto
   deines Tenants).
2. Suche oben nach **„App-Registrierungen“** (App registrations) und klicke auf
   **„Neue Registrierung“** (New registration).
3. Fülle das Formular aus:
   - **Name**: z. B. `Laserstern Kalender`
   - **Unterstützte Kontotypen**: „Nur Konten in diesem Organisationsverzeichnis“
     (Single tenant) – reicht für die eigene Firma
   - **Redirect URI**:
     - Plattform-Dropdown auf **„Single-page application (SPA)“** stellen
     - URI eintragen: `http://localhost:8080/` (siehe Abschnitt 3 – der Port muss
       zu dem Server passen, mit dem du die Seite später startest)
4. Auf **„Registrieren“** klicken.
5. Auf der **Übersichtsseite** der neuen App notierst du dir:
   - **Anwendungs-ID (Client-ID)** (Application (client) ID)
   - **Verzeichnis-ID (Mandant)** (Directory (tenant) ID)

### API-Berechtigungen setzen

1. Im Menü der App auf **„API-Berechtigungen“** (API permissions) klicken.
2. **„Berechtigung hinzufügen“** → **Microsoft Graph** → **Delegierte Berechtigungen**
   (Delegated permissions).
3. Folgende Berechtigungen suchen und hinzufügen:
   - `User.Read` (meist schon vorhanden)
   - `Calendars.ReadWrite`
4. Falls dein Tenant es verlangt: auf **„Admin-Zustimmung erteilen“**
   (Grant admin consent) klicken. Bei einer eigenen kleinen Firma bist du meist
   selbst Admin, dann reicht ein Klick.

Ein Client-Secret wird **nicht** benötigt – die SPA-Plattform verwendet PKCE
(Authorization Code Flow ohne Secret), das Secret bräuchte man nur bei
serverseitigem Code.

---

## 2. Konfiguration eintragen

Öffne `config.js` in diesem Ordner und trage deine Werte ein:

```js
window.CALENDAR_CONFIG = {
  clientId: "…deine Client-ID…",
  tenantId: "…deine Tenant-ID…",
  redirectUri: window.location.origin + window.location.pathname,
};
```

`redirectUri` muss nicht manuell geändert werden – die Seite ermittelt sie
automatisch aus der URL, über die sie aufgerufen wird. Wichtig ist nur, dass
genau diese URL (inkl. Port) als Redirect-URI in der Azure-App hinterlegt ist
(siehe Schritt 1).

---

## 3. Lokal starten

Im Ordner `exchange-kalender/` einen einfachen Webserver starten, z. B.:

**Mit Node.js:**
```bash
npx serve -l 8080
```

**Oder mit Python 3:**
```bash
python3 -m http.server 8080
```

Danach im Browser öffnen:

```
http://localhost:8080/
```

Falls du einen anderen Port verwendest, muss die Redirect-URI in der
Azure-App-Registrierung entsprechend angepasst werden (z. B. `http://localhost:3000/`).

---

## 4. Nutzung

- **„Mit Microsoft anmelden“** klicken → die Seite leitet dich zum Microsoft-Login
  weiter (Redirect-Flow, kein Popup) → nach Zugriffsbestätigung kehrst du
  automatisch zur Kalenderseite zurück.
- Nach dem Login werden deine Exchange-Termine für den angezeigten Monat geladen.
- Über **„+ Neuer Termin“** oder Klick auf einen Tag kannst du direkt einen neuen
  Termin in deinem Exchange-Kalender anlegen (Betreff, Datum, Uhrzeit oder
  ganztägig, Ort, Notiz).
- Bayerische Feiertage und Schulferien werden automatisch für die sichtbaren
  Jahre geladen (keine Anmeldung nötig).
- Navigation über `‹` / `›` (Monat vor/zurück) und „Heute“.

---

## Hinweise / bekannte Einschränkungen

- Ohne Internetzugriff funktionieren weder Microsoft Graph noch die
  Feiertags-/Ferien-API.
- Für produktiven Dauerbetrieb (statt lokalem Server) kann dieselbe Datei auch
  online gehostet werden – dazu einfach eine zusätzliche Redirect-URI mit der
  echten Domain in der Azure-App-Registrierung ergänzen und `config.js`
  entsprechend lassen (die Redirect-URI wird ja automatisch aus der
  aktuellen URL ermittelt).
- Mehrtägige/ganztägige Exchange-Termine werden auf jedem betroffenen Tag
  angezeigt.
- Anmeldung/Abmeldung laufen per Redirect (volle Seitennavigation zum
  Microsoft-Login und zurück), nicht per Popup. Falls dabei gerade ein
  Termin-Formular offen war (z.B. weil eine erneute interaktive Anmeldung
  nötig wurde), geht dessen Eingabe verloren – einfach danach neu ausfüllen.
- Die Feiertags-/Ferien-Daten stammen von der öffentlichen, kostenlosen
  OpenHolidaysAPI (Subdivision `DE-BY` = Bayern).
