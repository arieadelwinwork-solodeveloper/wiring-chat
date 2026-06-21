import './SkyBackground.css';

function CloudSvg({ className, style }) {
  return (
    <svg
      className={className}
      style={style}
      viewBox="0 0 240 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <ellipse cx="60" cy="50" rx="52" ry="28" fill="white" />
      <ellipse cx="110" cy="42" rx="44" ry="26" fill="white" />
      <ellipse cx="160" cy="48" rx="56" ry="30" fill="white" />
      <ellipse cx="200" cy="54" rx="38" ry="22" fill="white" />
    </svg>
  );
}

const BACK_CLOUDS = [
  { top: '8%', delay: '-20s' },
  { top: '22%', delay: '-55s' },
  { top: '38%', delay: '-90s' },
  { top: '54%', delay: '-10s' },
  { top: '68%', delay: '-75s' },
];

const MID_CLOUDS = [
  { top: '14%', delay: '-12s' },
  { top: '31%', delay: '-48s' },
  { top: '47%', delay: '-32s' },
  { top: '58%', delay: '-65s' },
  { top: '76%', delay: '-5s' },
];

const FRONT_CLOUDS = [
  { top: '18%', delay: '-8s' },
  { top: '42%', delay: '-28s' },
  { top: '63%', delay: '-18s' },
  { top: '82%', delay: '-36s' },
];

export default function SkyBackground() {
  return (
    <div className="sky-bg" aria-hidden>
      <div className="sky-bg__gradient" />

      <div className="sky-bg__layer sky-bg__layer--back">
        {BACK_CLOUDS.map((cloud, index) => (
          <CloudSvg
            key={`back-${index}`}
            className="sky-bg__cloud"
            style={{ top: cloud.top, animationDelay: cloud.delay }}
          />
        ))}
      </div>

      <div className="sky-bg__layer sky-bg__layer--mid">
        {MID_CLOUDS.map((cloud, index) => (
          <CloudSvg
            key={`mid-${index}`}
            className="sky-bg__cloud"
            style={{ top: cloud.top, animationDelay: cloud.delay }}
          />
        ))}
      </div>

      <div className="sky-bg__layer sky-bg__layer--front">
        {FRONT_CLOUDS.map((cloud, index) => (
          <CloudSvg
            key={`front-${index}`}
            className="sky-bg__cloud"
            style={{ top: cloud.top, animationDelay: cloud.delay }}
          />
        ))}
      </div>
    </div>
  );
}
