export type DiffLine = {
  type: "ctx" | "add" | "del";
  text: string;
};

/** Longest-common-subsequence line diff for small texts. Returns null when
 * the input is too large for the O(n·m) table; callers show a fallback. */
export function diffLines(aText: string, bText: string, maxCells = 4_000_000): DiffLine[] | null {
  const a = aText.split("\n");
  const b = bText.split("\n");
  if (a.length * b.length > maxCells) return null;

  // lcs[i][j] = LCS length of a[i..], b[j..]
  const lcs: Int32Array[] = Array.from({ length: a.length + 1 }, () => new Int32Array(b.length + 1));
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      lcs[i][j] = a[i] === b[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }

  const out: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      out.push({ type: "ctx", text: a[i] });
      i++;
      j++;
    } else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
      out.push({ type: "del", text: a[i] });
      i++;
    } else {
      out.push({ type: "add", text: b[j] });
      j++;
    }
  }
  while (i < a.length) out.push({ type: "del", text: a[i++] });
  while (j < b.length) out.push({ type: "add", text: b[j++] });
  return out;
}

/** True when the bytes look like displayable text: decodes as UTF-8 and has
 * no NUL bytes (the usual binary marker). */
export function sniffImageMime(head: ArrayBuffer): string | null {
  const b = new Uint8Array(head);
  const ascii = (from: number, to: number) => String.fromCharCode(...b.subarray(from, to));
  if (b.length >= 8 && b[0] === 0x89 && ascii(1, 4) === "PNG") return "image/png";
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.length >= 6 && (ascii(0, 6) === "GIF87a" || ascii(0, 6) === "GIF89a")) return "image/gif";
  if (b.length >= 12 && ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "image/webp";
  if (b.length >= 12 && ascii(4, 8) === "ftyp" && (ascii(8, 12) === "avif" || ascii(8, 12) === "avis")) {
    return "image/avif";
  }
  if (sniffsAsText(head)) {
    const start = new TextDecoder().decode(b).trimStart().slice(0, 400);
    if (start.startsWith("<svg") || (start.startsWith("<?xml") && start.includes("<svg"))) return "image/svg+xml";
  }
  return null;
}

export function sniffsAsText(head: ArrayBuffer): boolean {
  const arr = new Uint8Array(head);
  if (arr.includes(0)) return false;
  for (let cut = 0; cut <= 3 && cut <= arr.length; cut++) {
    try {
      new TextDecoder("utf-8", { fatal: true }).decode(arr.subarray(0, arr.length - cut));
      return true;
    } catch {
      continue;
    }
  }
  return false;
}

export function looksLikeText(bytes: ArrayBuffer): string | null {
  if (bytes.byteLength === 0) return "";
  const arr = new Uint8Array(bytes);
  if (arr.includes(0)) return null;
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(arr);
  } catch {
    return null;
  }
}

/** Collapses long runs of equal lines into context windows around changes. */
export function compactDiff(lines: DiffLine[], context = 3, maxOutput = 400): DiffLine[] {
  const keep = new Array(lines.length).fill(false);
  for (let k = 0; k < lines.length; k++) {
    if (lines[k].type !== "ctx") {
      const from = Math.max(0, k - context);
      const to = Math.min(lines.length - 1, k + context);
      for (let m = from; m <= to; m++) keep[m] = true;
    }
  }
  const out: DiffLine[] = [];
  let skipping = false;
  for (let k = 0; k < lines.length; k++) {
    if (keep[k]) {
      out.push(lines[k]);
      skipping = false;
    } else if (!skipping) {
      out.push({ type: "ctx", text: "…" });
      skipping = true;
    }
    if (out.length >= maxOutput) break;
  }
  return out;
}
