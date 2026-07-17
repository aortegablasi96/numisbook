import { describe, it, expect } from "vitest";
import { zipStore, unzip } from "./zip";

describe("zip STORE round-trip", () => {
  it("round-trips text and nested entry names", () => {
    const entries = [
      { name: "manifest.json", data: Buffer.from('{"version":1}', "utf8") },
      { name: "images/abc-123", data: Buffer.from("first image bytes", "utf8") },
      { name: "invoices/def-456", data: Buffer.from("pdf-ish bytes", "utf8") },
    ];
    const out = unzip(zipStore(entries));
    expect(out.size).toBe(3);
    expect(out.get("manifest.json")?.toString("utf8")).toBe('{"version":1}');
    expect(out.get("images/abc-123")?.toString("utf8")).toBe("first image bytes");
    expect(out.get("invoices/def-456")?.toString("utf8")).toBe("pdf-ish bytes");
  });

  it("round-trips arbitrary binary payloads byte-for-byte", () => {
    // Every byte value, plus zip-structural bytes (PK signatures) inside the
    // payload — a naive scanner that looked for signatures in the data would trip.
    const binary = Buffer.from(
      Array.from({ length: 512 }, (_, i) => i % 256),
    );
    const withSigs = Buffer.concat([
      Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x50, 0x4b, 0x05, 0x06]),
      binary,
    ]);
    const out = unzip(zipStore([{ name: "blob", data: withSigs }]));
    expect(out.get("blob")?.equals(withSigs)).toBe(true);
  });

  it("preserves accented (UTF-8) entry names", () => {
    const out = unzip(zipStore([{ name: "Münzen/Zürich", data: Buffer.from("x") }]));
    expect([...out.keys()]).toEqual(["Münzen/Zürich"]);
  });

  it("handles an empty archive and an empty payload", () => {
    expect(unzip(zipStore([])).size).toBe(0);
    const out = unzip(zipStore([{ name: "empty", data: Buffer.alloc(0) }]));
    expect(out.get("empty")?.length).toBe(0);
  });

  it("rejects a buffer that is not a zip", () => {
    expect(() => unzip(Buffer.from("not a zip at all"))).toThrow(/not a zip file/i);
  });

  it("rejects a corrupted entry (CRC mismatch)", () => {
    const zip = zipStore([{ name: "data", data: Buffer.from("original") }]);
    // Flip a byte inside the stored payload; the local header sits at offset 0,
    // so the data begins after the 30-byte header + 4-byte name "data".
    const tampered = Buffer.from(zip);
    tampered[30 + 4] ^= 0xff;
    expect(() => unzip(tampered)).toThrow(/CRC mismatch/i);
  });
});
