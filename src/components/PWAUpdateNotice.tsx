import { useRegisterSW } from 'virtual:pwa-register/react';
export default function PWAUpdateNotice() {
  const { needRefresh: [needRefresh, setNeedRefresh], updateServiceWorker } = useRegisterSW();
  if (!needRefresh) return null;
  return <div role="status" className="fixed bottom-24 left-1/2 z-[220] w-[min(90vw,360px)] -translate-x-1/2 rounded-2xl border border-white/20 bg-slate-900 p-4 text-sm text-white shadow-xl">
    <p>A game update is ready. Refresh when you are ready.</p>
    <div className="mt-3 flex gap-3"><button className="text-button" onClick={() => { void updateServiceWorker(true).catch(() => setNeedRefresh(false)); }}>Refresh</button><button className="text-button" onClick={() => setNeedRefresh(false)}>Later</button></div>
  </div>;
}
