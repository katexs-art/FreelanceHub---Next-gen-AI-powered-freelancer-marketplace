const KEY = "katexs:email-prefs";

export interface EmailPrefs {
  orders: boolean;
  messages: boolean;
  marketing: boolean;
}

const DEFAULT: EmailPrefs = { orders: true, messages: true, marketing: false };

export function getEmailPrefs(): EmailPrefs {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...DEFAULT, ...JSON.parse(raw) } : DEFAULT;
  } catch {
    return DEFAULT;
  }
}

export function setEmailPrefs(prefs: EmailPrefs) {
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs));
  } catch {}
}

export function shouldEmail(category: keyof EmailPrefs): boolean {
  return getEmailPrefs()[category];
}
