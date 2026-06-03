function cleanup(data, width, height, options) {
  let source = new Uint8ClampedArray(data);
  let target = new Uint8ClampedArray(source.length);
  const { radius, threshold, minAgree, iterations, includeAlpha, opaqueOnly } = options;
  const limit = threshold * threshold;
  const colorDistance = (a, b) => {
    const dr = source[a] - source[b], dg = source[a + 1] - source[b + 1], db = source[a + 2] - source[b + 2];
    const da = includeAlpha ? source[a + 3] - source[b + 3] : 0;
    return dr * dr + dg * dg + db * db + da * da;
  };
  for (let pass = 0; pass < iterations; pass++) {
    target.set(source);
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const current = (y * width + x) * 4;
      if (source[current + 3] === 0 || (opaqueOnly && source[current + 3] !== 255)) continue;
      const samples = [];
      for (let ny = Math.max(0, y - radius); ny <= Math.min(height - 1, y + radius); ny++) {
        for (let nx = Math.max(0, x - radius); nx <= Math.min(width - 1, x + radius); nx++) {
          const index = (ny * width + nx) * 4;
          if (source[index + 3] === 0 || (opaqueOnly && source[index + 3] !== 255)) continue;
          samples.push(index);
        }
      }
      let best = null;
      for (const seed of samples) {
        let count = 0, r = 0, g = 0, b = 0, a = 0;
        for (const sample of samples) if (colorDistance(seed, sample) <= limit) {
          count++; r += source[sample]; g += source[sample + 1]; b += source[sample + 2]; a += source[sample + 3];
        }
        if (!best || count > best.count) best = { count, r, g, b, a };
      }
      if (!best || best.count < minAgree) continue;
      const mr = Math.round(best.r / best.count), mg = Math.round(best.g / best.count), mb = Math.round(best.b / best.count), ma = Math.round(best.a / best.count);
      const dr = source[current] - mr, dg = source[current + 1] - mg, db = source[current + 2] - mb, da = includeAlpha ? source[current + 3] - ma : 0;
      if (dr * dr + dg * dg + db * db + da * da > limit) continue;
      target[current] = mr; target[current + 1] = mg; target[current + 2] = mb;
      if (includeAlpha && !opaqueOnly) target[current + 3] = ma;
    }
    [source, target] = [target, source];
  }
  return source;
}
function countUniqueColors(data) {
  const pixels = new Uint8ClampedArray(data);
  const colors = new Set();
  for (let index = 0; index < pixels.length; index += 4) colors.add((((pixels[index] * 256 + pixels[index + 1]) * 256 + pixels[index + 2]) * 256) + pixels[index + 3]);
  return colors.size;
}
const clamp = (value) => Math.max(0, Math.min(255, Math.round(value)));
const keyFor = (pixels, i) => `${pixels[i]},${pixels[i + 1]},${pixels[i + 2]}`;
function distanceRgb(pixels, offset, color) {
  const dr = pixels[offset] - color[0], dg = pixels[offset + 1] - color[1], db = pixels[offset + 2] - color[2];
  return dr * dr + dg * dg + db * db;
}
function nearestPaletteIndex(pixels, offset, palette, firstOpaque) {
  let best = firstOpaque, bestDistance = Infinity;
  for (let i = firstOpaque; i < palette.length; i++) {
    const distance = distanceRgb(pixels, offset, palette[i]);
    if (distance < bestDistance) { bestDistance = distance; best = i; }
  }
  return best;
}
function popularityPalette(pixels, options, firstOpaque, availableColors) {
  const counts = new Map();
  for (let i = 0; i < pixels.length; i += 4) {
    if (pixels[i + 3] <= options.alphaCutoff) continue;
    const key = keyFor(pixels, i);
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, availableColors).map(([key]) => key.split(',').map(Number).concat(255));
}
function medianCutPalette(pixels, options, firstOpaque, availableColors) {
  const step = Math.max(1, Math.min(8, options.sampleStep || 1));
  const samples = [];
  for (let pixel = 0; pixel < pixels.length / 4; pixel += step) {
    const i = pixel * 4;
    if (pixels[i + 3] > options.alphaCutoff) samples.push([pixels[i], pixels[i + 1], pixels[i + 2], 1]);
  }
  if (!samples.length) return [];
  let boxes = [samples];
  while (boxes.length < availableColors) {
    let splitIndex = -1, splitRange = -1;
    for (let i = 0; i < boxes.length; i++) {
      if (boxes[i].length < 2) continue;
      const range = channelRange(boxes[i]).range;
      if (range > splitRange) { splitRange = range; splitIndex = i; }
    }
    if (splitIndex < 0) break;
    const box = boxes.splice(splitIndex, 1)[0];
    const channel = channelRange(box).channel;
    box.sort((a, b) => a[channel] - b[channel]);
    const mid = Math.floor(box.length / 2);
    boxes.push(box.slice(0, mid), box.slice(mid));
  }
  return boxes.filter(Boolean).map((box) => {
    let r = 0, g = 0, b = 0;
    for (const color of box) { r += color[0]; g += color[1]; b += color[2]; }
    return [clamp(r / box.length), clamp(g / box.length), clamp(b / box.length), 255];
  });
}
function channelRange(box) {
  const min = [255, 255, 255], max = [0, 0, 0];
  for (const color of box) for (let c = 0; c < 3; c++) { if (color[c] < min[c]) min[c] = color[c]; if (color[c] > max[c]) max[c] = color[c]; }
  let channel = 0, range = max[0] - min[0];
  for (let c = 1; c < 3; c++) if (max[c] - min[c] > range) { channel = c; range = max[c] - min[c]; }
  return { channel, range };
}
function mapPixels(pixels, width, height, palette, firstOpaque, options) {
  const out = new Uint8ClampedArray(pixels.length), indices = new Uint8Array(width * height), transparentIndex = firstOpaque ? 0 : -1;
  if (options.dithering !== 'floyd-steinberg' || palette.length <= firstOpaque + 1) {
    const cache = new Map();
    for (let i = 0, p = 0; i < indices.length; i++, p += 4) {
      if (pixels[p + 3] <= options.alphaCutoff) { indices[i] = transparentIndex; out.set([0, 0, 0, 0], p); continue; }
      const key = keyFor(pixels, p); let index = cache.get(key);
      if (index === undefined) { index = nearestPaletteIndex(pixels, p, palette, firstOpaque); cache.set(key, index); }
      indices[i] = index; out.set(palette[index], p);
    }
    return { out, indices };
  }
  const work = new Float32Array(pixels.length);
  for (let i = 0; i < pixels.length; i++) work[i] = pixels[i];
  const diffuse = (x, y, er, eg, eb, factor) => {
    if (x < 0 || x >= width || y < 0 || y >= height) return;
    const p = (y * width + x) * 4;
    if (pixels[p + 3] <= options.alphaCutoff) return;
    work[p] += er * factor; work[p + 1] += eg * factor; work[p + 2] += eb * factor;
  };
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const p = (y * width + x) * 4, i = y * width + x;
    if (pixels[p + 3] <= options.alphaCutoff) { indices[i] = transparentIndex; out.set([0, 0, 0, 0], p); continue; }
    work[p] = clamp(work[p]); work[p + 1] = clamp(work[p + 1]); work[p + 2] = clamp(work[p + 2]);
    const index = nearestPaletteIndex(work, p, palette, firstOpaque), color = palette[index];
    indices[i] = index; out.set(color, p);
    const er = work[p] - color[0], eg = work[p + 1] - color[1], eb = work[p + 2] - color[2];
    diffuse(x + 1, y, er, eg, eb, 7 / 16); diffuse(x - 1, y + 1, er, eg, eb, 3 / 16); diffuse(x, y + 1, er, eg, eb, 5 / 16); diffuse(x + 1, y + 1, er, eg, eb, 1 / 16);
  }
  return { out, indices };
}
function reducePalette(data, width, height, rawOptions) {
  const pixels = new Uint8ClampedArray(data);
  const options = { targetColors:Math.max(2, Math.min(256, rawOptions.targetColors || 16)), algorithm:rawOptions.algorithm || 'median-cut', dithering:rawOptions.dithering || 'off', alphaCutoff:Math.max(0, Math.min(255, rawOptions.alphaCutoff ?? 1)), sampleStep:Math.max(1, Math.min(8, rawOptions.sampleStep || 1)) };
  let transparentPixels = 0, uniqueSourceColors = new Set();
  for (let i = 0; i < pixels.length; i += 4) {
    if (pixels[i + 3] <= options.alphaCutoff) transparentPixels++;
    else uniqueSourceColors.add(keyFor(pixels, i));
  }
  const usesTransparency = transparentPixels > 0, firstOpaque = usesTransparency ? 1 : 0;
  const availableColors = Math.max(0, options.targetColors - firstOpaque);
  const palette = usesTransparency ? [[0, 0, 0, 0]] : [];
  const opaquePalette = options.algorithm === 'popularity' ? popularityPalette(pixels, options, firstOpaque, availableColors) : medianCutPalette(pixels, options, firstOpaque, availableColors);
  palette.push(...opaquePalette);
  if (palette.length === firstOpaque && firstOpaque === 0) palette.push([0, 0, 0, 255]);
  const mapped = mapPixels(pixels, width, height, palette, firstOpaque, options);
  return { pixels:mapped.out, palette, indices:mapped.indices, stats:{ actualPaletteSize:palette.length, uniqueSourceColors:uniqueSourceColors.size, transparentPixels, algorithm:options.algorithm, dithering:options.dithering } };
}
self.onmessage = ({ data }) => {
  try {
    if (data.action === 'countColors') { self.postMessage({ id:data.id, count:countUniqueColors(data.pixels) }); return; }
    if (data.action === 'paletteReduction') {
      const result = reducePalette(data.pixels, data.width, data.height, data.options || {});
      self.postMessage({ id:data.id, pixels:result.pixels.buffer, palette:result.palette, indices:result.indices.buffer, stats:result.stats }, [result.pixels.buffer, result.indices.buffer]);
      return;
    }
    const result = cleanup(data.pixels, data.width, data.height, data.options);
    self.postMessage({ id:data.id, pixels:result.buffer }, [result.buffer]);
  } catch (error) { self.postMessage({ id:data.id, error:error.message }); }
};
