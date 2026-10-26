import { useId } from "react";

/**
 * The glossy white "COVO" bubble-letter mark — the actual app logo (not a
 * text wordmark). Originally inline in Splash.tsx; extracted so every
 * surface that needs the real logo (the Build It loading screen included)
 * renders the identical graphic rather than a typeset approximation of it.
 *
 * Gradient/filter ids are suffixed with a per-instance id so two copies on
 * the same page (unlikely today, but possible) don't collide.
 */
const CovoWordmark = ({ style }: { style?: React.CSSProperties }) => {
  const uid = useId().replace(/:/g, "");
  const gloss = `covo-gloss-${uid}`;
  const soft = `covo-soft-${uid}`;
  const glareBlur = `covo-glare-${uid}`;

  return (
    <svg
      viewBox="0 0 880 430"
      style={{ width: "100%", maxWidth: 500, height: "auto", ...style }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <radialGradient id={gloss} cx="32%" cy="22%" r="85%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="40%" stopColor="#ffffff" />
          <stop offset="75%" stopColor="#eef1f9" />
          <stop offset="100%" stopColor="#c7cfe3" />
        </radialGradient>
        <filter id={soft} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" />
        </filter>
        <filter id={glareBlur} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
      </defs>
      <g transform="translate(60,60)">
        <g transform="translate(5,12)" opacity="0.5" filter={`url(#${soft})`}>
          <path d="M 168.94 207.87 A 90 90 0 1 1 130.78 65.4" fill="none" stroke="#061a63" strokeWidth="108" strokeLinecap="round" />
          <circle cx="290" cy="150" r="90" fill="none" stroke="#061a63" strokeWidth="108" />
          <path d="M 386 74 L 464 272 L 560 56" fill="none" stroke="#061a63" strokeWidth="108" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="650" cy="150" r="90" fill="none" stroke="#061a63" strokeWidth="108" />
        </g>
        <path d="M 168.94 207.87 A 90 90 0 1 1 130.78 65.4" fill="none" stroke={`url(#${gloss})`} strokeWidth="104" strokeLinecap="round" />
        <circle cx="290" cy="150" r="90" fill="none" stroke={`url(#${gloss})`} strokeWidth="104" />
        <path d="M 386 74 L 464 272 L 560 56" fill="none" stroke={`url(#${gloss})`} strokeWidth="104" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="650" cy="150" r="90" fill="none" stroke={`url(#${gloss})`} strokeWidth="104" />
        <circle cx="290" cy="150" r="35" fill="#1c5bf7" opacity="0.9" />
        <circle cx="650" cy="150" r="35" fill="#1c5bf7" opacity="0.9" />
        <ellipse cx="80" cy="87" rx="28" ry="12" fill="#ffffff" opacity="0.95" transform="rotate(-35 80 87)" filter={`url(#${glareBlur})`} />
        <ellipse cx="262" cy="93" rx="20" ry="9" fill="#ffffff" opacity="0.8" transform="rotate(-35 262 93)" filter={`url(#${glareBlur})`} />
        <ellipse cx="415" cy="80" rx="20" ry="9" fill="#ffffff" opacity="0.8" transform="rotate(-30 415 80)" filter={`url(#${glareBlur})`} />
        <ellipse cx="622" cy="93" rx="20" ry="9" fill="#ffffff" opacity="0.8" transform="rotate(-35 622 93)" filter={`url(#${glareBlur})`} />
      </g>
    </svg>
  );
};

export default CovoWordmark;
