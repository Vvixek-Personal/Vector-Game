// Static waves retain the soft backdrop without an idle animation loop.

export default function WavyBackground() {
  return (
    <div className="wavy-bg" aria-hidden="true">
      <svg
        className="wavy-wave wavy-wave-1"
        viewBox="0 0 1440 160"
        preserveAspectRatio="none"
      >
        <path
          d="M0,72 C180,120 360,24 540,64 C720,104 900,32 1080,64 C1260,96 1350,56 1440,72 L1440,160 L0,160 Z"
          fill="currentColor"
        />
      </svg>
      <svg
        className="wavy-wave wavy-wave-2"
        viewBox="0 0 1440 160"
        preserveAspectRatio="none"
      >
        <path
          d="M0,96 C220,48 420,128 640,88 C860,48 1060,120 1260,84 C1340,70 1390,80 1440,92 L1440,160 L0,160 Z"
          fill="currentColor"
        />
      </svg>
    </div>
  );
}
