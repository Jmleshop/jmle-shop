/** Scales a preview blob to the export edge. Larger exports compress a bit better per pixel. */
export function estimateExportBytes(
  sampleBytes: number,
  sampleEdge: number,
  exportEdge: number,
  areaFactor = 0.72
): number {
  if (sampleBytes <= 0 || sampleEdge <= 0 || exportEdge <= 0) return 0;
  const area = (exportEdge / sampleEdge) ** 2;
  const factor = exportEdge > sampleEdge ? areaFactor : 1;
  return Math.max(1, Math.round(sampleBytes * area * factor));
}
