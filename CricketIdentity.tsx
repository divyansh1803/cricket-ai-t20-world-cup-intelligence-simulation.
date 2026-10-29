import React from 'react';
import { validatePlayerIdentity } from '../../data/imageRegistry';
import { getPlayerPhotoUrl, resolvePlayerImageUrl, toSafeAssetUrl } from '../../data/playerImageCatalog';
import {
  getTeamFlagSvg,
  getTeamDisplayName,
  normalizeTeamCode,
  TeamFlag,
  OFFICIAL_TEAM_FLAGS,
} from '../../utils/teamFlags';

export { getTeamFlagSvg, getTeamDisplayName, normalizeTeamCode, TeamFlag, OFFICIAL_TEAM_FLAGS };

interface FlagProps {
  countryCode?: string; // 'IN', 'IND', 'AU', 'AUS', 'ZA', 'SA', 'GB-ENG', 'ENG', 'NZ', 'PK', 'PAK', 'AF', 'AFG', 'WI', etc.
  code?: string;
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

export const HIGH_RES_FLAG_URLS: Record<string, string> = Object.fromEntries(
  Object.entries(OFFICIAL_TEAM_FLAGS).map(([code, meta]) => [code, meta.svgPath])
);

/**
 * Maps standardized team ISO / ICC codes or country names (e.g. 'IND', 'AUS', 'ENG', 'SA', 'WI')
 * to official local country flag SVG assets.
 */
export function getTeamFlagUrl(isoCode: string): string {
  return getTeamFlagSvg(isoCode);
}

export const CountryFlag: React.FC<FlagProps> = ({
  countryCode,
  code: fallbackCode,
  className = '',
  size = 'md',
}) => {
  const rawCode = countryCode || fallbackCode || 'IND';
  const canonical = normalizeTeamCode(rawCode);
  const countryName = getTeamDisplayName(canonical);
  const flagSvgUrl = getTeamFlagSvg(canonical);

  const dimensions = {
    xs: 'w-4 h-3',
    sm: 'w-5 h-3.5',
    md: 'w-6 h-4',
    lg: 'w-8 h-6',
    xl: 'w-11 h-8',
  }[size];

  const px = {
    xs: { width: 16, height: 12 },
    sm: { width: 20, height: 14 },
    md: { width: 24, height: 16 },
    lg: { width: 32, height: 24 },
    xl: { width: 44, height: 32 },
  }[size];

  return (
    <span
      className={`inline-flex overflow-hidden rounded-[3px] border border-white/20 shadow-xs shrink-0 align-middle ${dimensions} ${className}`}
      title={countryName}
      role="img"
      aria-label={`${countryName} national flag`}
    >
      <img
        src={flagSvgUrl}
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

interface TeamCrestProps {
  teamId: string;
  className?: string;
  size?: number;
}

export function getRealTeamLogoUrl(teamIdOrName: string): string {
  const t = (teamIdOrName || '').toLowerCase().trim();
  if (t === 'ind' || t === 'in' || t === 'india' || t === 'bcci') return '/assets/aistudio/bcci_7df8621c.png';
  if (t === 'aus' || t === 'au' || t === 'australia') return '/assets/aistudio/CRICKET_AUSTRALIA_b67dd7b5.jpg';
  if (t === 'eng' || t === 'gb-eng' || t === 'gb' || t === 'england') return '/assets/aistudio/England_Cricket_985e4463.jpg';
  if (t === 'sa' || t === 'za' || t === 'rsa' || t === 'south africa') return '/assets/aistudio/south_africa_cricket_d448bbea.png';
  if (t === 'pak' || t === 'pk' || t === 'pakistan') return '/assets/aistudio/PCB_b171eeee.webp';
  if (t === 'nz' || t === 'nzl' || t === 'new zealand') return '/assets/aistudio/New_zelaand_cricket_5cbf986e.webp';
  if (t === 'afg' || t === 'af' || t === 'afghanistan') return '/assets/aistudio/Afghanistan_Cricket_Board_a5973908.png';
  if (t === 'sl' || t === 'lk' || t === 'sri' || t === 'sri lanka') return '/assets/aistudio/Sri_LANKA_CRICKET_BOARD_c7fb001b.webp';
  if (t === 'ban' || t === 'bd' || t === 'bangladesh') return '/assets/aistudio/BCB_eb487bee.webp';
  if (t === 'wi' || t === 'west indies' || t === 'windies') return '/logos/wi.svg';
  if (t === 'ire' || t === 'ie' || t === 'ireland' || t === 'cricket ireland') return '/logos/cricket_ireland.webp';
  if (t === 'zim' || t === 'zw' || t === 'zimbabwe' || t === 'zimbabwe cricket') return '/logos/zimbabwe_cricket.webp';
  return `/logos/${t}.svg`;
}

export const TeamCrest: React.FC<TeamCrestProps> = ({ teamId, className = '', size = 28 }) => {
  const [imgError, setImgError] = React.useState(false);
  const logoUrl = getRealTeamLogoUrl(teamId);
  const teamLabel = getTeamDisplayName(teamId);

  return (
    <div
      className={`inline-flex items-center justify-center shrink-0 ${className}`}
      style={{ width: size, height: size }}
      title={`${teamLabel} official board crest`}
    >
      <img
        src={imgError ? getTeamFlagSvg(teamId) : logoUrl}
        alt={`${teamLabel} official crest`}
        className="w-full h-full object-contain drop-shadow-[0_2px_8px_rgba(0,0,0,0.55)]"
        onError={() => {
          if (!imgError) setImgError(true);
        }}
      />
    </div>
  );
};

interface PlayerCardAvatarProps {
  playerId: string;
  name: string;
  countryCode: string;
  jerseyNumber?: number;
  imageUrl?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const PlayerCardAvatar: React.FC<PlayerCardAvatarProps> = ({
  playerId,
  name,
  countryCode,
  jerseyNumber = 18,
  imageUrl: directImageUrl,
  size = 'md',
  className = '',
}) => {
  const verified = validatePlayerIdentity(playerId);

  const sizeStyles = {
    sm: 'h-10 w-10 text-xs',
    md: 'h-14 w-14 text-sm',
    lg: 'h-20 w-20 text-base',
    xl: 'h-28 w-28 text-xl',
  }[size];

  const primaryColor = verified?.teamColor || '#0078FF';
  const accentColor = verified?.teamAccent || '#FF9933';
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('');

  const computeBestSrc = React.useCallback(() => {
    const resolved = resolvePlayerImageUrl({
      id: playerId,
      name,
      imageUrl: directImageUrl || verified?.imageUrl,
    });
    return resolved || getPlayerPhotoUrl(playerId, name) || `/players/${playerId}.svg`;
  }, [playerId, name, directImageUrl, verified?.imageUrl]);

  const [currentSrc, setCurrentSrc] = React.useState<string | null>(() => computeBestSrc());

  React.useEffect(() => {
    setCurrentSrc(computeBestSrc());
  }, [computeBestSrc]);

  const handleImageError = () => {
    const fallbackSvg = `/players/${playerId}.svg`;
    if (currentSrc && currentSrc !== fallbackSvg) {
      setCurrentSrc(fallbackSvg);
    } else {
      setCurrentSrc(null);
    }
  };

  return (
    <div
      className={`relative flex items-center justify-center rounded-2xl overflow-hidden font-mono font-bold shadow-md select-none shrink-0 ${sizeStyles} ${className}`}
      style={{
        background: `linear-gradient(135deg, ${primaryColor} 0%, #0B132B 100%)`,
        border: `1.5px solid ${accentColor}44`,
      }}
    >
      {currentSrc ? (
        <img
          src={toSafeAssetUrl(currentSrc)}
          alt={name}
          className="w-full h-full object-cover object-top block"
          loading="eager"
          decoding="async"
          onError={handleImageError}
        />
      ) : (
        <>
          <div className="absolute inset-0 opacity-15 pointer-events-none">
            <svg viewBox="0 0 100 100" className="w-full h-full">
              <circle cx="50" cy="50" r="40" fill="none" stroke="#FFF" strokeWidth="4" strokeDasharray="6 4" />
            </svg>
          </div>

          <div className="relative z-10 flex flex-col items-center justify-center">
            <span className="text-white font-black tracking-tight">{initials}</span>
            {size !== 'sm' && (
              <span className="text-[10px] font-mono text-slate-300 opacity-80" style={{ color: accentColor }}>
                #{jerseyNumber}
              </span>
            )}
          </div>
        </>
      )}

      {/* National flag SVG badge on bottom right */}
      <div className="absolute bottom-1 right-1 z-20 shadow-md">
        <CountryFlag countryCode={countryCode} size="xs" />
      </div>
    </div>
  );
};
