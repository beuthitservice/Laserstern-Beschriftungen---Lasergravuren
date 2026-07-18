/* Kalenderübersicht: Exchange 365 (Microsoft Graph) + bayerische Feiertage/Schulferien (OpenHolidaysAPI) */

const GRAPH_ROOT = "https://graph.microsoft.com/v1.0";
const HOLIDAY_API = "https://openholidaysapi.org";
const COUNTRY = "DE";
const SUBDIVISION = "DE-BY";
const LANGUAGE = "DE";
const SCOPES = ["User.Read", "Calendars.ReadWrite"];
const WEEKDAY_MS = 24 * 60 * 60 * 1000;

const monthNames = [
  "Januar", "Februar", "März", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember",
];

let viewYear = new Date().getFullYear();
let viewMonth = new Date().getMonth(); // 0-indexed

let msalInstance = null;
let account = null;

const holidayCacheByYear = new Map(); // year -> { publicHolidays: Map(dateStr->name), schoolPeriods: [{start,end,name}] }
let exchangeEventsByDate = new Map(); // dateStr -> [{subject,startTime,endTime,allDay,location}]

const statusArea = document.getElementById("statusArea");
const monthTitle = document.getElementById("monthTitle");
const calendarBody = document.getElementById("calendarBody");
const accountLabel = document.getElementById("accountLabel");
const signInBtn = document.getElementById("signInBtn");
const signOutBtn = document.getElementById("signOutBtn");
const addEventBtn = document.getElementById("addEventBtn");
const eventDialog = document.getElementById("eventDialog");
const eventForm = document.getElementById("eventForm");
const allDayCheckbox = document.getElementById("fAllDay");
const timeRow = document.getElementById("timeRow");

function pad(n) {
  return String(n).padStart(2, "0");
}

function formatDateLocal(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function escapeHtml(str) {
  return String(str ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

function getISOWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = (d.getUTCDay() + 6) % 7; // Montag = 0
  d.setUTCDate(d.getUTCDate() - dayNum + 3); // nächster Donnerstag
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const firstDayNum = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayNum + 3);
  return 1 + Math.round((d - firstThursday) / (7 * WEEKDAY_MS));
}

function showStatus(message, type) {
  if (!message) {
    statusArea.innerHTML = "";
    return;
  }
  statusArea.innerHTML = `<div class="status-banner ${type}">${escapeHtml(message)}</div>`;
}

/* ---------- MSAL / Microsoft Graph ---------- */

async function initMsal() {
  const cfg = window.CALENDAR_CONFIG;
  if (!cfg || cfg.clientId === "DEINE-CLIENT-ID-HIER") {
    showStatus(
      "Bitte zuerst config.js mit deiner Azure-AD-Client-ID und Tenant-ID füllen (siehe README.md).",
      "error"
    );
    return;
  }

  msalInstance = new msal.PublicClientApplication({
    auth: {
      clientId: cfg.clientId,
      authority: `https://login.microsoftonline.com/${cfg.tenantId}`,
      redirectUri: cfg.redirectUri,
    },
    cache: { cacheLocation: "sessionStorage", storeAuthStateInCookie: false },
  });

  await msalInstance.initialize();

  // Nach einem Redirect-Login/-Logout landet der Browser hier wieder mit dem
  // Auth-Code im URL-Fragment; handleRedirectPromise() verarbeitet ihn.
  const redirectResult = await msalInstance.handleRedirectPromise().catch((e) => {
    console.error(e);
    showStatus("Anmeldung fehlgeschlagen: " + e.message, "error");
    return null;
  });

  if (redirectResult?.account) {
    account = redirectResult.account;
  } else {
    const accounts = msalInstance.getAllAccounts();
    if (accounts.length > 0) account = accounts[0];
  }
  updateAccountUI();
}

async function signIn() {
  try {
    // Redirect-Flow statt Popup: zuverlässiger auf Mobilgeräten und bei
    // Popup-Blockern. Die Seite navigiert zum Microsoft-Login und kehrt
    // danach zur redirectUri zurück (siehe initMsal/handleRedirectPromise).
    await msalInstance.loginRedirect({ scopes: SCOPES });
  } catch (e) {
    console.error(e);
    showStatus("Anmeldung fehlgeschlagen: " + e.message, "error");
  }
}

async function signOut() {
  if (!account) return;
  try {
    await msalInstance.logoutRedirect({ account });
  } catch (e) {
    console.error(e);
    showStatus("Abmeldung fehlgeschlagen: " + e.message, "error");
  }
}

async function getAccessToken() {
  if (!account) throw new Error("Nicht angemeldet");
  const request = { scopes: SCOPES, account };
  try {
    const result = await msalInstance.acquireTokenSilent(request);
    return result.accessToken;
  } catch (e) {
    // Silent-Renewal fehlgeschlagen (z.B. abgelaufene Session): per Redirect
    // erneut interaktiv anmelden. Die Seite navigiert weg, daher geht der
    // aktuell laufende Vorgang (z.B. ein offenes Termin-Formular) dabei verloren.
    await msalInstance.acquireTokenRedirect(request);
    throw new Error("Anmeldung erforderlich – Weiterleitung zum Microsoft-Login…");
  }
}

function updateAccountUI() {
  if (account) {
    accountLabel.textContent = account.username || account.name || "Angemeldet";
    signInBtn.style.display = "none";
    signOutBtn.style.display = "";
    addEventBtn.disabled = false;
  } else {
    accountLabel.textContent = "Nicht angemeldet";
    signInBtn.style.display = "";
    signOutBtn.style.display = "none";
    addEventBtn.disabled = true;
  }
}

async function fetchExchangeEvents(startDate, endDate) {
  if (!account) return new Map();
  const token = await getAccessToken();

  const startParam = `${formatDateLocal(startDate)}T00:00:00`;
  const endParam = `${formatDateLocal(endDate)}T23:59:59`;
  const url =
    `${GRAPH_ROOT}/me/calendarView?startDateTime=${startParam}&endDateTime=${endParam}` +
    `&$orderby=start/dateTime&$top=250`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Prefer: 'outlook.timezone="Europe/Berlin"',
    },
  });

  if (!res.ok) {
    throw new Error(`Microsoft Graph Fehler (${res.status})`);
  }

  const data = await res.json();
  const byDate = new Map();

  for (const ev of data.value || []) {
    const subject = ev.subject || "(ohne Betreff)";
    const location = ev.location?.displayName || "";
    const startStr = ev.start?.dateTime || "";
    const endStr = ev.end?.dateTime || "";
    const isAllDay = !!ev.isAllDay;

    if (isAllDay) {
      const start = new Date(startStr.slice(0, 10) + "T00:00:00");
      const end = new Date(endStr.slice(0, 10) + "T00:00:00");
      for (let d = start; d < end; d = new Date(d.getTime() + WEEKDAY_MS)) {
        const key = formatDateLocal(d);
        if (!byDate.has(key)) byDate.set(key, []);
        byDate.get(key).push({ subject, allDay: true, location });
      }
    } else {
      const dateKey = startStr.slice(0, 10);
      const startTime = startStr.slice(11, 16);
      const endTime = endStr.slice(11, 16);
      if (!byDate.has(dateKey)) byDate.set(dateKey, []);
      byDate.get(dateKey).push({ subject, allDay: false, startTime, endTime, location });
    }
  }

  return byDate;
}

async function createExchangeEvent(body) {
  const token = await getAccessToken();
  const res = await fetch(`${GRAPH_ROOT}/me/events`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Termin konnte nicht angelegt werden (${res.status}) ${text}`);
  }
  return res.json();
}

/* ---------- Feiertage & Schulferien (OpenHolidaysAPI, Bayern) ---------- */

function pickGermanName(nameArr) {
  if (!Array.isArray(nameArr) || nameArr.length === 0) return "";
  const de = nameArr.find((n) => (n.language || n.languageIsoCode) === "DE");
  return (de || nameArr[0]).text || "";
}

async function fetchYearHolidayData(year) {
  if (holidayCacheByYear.has(year)) return holidayCacheByYear.get(year);

  const validFrom = `${year}-01-01`;
  const validTo = `${year}-12-31`;
  const common = `countryIsoCode=${COUNTRY}&languageIsoCode=${LANGUAGE}&validFrom=${validFrom}&validTo=${validTo}&subdivisionCode=${SUBDIVISION}`;

  const result = { publicHolidays: new Map(), schoolPeriods: [] };

  try {
    const [phRes, shRes] = await Promise.all([
      fetch(`${HOLIDAY_API}/PublicHolidays?${common}`),
      fetch(`${HOLIDAY_API}/SchoolHolidays?${common}`),
    ]);

    if (phRes.ok) {
      const phData = await phRes.json();
      for (const item of phData) {
        const name = pickGermanName(item.name);
        // Feiertage sind i.d.R. eintägig, aber sicherheitshalber über den Zeitraum iterieren
        for (
          let d = new Date(item.startDate + "T00:00:00");
          d <= new Date(item.endDate + "T00:00:00");
          d = new Date(d.getTime() + WEEKDAY_MS)
        ) {
          result.publicHolidays.set(formatDateLocal(d), name);
        }
      }
    }

    if (shRes.ok) {
      const shData = await shRes.json();
      for (const item of shData) {
        result.schoolPeriods.push({
          start: item.startDate,
          end: item.endDate,
          name: pickGermanName(item.name),
        });
      }
    }
  } catch (e) {
    console.error("Feiertags-/Ferien-Abruf fehlgeschlagen", e);
    showStatus("Feiertage/Ferien konnten nicht geladen werden (Netzwerkfehler).", "error");
  }

  holidayCacheByYear.set(year, result);
  return result;
}

function schoolHolidayForDate(dateStr, years) {
  for (const year of years) {
    const data = holidayCacheByYear.get(year);
    if (!data) continue;
    for (const period of data.schoolPeriods) {
      if (dateStr >= period.start && dateStr <= period.end) return period.name;
    }
  }
  return null;
}

function publicHolidayForDate(dateStr, year) {
  const data = holidayCacheByYear.get(year);
  if (!data) return null;
  return data.publicHolidays.get(dateStr) || null;
}

/* ---------- Kalender rendern ---------- */

function getVisibleRange() {
  const firstOfMonth = new Date(viewYear, viewMonth, 1);
  const lastOfMonth = new Date(viewYear, viewMonth + 1, 0);

  const start = new Date(firstOfMonth);
  const startOffset = (start.getDay() + 6) % 7; // Montag=0
  start.setDate(start.getDate() - startOffset);

  const end = new Date(lastOfMonth);
  const endOffset = (7 - ((end.getDay() + 6) % 7) - 1) % 7;
  end.setDate(end.getDate() + endOffset);

  return { start, end };
}

async function loadAndRenderMonth() {
  showStatus("Lade Kalenderdaten…", "info");
  const { start, end } = getVisibleRange();

  const years = new Set([start.getFullYear(), end.getFullYear()]);
  await Promise.all([...years].map((y) => fetchYearHolidayData(y)));

  try {
    if (account) {
      exchangeEventsByDate = await fetchExchangeEvents(start, end);
    } else {
      exchangeEventsByDate = new Map();
    }
    showStatus("", "");
  } catch (e) {
    console.error(e);
    showStatus("Exchange-Termine konnten nicht geladen werden: " + e.message, "error");
  }

  renderCalendar();
}

function renderCalendar() {
  const { start, end } = getVisibleRange();
  monthTitle.textContent = `${monthNames[viewMonth]} ${viewYear}`;

  const years = [...new Set([start.getFullYear(), end.getFullYear()])];
  const todayStr = formatDateLocal(new Date());

  let html = "";
  let cursor = new Date(start);

  while (cursor <= end) {
    const weekNum = getISOWeek(cursor);
    html += `<tr><td class="kw">${weekNum}</td>`;

    for (let i = 0; i < 7; i++) {
      const dateStr = formatDateLocal(cursor);
      const inMonth = cursor.getMonth() === viewMonth;
      const isToday = dateStr === todayStr;
      const holidayName = publicHolidayForDate(dateStr, cursor.getFullYear());
      const ferienName = schoolHolidayForDate(dateStr, years);
      const events = exchangeEventsByDate.get(dateStr) || [];

      const classes = ["day"];
      if (!inMonth) classes.push("outside");
      if (isToday) classes.push("today");
      if (holidayName) classes.push("holiday");
      if (ferienName) classes.push("ferien");

      let cellHtml = `<div class="daynum">${cursor.getDate()}</div>`;
      if (holidayName) {
        cellHtml += `<div class="pill holiday-pill" title="${escapeHtml(holidayName)}">${escapeHtml(holidayName)}</div>`;
      }
      if (ferienName) {
        cellHtml += `<div class="pill ferien-pill" title="${escapeHtml(ferienName)}">Ferien: ${escapeHtml(ferienName)}</div>`;
      }
      for (const ev of events) {
        const timeLabel = ev.allDay ? "" : `${ev.startTime}–${ev.endTime} `;
        cellHtml += `<div class="pill exchange-pill" title="${escapeHtml(timeLabel + ev.subject)}">${escapeHtml(timeLabel + ev.subject)}</div>`;
      }

      html += `<td class="${classes.join(" ")}" data-date="${dateStr}">${cellHtml}</td>`;
      cursor = new Date(cursor.getTime() + WEEKDAY_MS);
    }

    html += "</tr>";
  }

  calendarBody.innerHTML = html;

  calendarBody.querySelectorAll("td.day").forEach((td) => {
    td.addEventListener("click", () => openEventDialog(td.dataset.date));
  });
}

/* ---------- Termin-Dialog ---------- */

function openEventDialog(dateStr) {
  if (!account) {
    showStatus("Bitte zuerst mit Microsoft anmelden, um Termine anzulegen.", "info");
    return;
  }
  eventForm.reset();
  document.getElementById("fDate").value = dateStr || formatDateLocal(new Date());
  document.getElementById("fStart").value = "09:00";
  document.getElementById("fEnd").value = "10:00";
  allDayCheckbox.checked = false;
  timeRow.style.display = "";
  eventDialog.showModal();
}

allDayCheckbox.addEventListener("change", () => {
  timeRow.style.display = allDayCheckbox.checked ? "none" : "";
});

document.getElementById("cancelEventBtn").addEventListener("click", () => {
  eventDialog.close();
});

eventForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const subject = document.getElementById("fSubject").value.trim();
  const date = document.getElementById("fDate").value;
  const location = document.getElementById("fLocation").value.trim();
  const notes = document.getElementById("fNotes").value.trim();
  const isAllDay = allDayCheckbox.checked;

  if (!subject || !date) return;

  let body;
  if (isAllDay) {
    const nextDay = new Date(date + "T00:00:00");
    nextDay.setDate(nextDay.getDate() + 1);
    body = {
      subject,
      isAllDay: true,
      start: { dateTime: `${date}T00:00:00`, timeZone: "Europe/Berlin" },
      end: { dateTime: `${formatDateLocal(nextDay)}T00:00:00`, timeZone: "Europe/Berlin" },
    };
  } else {
    const start = document.getElementById("fStart").value || "09:00";
    const end = document.getElementById("fEnd").value || "10:00";
    body = {
      subject,
      start: { dateTime: `${date}T${start}:00`, timeZone: "Europe/Berlin" },
      end: { dateTime: `${date}T${end}:00`, timeZone: "Europe/Berlin" },
    };
  }
  if (location) body.location = { displayName: location };
  if (notes) body.body = { contentType: "Text", content: notes };

  const saveBtn = document.getElementById("saveEventBtn");
  saveBtn.disabled = true;
  try {
    await createExchangeEvent(body);
    eventDialog.close();
    await loadAndRenderMonth();
  } catch (err) {
    console.error(err);
    showStatus(err.message, "error");
  } finally {
    saveBtn.disabled = false;
  }
});

/* ---------- Navigation & Init ---------- */

document.getElementById("prevBtn").addEventListener("click", () => {
  viewMonth -= 1;
  if (viewMonth < 0) { viewMonth = 11; viewYear -= 1; }
  loadAndRenderMonth();
});

document.getElementById("nextBtn").addEventListener("click", () => {
  viewMonth += 1;
  if (viewMonth > 11) { viewMonth = 0; viewYear += 1; }
  loadAndRenderMonth();
});

document.getElementById("todayBtn").addEventListener("click", () => {
  const now = new Date();
  viewYear = now.getFullYear();
  viewMonth = now.getMonth();
  loadAndRenderMonth();
});

addEventBtn.addEventListener("click", () => openEventDialog(formatDateLocal(new Date())));
signInBtn.addEventListener("click", signIn);
signOutBtn.addEventListener("click", signOut);

(async function main() {
  await initMsal();
  await loadAndRenderMonth();
})();
