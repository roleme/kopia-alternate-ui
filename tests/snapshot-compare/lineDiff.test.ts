import { describe, expect, it } from "vitest";
import {
  compactDiff,
  diffLines,
  looksLikeText,
  sniffImageMime,
  sniffsAsText
} from "../../src/snapshot-compare/lineDiff";

const enc = new TextEncoder();

describe("diffLines", () => {
  it("returns all context lines for identical input", () => {
    const out = diffLines("a\nb\nc", "a\nb\nc");
    expect(out).toEqual([
      { type: "ctx", text: "a" },
      { type: "ctx", text: "b" },
      { type: "ctx", text: "c" }
    ]);
  });

  it("reports a modified line as del plus add, same position", () => {
    const out = diffLines("timeout: 30\nretries: 5", "timeout: 60\nretries: 5");
    expect(out).toEqual([
      { type: "del", text: "timeout: 30" },
      { type: "add", text: "timeout: 60" },
      { type: "ctx", text: "retries: 5" }
    ]);
  });

  it("reports pure additions and removals", () => {
    expect(diffLines("keep\n", "keep\nnew\n")).toEqual([
      { type: "ctx", text: "keep" },
      { type: "add", text: "new" },
      { type: "ctx", text: "" }
    ]);
    expect(diffLines("gone\nkeep", "keep")).toEqual([
      { type: "del", text: "gone" },
      { type: "ctx", text: "keep" }
    ]);
  });

  it("handles same-name file rewritten end to end", () => {
    const out = diffLines('{\n  "a": 1\n}', '{\n  "a": 2,\n  "b": 3\n}')!;
    expect(out.filter((l) => l.type === "add").map((l) => l.text)).toEqual(['  "a": 2,', '  "b": 3']);
    expect(out.filter((l) => l.type === "del").map((l) => l.text)).toEqual(['  "a": 1']);
  });

  it("returns null over the size cap instead of hanging", () => {
    const big = Array(5000).fill("x").join("\n");
    expect(diffLines(big, big + "\n", 1000)).toBeNull();
  });
});

describe("looksLikeText", () => {
  it("decodes utf-8 text", () => {
    expect(looksLikeText(enc.encode("héllo\nworld").buffer)).toBe("héllo\nworld");
  });
  it("rejects binary containing NUL bytes", () => {
    expect(looksLikeText(enc.encode("a\u0000b").buffer)).toBeNull();
  });
  it("rejects invalid utf-8", () => {
    expect(looksLikeText(new Uint8Array([0xff, 0xfe, 0xfd]).buffer)).toBeNull();
  });
});

describe("compactDiff", () => {
  it("collapses unchanged runs into ellipses with context around changes", () => {
    const lines = diffLines(
      Array.from({ length: 30 }, (_, i) => `l${i}`).join("\n"),
      Array.from({ length: 30 }, (_, i) => (i === 15 ? "CHANGED" : `l${i}`)).join("\n")
    )!;
    const out = compactDiff(lines, 2);
    expect(out.length).toBeLessThan(12);
    expect(out.some((l) => l.text === "…")).toBe(true);
    expect(out.some((l) => l.text === "CHANGED")).toBe(true);
  });
});

const bytes = (...values: number[]) => new Uint8Array(values).buffer;
const ascii = (text: string) => new TextEncoder().encode(text).buffer;

describe("sniffImageMime", () => {
  it("recognizes common raster formats by their magic bytes", () => {
    expect(sniffImageMime(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0))).toBe("image/png");
    expect(sniffImageMime(bytes(0xff, 0xd8, 0xff, 0xe0, 0, 0x10))).toBe("image/jpeg");
    expect(sniffImageMime(ascii("GIF89a\u0001\u0000"))).toBe("image/gif");
    expect(sniffImageMime(ascii("RIFF\u0000\u0000\u0000\u0000WEBPVP8 "))).toBe("image/webp");
    expect(sniffImageMime(ascii("\u0000\u0000\u0000\u001cftypavif"))).toBe("image/avif");
  });

  it("recognizes SVG markup but not other text", () => {
    expect(sniffImageMime(ascii('<svg xmlns="http://www.w3.org/2000/svg"></svg>'))).toBe("image/svg+xml");
    expect(sniffImageMime(ascii('<?xml version="1.0"?><svg></svg>'))).toBe("image/svg+xml");
    expect(sniffImageMime(ascii("<html></html>"))).toBeNull();
    expect(sniffImageMime(ascii("plain text"))).toBeNull();
  });

  it("returns null for unknown binary", () => {
    expect(sniffImageMime(bytes(0, 1, 2, 3, 4, 5))).toBeNull();
  });
});

describe("sniffsAsText", () => {
  it("accepts text and rejects NUL bytes", () => {
    expect(sniffsAsText(ascii("hello\nworld"))).toBe(true);
    expect(sniffsAsText(bytes(0x68, 0x00, 0x69))).toBe(false);
  });

  it("tolerates a multi-byte character cut off at the end of the sample", () => {
    const full = new TextEncoder().encode("héllo wörld ✓");
    expect(sniffsAsText(full.slice(0, full.length - 1).buffer)).toBe(true);
  });

  it("rejects invalid UTF-8 in the middle", () => {
    expect(sniffsAsText(bytes(0x61, 0xff, 0xfe, 0x62, 0x63, 0x64, 0x65, 0x66))).toBe(false);
  });
});
