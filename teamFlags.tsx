import React from 'react';

export interface TeamFlagMeta {
  code: string;
  name: string;
  svgPath: string;
}

export const OFFICIAL_TEAM_FLAGS: Record<string, TeamFlagMeta> = {
  IND: { code: 'IND', name: 'India', svgPath: '/flags/ind.svg' },
  AUS: { code: 'AUS', name: 'Australia', svgPath: '/flags/aus.svg' },
  ENG: { code: 'ENG', name: 'England', svgPath: '/flags/eng.svg' },
  SA: { code: 'SA', name: 'South Africa', svgPath: '/flags/sa.svg' },
  NZ: { code: 'NZ', name: 'New Zealand', svgPath: '/flags/nz.svg' },
  PAK: { code: 'PAK', name: 'Pakistan', svgPath: '/flags/pak.svg' },
  WI: { code: 'WI', name: 'West Indies', svgPath: '/flags/wi.svg' },
  SL: { code: 'SL', name: 'Sri Lanka', svgPath: '/flags/sl.svg' },
  AFG: { code: 'AFG', name: 'Afghanistan', svgPath: '/flags/afg.svg' },
  BAN: { code: 'BAN', name: 'Bangladesh', svgPath: '/flags/ban.svg' },
  IRE: { code: 'IRE', name: 'Ireland', svgPath: '/flags/ire.svg' },
  ZIM: { code: 'ZIM', name: 'Zimbabwe', svgPath: '/flags/zim.svg' },
  USA: { code: 'USA', name: 'United States', svgPath: '/flags/usa.svg' },
  UAE: { code: 'UAE', name: 'United Arab Emirates', svgPath: '/flags/uae.svg' },
  NED: { code: 'NED', name: 'Netherlands', svgPath: '/flags/ned.svg' },
  SCO: { code: 'SCO', name: 'Scotland', svgPath: '/flags/sco.svg' },
  NEP: { code: 'NEP', name: 'Nepal', svgPath: '/flags/nep.svg' },
  NAM: { code: 'NAM', name: 'Namibia', svgPath: '/flags/nam.svg' },
  OMA: { code: 'OMA', name: 'Oman', svgPath: '/flags/oma.svg' },
  CAN: { code: 'CAN', name: 'Canada', svgPath: '/flags/can.svg' },
  UGA: { code: 'UGA', name: 'Uganda', svgPath: '/flags/uga.svg' },
  PNG: { code: 'PNG', name: 'Papua New Guinea', svgPath: '/flags/png.svg' },
};

const ALIAS_TO_CANONICAL_CODE: Record<string, string> = {
  // India
  IN: 'IND',
  IND: 'IND',
  INDIA: 'IND',
  BCCI: 'IND',
  // Australia
  AU: 'AUS',
  AUS: 'AUS',
  AUSTRALIA: 'AUS',
  // England
  GB: 'ENG',
  'GB-ENG': 'ENG',
  ENG: 'ENG',
  ENGLAND: 'ENG',
  ECB: 'ENG',
  // South Africa
  ZA: 'SA',
  SA: 'SA',
  RSA: 'SA',
  'SOUTH AFRICA': 'SA',
  CSA: 'SA',
  // New Zealand
  NZ: 'NZ',
  NZL: 'NZ',
  'NEW ZEALAND': 'NZ',
  NZC: 'NZ',
  // Pakistan
  PK: 'PAK',
  PAK: 'PAK',
  PAKISTAN: 'PAK',
  PCB: 'PAK',
  // West Indies
  WI: 'WI',
  WIN: 'WI',
  BB: 'WI',
  BARBADOS: 'WI',
  WINDIES: 'WI',
  'WEST INDIES': 'WI',
  CWI: 'WI',
  // Sri Lanka
  LK: 'SL',
  SL: 'SL',
  SRI: 'SL',
  'SRI LANKA': 'SL',
  SLC: 'SL',
  // Afghanistan
  AF: 'AFG',
  AFG: 'AFG',
  AFGHANISTAN: 'AFG',
  ACB: 'AFG',
  // Bangladesh
  BD: 'BAN',
  BAN: 'BAN',
  BANGLADESH: 'BAN',
  BCB: 'BAN',
  // Ireland
  IE: 'IRE',
  IRE: 'IRE',
  IRELAND: 'IRE',
  // Zimbabwe
  ZW: 'ZIM',
  ZIM: 'ZIM',
  ZIMBABWE: 'ZIM',
  // Associate Nations
  US: 'USA',
  USA: 'USA',
  'UNITED STATES': 'USA',
  AE: 'UAE',
  UAE: 'UAE',
  'UNITED ARAB EMIRATES': 'UAE',
  NL: 'NED',
  NED: 'NED',
  NETHERLANDS: 'NED',
  'GB-SCT': 'SCO',
  SCO: 'SCO',
  SCOTLAND: 'SCO',
  NP: 'NEP',
  NEP: 'NEP',
  NEPAL: 'NEP',
  NA: 'NAM',
  NAM: 'NAM',
  NAMIBIA: 'NAM',
  OM: 'OMA',
  OMA: 'OMA',
  OMAN: 'OMA',
  CA: 'CAN',
  CAN: 'CAN',
  CANADA: 'CAN',
  UG: 'UGA',
  UGA: 'UGA',
  UGANDA: 'UGA',
  PG: 'PNG',
  PNG: 'PNG',
  'PAPUA NEW GUINEA': 'PNG',
  // Emoji Flag Aliases -> Canonical Official SVG Flag
  '🇮🇳': 'IND',
  '🇦🇺': 'AUS',
  '🏴󠁧󠁢󠁥󠁮󠁧󠁿': 'ENG',
  '🇬🇧': 'ENG',
  '🇿🇦': 'SA',
  '🇳🇿': 'NZ',
  '🇵🇰': 'PAK',
  '🇧🇧': 'WI',
  '🌴': 'WI',
  '🇱🇰': 'SL',
  '🇦🇫': 'AFG',
  '🇧🇩': 'BAN',
  '🇮🇪': 'IRE',
  '🇿🇼': 'ZIM',
  '🇺🇸': 'USA',
  '🇦🇪': 'UAE',
  '🇳🇱': 'NED',
  '🏴󠁧󠁢󠁳󠁣󠁴󠁿': 'SCO',
  '🇳🇵': 'NEP',
  '🇳🇦': 'NAM',
  '🇴🇲': 'OMA',
  '🇨🇦': 'CAN',
  '🇺🇬': 'UGA',
  '🇵🇬': 'PNG',
};

/**
 * Normalizes any team code, ISO country code, or country name (e.g., 'ind', 'AUS', 'ZA', 'West Indies')
 * into a canonical ICC team code ('IND', 'AUS', 'SA', 'WI', etc.).
 */
export function normalizeTeamCode(teamCodeOrName?: string): string {
  const raw = (teamCodeOrName || '').toUpperCase().trim();
  if (!raw) return 'IND';
  if (ALIAS_TO_CANONICAL_CODE[raw]) {
    return ALIAS_TO_CANONICAL_CODE[raw];
  }
  if (raw.includes('INDIA')) return 'IND';
  if (raw.includes('AUSTRALIA')) return 'AUS';
  if (raw.includes('ENGLAND')) return 'ENG';
  if (raw.includes('SOUTH AFRICA')) return 'SA';
  if (raw.includes('NEW ZEALAND')) return 'NZ';
  if (raw.includes('PAKISTAN')) return 'PAK';
  if (raw.includes('WEST INDIES') || raw.includes('WINDIES') || raw.includes('BARBADOS')) return 'WI';
  if (raw.includes('SRI LANKA')) return 'SL';
  if (raw.includes('AFGHANISTAN')) return 'AFG';
  if (raw.includes('BANGLADESH')) return 'BAN';
  if (raw.includes('IRELAND')) return 'IRE';
  if (raw.includes('ZIMBABWE')) return 'ZIM';
  if (raw.includes('EMIRATES') || raw.includes('UAE')) return 'UAE';
  if (raw.includes('UNITED STATES') || raw.includes('USA')) return 'USA';
  if (raw.includes('SCOTLAND')) return 'SCO';
  if (raw.includes('NETHERLANDS')) return 'NED';
  if (raw.includes('NEPAL')) return 'NEP';
  if (raw.includes('NAMIBIA')) return 'NAM';
  if (raw.includes('OMAN')) return 'OMA';
  if (raw.includes('CANADA')) return 'CAN';
  if (raw.includes('UGANDA')) return 'UGA';
  return OFFICIAL_TEAM_FLAGS[raw] ? raw : 'IND';
}

/**
 * Global utility function mapping team codes ('IND', 'AUS', 'ENG', 'SA', 'WI', etc.)
 * or full team names to official country flag SVG asset paths.
 */
export function getTeamFlagSvg(teamCodeOrName?: string): string {
  const canonical = normalizeTeamCode(teamCodeOrName);
  return OFFICIAL_TEAM_FLAGS[canonical]?.svgPath || '/flags/ind.svg';
}

/**
 * Returns the full accessible country/team display name for a given code.
 */
export function getTeamDisplayName(teamCodeOrName?: string): string {
  const canonical = normalizeTeamCode(teamCodeOrName);
  return OFFICIAL_TEAM_FLAGS[canonical]?.name || canonical;
}

export interface TeamFlagProps {
  code?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  title?: string;
}

const FLAG_SIZE_CLASSES: Record<NonNullable<TeamFlagProps['size']>, string> = {
  xs: 'w-4 h-3',
  sm: 'w-5 h-3.5',
  md: 'w-6 h-4',
  lg: 'w-8 h-6',
  xl: 'w-11 h-8',
};

const FLAG_PIXEL_SIZES: Record<NonNullable<TeamFlagProps['size']>, { width: number; height: number }> = {
  xs: { width: 16, height: 12 },
  sm: { width: 20, height: 14 },
  md: { width: 24, height: 16 },
  lg: { width: 32, height: 24 },
  xl: { width: 44, height: 32 },
};

/**
 * Renders an official country flag SVG asset for any team code or country name,
 * cleanly replacing raw text labels like 'IND' or 'AUS' across scoreboards and headers.
 */
export const TeamFlag: React.FC<TeamFlagProps> = ({
  code = 'IND',
  size = 'sm',
  className = '',
  title,
}) => {
  const canonical = normalizeTeamCode(code);
  const svgSrc = getTeamFlagSvg(canonical);
  const countryName = getTeamDisplayName(canonical);
  const px = FLAG_PIXEL_SIZES[size];

  return (
    <span
      className={`inline-flex overflow-hidden rounded-[3px] border border-white/20 shadow-xs shrink-0 align-middle ${FLAG_SIZE_CLASSES[size]} ${className}`}
      title={title || countryName}
      role="img"
      aria-label={`${countryName} flag`}
    >
      <img
        src={svgSrc}
        alt={`${countryName} flag`}
        width={px.width}
        height={px.height}
        className="w-full h-full object-cover block"
        loading="eager"
        decoding="async"
      />
    </span>
  );
};
