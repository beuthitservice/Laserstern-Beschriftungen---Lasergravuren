// Trage hier die Werte aus deiner Azure AD App Registration ein.
// Eine Schritt-für-Schritt-Anleitung dafür steht in README.md.
window.CALENDAR_CONFIG = {
  // "Application (client) ID" aus dem Azure-Portal (App Registration > Übersicht)
  clientId: "DEINE-CLIENT-ID-HIER",

  // "Directory (tenant) ID" aus dem Azure-Portal (App Registration > Übersicht)
  tenantId: "DEINE-TENANT-ID-HIER",

  // Muss exakt der Redirect-URI entsprechen, die du in der App Registration
  // (Plattform: Single-page application) hinterlegt hast, z.B. http://localhost:8080/
  redirectUri: window.location.origin + window.location.pathname,
};
