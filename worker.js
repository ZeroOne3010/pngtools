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
self.onmessage = ({ data }) => {
  try {
    const result = cleanup(data.pixels, data.width, data.height, data.options);
    self.postMessage({ id:data.id, pixels:result.buffer }, [result.buffer]);
  } catch (error) { self.postMessage({ id:data.id, error:error.message }); }
};
