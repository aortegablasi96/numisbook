// A minimal ZIP writer and reader, STORE (no compression) only. Dependency-free
// by decision: the account archive (ADR-017 addendum, slice 3) bundles a JSON
// manifest with already-compressed image/PDF bytes, so DEFLATE would buy almost
// nothing, and STORE has no decompression step and therefore no zip-bomb
// amplification. Mirrors `csv.ts`: this module knows the container format, not
// the archive's meaning — the manifest contract lives in `archive.ts`.
//
// The dialect we read is the one we write: local file headers, a central
// directory, an end-of-central-directory record, method 0, no data descriptors,
// no ZIP64. `unzip` reads the central directory (the authoritative index) and
// rejects any entry that is not STORE, so a foreign compressed zip is refused
// rather than silently mis-decoded.

export type ZipEntry = { name: string; data: Buffer };

const LOCAL_SIG = 0x04034b50; // PK\x03\x04
const CENTRAL_SIG = 0x02014b50; // PK\x01\x02
const EOCD_SIG = 0x06054b50; // PK\x05\x06
const STORE = 0; // compression method: none

// Fixed DOS date/time (1980-01-01 00:00:00) so output is deterministic — the
// archive's timestamps live in the manifest, not in zip metadata.
const DOS_TIME = 0;
const DOS_DATE = 0x0021;

// UTF-8 filename flag (general-purpose bit 11), so accented entry names survive.
const FLAG_UTF8 = 0x0800;

// CRC-32 (IEEE 802.3, reflected 0xEDB88320) — the checksum every zip entry
// carries. Built once as a lookup table.
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf: Buffer): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/**
 * Build a STORE zip from a list of named byte payloads. Entry names may contain
 * `/` to nest (e.g. `images/<id>`); they are stored verbatim as UTF-8.
 */
export function zipStore(entries: readonly ZipEntry[]): Buffer {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;

  for (const entry of entries) {
    const name = Buffer.from(entry.name, "utf8");
    const crc = crc32(entry.data);
    const size = entry.data.length;

    const local = Buffer.alloc(30);
    local.writeUInt32LE(LOCAL_SIG, 0);
    local.writeUInt16LE(20, 4); // version needed
    local.writeUInt16LE(FLAG_UTF8, 6);
    local.writeUInt16LE(STORE, 8);
    local.writeUInt16LE(DOS_TIME, 10);
    local.writeUInt16LE(DOS_DATE, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(size, 18); // compressed size (== uncompressed for STORE)
    local.writeUInt32LE(size, 22); // uncompressed size
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28); // extra field length
    locals.push(local, name, entry.data);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(CENTRAL_SIG, 0);
    central.writeUInt16LE(20, 4); // version made by
    central.writeUInt16LE(20, 6); // version needed
    central.writeUInt16LE(FLAG_UTF8, 8);
    central.writeUInt16LE(STORE, 10);
    central.writeUInt16LE(DOS_TIME, 12);
    central.writeUInt16LE(DOS_DATE, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(size, 20);
    central.writeUInt32LE(size, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt16LE(0, 30); // extra field length
    central.writeUInt16LE(0, 32); // comment length
    central.writeUInt16LE(0, 34); // disk number start
    central.writeUInt16LE(0, 36); // internal attributes
    central.writeUInt32LE(0, 38); // external attributes
    central.writeUInt32LE(offset, 42); // local header offset
    centrals.push(central, name);

    offset += local.length + name.length + entry.data.length;
  }

  const centralDir = Buffer.concat(centrals);
  const centralOffset = offset;

  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(EOCD_SIG, 0);
  eocd.writeUInt16LE(0, 4); // this disk
  eocd.writeUInt16LE(0, 6); // disk with central dir
  eocd.writeUInt16LE(entries.length, 8); // records on this disk
  eocd.writeUInt16LE(entries.length, 10); // total records
  eocd.writeUInt32LE(centralDir.length, 12);
  eocd.writeUInt32LE(centralOffset, 16);
  eocd.writeUInt16LE(0, 20); // comment length

  return Buffer.concat([...locals, centralDir, eocd]);
}

/**
 * Read a STORE zip back into a map of entry name → bytes, the inverse of
 * `zipStore`. Reads the central directory rather than scanning local headers,
 * verifies each entry's CRC, and throws on a truncated file, a bad signature, or
 * any non-STORE entry (the file is not one of ours — better refused than
 * mis-decoded).
 */
export function unzip(buf: Buffer): Map<string, Buffer> {
  const eocd = findEocd(buf);
  const count = buf.readUInt16LE(eocd + 10);
  let ptr = buf.readUInt32LE(eocd + 16); // central directory offset

  const out = new Map<string, Buffer>();
  for (let i = 0; i < count; i++) {
    if (buf.readUInt32LE(ptr) !== CENTRAL_SIG) {
      throw new Error("Malformed zip: bad central directory signature.");
    }
    const method = buf.readUInt16LE(ptr + 10);
    if (method !== STORE) {
      throw new Error("Unsupported zip: only STORE (uncompressed) entries are read.");
    }
    const crc = buf.readUInt32LE(ptr + 16);
    const size = buf.readUInt32LE(ptr + 20); // compressed == uncompressed
    const nameLen = buf.readUInt16LE(ptr + 28);
    const extraLen = buf.readUInt16LE(ptr + 30);
    const commentLen = buf.readUInt16LE(ptr + 32);
    const localOffset = buf.readUInt32LE(ptr + 42);
    const name = buf.toString("utf8", ptr + 46, ptr + 46 + nameLen);

    if (buf.readUInt32LE(localOffset) !== LOCAL_SIG) {
      throw new Error("Malformed zip: bad local header signature.");
    }
    const localNameLen = buf.readUInt16LE(localOffset + 26);
    const localExtraLen = buf.readUInt16LE(localOffset + 28);
    const dataStart = localOffset + 30 + localNameLen + localExtraLen;
    const data = buf.subarray(dataStart, dataStart + size);
    if (data.length !== size) {
      throw new Error("Malformed zip: entry data is truncated.");
    }
    if (crc32(data) !== crc) {
      throw new Error(`Corrupt zip: CRC mismatch for entry "${name}".`);
    }

    out.set(name, Buffer.from(data));
    ptr += 46 + nameLen + extraLen + commentLen;
  }
  return out;
}

// Locate the end-of-central-directory record. It is the last 22 bytes when there
// is no archive comment (ours never has one), but scan backwards to tolerate one
// and to fail cleanly on a file that is not a zip at all.
function findEocd(buf: Buffer): number {
  const min = Math.max(0, buf.length - (22 + 0xffff));
  for (let i = buf.length - 22; i >= min; i--) {
    if (buf.readUInt32LE(i) === EOCD_SIG) return i;
  }
  throw new Error("Not a zip file: no end-of-central-directory record found.");
}
