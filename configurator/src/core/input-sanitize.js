/**
 * Display-name sanitization — ONE rule, used by every write path into S.name.
 * (Audit C1, 2026-08-14: typed input and share-import stripped the same character set;
 * the genie hand-off bridge only length-capped. A same-origin sessionStorage write could
 * carry markup into the receipts screen. Converge on one function so a future path
 * can't drift open again.)
 *
 * Stripped set: < > " ' & `  — the minimal HTML/attribute breakers used elsewhere in the app.
 * Cap: 60 chars (matches sanitizeSharedConfig's historical ceiling).
 */
export function sanitizeDisplayName(name) {
  return String(name || '').replace(/[<>"'&`]/g, '').trim().slice(0, 60);
}
