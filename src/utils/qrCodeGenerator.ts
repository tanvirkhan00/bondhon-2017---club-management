/**
 * Pure TypeScript ISO/IEC 18004 QR Code Encoder (Byte Mode, Error Correction M, Versions 1–10).
 * Zero external runtime dependencies — works identically across browser, Vite/Rolldown, and Netlify CI.
 */

export interface QrMatrix {
  size: number;
  modules: Uint8Array; // 1 = dark, 0 = light
}

interface VersionSpec {
  version: number;
  size: number;
  totalDataBytes: number;
  ecBytesPerBlock: number;
  blocksGroup1: [count: number, dataBytes: number];
  blocksGroup2?: [count: number, dataBytes: number];
  alignmentCoords: number[];
  versionInfoBits?: number;
}

const VERSION_SPECS: VersionSpec[] = [
  {
    version: 1,
    size: 21,
    totalDataBytes: 16,
    ecBytesPerBlock: 10,
    blocksGroup1: [1, 16],
    alignmentCoords: [],
  },
  {
    version: 2,
    size: 25,
    totalDataBytes: 28,
    ecBytesPerBlock: 16,
    blocksGroup1: [1, 28],
    alignmentCoords: [6, 18],
  },
  {
    version: 3,
    size: 29,
    totalDataBytes: 44,
    ecBytesPerBlock: 26,
    blocksGroup1: [1, 44],
    alignmentCoords: [6, 22],
  },
  {
    version: 4,
    size: 33,
    totalDataBytes: 64,
    ecBytesPerBlock: 18,
    blocksGroup1: [2, 32],
    alignmentCoords: [6, 26],
  },
  {
    version: 5,
    size: 37,
    totalDataBytes: 86,
    ecBytesPerBlock: 24,
    blocksGroup1: [2, 43],
    alignmentCoords: [6, 30],
  },
  {
    version: 6,
    size: 41,
    totalDataBytes: 108,
    ecBytesPerBlock: 16,
    blocksGroup1: [4, 27],
    alignmentCoords: [6, 34],
  },
  {
    version: 7,
    size: 45,
    totalDataBytes: 124,
    ecBytesPerBlock: 18,
    blocksGroup1: [4, 31],
    alignmentCoords: [6, 22, 38],
    versionInfoBits: 0x07c94,
  },
  {
    version: 8,
    size: 49,
    totalDataBytes: 154,
    ecBytesPerBlock: 22,
    blocksGroup1: [2, 38],
    blocksGroup2: [2, 39],
    alignmentCoords: [6, 24, 42],
    versionInfoBits: 0x085bc,
  },
  {
    version: 9,
    size: 53,
    totalDataBytes: 182,
    ecBytesPerBlock: 22,
    blocksGroup1: [3, 36],
    blocksGroup2: [2, 37],
    alignmentCoords: [6, 26, 46],
    versionInfoBits: 0x09a99,
  },
  {
    version: 10,
    size: 57,
    totalDataBytes: 216,
    ecBytesPerBlock: 26,
    blocksGroup1: [4, 43],
    blocksGroup2: [1, 44],
    alignmentCoords: [6, 28, 50],
    versionInfoBits: 0x0a4d3,
  },
];

// GF(256) lookup tables using primitive polynomial x^8 + x^4 + x^3 + x^2 + 1 (0x11d)
const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);

(() => {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = x;
    GF_EXP[i + 255] = x;
    GF_LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
})();

function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return GF_EXP[GF_LOG[a] + GF_LOG[b]];
}

function getReedSolomonGenerator(degree: number): Uint8Array {
  let poly = new Uint8Array([1]);
  for (let i = 0; i < degree; i++) {
    const next = new Uint8Array(poly.length + 1);
    const factor = GF_EXP[i];
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= poly[j];
      next[j + 1] ^= gfMul(poly[j], factor);
    }
    poly = next;
  }
  return poly;
}

function computeReedSolomonEc(data: Uint8Array, ecCount: number): Uint8Array {
  const gen = getReedSolomonGenerator(ecCount);
  const res = new Uint8Array(ecCount);
  for (let i = 0; i < data.length; i++) {
    const factor = data[i] ^ res[0];
    res.copyWithin(0, 1);
    res[ecCount - 1] = 0;
    if (factor !== 0) {
      for (let j = 0; j < ecCount; j++) {
        res[j] ^= gfMul(gen[j + 1], factor);
      }
    }
  }
  return res;
}

function selectVersion(byteLength: number): VersionSpec {
  for (const spec of VERSION_SPECS) {
    const countBits = spec.version >= 10 ? 16 : 8;
    const totalNeededBits = 4 + countBits + byteLength * 8;
    if (totalNeededBits <= spec.totalDataBytes * 8) {
      return spec;
    }
  }
  throw new Error('QR payload exceeds supported length (max 213 bytes).');
}

function encodeDataCodewords(bytes: Uint8Array, spec: VersionSpec): Uint8Array {
  const bits: number[] = [];
  const pushBits = (val: number, len: number) => {
    for (let i = len - 1; i >= 0; i--) {
      bits.push((val >>> i) & 1);
    }
  };

  // Byte mode indicator (0100)
  pushBits(0b0100, 4);
  // Character count
  pushBits(bytes.length, spec.version >= 10 ? 16 : 8);
  // Payload bytes
  for (let i = 0; i < bytes.length; i++) {
    pushBits(bytes[i], 8);
  }

  const maxBits = spec.totalDataBytes * 8;
  const terminatorLen = Math.min(4, maxBits - bits.length);
  pushBits(0, terminatorLen);

  while (bits.length % 8 !== 0) {
    bits.push(0);
  }

  const codewords = new Uint8Array(spec.totalDataBytes);
  let cwIdx = 0;
  for (let i = 0; i < bits.length; i += 8) {
    let b = 0;
    for (let j = 0; j < 8; j++) {
      b = (b << 1) | bits[i + j];
    }
    codewords[cwIdx++] = b;
  }

  let padToggle = 0;
  while (cwIdx < spec.totalDataBytes) {
    codewords[cwIdx++] = padToggle === 0 ? 0xec : 0x11;
    padToggle ^= 1;
  }

  return codewords;
}

function interleaveBlocks(dataCodewords: Uint8Array, spec: VersionSpec): Uint8Array {
  const dataBlocks: Uint8Array[] = [];
  const ecBlocks: Uint8Array[] = [];
  let offset = 0;

  const pushGroup = (count: number, len: number) => {
    for (let i = 0; i < count; i++) {
      const slice = dataCodewords.slice(offset, offset + len);
      offset += len;
      dataBlocks.push(slice);
      ecBlocks.push(computeReedSolomonEc(slice, spec.ecBytesPerBlock));
    }
  };

  pushGroup(spec.blocksGroup1[0], spec.blocksGroup1[1]);
  if (spec.blocksGroup2) {
    pushGroup(spec.blocksGroup2[0], spec.blocksGroup2[1]);
  }

  const maxDataLen = Math.max(...dataBlocks.map((b) => b.length));
  const totalBytes = spec.totalDataBytes + dataBlocks.length * spec.ecBytesPerBlock;
  const result = new Uint8Array(totalBytes);
  let outIdx = 0;

  for (let col = 0; col < maxDataLen; col++) {
    for (const block of dataBlocks) {
      if (col < block.length) {
        result[outIdx++] = block[col];
      }
    }
  }

  for (let col = 0; col < spec.ecBytesPerBlock; col++) {
    for (const ec of ecBlocks) {
      result[outIdx++] = ec[col];
    }
  }

  return result;
}

function computeFormatBits(maskPattern: number): number {
  // Error correction M = 00
  const data = (0b00 << 3) | maskPattern;
  let rem = data << 10;
  const gen = 0x537;
  for (let i = 4; i >= 0; i--) {
    if (rem & (1 << (i + 10))) {
      rem ^= gen << i;
    }
  }
  return ((data << 10) | rem) ^ 0x5412;
}

function shouldMask(maskPattern: number, row: number, col: number): boolean {
  switch (maskPattern) {
    case 0:
      return (row + col) % 2 === 0;
    case 1:
      return row % 2 === 0;
    case 2:
      return col % 3 === 0;
    case 3:
      return (row + col) % 3 === 0;
    case 4:
      return (Math.floor(row / 2) + Math.floor(col / 3)) % 2 === 0;
    case 5:
      return ((row * col) % 2) + ((row * col) % 3) === 0;
    case 6:
      return (((row * col) % 2) + ((row * col) % 3)) % 2 === 0;
    case 7:
      return (((row + col) % 2) + ((row * col) % 3)) % 2 === 0;
    default:
      return false;
  }
}

function evaluatePenalty(modules: Uint8Array, size: number): number {
  let penalty = 0;
  const at = (r: number, c: number) => modules[r * size + c];

  // N1: 5+ consecutive same-color modules in row/col
  for (let r = 0; r < size; r++) {
    let runColor = at(r, 0);
    let runLen = 1;
    for (let c = 1; c < size; c++) {
      const color = at(r, c);
      if (color === runColor) {
        runLen++;
      } else {
        if (runLen >= 5) penalty += 3 + (runLen - 5);
        runColor = color;
        runLen = 1;
      }
    }
    if (runLen >= 5) penalty += 3 + (runLen - 5);
  }

  for (let c = 0; c < size; c++) {
    let runColor = at(0, c);
    let runLen = 1;
    for (let r = 1; r < size; r++) {
      const color = at(r, c);
      if (color === runColor) {
        runLen++;
      } else {
        if (runLen >= 5) penalty += 3 + (runLen - 5);
        runColor = color;
        runLen = 1;
      }
    }
    if (runLen >= 5) penalty += 3 + (runLen - 5);
  }

  // N2: 2x2 blocks of same color
  for (let r = 0; r < size - 1; r++) {
    for (let c = 0; c < size - 1; c++) {
      const v = at(r, c);
      if (v === at(r, c + 1) && v === at(r + 1, c) && v === at(r + 1, c + 1)) {
        penalty += 3;
      }
    }
  }

  // N3: 1:1:3:1:1 pattern with 4 light modules before or after
  const checkPattern = (line: number[]) => {
    for (let i = 0; i <= line.length - 11; i++) {
      const matchLeft =
        line[i] === 1 &&
        line[i + 1] === 0 &&
        line[i + 2] === 1 &&
        line[i + 3] === 1 &&
        line[i + 4] === 1 &&
        line[i + 5] === 0 &&
        line[i + 6] === 1 &&
        line[i + 7] === 0 &&
        line[i + 8] === 0 &&
        line[i + 9] === 0 &&
        line[i + 10] === 0;
      const matchRight =
        line[i] === 0 &&
        line[i + 1] === 0 &&
        line[i + 2] === 0 &&
        line[i + 3] === 0 &&
        line[i + 4] === 1 &&
        line[i + 5] === 0 &&
        line[i + 6] === 1 &&
        line[i + 7] === 1 &&
        line[i + 8] === 1 &&
        line[i + 9] === 0 &&
        line[i + 10] === 1;
      if (matchLeft || matchRight) penalty += 40;
    }
  };

  for (let r = 0; r < size; r++) {
    const row: number[] = [];
    for (let c = 0; c < size; c++) row.push(at(r, c));
    checkPattern(row);
  }
  for (let c = 0; c < size; c++) {
    const col: number[] = [];
    for (let r = 0; r < size; r++) col.push(at(r, c));
    checkPattern(col);
  }

  // N4: dark ratio balance
  let darkCount = 0;
  for (let i = 0; i < modules.length; i++) {
    if (modules[i]) darkCount++;
  }
  const percent = (darkCount * 100) / modules.length;
  const steps = Math.floor(Math.abs(percent - 50) / 5);
  penalty += steps * 10;

  return penalty;
}

export function generateQrMatrix(text: string): QrMatrix {
  const payload = new TextEncoder().encode(text);
  const spec = selectVersion(payload.length);
  const size = spec.size;

  const dataCw = encodeDataCodewords(payload, spec);
  const finalBytes = interleaveBlocks(dataCw, spec);

  const baseModules = new Uint8Array(size * size);
  const isFunction = new Uint8Array(size * size);

  const setFn = (r: number, c: number, dark: boolean) => {
    if (r < 0 || c < 0 || r >= size || c >= size) return;
    baseModules[r * size + c] = dark ? 1 : 0;
    isFunction[r * size + c] = 1;
  };

  // Finder patterns + 1px separators
  const drawFinder = (top: number, left: number) => {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const rr = top + r;
        const cc = left + c;
        if (rr < 0 || cc < 0 || rr >= size || cc >= size) continue;
        const inBorder = r === 0 || r === 6 || c === 0 || c === 6;
        const inCore = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        const inBounds = r >= 0 && r <= 6 && c >= 0 && c <= 6;
        setFn(rr, cc, inBounds && (inBorder || inCore));
      }
    }
  };
  drawFinder(0, 0);
  drawFinder(0, size - 7);
  drawFinder(size - 7, 0);

  // Alignment patterns
  for (const r of spec.alignmentCoords) {
    for (const c of spec.alignmentCoords) {
      if (
        (r === 6 && c === 6) ||
        (r === 6 && c === size - 7) ||
        (r === size - 7 && c === 6)
      ) {
        continue;
      }
      for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
          const dark = Math.max(Math.abs(dr), Math.abs(dc)) !== 1;
          setFn(r + dr, c + dc, dark);
        }
      }
    }
  }

  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    const dark = i % 2 === 0;
    if (!isFunction[6 * size + i]) setFn(6, i, dark);
    if (!isFunction[i * size + 6]) setFn(i, 6, dark);
  }

  // Dark module
  setFn(size - 8, 8, true);

  // Reserve format info cells
  for (let i = 0; i <= 8; i++) {
    if (i !== 6) {
      isFunction[8 * size + i] = 1;
      isFunction[i * size + 8] = 1;
    }
  }
  for (let i = 0; i < 8; i++) {
    isFunction[8 * size + (size - 1 - i)] = 1;
  }
  for (let i = 0; i < 7; i++) {
    isFunction[(size - 1 - i) * size + 8] = 1;
  }

  // Version info cells (Version 7+)
  if (spec.versionInfoBits !== undefined) {
    for (let i = 0; i < 18; i++) {
      const dark = ((spec.versionInfoBits >>> i) & 1) === 1;
      const a = size - 11 + (i % 3);
      const b = Math.floor(i / 3);
      setFn(a, b, dark);
      setFn(b, a, dark);
    }
  }

  // Place interleaved data + ECC bits in standard zig-zag
  let bitIdx = 0;
  const totalBits = finalBytes.length * 8;
  let upward = true;
  for (let rightCol = size - 1; rightCol >= 1; rightCol -= 2) {
    if (rightCol === 6) rightCol = 5;
    for (let step = 0; step < size; step++) {
      const r = upward ? size - 1 - step : step;
      for (let cOffset = 0; cOffset < 2; cOffset++) {
        const c = rightCol - cOffset;
        if (isFunction[r * size + c]) continue;
        let bit = 0;
        if (bitIdx < totalBits) {
          bit = (finalBytes[bitIdx >>> 3] >>> (7 - (bitIdx & 7))) & 1;
        }
        bitIdx++;
        baseModules[r * size + c] = bit;
      }
    }
    upward = !upward;
  }

  // Try all 8 masks and choose lowest penalty
  let bestMask = 0;
  let bestPenalty = Number.POSITIVE_INFINITY;
  let bestModules = baseModules;

  for (let mask = 0; mask < 8; mask++) {
    const candidate = new Uint8Array(baseModules);
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (!isFunction[r * size + c] && shouldMask(mask, r, c)) {
          candidate[r * size + c] ^= 1;
        }
      }
    }

    // Write format info
    const fmt = computeFormatBits(mask);
    for (let i = 0; i < 15; i++) {
      const dark = ((fmt >>> i) & 1) === 1 ? 1 : 0;
      if (i < 6) {
        candidate[i * size + 8] = dark;
      } else if (i < 8) {
        candidate[(i + 1) * size + 8] = dark;
      } else {
        candidate[(size - 15 + i) * size + 8] = dark;
      }

      if (i < 8) {
        candidate[8 * size + (size - 1 - i)] = dark;
      } else if (i < 9) {
        candidate[8 * size + 7] = dark;
      } else {
        candidate[8 * size + (14 - i)] = dark;
      }
    }

    const penalty = evaluatePenalty(candidate, size);
    if (penalty < bestPenalty) {
      bestPenalty = penalty;
      bestMask = mask;
      bestModules = candidate;
    }
  }

  void bestMask;
  return { size, modules: bestModules };
}

export function renderQrToCanvas(
  canvas: HTMLCanvasElement,
  text: string,
  options: {
    cssSize: number;
    marginModules?: number;
    darkColor?: string;
    lightColor?: string;
    dpr?: number;
  }
): void {
  const {
    cssSize,
    marginModules = 4,
    darkColor = '#0F1B33',
    lightColor = '#FFFFFF',
    dpr = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 2, 3) : 2,
  } = options;

  const matrix = generateQrMatrix(text);
  const totalModules = matrix.size + marginModules * 2;
  const pixelTarget = Math.round(cssSize * dpr);
  // Snap cell size to integer pixels so mobile cameras see zero anti-aliasing blur
  const modulePx = Math.max(2, Math.floor(pixelTarget / totalModules));
  const canvasPx = modulePx * totalModules;

  canvas.width = canvasPx;
  canvas.height = canvasPx;
  canvas.style.width = `${cssSize}px`;
  canvas.style.height = `${cssSize}px`;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = lightColor;
  ctx.fillRect(0, 0, canvasPx, canvasPx);

  ctx.fillStyle = darkColor;
  for (let r = 0; r < matrix.size; r++) {
    for (let c = 0; c < matrix.size; c++) {
      if (matrix.modules[r * matrix.size + c]) {
        ctx.fillRect(
          (c + marginModules) * modulePx,
          (r + marginModules) * modulePx,
          modulePx,
          modulePx
        );
      }
    }
  }
}

export function exportQrPngDataUrl(
  text: string,
  darkColor = '#0F1B33',
  lightColor = '#FFFFFF'
): string {
  const canvas = document.createElement('canvas');
  renderQrToCanvas(canvas, text, {
    cssSize: 512,
    marginModules: 4,
    darkColor,
    lightColor,
    dpr: 1,
  });
  return canvas.toDataURL('image/png');
}
