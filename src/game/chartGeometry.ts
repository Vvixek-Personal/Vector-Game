export function curveThroughPoints(points: [number, number][]): string {
  if (!points.length) return '';
  let path = 'M '+points[0][0]+' '+points[0][1];
  for(let i=1;i<points.length;i++) {
    const a=points[i-1], b=points[i], middle=(a[0]+b[0])/2;
    // Control heights stay at the measured endpoints, so curves cannot overshoot.
    path += ' C '+middle+' '+a[1]+', '+middle+' '+b[1]+', '+b[0]+' '+b[1];
  }
  return path;
}
export function chartMaximum(values: number[], fixed?: number): number {
  if(fixed && Number.isFinite(fixed) && fixed>0) return fixed;
  const max=Math.max(1,...values.filter(Number.isFinite));
  const magnitude=10**Math.floor(Math.log10(max)), scaled=max/magnitude;
  return (scaled<=1?1:scaled<=2?2:scaled<=5?5:10)*magnitude;
}
