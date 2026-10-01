// Google (and Apple on some devices) refuse to sign people in from the browsers
// built into other apps — WhatsApp, Instagram, Facebook, TikTok, Snapchat and so
// on. People open Blockwork from exactly those apps, so we detect them and tell
// the person to open the page in Safari or Chrome. Email sign-up always works.

// Returns the name of the in-app browser, or null for a normal browser.
export function detectInAppBrowser(ua) {
  const u = ua || (typeof navigator !== "undefined" ? navigator.userAgent : "") || "";
  if (/FBAN|FBAV|FB_IAB|FB4A/i.test(u)) return "Facebook";
  if (/Instagram/i.test(u)) return "Instagram";
  if (/WhatsApp/i.test(u)) return "WhatsApp";
  if (/musical_ly|TikTok|BytedanceWebview|trill/i.test(u)) return "TikTok";
  if (/Snapchat/i.test(u)) return "Snapchat";
  if (/\bLine\//i.test(u)) return "LINE";
  if (/MicroMessenger/i.test(u)) return "WeChat";
  if (/LinkedInApp/i.test(u)) return "LinkedIn";
  // Android WebView marks itself "; wv)".
  if (/Android/i.test(u) && /; wv\)/i.test(u)) return "this app";
  // An iPhone/iPad web view has no "Safari/" token (Safari, Chrome and Firefox do).
  if (/iPhone|iPad|iPod/i.test(u) && !/Safari\//i.test(u)) return "this app";
  return null;
}

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const el = document.createElement("textarea");
      el.value = text;
      el.setAttribute("readonly", "");
      el.style.position = "fixed";
      el.style.opacity = "0";
      document.body.appendChild(el);
      el.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(el);
      return ok;
    } catch {
      return false;
    }
  }
}

// Android can hand the page to the default browser. iPhone has no such door, so
// the link is copied for the person to paste into Safari.
// Returns "opened" | "copied" | "failed".
export async function openInBrowser(url) {
  const ua = navigator.userAgent || "";
  if (/Android/i.test(ua)) {
    try {
      const u = new URL(url);
      window.location.href = `intent://${u.host}${u.pathname}${u.search}#Intent;scheme=https;end`;
      return "opened";
    } catch {
      /* fall through to copying */
    }
  }
  return (await copyText(url)) ? "copied" : "failed";
}