import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Activity, Trophy, Target, Zap, ArrowUpRight, TrendingUp, Sparkles, Gem } from 'lucide-react';
import { MODE_ORDER, MODES } from '../../game/types';
import { loadScores, type Stats, type RunSnap } from '../../game/storage';
import { compareSamples, formatDuration, metricValue, selectRuns, summarizeRuns, type AnalyticsMetric } from '../../game/analytics';
import CurvedGraph, { type GraphPoint } from '../CurvedGraph';

interface Props { stats: Stats; reducedMotion?: boolean; }
const METRICS: { id: AnalyticsMetric; label: string; name: string; unit: string; color: string; max?: number; lower?: boolean }[] = [
  {id:'score',label:'Score',name:'Score',unit:' pts',color:'var(--brand)'},
  {id:'accuracy',label:'Accuracy',name:'Accuracy',unit:'%',color:'#10b981',max:100},
  {id:'reaction',label:'Reaction',name:'Reaction time',unit:' ms',color:'#a78bfa',lower:true},
  {id:'streak',label:'Streak',name:'Streak',unit:'',color:'#f472b6'},
  {id:'sparks',label:'Sparks',name:'Sparks earned',unit:'',color:'#eab308'},
];
const number=(n:number|null,decimals=0)=>n===null?'—':n.toLocaleString(undefined,{maximumFractionDigits:decimals});
function useCount(to:number,reduced:boolean) {
  const [value,setValue]=useState(reduced?to:0); const previous=useRef(value);
  useEffect(()=> {
    if(reduced) { setValue(to); previous.current=to; return; }
    const from=previous.current,start=performance.now();let frame=0;
    const tick=(now:number)=> {const t=Math.min(1,(now-start)/420);const next=from+(to-from)*(1-(1-t)**3);setValue(next);previous.current=next;if(t<1)frame=requestAnimationFrame(tick);};
    frame=requestAnimationFrame(tick);return ()=>cancelAnimationFrame(frame);
  },[to,reduced]);
  return value;
}
function dateFor(run:RunSnap) { return Number.isFinite(run.createdAt)?new Date(run.createdAt).toLocaleString(undefined,{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}):run.date; }
export default function StatsScreen({stats,reducedMotion=false}:Props) {
  const systemReduced=useReducedMotion(); const reduced=reducedMotion||!!systemReduced;
  const [mode,setMode]=useState('all'),[limit,setLimit]=useState(10),[rules,setRules]=useState('all'),[metric,setMetric]=useState<AnalyticsMetric>('score');
  const history=stats.history??[];
  const selection=useMemo(()=>selectRuns(history,mode,limit,rules),[history,mode,limit,rules]);
  const summary=useMemo(()=>summarizeRuns(selection.current),[selection]);
  const spec=METRICS.find(m=>m.id===metric);
  const change=compareSamples(selection.current,selection.previous,metric);
  const attempts=stats.hits+stats.misses;
  const accuracy=attempts?stats.hits/attempts*100:null;
  const reaction=stats.reactionCount?stats.reactionTotal/stats.reactionCount:null;
  const animatedRuns=useCount(stats.runs,reduced),animatedScore=useCount(stats.totalScore,reduced);
  const graph:GraphPoint[]=selection.current.slice().reverse().flatMap(run=> {
    const value=metricValue(run,metric);
    return value===null?[]:[{value,label:'Run #'+(run.runNumber??Math.max(1,stats.runs-history.indexOf(run))),mode:MODES[run.mode]?.label??run.mode,date:dateFor(run)}];
  });
  const rows=MODE_ORDER.filter(m=>m!=='practice').map(m=>({id:m,...MODES[m],runs:stats.modeRuns?.[m]??0,best:loadScores(m)[0]?.score??0}));
  const maxRuns=Math.max(1,...rows.map(r=>r.runs));
  const enter=reduced?false:{opacity:0,y:10};
  return <div className="stats-page analytics-page">
    <header className="home-header analytics-heading">
      <div><span className="analytics-eyebrow">YOUR PERFORMANCE</span><h2 className="stats-title">Find your flow.</h2><p>Real results. Clear progress. Practice stays separate.</p></div>
    </header>
    <div className="stats-hero-grid">
      {[{label:'Scored runs',value:Math.round(animatedRuns).toLocaleString(),note:'Lifetime',icon:Activity,color:'var(--brand)'},
        {label:'Total score',value:Math.round(animatedScore).toLocaleString(),note:'Lifetime points',icon:Trophy,color:'#a78bfa'},
        {label:'Accuracy',value:accuracy===null?'—':number(accuracy,1)+'%',note:'All hits ÷ attempts',icon:Target,color:'#10b981'},
        {label:'Reaction',value:reaction===null?'—':number(reaction)+' ms',note:'Successful hits · lower is faster',icon:Zap,color:'#f59e0b'}
      ].map((card,i)=><motion.div key={card.label} className="stats-kpi glass" initial={enter} animate={{opacity:1,y:0}} transition={{duration:reduced?0:.28,delay:reduced?0:i*.035}} whileHover={reduced?undefined:{y:-2}}><div className="analytics-kpi-label"><span>{card.label}</span><card.icon size={17} style={{color:card.color}}/></div><strong>{card.value}</strong><small>{card.note}</small></motion.div>)}
    </div>
    <section className="stats-panel glass analytics-chart-panel" aria-label="Performance analysis">
      <div className="analytics-section-title"><div><span className="analytics-eyebrow">LOOK CLOSER</span><h3>Every run tells a story.</h3></div><span className="analytics-sample-count">{selection.current.length} of {selection.available} matching runs</span></div>
      <div className="analytics-controls">
        <label>Game mode<select aria-label="Analytics game mode" value={mode} onChange={e=>setMode(e.target.value)}><option value="all">All scored modes</option>{MODE_ORDER.filter(m=>m!=='practice').map(m=><option key={m} value={m}>{MODES[m].label}</option>)}</select></label>
        <label>Run range<select aria-label="Analytics run range" value={limit} onChange={e=>setLimit(Number(e.target.value))}>{[5,10,25,100].map(n=><option key={n} value={n}>{n===100?'All recorded (up to 100)':'Last '+n+' runs'}</option>)}</select></label>
        <label>Rules<select aria-label="Analytics rules" value={rules} onChange={e=>setRules(e.target.value)}><option value="all">All rules</option><option value="standard">Standard · 1×</option><option value="modified">With modifiers</option></select></label>
      </div>
      <div className="analytics-metric-tabs" role="group" aria-label="Chart metric">{METRICS.map(m=><button key={m.id} aria-pressed={metric===m.id} className={metric===m.id?'active':''} onClick={()=>setMetric(m.id)}><i style={{background:m.color}}/>{m.label}</button>)}</div>
      <CurvedGraph key={metric+'-'+mode+'-'+limit+'-'+rules} data={graph} metricName={spec.name} unit={spec.unit} color={spec.color} domainMax={spec.max} lowerIsBetter={spec.lower} peakLabel={spec.lower?'Fastest run':'Best run'} reducedMotion={reduced}/>
      <p className="analytics-context">{metric==='reaction'?'Only runs with measured reaction times appear. Lower is faster.':mode==='all'?'Choose one mode to compare scores under similar rules.':'Showing '+MODES[mode].label+' results in play order.'} {rules!=='all'?'Older runs without rule details are excluded.':''}</p>
      <div className="analytics-comparison" role="status">
        <TrendingUp size={17}/>{change===null?<span>{limit === 100 ? "Showing all retained runs. Choose a smaller range to compare recent samples." : `Complete two equal groups of ${limit} matching runs for a comparison.`}</span>:<span><strong>{Math.abs(change).toFixed(1)}% {change===0?'unchanged':metric==='reaction'?(change>0?'faster':'slower'):(change>0?'higher':'lower')}</strong> {spec.name.toLowerCase()} average vs the previous {selection.previous.length} matching runs.</span>}
      </div>
    </section>
    <div className="analytics-sample-grid">
      {[['Mean score',number(summary.averageScore),'Points per selected run'],['Mean run accuracy',summary.meanAccuracy===null?'—':number(summary.meanAccuracy,1)+'%','Each run has equal weight'],['Average reaction',summary.reactionMs===null?'—':number(summary.reactionMs)+' ms',summary.reactionRuns+' runs with measured timing'],['Points per minute',number(summary.scorePerMinute,1),'Uses runs with recorded duration']].map(([label,value,note])=><div className="analytics-mini-card" key={label}><span>{label}</span><strong>{value}</strong><small>{note}</small></div>)}
    </div>
    <div className="analytics-detail-grid">
      <section className="stats-panel glass"><div className="analytics-section-title"><h3>Precision & pace</h3><Target size={18}/></div><dl className="analytics-facts">
        <div><dt>Hits / misses · lifetime</dt><dd>{stats.hits.toLocaleString()} / {stats.misses.toLocaleString()}</dd></div>
        <div><dt>Best streak · selected runs</dt><dd>{number(summary.bestStreak)}</dd></div>
        <div><dt>Perfect hits · measured runs</dt><dd>{summary.perfectRate===null?'—':number(summary.perfectRate,1)+'%'}</dd></div>
        <div><dt>Fastest correct response · lifetime</dt><dd>{stats.fastestMs>0&&stats.fastestMs<9999?Math.round(stats.fastestMs)+' ms':'—'}</dd></div>
        <div><dt>Active play · lifetime</dt><dd>{formatDuration(stats.playSeconds)}</dd></div>
      </dl><p className="analytics-context">Perfect hits include Lightning and Perfect responses under 340 ms. Missing older measurements appear as —.</p></section>
      <section className="stats-panel glass"><div className="analytics-section-title"><h3>Runs by mode</h3><Activity size={18}/></div>{rows.filter(r=>r.runs>0).length?rows.filter(r=>r.runs>0).map(r=><div className="stat-bar" key={r.id}><div className="stat-bar-head"><span>{r.label}</span><strong>{r.runs} runs · best {r.best.toLocaleString()}</strong></div><div className="stat-bar-track"><motion.div className="stat-bar-fill" style={{background:r.color}} initial={reduced?false:{width:0}} animate={{width:r.runs/maxRuns*100+'%'}} transition={{duration:reduced?0:.45}}/></div></div>):<p className="analytics-context">Your mode breakdown appears after a scored run.</p>}<p className="analytics-context">Daily and weekly personal bests refer to the current UTC challenge period.</p></section>
    </div>
    <section className="stats-panel glass"><div className="analytics-section-title"><div><span className="analytics-eyebrow">THE DETAILS</span><h3>Recent runs</h3></div><span className="analytics-sample-count">Selected filters · newest first</span></div>
      {!selection.current.length?<p className="analytics-context">No recorded runs match these filters yet.</p>:<div className="analytics-table-scroll" tabIndex={0} role="region" aria-label="Recent run details"><table className="analytics-table"><caption className="sr-only">Recent scored runs with accuracy, reaction time, duration, and points.</caption><thead><tr><th>Run / mode</th><th>Score</th><th>Accuracy</th><th>Reaction</th><th>Duration</th></tr></thead><tbody>{selection.current.map((r,i)=><tr key={r.id??i}><td><strong>{MODES[r.mode]?.label??r.mode}</strong><small>{dateFor(r)}{r.modifierMultiplier>1?' · '+r.modifierMultiplier+'×':''}</small></td><td>{r.score.toLocaleString()}</td><td>{metricValue(r,'accuracy')===null?'—':number(metricValue(r,'accuracy'),1)+'%'}</td><td>{metricValue(r,'reaction')===null?'—':number(metricValue(r,'reaction'))+' ms'}</td><td>{formatDuration(r.playSeconds)}</td></tr>)}</tbody></table></div>}
    </section>
    <div className="analytics-wallet"><span><Sparkles size={15}/>{(stats.sparks??0).toLocaleString()} Sparks</span><span><Gem size={15}/>{(stats.diamonds??0).toLocaleString()} Diamonds</span><small>Charts retain your latest 100 scored runs. Lifetime totals keep accumulating.</small></div>
  </div>;
}
