// Which social sign-in buttons are shown. A button is only ever shown for a
// provider that works — flip a value to false to hide it everywhere (sign-up and
// log in) in one place.
//
// Checked against Base44's login service: Google, Apple and Facebook all start
// their real provider sign-in page for this app. Each provider also has to be
// switched on in the app dashboard's Authentication page.
export const AUTH_PROVIDERS = {
  google: true,
  apple: true,
  facebook: true,
};

export const PROVIDER_LABELS = {
  google: "Google",
  apple: "Apple",
  facebook: "Facebook",
};

// Providers Google/Apple refuse to serve inside another app's built-in browser.
export const BLOCKED_IN_APP_BROWSERS = ["google", "apple"];