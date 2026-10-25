import { useEffect, useId, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { chartMaximum, curveThroughPoints } from '../game/chartGeometry';

export interface GraphPoint { value: number; label: string; mode?: string; date?: string; sparks?: number; extra?: string; }
interface Props {
  data: GraphPoint[]; metricName?: string; unit?: string; color?: string; fillColor?: string; height?: number;
  showGrid?: boolean; showPeakPin?: boolean; peakLabel?: string; domainMax?: number; lowerIsBetter?: boolean; reducedMotion?: boolean;
}
const compact = new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 });
export default function CurvedGraph({ data, metricName='Score', unit='', color='var(--brand)', fillColor, height=240, showGrid=true, showPeakPin=true, peakLabel='Best', domainMax, lowerIsBetter=false, reducedMotion=false }: Props) {
  const root=useRef<HTMLDivElement>(null);
  const [width,setWidth]=useState(600);
  const [selected,setSelected]=useState<number|null>(null);
  const id='chart-'+useId().replaceAll(':','');
  useEffect(()=> {
    if(!root.current) return;
    const observer=new ResizeObserver(([entry])=>setWidth(Math.max(260,Math.round(entry.contentRect.width))));
    observer.observe(root.current); return ()=>observer.disconnect();
  },[]);
  const points=data.filter(p=>Number.isFinite(p.value) && p.value>=0);
  const max=chartMaximum(points.map(p=>p.value),domainMax);
  const left=44,right=20,top=36,bottom=26,plotWidth=width-left-right,plotHeight=height-top-bottom;
  const coords: [number,number][]=points.map((p,i)=>[left+(points.length===1?plotWidth/2:i/(points.length-1)*plotWidth),top+(1-Math.min(max,p.value)/max)*plotHeight]);
  const path=curveThroughPoints(coords);
  const area=coords.length>1 ? path+' L '+coords.at(-1)[0]+' '+(height-bottom)+' L '+coords[0][0]+' '+(height-bottom)+' Z' : '';
  const index=Math.min(points.length-1,Math.max(0,selected??points.length-1));
  const active=points[index];
  const best=points.reduce((n,p,i)=> i && (lowerIsBetter?p.value<points[n].value:p.value>points[n].value)?i:n,0);
  const inspect=(clientX:number)=> {
    const rect=root.current?.getBoundingClientRect(); if(!rect||!coords.length) return;
    const x=(clientX-rect.left)/rect.width*width;
    setSelected(coords.reduce((n,p,i)=>Math.abs(p[0]-x)<Math.abs(coords[n][0]-x)?i:n,0));
  };
  return <div ref={root} className="performance-chart" role="group" aria-label={metricName+' history. Use left and right arrow keys to inspect runs.'} tabIndex={points.length?0:undefined}
    onKeyDown={e=> {
      if(!points.length) return;
      if(e.key==='ArrowLeft'||e.key==='ArrowRight') { e.preventDefault();setSelected(Math.max(0,Math.min(points.length-1,index+(e.key==='ArrowRight'?1:-1)))); }
      if(e.key==='Home'||e.key==='End') { e.preventDefault();setSelected(e.key==='Home'?0:points.length-1); }
      if(e.key==='Escape') setSelected(null);
    }}>
    {!points.length ? <div className="analytics-empty"><strong>No {metricName.toLowerCase()} data yet</strong><p>Finish a scored run to see your results here. Practice stays separate.</p></div> : <>
      <div className="chart-reading" role="status" aria-live="polite" aria-atomic="true">
        <div><span className="chart-metric-dot" style={{background:color}}/>{active.label}<small>{active.mode}{active.date?' · '+active.date:''}</small></div>
        <strong style={{color}}>{Math.round(active.value).toLocaleString()}{unit}</strong>
      </div>
      <div className="curved-graph-canvas" style={{height,touchAction:'pan-y'}} onPointerDown={e=>inspect(e.clientX)} onPointerMove={e=> {if(e.pointerType==='mouse'||e.buttons) inspect(e.clientX);}} onPointerLeave={()=>setSelected(null)}>
        <svg viewBox={'0 0 '+width+' '+height} width="100%" height="100%" aria-hidden="true">
          <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={fillColor||color} stopOpacity=".24"/><stop offset="100%" stopColor={fillColor||color} stopOpacity="0"/></linearGradient></defs>
          {showGrid&&[0,.25,.5,.75,1].map(r=><g key={r}><line x1={left} x2={width-right} y1={top+(1-r)*plotHeight} y2={top+(1-r)*plotHeight} stroke="var(--panel-border)" strokeDasharray={r?'3 6':undefined}/><text x={left-9} y={top+(1-r)*plotHeight+4} textAnchor="end" fontSize="10" fill="var(--text-faint)">{compact.format(max*r)}</text></g>)}
          {area&&<motion.path d={area} fill={'url(#'+id+')'} initial={reducedMotion?false:{opacity:0}} animate={{opacity:1}} transition={{duration:.25}}/>}
          {points.length>1&&<motion.path d={path} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" initial={reducedMotion?false:{pathLength:0,opacity:0}} animate={{pathLength:1,opacity:1}} transition={{duration:reducedMotion?0:.55,ease:[.22,1,.36,1]}}/>}
          {selected!==null&&coords[index]&&<line x1={coords[index][0]} x2={coords[index][0]} y1={top} y2={height-bottom} stroke={color} strokeDasharray="3 4" opacity=".5"/>}
          {coords.map(([x,y],i)=><g key={i}>{i===index&&<circle cx={x} cy={y} r="11" fill={color} opacity=".14"/>}<circle data-chart-point="true" cx={x} cy={y} r={i===index?5:3.5} fill={i===best?'#eab308':color} stroke="var(--surface)" strokeWidth="2"/></g>)}
          {showPeakPin&&coords[best]&&<g transform={'translate('+Math.max(52,Math.min(width-52,coords[best][0]))+','+Math.max(22,coords[best][1]-14)+')'}><rect x="-45" y="-16" width="90" height="17" rx="8.5" fill="#eab308"/><text textAnchor="middle" y="-4" fill="#191400" fontSize="9" fontWeight="700">{peakLabel}</text></g>}
        </svg>
      </div>
      <div className="chart-footnote"><span>{points.length===1?'1 real run recorded':points.length+' runs · oldest → newest'}</span><span>Hover, touch, or use ← →</span></div>
    </>}
  </div>;
}
