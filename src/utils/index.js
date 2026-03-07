// JS version (no TS annotations) so it works even if TS parsing is misconfigured.
export function createPageUrl(pageName) {
  return '/' + String(pageName ?? '').replace(/ /g, '-')
}
