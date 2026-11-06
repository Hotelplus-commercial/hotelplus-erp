/* The Office APP › BD-AC (moved from PS Dashboard per RV23). Route prefix follows the existing
 * The Office APP routes (/the-office-app/*). Old PS Dashboard BD-AC links replace-redirect here. */
export const OFFICE_BDAC_PATH = "/the-office-app/dashboard";
/** R2 C: BD-AC is tab 1 of The Office Dashboard. */
export const OFFICE_BDAC_TAB = "bd-ac";

/** Tab values earlier builds / documents used for BD-AC on PS Dashboard. */
const OLD_KEYS = new Set(["bdac", "bd-ac", "bd_ac"]);
export const isOldBdacKey = (v: string | null | undefined) => !!v && OLD_KEYS.has(v.trim().toLowerCase());

/** Search string → The Office Dashboard ?tab=bd-ac href (other params kept). */
export function officeBdacHref(searchStr: string): string {
  const sp = new URLSearchParams(searchStr.startsWith("?") ? searchStr.slice(1) : searchStr);
  sp.set("tab", OFFICE_BDAC_TAB);
  return `${OFFICE_BDAC_PATH}?${sp.toString()}`;
}

/** PS Dashboard URL → new BD-AC href (other params kept), or null when the link is not a BD-AC link. */
export function bdacRedirectHref(searchStr: string, hash = ""): string | null {
  const sp = new URLSearchParams(searchStr.startsWith("?") ? searchStr.slice(1) : searchStr);
  const byTab = isOldBdacKey(sp.get("tab"));
  const byHash = isOldBdacKey(hash.replace(/^#/, ""));
  if (!byTab && !byHash) return null;
  sp.set("tab", OFFICE_BDAC_TAB);
  const qs = sp.toString();
  return `${OFFICE_BDAC_PATH}${qs ? `?${qs}` : ""}`;
}
