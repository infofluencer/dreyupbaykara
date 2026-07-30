import { useId, type ReactElement, type ReactNode } from "react";
import type { TreatmentId } from "./treatments";

interface IllustrationProps {
  accent: string;
  className?: string;
}

function Frame({
  accent,
  className,
  children,
}: IllustrationProps & { children: ReactNode }) {
  const uid = useId().replace(/:/g, "");
  const gradientId = `tg-${uid}`;

  return (
    <svg
      viewBox="0 0 120 88"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={accent} stopOpacity="0.18" />
          <stop offset="100%" stopColor={accent} stopOpacity="0.05" />
        </linearGradient>
      </defs>
      <rect width="120" height="88" rx="14" fill={`url(#${gradientId})`} />
      {children}
    </svg>
  );
}

function BelFitigi({ accent, className }: IllustrationProps) {
  return (
    <Frame accent={accent} className={className}>
      <ellipse cx="60" cy="44" rx="18" ry="28" stroke={accent} strokeWidth="2.2" fill="white" fillOpacity="0.55" />
      <path d="M48 38c6-4 18-4 24 0" stroke={accent} strokeWidth="2" strokeLinecap="round" />
      <path d="M48 50c6 4 18 4 24 0" stroke={accent} strokeWidth="2" strokeLinecap="round" />
      <circle cx="72" cy="44" r="7" fill={accent} fillOpacity="0.85" />
      <circle cx="72" cy="44" r="3.2" fill="white" />
    </Frame>
  );
}

function BeyinKanamasi({ accent, className }: IllustrationProps) {
  return (
    <Frame accent={accent} className={className}>
      <path
        d="M42 52c0-16 10-26 22-26s18 8 18 20c0 8-4 14-10 18-4 2.5-8 4-12 4s-10-2-14-6c-2.5-2.5-4-6-4-10z"
        stroke={accent}
        strokeWidth="2.2"
        fill="white"
        fillOpacity="0.55"
      />
      <path d="M54 40c4-6 14-8 20-2" stroke={accent} strokeWidth="1.6" strokeLinecap="round" opacity="0.7" />
      <circle cx="68" cy="48" r="6" fill={accent} fillOpacity="0.9" />
      <path d="M68 42v12M62 48h12" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
    </Frame>
  );
}

function BeyinTumoru({ accent, className }: IllustrationProps) {
  return (
    <Frame accent={accent} className={className}>
      <path
        d="M40 50c2-18 14-28 28-28 12 0 22 8 22 22 0 10-5 18-14 22-6 3-12 4-18 2-8-2-14-8-18-18z"
        stroke={accent}
        strokeWidth="2.2"
        fill="white"
        fillOpacity="0.55"
      />
      <circle cx="62" cy="46" r="9" fill={accent} fillOpacity="0.25" stroke={accent} strokeWidth="1.8" />
      <circle cx="62" cy="46" r="4" fill={accent} />
    </Frame>
  );
}

function Parkinson({ accent, className }: IllustrationProps) {
  return (
    <Frame accent={accent} className={className}>
      <rect x="52" y="22" width="16" height="28" rx="8" stroke={accent} strokeWidth="2.2" fill="white" fillOpacity="0.55" />
      <circle cx="60" cy="30" r="3.5" fill={accent} />
      <path d="M60 36v22" stroke={accent} strokeWidth="2" strokeLinecap="round" />
      <path d="M52 58h16" stroke={accent} strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="48" cy="62" r="4" fill={accent} fillOpacity="0.35" stroke={accent} strokeWidth="1.5" />
      <circle cx="72" cy="62" r="4" fill={accent} fillOpacity="0.35" stroke={accent} strokeWidth="1.5" />
      <path d="M48 62h24" stroke={accent} strokeWidth="1.5" strokeDasharray="2 2" />
    </Frame>
  );
}

function BoyunFitigi({ accent, className }: IllustrationProps) {
  return (
    <Frame accent={accent} className={className}>
      <path d="M60 18c8 4 12 12 12 22s-4 18-12 22c-8-4-12-12-12-22s4-18 12-22z" stroke={accent} strokeWidth="2.2" fill="white" fillOpacity="0.55" />
      <ellipse cx="60" cy="30" rx="7" ry="3.5" stroke={accent} strokeWidth="1.6" />
      <ellipse cx="60" cy="40" rx="7" ry="3.5" fill={accent} fillOpacity="0.85" />
      <ellipse cx="60" cy="50" rx="7" ry="3.5" stroke={accent} strokeWidth="1.6" />
    </Frame>
  );
}

function OmurgaTumorleri({ accent, className }: IllustrationProps) {
  return (
    <Frame accent={accent} className={className}>
      <path d="M60 16v56" stroke={accent} strokeWidth="2" strokeLinecap="round" opacity="0.45" />
      {[24, 36, 48, 60].map((y) => (
        <rect
          key={y}
          x="50"
          y={y}
          width="20"
          height="8"
          rx="2.5"
          stroke={accent}
          strokeWidth="1.7"
          fill="white"
          fillOpacity="0.55"
        />
      ))}
      <circle cx="74" cy="40" r="8" fill={accent} fillOpacity="0.2" stroke={accent} strokeWidth="1.8" />
      <circle cx="74" cy="40" r="3.5" fill={accent} />
    </Frame>
  );
}

function KanalDarligi({ accent, className }: IllustrationProps) {
  return (
    <Frame accent={accent} className={className}>
      <ellipse cx="60" cy="44" rx="26" ry="18" stroke={accent} strokeWidth="2.2" fill="white" fillOpacity="0.5" />
      <ellipse cx="60" cy="44" rx="10" ry="7" fill={accent} fillOpacity="0.2" stroke={accent} strokeWidth="1.8" />
      <path d="M50 44h20" stroke={accent} strokeWidth="2.4" strokeLinecap="round" />
      <path d="M54 38l12 12M66 38L54 50" stroke={accent} strokeWidth="1.6" strokeLinecap="round" opacity="0.7" />
    </Frame>
  );
}

function Skolyoz({ accent, className }: IllustrationProps) {
  return (
    <Frame accent={accent} className={className}>
      <path
        d="M58 18c8 8 4 16-2 24s-8 14 0 22 10 12 6 18"
        stroke={accent}
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M52 18c4 6 2 14-2 20s-4 12 2 20 8 12 4 18"
        stroke={accent}
        strokeWidth="1.6"
        strokeLinecap="round"
        opacity="0.4"
        fill="none"
      />
      <circle cx="58" cy="18" r="3" fill={accent} />
      <circle cx="62" cy="82" r="0" />
    </Frame>
  );
}

function Kifoz({ accent, className }: IllustrationProps) {
  return (
    <Frame accent={accent} className={className}>
      <path
        d="M38 70c8-4 14-20 18-34 4-14 10-24 20-28"
        stroke={accent}
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M44 70c6-4 10-16 14-28 3-12 8-22 16-26"
        stroke={accent}
        strokeWidth="1.6"
        strokeLinecap="round"
        opacity="0.4"
        fill="none"
      />
      <circle cx="76" cy="18" r="3" fill={accent} />
      <circle cx="38" cy="70" r="3" fill={accent} fillOpacity="0.5" />
    </Frame>
  );
}

const ILLUSTRATIONS: Record<
  TreatmentId,
  (props: IllustrationProps) => ReactElement
> = {
  "bel-fitigi": BelFitigi,
  "beyin-kanamasi": BeyinKanamasi,
  "beyin-tumoru": BeyinTumoru,
  parkinson: Parkinson,
  "boyun-fitigi": BoyunFitigi,
  "omurga-tumorleri": OmurgaTumorleri,
  "kanal-darligi": KanalDarligi,
  skolyoz: Skolyoz,
  kifoz: Kifoz,
};

export function TreatmentIllustration({
  id,
  accent,
  className,
  image,
  fill,
}: {
  id: TreatmentId;
  accent: string;
  className?: string;
  image?: string;
  /** Kartın sol/sağ paneli gibi sabit yükseklikte doldurmak için */
  fill?: boolean;
}) {
  if (image) {
    return (
      <div
        className={`relative overflow-hidden bg-[#0d1219] ${fill ? "h-full w-full" : "rounded-xl"} ${className ?? ""}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={image}
          alt=""
          className={
            fill
              ? "absolute inset-0 h-full w-full object-cover"
              : "aspect-[120/88] h-auto w-full object-cover"
          }
          loading="lazy"
          decoding="async"
        />
      </div>
    );
  }

  const Comp = ILLUSTRATIONS[id];
  return <Comp accent={accent} className={className} />;
}
