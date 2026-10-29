import React, { useMemo, useState } from 'react';
import { ArrowRight, CheckCircle2, Compass, ShieldAlert, Target } from 'lucide-react';
import { BallEvent, Player } from '../../types/cricket';
import { computeBatterSectorDistribution } from '../common/FieldingHeatmap';

export interface FieldShiftRecommendation {
  id: string;
  priority: 'HIGH' | 'TACTICAL' | 'CONTAINMENT';
  command: string;
  rationale: string;
  hotZoneLabel: string;
  hotZoneSharePct: number;
  expectedSavePct: number;
  fromPos: { x: number; y: number; label: string };
  toPos: { x: number; y: number; label: string };
  recommendedFieldPreset: 'Balanced Ring' | 'Aggressive Slips' | 'Deep Boundary Defense';
  recommendedBowlingLine:
    | 'Wide Yorker'
    | 'Hard Deck Bouncer'
    | 'Stump-to-stump'
    | 'Slower Variation';
}

export interface AIFieldingStrategyCoachProps {
  bowler: Player;
  striker: Player;
  overs: number;
  wickets: number;
  history: BallEvent[];
  currentFieldPreset: string;
  currentBowlingLine: string;
  onApplyFieldShift: (rec: FieldShiftRecommendation) => void;
}

export const AIFieldingStrategyCoach: React.FC<AIFieldingStrategyCoachProps> = ({
  bowler,
  striker,
  overs,
  wickets,
  history,
  currentFieldPreset,
  currentBowlingLine,
  onApplyFieldShift,
}) => {
  const [appliedAlertId, setAppliedAlertId] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);

  const bowlerProfile = useMemo(() => {
    const style = (bowler.bowlingStyle || bowler.role || '').toLowerCase();
    const isSpin =
      style.includes('spin') ||
      style.includes('orthodox') ||
      style.includes('chinaman') ||
      style.includes('mystery') ||
      bowler.role === 'Spin Bowler';
    const isLeftArm = style.includes('left-arm') || style.includes('left arm');
    const isWristSpin =
      style.includes('leg-spin') || style.includes('chinaman') || style.includes('mystery');
    const isExpressPace = !isSpin && (style.includes('fast') && !style.includes('medium'));

    return {
      isSpin,
      isLeftArm,
      isWristSpin,
      isExpressPace,
      displayStyle: bowler.bowlingStyle && bowler.bowlingStyle !== 'None'
        ? bowler.bowlingStyle
        : bowler.role,
    };
  }, [bowler]);

  const phaseInfo = useMemo(() => {
    if (overs < 6) return { id: 'powerplay', label: 'Powerplay (Max 2 Outside 30yd)' };
    if (overs < 15) return { id: 'middle', label: 'Middle Overs (Max 4 Outside 30yd)' };
    return { id: 'death', label: 'Death Overs (Max 5 Outside 30yd)' };
  }, [overs]);

  // Combine career wagon-wheel sectors with live match deliveries faced by this striker
  const recommendations = useMemo<FieldShiftRecommendation[]>(() => {
    const baseSectors = computeBatterSectorDistribution(striker);
    const liveStrikerBalls = history.filter(
      (b) =>
        (b.batter?.id === striker.id ||
          b.batter?.name?.toLowerCase() === striker.name.toLowerCase()) &&
        (b.batterRuns ?? b.runsScored) > 0
    );

    // Boost sectors where the striker has scored boundaries in the current live innings
    const mergedSectors = baseSectors.map((sec) => {
      let liveBoost = 0;
      for (const b of liveStrikerBalls) {
        const comm = (b.commentary || '').toLowerCase();
        const runs = b.batterRuns ?? b.runsScored ?? 0;
        if (
          (sec.id === 'cover_point' && (comm.includes('cover') || comm.includes('point'))) ||
          (sec.id === 'mid_wicket' && (comm.includes('mid-wicket') || comm.includes('midwicket') || comm.includes('pull'))) ||
          (sec.id === 'fine_leg' && (comm.includes('fine leg') || comm.includes('scoop') || comm.includes('glance'))) ||
          (sec.id === 'straight' && (comm.includes('straight') || comm.includes('off')))
        ) {
          liveBoost += runs * 1.3;
        }
      }
      return {
        ...sec,
        effectiveScore: sec.runsSharePct + liveBoost,
      };
    });

    const sorted = [...mergedSectors].sort((a, b) => b.effectiveScore - a.effectiveScore);
    const primaryHot = sorted[0];
    const secondaryHot = sorted[1] || sorted[0];
    const coldZone = sorted[sorted.length - 1];

    const recs: FieldShiftRecommendation[] = [];

    // Alert 1: Primary Wagon-Wheel + Bowler Type Specific Shift
    if (bowlerProfile.isSpin) {
      if (primaryHot.id === 'mid_wicket' || primaryHot.id === 'square_leg') {
        recs.push({
          id: `${striker.id}-${bowler.id}-spin-leg`,
          priority: 'HIGH',
          command:
            phaseInfo.id === 'powerplay'
              ? 'Bring Square Leg inside & push Deep Mid-Wicket to cow corner'
              : 'Push Deep Mid-Wicket 8m squarer & bring Short Cover catching',
          rationale: `${striker.name} (${striker.battingHand}) channels ${primaryHot.runsSharePct}% of wagon-wheel runs through ${primaryHot.name} (Spin SR ${striker.stats.spinSR || 134}). ${bowler.name}'s ${bowlerProfile.displayStyle} turns into the slog-sweep arc.`,
          hotZoneLabel: primaryHot.name,
          hotZoneSharePct: primaryHot.runsSharePct,
          expectedSavePct: 24,
          fromPos: { x: 74, y: 34, label: 'Mid-On' },
          toPos: { x: 96, y: 46, label: 'Deep MW' },
          recommendedFieldPreset:
            wickets >= 5 ? 'Aggressive Slips' : 'Deep Boundary Defense',
          recommendedBowlingLine: 'Stump-to-stump',
        });
      } else {
        recs.push({
          id: `${striker.id}-${bowler.id}-spin-off`,
          priority: 'HIGH',
          command: 'Move Point to Extra Cover & bring Backward Point inside circle',
          rationale: `${striker.name} drives ${primaryHot.runsSharePct}% of runs into ${primaryHot.name} (SR ${primaryHot.strikeRate}). Denying the inside-out release against ${bowler.name}'s flight forces risky hits to the longer boundary.`,
          hotZoneLabel: primaryHot.name,
          hotZoneSharePct: primaryHot.runsSharePct,
          expectedSavePct: 22,
          fromPos: { x: 24, y: 58, label: 'Point' },
          toPos: { x: 28, y: 34, label: 'Extra Cover' },
          recommendedFieldPreset: 'Balanced Ring',
          recommendedBowlingLine: 'Slower Variation',
        });
      }
    } else {
      // Pace Bowler Tactical Alerts
      if (primaryHot.id === 'fine_leg' || primaryHot.id === 'square_leg') {
        recs.push({
          id: `${striker.id}-${bowler.id}-pace-behind`,
          priority: 'HIGH',
          command: 'Drop Fine Leg deep & bring Square Leg inside 30-yard circle',
          rationale: `${striker.name}'s wagon wheel peaks behind square (${primaryHot.runsSharePct}% in ${primaryHot.name}). Against ${bowler.name}'s ${bowlerProfile.displayStyle}, plug the ramp/flick corridor and bowl wide of off-stump.`,
          hotZoneLabel: primaryHot.name,
          hotZoneSharePct: primaryHot.runsSharePct,
          expectedSavePct: 27,
          fromPos: { x: 84, y: 60, label: 'Sq Leg' },
          toPos: { x: 86, y: 88, label: 'Deep Fine' },
          recommendedFieldPreset: 'Deep Boundary Defense',
          recommendedBowlingLine: 'Wide Yorker',
        });
      } else if (primaryHot.id === 'cover_point' || primaryHot.id === 'extra_cover') {
        recs.push({
          id: `${striker.id}-${bowler.id}-pace-cover`,
          priority: 'HIGH',
          command:
            phaseInfo.id === 'powerplay'
              ? 'Move Point to Cover & float a catching Short Extra Cover'
              : 'Move Point to Deep Cover-Point & bring Mid-Wicket inside',
          rationale: `${striker.name} scores ${primaryHot.runsSharePct}% of runs through ${primaryHot.name} (Pace SR ${striker.stats.paceSR || 142}). ${bowlerProfile.isLeftArm ? 'Left-arm angle across the bat' : 'Outswing width'} feeds this hot zone unless Cover is reinforced.`,
          hotZoneLabel: primaryHot.name,
          hotZoneSharePct: primaryHot.runsSharePct,
          expectedSavePct: 25,
          fromPos: { x: 22, y: 62, label: 'Point' },
          toPos: { x: 18, y: 40, label: 'Cover' },
          recommendedFieldPreset:
            phaseInfo.id === 'powerplay' ? 'Aggressive Slips' : 'Deep Boundary Defense',
          recommendedBowlingLine: 'Wide Yorker',
        });
      } else {
        recs.push({
          id: `${striker.id}-${bowler.id}-pace-leg`,
          priority: 'HIGH',
          command: 'Push Deep Mid-Wicket back & move Mid-Off wider to Extra Cover',
          rationale: `${striker.name} hammers ${primaryHot.runsSharePct}% of runs into ${primaryHot.name} (Boundary ${primaryHot.boundaryPct}%). Protect the pull/pick-up arc against ${bowler.name}'s hard-length seamers.`,
          hotZoneLabel: primaryHot.name,
          hotZoneSharePct: primaryHot.runsSharePct,
          expectedSavePct: 23,
          fromPos: { x: 76, y: 44, label: 'Mid-Wicket' },
          toPos: { x: 98, y: 40, label: 'Deep MW' },
          recommendedFieldPreset: 'Deep Boundary Defense',
          recommendedBowlingLine: 'Hard Deck Bouncer',
        });
      }
    }

    // Alert 2: Secondary Hot Zone Plug & Cold Zone Vacate
    recs.push({
      id: `${striker.id}-${bowler.id}-secondary`,
      priority: 'TACTICAL',
      command: `Vacate ${coldZone.name.split('/')[0].trim()} & reinforce ${secondaryHot.name.split('/')[0].trim()}`,
      rationale: `Wagon wheel shows only ${coldZone.runsSharePct}% scoring in ${coldZone.name} vs ${secondaryHot.runsSharePct}% in ${secondaryHot.name}. Reallocate that ring saver to cut off ${striker.name}'s secondary release shot.`,
      hotZoneLabel: secondaryHot.name,
      hotZoneSharePct: secondaryHot.runsSharePct,
      expectedSavePct: 17,
      fromPos: { x: 34, y: 80, label: '3rd Man' },
      toPos: { x: 30, y: 46, label: 'Cover Ring' },
      recommendedFieldPreset: 'Balanced Ring',
      recommendedBowlingLine: bowlerProfile.isSpin ? 'Stump-to-stump' : 'Slower Variation',
    });

    // Alert 3: Phase-Specific Wicket Trap
    recs.push({
      id: `${striker.id}-${bowler.id}-trap`,
      priority: 'CONTAINMENT',
      command:
        phaseInfo.id === 'death'
          ? 'Bring Fine Leg up & pack Deep Extra Cover + Wide Long-Off'
          : 'Bring Square Leg inside & float Catching Slip / Short Third',
      rationale:
        phaseInfo.id === 'death'
          ? `Death-overs bluff (${overs.toFixed(1)} ov): ${bowler.name} executes wide yorkers/cutters away from ${striker.name}'s leg-side arc.`
          : `Attacking wicket squeeze: force ${striker.name} to hit against ${bowler.name}'s ${bowlerProfile.isSpin ? 'spin drift' : 'seam movement'} into a reinforced off-side ring.`,
      hotZoneLabel: primaryHot.name,
      hotZoneSharePct: primaryHot.runsSharePct,
      expectedSavePct: 19,
      fromPos: { x: 86, y: 58, label: 'Deep Sq' },
      toPos: { x: 72, y: 58, label: 'In-Ring Sq' },
      recommendedFieldPreset:
        phaseInfo.id === 'death' ? 'Deep Boundary Defense' : 'Aggressive Slips',
      recommendedBowlingLine:
        phaseInfo.id === 'death' ? 'Wide Yorker' : 'Stump-to-stump',
    });

    return recs;
  }, [striker, bowler, bowlerProfile, phaseInfo.id, overs, wickets, history]);

  const activeRec = recommendations[selectedIndex] || recommendations[0];
  const isAlreadySynced =
    appliedAlertId === activeRec.id ||
    (currentFieldPreset === activeRec.recommendedFieldPreset &&
      currentBowlingLine === activeRec.recommendedBowlingLine);

  return (
    <div className="rounded-2xl border border-amber-500/35 bg-slate-950/95 p-4 sm:p-5 space-y-4">
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2 text-xs font-mono text-amber-400 font-semibold">
            <ShieldAlert className="h-4 w-4 shrink-0" />
            <span>AI Fielding Strategy Coach · Live Tactical Alert</span>
          </div>
          <p className="text-[11px] text-slate-400 font-mono">
            {bowler.name} ({bowlerProfile.displayStyle}) vs {striker.name} ({striker.battingHand}) ·{' '}
            {phaseInfo.label}
          </p>
        </div>

        {/* Selector Tabs for the 3 Live Tactical Alerts */}
        <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800 text-[11px] font-mono">
          {recommendations.map((rec, idx) => (
            <button
              key={rec.id}
              type="button"
              onClick={() => setSelectedIndex(idx)}
              className={`px-2.5 py-1 rounded transition-colors cursor-pointer whitespace-nowrap ${
                selectedIndex === idx
                  ? 'bg-amber-400 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Alert {idx + 1}
            </button>
          ))}
        </div>
      </div>

      {/* Main Tactical Alert Body + Mini Field Shift Radar */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
        {/* Mini Field Vector Diagram (3 Cols) */}
        <div className="sm:col-span-3 flex flex-col items-center justify-center rounded-xl border border-slate-800 bg-[#061a12] p-2.5">
          <svg
            viewBox="0 0 120 120"
            className="w-24 h-24 select-none"
            role="img"
            aria-label="Recommended fielder shift vector"
          >
            <circle
              cx="60"
              cy="60"
              r="52"
              fill="#0a291d"
              stroke="#334155"
              strokeWidth="1.2"
            />
            <circle
              cx="60"
              cy="60"
              r="28"
              fill="none"
              stroke="#cbd5e1"
              strokeOpacity="0.4"
              strokeWidth="1"
              strokeDasharray="3 2"
            />
            <rect x="56" y="48" width="8" height="24" rx="1.5" fill="#b08d63" />

            {/* Old Position */}
            <circle
              cx={activeRec.fromPos.x}
              cy={activeRec.fromPos.y}
              r="5"
              fill="none"
              stroke="#94a3b8"
              strokeWidth="1.5"
              strokeDasharray="2 2"
            />
            {/* Shift Vector Line */}
            <line
              x1={activeRec.fromPos.x}
              y1={activeRec.fromPos.y}
              x2={activeRec.toPos.x}
              y2={activeRec.toPos.y}
              stroke="#fbbf24"
              strokeWidth="2"
            />
            {/* New Recommended Position */}
            <circle
              cx={activeRec.toPos.x}
              cy={activeRec.toPos.y}
              r="6"
              fill="#10b981"
              stroke="#ffffff"
              strokeWidth="1.5"
            />
          </svg>
          <span className="text-[10px] font-mono text-slate-300 mt-1 tabular-nums">
            {activeRec.fromPos.label} → {activeRec.toPos.label}
          </span>
        </div>

        {/* Tactical Command & Wagon-Wheel Explanation (9 Cols) */}
        <div className="sm:col-span-9 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
              <Compass className="h-4 w-4 text-amber-400 shrink-0" />
              <span>“{activeRec.command}”</span>
            </h4>
            <span className="text-xs font-mono text-emerald-300 tabular-nums">
              Est. Boundary Save +{activeRec.expectedSavePct}%
            </span>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">{activeRec.rationale}</p>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-slate-400 tabular-nums">
              <span className="flex items-center gap-1 text-rose-300">
                <Target className="h-3.5 w-3.5" />
                Hot Zone: {activeRec.hotZoneLabel} ({activeRec.hotZoneSharePct}%)
              </span>
              <span aria-hidden="true">·</span>
              <span>Line: {activeRec.recommendedBowlingLine}</span>
              <span aria-hidden="true">·</span>
              <span>Field: {activeRec.recommendedFieldPreset}</span>
            </div>

            <button
              type="button"
              onClick={() => {
                setAppliedAlertId(activeRec.id);
                onApplyFieldShift(activeRec);
              }}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 ${
                isAlreadySynced
                  ? 'bg-emerald-500/20 border border-emerald-400/50 text-emerald-200'
                  : 'bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold'
              }`}
            >
              {isAlreadySynced ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Field Shift Active</span>
                </>
              ) : (
                <>
                  <span>Apply Field Shift</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
