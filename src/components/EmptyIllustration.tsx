import type { ReactElement } from 'react';

function EmptySkylineShapes(): ReactElement {
  return (
    <>
      <circle cx="110" cy="64" r="52" className="fill-teal-50 dark:fill-teal-950/60" />
      <rect
        x="48"
        y="62"
        width="24"
        height="38"
        rx="3"
        className="fill-slate-200 dark:fill-slate-800"
      />
      <rect
        x="78"
        y="46"
        width="30"
        height="54"
        rx="3"
        className="fill-teal-200/80 dark:fill-teal-900/70"
      />
      <rect
        x="114"
        y="56"
        width="26"
        height="44"
        rx="3"
        className="fill-slate-200 dark:fill-slate-800"
      />
      <path
        d="M148 92c0-15 11-26 26-26 0 15-11 26-26 26Z"
        className="fill-emerald-200 dark:fill-emerald-800/70"
      />
      <path
        d="M148 92l12-12"
        className="stroke-emerald-700 dark:stroke-emerald-300"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </>
  );
}

/**
 * Calm inline SVG illustration for the empty state before a plan is generated.
 */
export function EmptyIllustration(): ReactElement {
  return (
    <svg
      viewBox="0 0 220 130"
      fill="none"
      aria-hidden="true"
      className="mx-auto h-32 w-56 text-teal-600 dark:text-teal-400"
    >
      <EmptySkylineShapes />
      <path
        d="M36 42c16 0 24-10 38-10 10 0 16 6 16 12s-6 10-14 10H44"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <path
        d="M126 32h24c8 0 13 4.5 13 10s-5 9-11 9h-18"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeOpacity="0.65"
      />
      <line
        x1="34"
        y1="100"
        x2="186"
        y2="100"
        className="stroke-slate-300 dark:stroke-slate-700"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
