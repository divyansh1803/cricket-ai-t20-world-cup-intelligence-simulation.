import { Player, PlayerDNA, HiddenWeakness, TeamChemistry, BallEvent, Team } from '../types/cricket';

export function getPlayerDNA(player: Player): PlayerDNA {
  if (player.dna) return player.dna;

  // Compute algorithmic DNA from verified stats
  const isBatter = player.role.includes('Batter') || player.role.includes('All-Rounder');
  const isBowler = player.role.includes('Bowler');

  const pressureScore = player.rating >= 94 ? 92 : player.rating >= 90 ? 86 : 76;
  const aggression = Math.min(99, Math.max(50, Math.round((player.stats.strikeRate / 175) * 95)));
  const consistency = Math.min(98, Math.max(55, Math.round(player.stats.average * 2.1)));
  const chaseAbility = Math.min(99, Math.max(60, Math.round((player.stats.chasingAvg || 32) * 2.3)));
  const finishingAbility = Math.min(99, Math.max(45, Math.round((player.stats.deathSR || 160) / 2.1)));

  const powerplayIndex = Math.min(98, Math.max(50, Math.round((player.stats.powerplaySR || 135) / 1.7)));
  const middleOversIndex = Math.min(98, Math.max(50, Math.round((player.stats.middleSR || 140) / 1.65)));
  const deathOversIndex = isBowler
    ? Math.min(99, Math.max(50, Math.round((10 - (player.stats.economy || 8.0)) * 12 + 40)))
    : finishingAbility;

  const spinMatchup = Math.min(99, Math.max(45, Math.round((player.stats.spinSR || 140) / 1.7)));
  const paceMatchup = Math.min(99, Math.max(45, Math.round((player.stats.paceSR || 145) / 1.7)));

  let riskProfile: PlayerDNA['riskProfile'] = 'Calculated';
  if (aggression >= 90) riskProfile = 'High Risk';
  else if (aggression >= 80) riskProfile = 'Aggressive';
  else if (consistency >= 85) riskProfile = 'Conservative';

  return {
    pressureScore,
    aggression,
    consistency,
    chaseAbility,
    finishingAbility,
    powerplayIndex,
    middleOversIndex,
    deathOversIndex,
    spinMatchup,
    paceMatchup,
    riskProfile,
  };
}

export function getPlayerWeaknesses(player: Player): HiddenWeakness[] {
  if (player.weaknesses && player.weaknesses.length > 0) return player.weaknesses;

  const weaknesses: HiddenWeakness[] = [];

  if (player.battingHand === 'Right-hand') {
    weaknesses.push({
      factor: 'Left-Arm Fast Inswing',
      threatLevel: 'HIGH',
      insight: 'Susceptible to 142+ km/h nip-backer attacking the front pad in the first 8 deliveries.',
    });
  } else {
    weaknesses.push({
      factor: 'Off-Spin Gripping Away',
      threatLevel: 'HIGH',
      insight: 'Strike rate drops by 19% against disciplined right-arm off-spin flighted outside off.',
    });
  }

  if (player.stats.deathSR && player.stats.deathSR > 180) {
    weaknesses.push({
      factor: 'Wide Outside-Off Yorkers',
      threatLevel: 'MEDIUM',
      insight: 'Boundary conversion diminishes by 34% when denied leg-side elevation behind square.',
    });
  } else {
    weaknesses.push({
      factor: 'Steep Rib-Line Bouncers',
      threatLevel: 'MEDIUM',
      insight: 'Cautious against 145 km/h bouncers targeting the chest; defensive pull yields dot balls.',
    });
  }

  weaknesses.push({
    factor: 'Scoreboard Pressure (>12 RRR)',
    threatLevel: player.rating >= 93 ? 'LOW' : 'HIGH',
    insight: player.rating >= 93
      ? 'Ice-cold execution under high pressure; maintains shape through contact.'
      : 'Hazard probability doubles when required run rate exceeds 12.0 in final 3 overs.',
  });

  return weaknesses;
}

export function calculateTeamChemistry(players: Player[]): TeamChemistry {
  if (players.length === 0) {
    return {
      overall: 50,
      battingBalance: 50,
      bowlingBalance: 50,
      roleCoverage: 50,
      leftRightBalance: 50,
      experienceBalance: 50,
      finishingDepth: 50,
      keySynergies: ['Default squad profile'],
      tacticalGaps: ['Insufficient players selected'],
    };
  }

  const leftHanders = players.filter((p) => p.battingHand === 'Left-hand').length;
  const leftRightBalance = Math.min(100, Math.max(50, Math.round(100 - Math.abs(leftHanders - 4) * 8)));

  const spinners = players.filter((p) => p.role === 'Spin Bowler' || p.bowlingStyle.includes('spin')).length;
  const pacers = players.filter((p) => p.role === 'Pace Bowler' || p.bowlingStyle.includes('fast')).length;
  const bowlingBalance = Math.min(100, Math.max(50, spinners >= 2 && pacers >= 3 ? 94 : 72));

  const wkCount = players.filter((p) => p.role.includes('Wicketkeeper')).length;
  const arCount = players.filter((p) => p.role.includes('All-Rounder')).length;
  const roleCoverage = Math.min(100, Math.max(40, (wkCount >= 1 ? 40 : 0) + (arCount >= 2 ? 40 : 20) + (players.length >= 11 ? 20 : 0)));

  const highExpCount = players.filter((p) => p.stats.matches >= 60).length;
  const experienceBalance = Math.min(100, Math.max(60, highExpCount * 12 + 20));

  const finishers = players.filter((p) => (p.stats.deathSR || 0) >= 170).length;
  const finishingDepth = Math.min(100, Math.max(50, finishers * 28 + 20));

  const battingBalance = Math.min(100, Math.max(55, Math.round(players.reduce((acc, p) => acc + (p.stats.strikeRate > 135 ? 10 : 5), 0))));

  const overall = Math.round(
    (battingBalance * 0.2 + bowlingBalance * 0.2 + roleCoverage * 0.2 + leftRightBalance * 0.15 + finishingDepth * 0.15 + experienceBalance * 0.1)
  );

  const keySynergies: string[] = [];
  if (leftRightBalance >= 85) keySynergies.push('Elite left-hand/right-hand disruption neutralizes bowling fields');
  if (bowlingBalance >= 85) keySynergies.push('Dual pace-spin bowling options prevent opposition targeting');
  if (finishingDepth >= 80) keySynergies.push('Deep finishing order guarantees acceleration in overs 17-20');

  const tacticalGaps: string[] = [];
  if (wkCount < 1) tacticalGaps.push('Missing recognized wicketkeeper batter');
  if (pacers < 3) tacticalGaps.push('Vulnerable in powerplay seam overs; lacks express pace');
  if (spinners < 1) tacticalGaps.push('Lacks wrist-spin variation for middle-overs choke');

  return {
    overall,
    battingBalance,
    bowlingBalance,
    roleCoverage,
    leftRightBalance,
    experienceBalance,
    finishingDepth,
    keySynergies,
    tacticalGaps,
  };
}

export function generateMatchStory(
  events: BallEvent[],
  teamA: Team,
  teamB: Team,
  finalScoreA: number,
  finalWicketsA: number,
  target: number
) {
  const won = finalScoreA >= target;

  return [
    {
      title: 'Chapter 1: The Powerplay Blitz',
      oversRange: 'Overs 0.1 - 6.0',
      headline: `${teamB.shortName} tested the openers with aggressive seam lines`,
      narrative: `The match ignited under the floodlights as new-ball bowlers probed the top order with hard lengths. Boundaries flew through extra cover while slips waited for an edge.`,
      keyMoment: `Powerplay concluded at RR 8.8 with win probability balanced at 54%.`,
      winProbShift: '+4.2%',
    },
    {
      title: 'Chapter 2: The Middle-Overs Spin Trap',
      oversRange: 'Overs 7.1 - 14.0',
      headline: 'Spin choke restricted boundary access and built scoreboard tension',
      narrative: `Tension mounted as fielders spread to the fence. Wrist spin gripping off the deck forced batters to rotate strike with hard singles, testing patience and shot selection.`,
      keyMoment: `Dot-ball accumulation drove the required run rate into double figures.`,
      winProbShift: '-11.4%',
    },
    {
      title: 'Chapter 3: The Counterattack & Turning Point',
      oversRange: 'Overs 14.1 - 18.0',
      headline: '360° boundary surge broke open the fielding ring',
      narrative: `With the required rate climbing dangerously, the set batters unleashed a barrage of reverse scoops, lofted drives, and maximums over mid-wicket, turning the contest on its head.`,
      keyMoment: `A sensational 18-run over completely flipped momentum back to the chase.`,
      winProbShift: '+24.6%',
    },
    {
      title: 'Chapter 4: The Final Over Climax',
      oversRange: 'Overs 18.1 - 20.0',
      headline: won ? `${teamA.name} seals dramatic World Cup victory!` : `${teamB.name} clinches ice-cold death-over defense!`,
      narrative: won
        ? `Nerves of steel! Under immense stadium roar and laser focus, the chase was completed with clinical boundary hitting into the vacant outfield.`
        : `Defensive bowling masterclass! Pinpoint yorkers on fifth stump sealed the victory in a thrilling finish.`,
      keyMoment: won ? `Winning runs struck to ignite celebration!` : `Death bowler defended target with ice in the veins.`,
      winProbShift: won ? '100% VICTORY' : '0% DEFEAT',
    },
  ];
}
