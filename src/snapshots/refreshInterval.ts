const LEGACY_TEN_SECONDS = 15000;
const TEN_SECONDS = 10000;

export function normalizeRefreshInterval(value: number | null): number | null {
  return value === LEGACY_TEN_SECONDS ? TEN_SECONDS : value;
}
