import {
  Team,
  Player,
  Stadium,
  BallEvent,
  DeliveryOutcome,
  MonteCarloResult,
  DrsBallTrackingOutcome,
} from '../types/cricket';

export interface MatchContext {
  teamA: Team;
  teamB: Team;
  stadium: Stadium;
  targetRuns?: number;
  pitchFactor: 'Pace' | 'True' | 'Slow' | 'Spin';
  dewActive: boolean;
  userTactics: {
    battingAggression: 'Anchor' | 'Balanced' | 'Aggressive' | 'Maximum Risk';
    bowlingLine: 'Stump-to-stump' | 'Wide Yorker' | 'Hard Deck Bouncer' | 'Slower Variation';
    fieldPreset: 'Aggressive Slips' | 'Balanced Ring' | 'Deep Boundary Defense';
  };
}

export interface SimulateBallOptions {
  inningsNumber?: 1 | 2 | 3 | 4;
  totalOvers?: number;
  maxWickets?: number;
  nonStriker?: Player;
  bowlingXI?: Player[];
  isFreeHit?: boolean;
  sequenceNumber?: number;
}

let authoritativeDeliverySeq = 0;

export class CricketIntelligenceEngine {
  /**
   * Calculates dynamic win probability for the batting side (or Team A) based on current score, target/par, wickets, RRR, and matchup
   */
  static calculateWinProbability(
    runs: number,
    wickets: number,
    ballsBowled: number,
    totalOvers: number,
    target: number,
    teamA: Team,
    teamB: Team,
    stadium: Stadium,
    dew: boolean
  ): number {
    const totalBalls = Math.max(6, totalOvers * 6);
    const remainingBalls = Math.max(0, totalBalls - ballsBowled);

    // 1st Innings Mode (target <= 0): compare projected total vs venue par score
    if (!target || target <= 0) {
      const parScore = totalOvers === 1 ? 11 : stadium?.avgFirstInningsScore || 176;
      const crr = ballsBowled > 0 ? (runs / ballsBowled) * 6 : parScore / totalOvers;
      const wicketsRemainingFactor = Math.max(0.45, 1 - wickets * 0.055);
      const projected = runs + (remainingBalls / 6) * Math.max(6.2, crr * 0.65 + (parScore / totalOvers) * 0.42) * wicketsRemainingFactor;
      const diffFromPar = projected - parScore;
      const ratingDiff = teamA.ratings.overall - teamB.ratings.overall;
      const rawProb = 50 + diffFromPar * 0.85 + ratingDiff * 1.2 - (dew ? 3.5 : 0);
      return Math.max(5, Math.min(95, Math.round(rawProb * 10) / 10));
    }

    const needed = Math.max(0, target - runs);

    if (runs >= target) return 100;
    if (wickets >= (totalOvers === 1 ? 2 : 10)) return 0;
    if (remainingBalls === 0 && runs < target - 1) return 0;
    if (remainingBalls === 0 && runs === target - 1) return 50; // Tied -> Super Over

    const rrr = remainingBalls > 0 ? (needed / remainingBalls) * 6 : 99;
    const crr = ballsBowled > 0 ? (runs / ballsBowled) * 6 : 8.0;

    // Base probability from RRR vs benchmark (8.5 RPO)
    let prob = 50 + (crr - rrr) * 4.5;

    // Penalty for wickets lost
    prob -= wickets * (totalOvers === 1 ? 18 : 5.2);

    // Team rating differential
    const ratingDiff = teamA.ratings.overall - teamB.ratings.overall;
    prob += ratingDiff * 1.5;

    // Dew bonus for chasing team
    if (dew) {
      prob += 4.5;
    }

    // Stadium chasing bias
    const chaseBias = ((stadium?.chasingWinPercent || 52) - 50) * 0.4;
    prob += chaseBias;

    return Math.max(2, Math.min(98, Math.round(prob * 10) / 10));
  }

  /**
   * Calculates live momentum percentage (0-100) favoring batting team
   */
  static calculateMomentum(recentEvents: BallEvent[]): number {
    if (recentEvents.length === 0) return 50;

    const lastSix = recentEvents.slice(-6);
    let score = 50;

    lastSix.forEach((e) => {
      if (e.isWicket) score -= 12;
      else if (e.runsScored >= 6) score += 9;
      else if (e.runsScored >= 4) score += 5;
      else if (e.runsScored === 0) score -= 2;
      else score += 1;
    });

    return Math.max(10, Math.min(90, Math.round(score)));
  }

  /**
   * Generates a single authoritative ball outcome with unique eventId, cricket extras,
   * legal-ball accounting, fielder attribution, speed, length, and shot choice.
   */
  static simulateBall(
    ballIndex: number,
    currentScore: number,
    currentWickets: number,
    target: number,
    bowler: Player,
    striker: Player,
    context: MatchContext,
    prevWinProb: number,
    options?: SimulateBallOptions
  ): BallEvent {
    authoritativeDeliverySeq += 1;
    const inningsNumber = options?.inningsNumber ?? 2;
    const totalOvers = options?.totalOvers ?? 20;
    const isFreeHit = Boolean(options?.isFreeHit);
    const nonStriker = options?.nonStriker;
    const bowlingXI = options?.bowlingXI && options.bowlingXI.length > 0 ? options.bowlingXI : context.teamB.squad;

    const overNum = Math.floor(ballIndex / 6);
    const ballInOver = (ballIndex % 6) + 1;
    const isDeathOver = totalOvers === 1 || overNum >= Math.max(1, totalOvers - 5);

    const isSpinner =
      bowler.role === 'Spin Bowler' ||
      bowler.bowlingStyle.toLowerCase().includes('spin') ||
      bowler.bowlingStyle.toLowerCase().includes('slow');

    // Speeds and delivery types based on bowler type
    let speed = 140;
    let deliveryType = 'Good Length Seam';
    let length: BallEvent['length'] = 'Good Length';

    if (isSpinner) {
      speed = Math.floor(82 + Math.random() * 15);
      deliveryType = Math.random() > 0.42 ? 'Stock Spinning Delivery' : 'Deceptive Wrong-Un / Arm Ball';
      length = Math.random() > 0.45 ? 'Good Length' : 'Full';
    } else {
      speed = Math.floor(136 + Math.random() * 13);
      if (isDeathOver) {
        if (context.userTactics.bowlingLine === 'Wide Yorker' || Math.random() > 0.5) {
          deliveryType = 'Searing Wide-Channel Yorker';
          length = 'Yorker';
        } else {
          deliveryType = 'Deceptive Back-of-Hand Slower Ball';
          length = 'Slower Ball';
          speed -= 21;
        }
      } else {
        if (context.userTactics.bowlingLine === 'Hard Deck Bouncer' || Math.random() > 0.76) {
          deliveryType = 'Sharp Steep Bouncer';
          length = 'Bouncer';
        } else if (Math.random() > 0.65) {
          deliveryType = 'Full Out-Swinger';
          length = 'Full';
        } else {
          deliveryType = 'Probing Good Length Seam';
          length = 'Good Length';
        }
      }
    }

    // Pick wicketkeeper & outfielders from bowling XI for realistic dismissal text
    const wicketkeeper =
      bowlingXI.find((p) => p.role.includes('Wicketkeeper') && p.id !== bowler.id) ||
      bowlingXI.find((p) => p.id !== bowler.id) ||
      bowler;
    const outfielders = bowlingXI.filter((p) => p.id !== bowler.id && p.id !== wicketkeeper.id);
    const randomOutfielder =
      outfielders.length > 0
        ? outfielders[Math.floor(Math.random() * outfielders.length)]
        : wicketkeeper;

    // Aggression & matchup modifiers
    let boundaryBoost = 0;
    let wicketHazard = 0;
    if (context.userTactics.battingAggression === 'Maximum Risk') {
      boundaryBoost = 13;
      wicketHazard = 10;
    } else if (context.userTactics.battingAggression === 'Aggressive') {
      boundaryBoost = 7;
      wicketHazard = 4.5;
    } else if (context.userTactics.battingAggression === 'Anchor') {
      boundaryBoost = -5;
      wicketHazard = -4;
    }

    if (context.userTactics.fieldPreset === 'Deep Boundary Defense') {
      boundaryBoost -= 5;
    } else if (context.userTactics.fieldPreset === 'Aggressive Slips') {
      wicketHazard += 4;
    }

    const strikerPower = ((striker?.stats?.strikeRate || 138) - 132) * 0.14;
    boundaryBoost += strikerPower;

    const bowlerSuppression = (8.0 - (bowler?.stats?.economy || 7.8)) * 1.4;
    boundaryBoost -= bowlerSuppression;
    wicketHazard += ((bowler?.rating || 88) - 90) * 0.35;

    // Weather & Pitch Condition modifiers ('Pace' = Damp/Seam, 'Spin' = Dusty/Turn, 'True' = Batting Paradise)
    if (context.pitchFactor === 'Pace') {
      if (!isSpinner) {
        wicketHazard += 2.6;
        boundaryBoost -= 3.4;
      } else {
        wicketHazard -= 0.4;
        boundaryBoost -= 1.0;
      }
    } else if (context.pitchFactor === 'Spin' || context.pitchFactor === 'Slow') {
      if (isSpinner) {
        wicketHazard += 3.2;
        boundaryBoost -= 4.0;
      } else {
        wicketHazard += 0.6;
        boundaryBoost -= 1.8;
      }
    } else if (context.pitchFactor === 'True') {
      boundaryBoost += 5.0;
      wicketHazard -= 1.6;
    }

    if (context.dewActive && inningsNumber === 2) {
      boundaryBoost += 2.2;
      if (isSpinner) {
        wicketHazard -= 1.1;
      }
    }

    if (isFreeHit) {
      boundaryBoost += 10;
    }

    // Extras check first (Wides & No-Balls are illegal deliveries; Byes & Leg-Byes are legal)
    const extraRoll = Math.random() * 100;
    const wideThreshold =
      context.userTactics.bowlingLine === 'Wide Yorker'
        ? 3.8
        : isSpinner
        ? 2.0
        : 2.9;
    const noBallThreshold = wideThreshold + (isSpinner ? 0.5 : 1.15);

    let isLegalDelivery = true;
    let outcome: DeliveryOutcome = '0';
    let displayToken = '•';
    let shot = 'Orthodox Forward Defense';
    let batterRuns = 0;
    let extraType: BallEvent['extraType'] = null;
    let extraRuns = 0;
    let bowlerRunsConceded = 0;
    let physicalRunsCompleted = 0;
    let runsScored = 0;
    let isWicket = false;
    let wicketType: BallEvent['wicketType'] = undefined;
    let dismissedPlayer: Player | undefined = undefined;
    let fielder: Player | undefined = undefined;

    if (extraRoll < wideThreshold) {
      // WIDE DELIVERY (Illegal ball: 1 penalty run + optional extra wide run; not a ball faced by batter)
      isLegalDelivery = false;
      outcome = 'WD';
      extraType = 'wide';
      const bonusWideRuns = Math.random() < 0.12 ? 1 : 0; // occasional 2 wides when keeper parries
      extraRuns = 1 + bonusWideRuns;
      batterRuns = 0;
      runsScored = extraRuns;
      bowlerRunsConceded = extraRuns;
      physicalRunsCompleted = bonusWideRuns; // 1st wide doesn't cross batters; 2nd wide means batters ran 1
      displayToken = extraRuns > 1 ? `${extraRuns}WD` : 'WD';
      shot =
        bonusWideRuns > 0
          ? 'Swung wide outside tramline; batters scamper an extra wide as keeper half-stops'
          : 'Left alone outside the wide guideline';
    } else if (extraRoll < noBallThreshold) {
      // NO-BALL DELIVERY (Illegal ball: 1 penalty extra + runs off the bat; counts as ball faced by batter; triggers Free Hit!)
      isLegalDelivery = false;
      outcome = 'NB';
      extraType = 'noBall';
      extraRuns = 1;
      const nbHitRoll = Math.random();
      if (nbHitRoll < 0.16) batterRuns = 6;
      else if (nbHitRoll < 0.38) batterRuns = 4;
      else if (nbHitRoll < 0.68) batterRuns = 1;
      else if (nbHitRoll < 0.78) batterRuns = 2;
      else batterRuns = 0;

      runsScored = 1 + batterRuns;
      bowlerRunsConceded = runsScored;
      physicalRunsCompleted = batterRuns === 4 || batterRuns === 6 ? 0 : batterRuns;
      displayToken = batterRuns > 0 ? `NB+${batterRuns}` : 'NB';
      shot =
        batterRuns >= 4
          ? `Overstepped No-Ball! Punished by ${striker.name} for ${batterRuns} off the bat — Free Hit coming up`
          : `Front-foot No-Ball signaled by umpire — Free Hit on the next delivery`;
    } else if (extraRoll < noBallThreshold + 1.45) {
      // LEG-BYES (Legal delivery: counts as ball faced and legal ball, added to team extras, NOT charged to bowler or batter!)
      isLegalDelivery = true;
      outcome = 'LB';
      extraType = 'legBye';
      extraRuns = Math.random() < 0.14 ? 4 : 1;
      batterRuns = 0;
      runsScored = extraRuns;
      bowlerRunsConceded = 0;
      physicalRunsCompleted = extraRuns === 4 ? 0 : extraRuns;
      displayToken = `${extraRuns}LB`;
      shot =
        extraRuns === 4
          ? 'Angled onto the thigh pad and races fine past the keeper for four leg-byes'
          : 'Clipped off the pad into square leg; batters cross for a leg-bye';
    } else if (extraRoll < noBallThreshold + 2.05) {
      // BYES (Legal delivery: missed by batter & keeper, added to team extras, NOT charged to bowler or batter!)
      isLegalDelivery = true;
      outcome = 'B';
      extraType = 'bye';
      extraRuns = Math.random() < 0.18 ? 2 : 1;
      batterRuns = 0;
      runsScored = extraRuns;
      bowlerRunsConceded = 0;
      physicalRunsCompleted = extraRuns;
      displayToken = `${extraRuns}B`;
      shot = 'Sharp seam movement beats bat and nutmegs keeper for sharp byes';
    } else {
      // STANDARD LEGAL DELIVERY
      isLegalDelivery = true;
      const roll = Math.random() * 100;
      const effectiveWicketChance = Math.max(2.8, Math.min(18, 6.2 + wicketHazard));
      const sixThreshold = effectiveWicketChance + Math.max(5, Math.min(24, 10.5 + boundaryBoost * 0.55));
      const fourThreshold = sixThreshold + Math.max(8, Math.min(28, 14.5 + boundaryBoost * 0.55));

      if (roll < effectiveWicketChance && (!isFreeHit || Math.random() < 0.18)) {
        isWicket = true;
        outcome = 'W';
        batterRuns = 0;
        runsScored = 0;
        bowlerRunsConceded = 0;
        physicalRunsCompleted = 0;
        displayToken = 'W';

        if (isFreeHit) {
          // Only Run Out is legal on a Free Hit!
          wicketType = 'Run Out';
          fielder = randomOutfielder;
          const nonStrikerOut = Boolean(nonStriker && Math.random() < 0.45);
          dismissedPlayer = nonStrikerOut && nonStriker ? nonStriker : striker;
          shot = `Free Hit chaos! Direct hit from ${fielder.name} catches ${dismissedPlayer.name} short of the crease`;
        } else {
          const wRoll = Math.random();
          if (wRoll < 0.34) {
            wicketType = 'LBW';
            dismissedPlayer = striker;
            shot = 'Pinned on the front pad playing across the line in front of middle and leg';
          } else if (wRoll < 0.72) {
            wicketType = 'Caught';
            dismissedPlayer = striker;
            const isCaughtBehind = Math.random() < 0.45;
            fielder = isCaughtBehind ? wicketkeeper : randomOutfielder;
            shot = isCaughtBehind
              ? `Feathered outside edge behind to wicketkeeper ${wicketkeeper.name}`
              : `Lofted drive mistimed to ${fielder.name} patrolling the boundary`;
          } else if (wRoll < 0.88) {
            wicketType = 'Bowled';
            dismissedPlayer = striker;
            shot = 'Beaten for pace as delivery nips back to shatter top of off-stump';
          } else if (isSpinner && wRoll < 0.95) {
            wicketType = 'Stumped';
            dismissedPlayer = striker;
            fielder = wicketkeeper;
            shot = `Dragged out of the crease by flight and turn; lightning stumping by ${wicketkeeper.name}`;
          } else {
            wicketType = 'Run Out';
            fielder = randomOutfielder;
            const nonStrikerOut = Boolean(nonStriker && Math.random() < 0.4);
            dismissedPlayer = nonStrikerOut && nonStriker ? nonStriker : striker;
            shot = `Direct rocket throw from ${fielder.name} catches ${dismissedPlayer.name} inches short`;
          }
        }
      } else if (roll < sixThreshold) {
        batterRuns = 6;
        runsScored = 6;
        bowlerRunsConceded = 6;
        physicalRunsCompleted = 0;
        outcome = '6';
        displayToken = '6';
        shot =
          length === 'Bouncer'
            ? 'Swivel pull launched deep into the square-leg tier for SIX'
            : 'Effortless lofted extension straight over the sightscreen for SIX';
      } else if (roll < fourThreshold) {
        batterRuns = 4;
        runsScored = 4;
        bowlerRunsConceded = 4;
        physicalRunsCompleted = 0;
        outcome = '4';
        displayToken = '4';
        shot =
          length === 'Yorker'
            ? 'Squeezed out and carved past backward point for FOUR'
            : 'Glorious cover drive piercing the extra-cover gap for FOUR';
      } else if (roll < 66) {
        batterRuns = 1;
        runsScored = 1;
        bowlerRunsConceded = 1;
        physicalRunsCompleted = 1;
        outcome = '1';
        displayToken = '1';
        shot = 'Worked softly into the mid-wicket pocket for a brisk single';
      } else if (roll < 77) {
        batterRuns = 2;
        runsScored = 2;
        bowlerRunsConceded = 2;
        physicalRunsCompleted = 2;
        outcome = '2';
        displayToken = '2';
        shot = 'Clipped behind square with urgent calling to complete two runs';
      } else if (roll < 79.2) {
        batterRuns = 3;
        runsScored = 3;
        bowlerRunsConceded = 3;
        physicalRunsCompleted = 3;
        outcome = '3';
        displayToken = '3';
        shot = 'Timed into the deep cover pocket; boundary relay cut off, three runs taken';
      } else {
        batterRuns = 0;
        runsScored = 0;
        bowlerRunsConceded = 0;
        physicalRunsCompleted = 0;
        outcome = '0';
        displayToken = '•';
        shot =
          length === 'Yorker'
            ? "Jammed out solidly right back to the bowler's boots"
            : 'Probing channel outside off-stump defended crisply to point';
      }
    }

    const nextScore = currentScore + runsScored;
    const nextWickets = isWicket ? currentWickets + 1 : currentWickets;
    const legalBallsAfter = isLegalDelivery ? ballIndex + 1 : ballIndex;

    const newWinProb = CricketIntelligenceEngine.calculateWinProbability(
      nextScore,
      nextWickets,
      legalBallsAfter,
      totalOvers,
      target,
      context.teamA,
      context.teamB,
      context.stadium,
      context.dewActive
    );

    const winProbDelta = Math.round((newWinProb - prevWinProb) * 10) / 10;

    let commentary = '';
    if (isWicket) {
      if (wicketType === 'Run Out') {
        commentary = `RUN OUT! Direct hit from ${fielder?.name || 'the fielder'}! ${dismissedPlayer?.name || striker.name} is caught short of the ground!`;
      } else if (wicketType === 'Stumped') {
        commentary = `STUMPED! ${bowler.name} deceives ${striker.name} in flight and ${fielder?.name || 'the keeper'} whips the bails off in a flash!`;
      } else if (wicketType === 'Caught') {
        commentary = `OUT! Caught by ${fielder?.name || 'the fielder'}! ${bowler.name} breaks through at ${speed} km/h to dismiss ${striker.name}!`;
      } else {
        commentary = `OUT! ${bowler.name} strikes (${wicketType})! ${striker.name} departs off a ${speed} km/h ${deliveryType.toLowerCase()}!`;
      }
    } else if (extraType === 'noBall') {
      commentary =
        batterRuns >= 4
          ? `NO-BALL AND ${batterRuns === 6 ? 'SIX' : 'FOUR'}! ${bowler.name} oversteps and ${striker.name} cashes in — ${runsScored} total runs and a FREE HIT next ball!`
          : `NO-BALL called! ${bowler.name} oversteps the popping crease (${runsScored} run${runsScored > 1 ? 's' : ''}). FREE HIT coming up!`;
    } else if (extraType === 'wide') {
      commentary = `WIDE signaled! ${bowler.name} strays beyond the tramline (${extraRuns} wide${extraRuns > 1 ? 's' : ''}). Extra ball to be re-bowled.`;
    } else if (extraType === 'legBye') {
      commentary = `${extraRuns} Leg-Bye${extraRuns > 1 ? 's' : ''}! Glances off the pad of ${striker.name} and trickles fine.`;
    } else if (extraType === 'bye') {
      commentary = `${extraRuns} Bye${extraRuns > 1 ? 's' : ''}! Beats both bat and gloves, alertly stolen by the batters.`;
    } else if (batterRuns === 6) {
      commentary = `SIX! Colossal strike from ${striker.name}! Clean swing of the bat sends ${bowler.name} soaring deep into the stands (${speed} km/h).`;
    } else if (batterRuns === 4) {
      commentary = `FOUR! Sublime placement by ${striker.name}, threading the infield ring with surgical timing.`;
    } else if (batterRuns === 0) {
      commentary = `Dot ball. Tight line and bounce from ${bowler.name} at ${speed} km/h keeps ${striker.name} watchful.`;
    } else {
      commentary = `${batterRuns} run${batterRuns > 1 ? 's' : ''}. Smart wristwork from ${striker.name} to work the gap and rotate strike.`;
    }

    let aiExplanation = '';
    if (isWicket) {
      aiExplanation = `Win probability shifted ${winProbDelta > 0 ? `+${winProbDelta}` : winProbDelta}% as losing ${dismissedPlayer?.name || striker.name} exposes a new batter to the crease.`;
    } else if (runsScored >= 4) {
      aiExplanation = `Shifted ${winProbDelta > 0 ? `+${winProbDelta}` : winProbDelta}% win probability via boundary acceleration${extraType === 'noBall' ? ' plus an upcoming Free Hit' : ''}.`;
    } else if (runsScored === 0 && isDeathOver) {
      aiExplanation = `Shifted ${winProbDelta}% probability due to late-innings dot-ball pressure.`;
    }

    const seqTag = options?.sequenceNumber ?? authoritativeDeliverySeq;
    const eventId = `inn${inningsNumber}-seq${seqTag}-lb${ballIndex}-${Date.now().toString(36)}`;

    return {
      eventId,
      inningsNumber,
      overNumber: overNum,
      ballInOver,
      totalBalls: legalBallsAfter,
      legalBallsAfter,
      isLegalDelivery,
      isFreeHit,
      bowler,
      batter: striker,
      nonStriker,
      dismissedPlayer,
      fielder,
      deliveryType,
      speedKmh: speed,
      length,
      shot,
      outcome,
      displayToken,
      runsScored,
      batterRuns,
      extraType,
      extraRuns,
      bowlerRunsConceded,
      physicalRunsCompleted,
      isWicket,
      wicketType,
      scoreAtBall: `${nextScore}/${nextWickets}`,
      commentary,
      winProbA: newWinProb,
      winProbDelta,
      momentumA: runsScored >= 4 ? 68 : isWicket ? 32 : 50,
      aiExplanation,
    };
  }

  /**
   * Simulates a Hawk-Eye & UltraEdge DRS Ball-Tracking outcome for a dismissal review.
   * Incorporates delivery speed, length, bowler trajectory, and venue pitch bounce/turn.
   */
  static simulateDrsBallTracking(
    ball: BallEvent,
    stadium: Stadium,
    dewActive: boolean
  ): DrsBallTrackingOutcome {
    const shotLower = (ball.shot || '').toLowerCase();
    const isCaughtBehind =
      ball.wicketType === 'Caught' &&
      (shotLower.includes('edge') || shotLower.includes('wicketkeeper') || shotLower.includes('behind'));
    const appealType: 'LBW' | 'CAUGHT BEHIND' = isCaughtBehind ? 'CAUGHT BEHIND' : 'LBW';

    const isSpin =
      ball.bowler.role === 'Spin Bowler' ||
      ball.bowler.bowlingStyle.toLowerCase().includes('spin') ||
      ball.speedKmh < 105;

    const highBouncePitch = stadium.pitchType === 'Pace & Bounce';
    const turningPitch = stadium.pitchType === 'Slow & Turning' || stadium.pitchType === 'Dry Spin-Friendly';

    // Base overturn probability (~40-46% on contested T20 reviews, slightly higher on high-bounce/turning decks)
    let overturnChance = 0.42;
    if (highBouncePitch && (ball.length === 'Good Length' || ball.length === 'Bouncer' || ball.length === 'Short of Length')) {
      overturnChance += 0.08;
    }
    if (turningPitch && isSpin) {
      overturnChance += 0.05;
    }
    if (dewActive) {
      overturnChance -= 0.03; // Skiddy dew keeps ball lower onto the stumps
    }

    const roll = Math.random();
    const isOverturned = roll < overturnChance;
    const isUmpiresCall = !isOverturned && appealType === 'LBW' && roll < overturnChance + 0.24;

    const seamDeviationDeg = isSpin
      ? Number(((turningPitch ? 3.8 : 2.4) * (Math.random() > 0.35 ? -1 : 1)).toFixed(1))
      : Number(((dewActive ? 1.1 : 1.9) * (Math.random() > 0.5 ? -1 : 1)).toFixed(1));

    if (isOverturned) {
      if (appealType === 'CAUGHT BEHIND') {
        return {
          appealType,
          frontFoot: 'FAIR DELIVERY',
          ultraEdge: 'FLATLINE (NO BAT)',
          pitching: 'OUTSIDE OFF',
          impact: 'OUTSIDE OFF',
          wickets: 'MISSING (OFF)',
          decision: 'OVERTURNED',
          finalVerdict: 'NOT OUT',
          isUmpiresCall: false,
          retainReview: true,
          speedKmh: ball.speedKmh,
          bounceHeightCm: 74.2,
          seamDeviationDeg,
          stumpOverlapPct: 0,
          pitchX: 186,
          pitchY: 156,
          impactX: 182,
          impactY: 90,
          targetStumpX: 174,
          summaryText: `DECISION OVERTURNED — NOT OUT! UltraEdge shows a flatline as the ${ball.speedKmh} km/h delivery passes the bat, and ball-tracking confirms missing off-stump. ${ball.batter.name} resumes batting!`,
        };
      }

      // Overturned LBW: either bouncing over bails (>71.1 cm) or sliding past leg/off stump
      const missesForHeight = highBouncePitch || ball.length === 'Bouncer' || Math.random() < 0.45;
      const wicketsStatus: DrsBallTrackingOutcome['wickets'] = missesForHeight
        ? 'MISSING (HEIGHT)'
        : Math.random() < 0.6
        ? 'MISSING (LEG)'
        : 'MISSING (OFF)';
      const bounceHeightCm = missesForHeight
        ? Number((73.8 + Math.random() * 6.5).toFixed(1))
        : Number((58.5 + Math.random() * 9.0).toFixed(1));
      const targetStumpX =
        wicketsStatus === 'MISSING (LEG)' ? 225 : wicketsStatus === 'MISSING (OFF)' ? 176 : 201;

      return {
        appealType,
        frontFoot: 'FAIR DELIVERY',
        ultraEdge: 'FLATLINE (NO BAT)',
        pitching: wicketsStatus === 'MISSING (LEG)' && Math.random() < 0.35 ? 'OUTSIDE LEG' : 'IN LINE',
        impact: 'IN LINE',
        wickets: wicketsStatus,
        decision: 'OVERTURNED',
        finalVerdict: 'NOT OUT',
        isUmpiresCall: false,
        retainReview: true,
        speedKmh: ball.speedKmh,
        bounceHeightCm,
        seamDeviationDeg,
        stumpOverlapPct: 0,
        pitchX: 204,
        pitchY: 162,
        impactX: 206,
        impactY: 94,
        targetStumpX,
        summaryText: missesForHeight
          ? `DECISION OVERTURNED — NOT OUT! Hawk-Eye ball tracking projects ${bounceHeightCm} cm carry (bouncing clear over the 71.1 cm bails). ${ball.batter.name} survives!`
          : `DECISION OVERTURNED — NOT OUT! Hawk-Eye ball tracking shows lateral deviation (${seamDeviationDeg}°) taking the ball past the stumps (${wicketsStatus}). ${ball.batter.name} continues!`,
      };
    }

    if (isUmpiresCall) {
      const bounceHeightCm = Number((68.4 + Math.random() * 2.6).toFixed(1));
      const overlap = Math.floor(18 + Math.random() * 28); // <50% ball hitting = Umpire's Call
      return {
        appealType: 'LBW',
        frontFoot: 'FAIR DELIVERY',
        ultraEdge: 'FLATLINE (NO BAT)',
        pitching: 'IN LINE',
        impact: "UMPIRE'S CALL",
        wickets: "UMPIRE'S CALL",
        decision: 'UPHELD',
        finalVerdict: 'OUT',
        isUmpiresCall: true,
        retainReview: true,
        speedKmh: ball.speedKmh,
        bounceHeightCm,
        seamDeviationDeg,
        stumpOverlapPct: overlap,
        pitchX: 203,
        pitchY: 158,
        impactX: 209,
        impactY: 92,
        targetStumpX: 211,
        summaryText: `DECISION UPHELD (UMPIRE'S CALL) — OUT! Ball-tracking shows ${overlap}% of the ball clipping the outer bail/leg-stump (${bounceHeightCm} cm height). On-field OUT stands; batting team retains review.`,
      };
    }

    // Full UPHELD (Three Reds for LBW, or Clear UltraEdge Spike for Caught Behind)
    const bounceHeightCm = Number((49.0 + Math.random() * 17.5).toFixed(1));
    const overlap = Math.floor(64 + Math.random() * 34);
    return {
      appealType,
      frontFoot: 'FAIR DELIVERY',
      ultraEdge: appealType === 'CAUGHT BEHIND' ? 'SPIKE DETECTED (EDGE)' : 'FLATLINE (NO BAT)',
      pitching: 'IN LINE',
      impact: 'IN LINE',
      wickets: 'HITTING',
      decision: 'UPHELD',
      finalVerdict: 'OUT',
      isUmpiresCall: false,
      retainReview: false,
      speedKmh: ball.speedKmh,
      bounceHeightCm,
      seamDeviationDeg,
      stumpOverlapPct: overlap,
      pitchX: 200,
      pitchY: 158,
      impactX: 200,
      impactY: 92,
      targetStumpX: 200,
      summaryText:
        appealType === 'CAUGHT BEHIND'
          ? `DECISION UPHELD — OUT! UltraEdge confirms a sharp acoustic spike as the ${ball.speedKmh} km/h delivery kisses the outside edge. ${ball.batter.name} departs; 1 review lost.`
          : `DECISION UPHELD (THREE REDS) — OUT! Hawk-Eye confirms pitching in line, impact in line, and ${overlap}% crashing into middle stump (${bounceHeightCm} cm height). 1 review deducted.`,
    };
  }

  /**
   * Runs Monte Carlo Simulation (e.g. 5,000 matches) between two teams with contextual factors
   */
  static runMonteCarloSimulation(
    teamA: Team,
    teamB: Team,
    stadium: Stadium,
    dew: boolean,
    simCount = 5000
  ): MonteCarloResult {
    let teamAWins = 0;
    const scoresA: number[] = [];

    // Factor weightings
    const battingDiff = teamA.ratings.batting - teamB.ratings.batting;
    const bowlingDiff = teamA.ratings.bowling - teamB.ratings.bowling;
    const deathDiff = teamA.ratings.deathOvers - teamB.ratings.deathOvers;
    const venueAvg = stadium.avgFirstInningsScore;

    for (let i = 0; i < simCount; i++) {
      // Gaussian randomized scores
      const noiseA = (Math.random() + Math.random() + Math.random() - 1.5) * 24;
      const noiseB = (Math.random() + Math.random() + Math.random() - 1.5) * 24;

      const scoreA = Math.round(venueAvg + battingDiff * 1.2 - (teamB.ratings.bowling - 90) * 0.8 + noiseA);
      const scoreB = Math.round(venueAvg + (teamB.ratings.batting - 90) * 1.2 - bowlingDiff * 0.8 + (dew ? 6 : 0) + noiseB);

      scoresA.push(scoreA);

      if (scoreA > scoreB) {
        teamAWins++;
      } else if (scoreA === scoreB && Math.random() > 0.5) {
        teamAWins++;
      }
    }

    scoresA.sort((a, b) => a - b);
    const medianScoreA = scoresA[Math.floor(scoresA.length * 0.5)];
    const score10th = scoresA[Math.floor(scoresA.length * 0.1)];
    const score90th = scoresA[Math.floor(scoresA.length * 0.9)];

    const teamAWinPercent = Math.round((teamAWins / simCount) * 1000) / 10;
    const teamBWinPercent = Math.round((100 - teamAWinPercent) * 10) / 10;

    const factors = [
      {
        name: 'Top-Order Firepower',
        impactPercent: Math.abs(battingDiff * 1.1),
        favorTeam: battingDiff >= 0 ? ('teamA' as const) : ('teamB' as const),
        reason: `${battingDiff >= 0 ? teamA.name : teamB.name} generates 1.2 higher boundary rate in overs 1-6.`,
      },
      {
        name: 'Death Overs Bowling',
        impactPercent: Math.abs(deathDiff * 1.3),
        favorTeam: deathDiff >= 0 ? ('teamA' as const) : ('teamB' as const),
        reason: `${deathDiff >= 0 ? teamA.name : teamB.name} concedes fewer runs in overs 16-20 with elite yorker specialists.`,
      },
      {
        name: 'Venue & Dew Factor',
        impactPercent: dew ? 5.8 : 2.4,
        favorTeam: dew ? ('teamB' as const) : ('teamA' as const),
        reason: dew ? `Heavy dew in ${stadium.city} favors chasing side with 14% lower bowling grip efficiency.` : 'True pitch bounce ensures balanced contest.',
      },
      {
        name: 'Tournament Head-to-Head Form',
        impactPercent: 3.5,
        favorTeam: teamA.ratings.overall >= teamB.ratings.overall ? ('teamA' as const) : ('teamB' as const),
        reason: `Recent 5-game momentum and net run rate advantage.`,
      },
    ];

    return {
      simulationsRun: simCount,
      teamAWins,
      teamBWins: simCount - teamAWins,
      teamAWinPercent,
      teamBWinPercent,
      medianScoreA,
      score10thPercentile: score10th,
      score90thPercentile: score90th,
      mostLikelyMargin: `${teamAWinPercent >= 50 ? teamA.name : teamB.name} by 8 - 18 runs / 4 wickets`,
      factors,
    };
  }

  /**
   * Simulates What-If scenarios with quantitative win rate comparisons
   */
  static runWhatIfScenario(
    baseTeamA: Team,
    baseTeamB: Team,
    stadium: Stadium,
    scenarioType: 'BUMRAH_OUT' | 'HEAVY_DEW' | 'SLOW_PITCH' | 'SKY_PROMOTED' | 'TARGET_210'
  ) {
    const baseMC = CricketIntelligenceEngine.runMonteCarloSimulation(baseTeamA, baseTeamB, stadium, false, 2000);
    const baseWin = baseMC.teamAWinPercent;

    let modifiedWin = baseWin;
    let description = '';
    let tacticalInsight = '';

    switch (scenarioType) {
      case 'BUMRAH_OUT':
        modifiedWin = Math.max(15, baseWin - 13.8);
        description = 'Key strike bowler Jasprit Bumrah rested / unavailable';
        tacticalInsight = 'Removing Bumrah increases death over economy from 6.8 to 11.2, resulting in a -13.8% win probability drop.';
        break;
      case 'HEAVY_DEW':
        modifiedWin = Math.max(15, baseWin - 6.5);
        description = 'Outfield soaked with heavy evening dew';
        tacticalInsight = 'Slippery ball diminishes spin revolutions by 35% and increases boundary frequency off misfielded ground balls.';
        break;
      case 'SLOW_PITCH':
        modifiedWin = Math.min(95, baseWin + 4.2);
        description = 'Surface baked dry, gripping and turning 3.4 degrees';
        tacticalInsight = 'Spin choke suppresses opponent boundary percentage, favoring disciplined subcontinental spinners.';
        break;
      case 'SKY_PROMOTED':
        modifiedWin = Math.min(95, baseWin + 3.1);
        description = 'Suryakumar Yadav promoted to bat at #3 in powerplay';
        tacticalInsight = 'SKY facing 8 extra deliveries in the first 10 overs generates an expected +14 bonus runs.';
        break;
      case 'TARGET_210':
        modifiedWin = Math.max(10, baseWin - 18.5);
        description = 'Defending a target shifted to 210+';
        tacticalInsight = 'Chasing 10.5+ RRR from ball one elevates early wicket hazards dramatically.';
        break;
    }

    return {
      scenarioType,
      description,
      tacticalInsight,
      baseWinPercent: baseWin,
      scenarioWinPercent: Math.round(modifiedWin * 10) / 10,
      delta: Math.round((modifiedWin - baseWin) * 10) / 10,
    };
  }

  /**
   * Calculates over-by-over historical average run rate curve for a specific venue.
   * Calibrated using venue average first-innings totals, pitch factors, and standard T20 phases.
   */
  static calculateVenueHistoricalRunRateCurve(stadium: Stadium, totalOvers = 20): Array<{
    over: number;
    historicalAvgRR: number;
    historicalAccumulatedRuns: number;
    phase: 'powerplay' | 'middle' | 'death';
  }> {
    const venueAvg = stadium?.avgFirstInningsScore || 168;
    const baseRPO = venueAvg / totalOvers; // Average runs per over overall

    const curve: Array<{
      over: number;
      historicalAvgRR: number;
      historicalAccumulatedRuns: number;
      phase: 'powerplay' | 'middle' | 'death';
    }> = [];

    let accumulatedRuns = 0;

    for (let o = 1; o <= totalOvers; o++) {
      let phaseFactor = 1.0;
      let phase: 'powerplay' | 'middle' | 'death' = 'middle';

      if (o <= 6) {
        // Powerplay: field restrictions allow 1.08x baseline scoring
        phase = 'powerplay';
        phaseFactor = 1.06;
      } else if (o <= 15) {
        // Middle overs: spinners operate, boundaries harder to access (0.94x)
        phase = 'middle';
        phaseFactor = 0.94;
      } else {
        // Death overs: maximum aggression, 1.32x baseline scoring
        phase = 'death';
        phaseFactor = 1.34;
      }

      // Pitch adjustment: Pace & Bounce grounds allow slightly higher death run rates
      if (stadium?.pitchType === 'Pace & Bounce' && o >= 16) {
        phaseFactor += 0.08;
      } else if (stadium?.pitchType === 'Slow & Turning' && o >= 7 && o <= 15) {
        phaseFactor -= 0.06;
      }

      const expectedOverRuns = baseRPO * phaseFactor;
      accumulatedRuns += expectedOverRuns;

      const historicalAvgRR = Number((accumulatedRuns / o).toFixed(2));

      curve.push({
        over: o,
        historicalAvgRR,
        historicalAccumulatedRuns: Math.round(accumulatedRuns),
        phase,
      });
    }

    return curve;
  }

  /**
   * Generates dynamic high-speed boundary relay scenarios for reflex fielding drills.
   */
  static getBoundaryReflexScenarios(): Array<{
    id: string;
    title: string;
    batterName: string;
    fielderName: string;
    fielderRole: string;
    shotType: string;
    boundaryZone: string;
    exitSpeedKmh: number;
    boundaryDistanceMeters: number;
    fielderSprintSpeedKmh: number;
    cutoffWindowMs: number;
    targetStumps: 'striker' | 'non-striker' | 'keeper';
    throwDistanceMeters: number;
    optimalThrowSpeedKmh: number;
    difficulty: 'Foundation' | 'Club Pro' | 'First Class' | 'International' | 'Masterclass';
  }> {
    return [
      {
        id: 'cover_boundary_bullet',
        title: 'Deep Extra Cover Sliding Cutoff & Bullet Relay',
        batterName: 'Travis Head',
        fielderName: 'Ravindra Jadeja',
        fielderRole: 'Gun Boundary Specialist',
        shotType: 'Lofted Inside-Out Cover Drive',
        boundaryZone: 'Extra Cover Fence (68m)',
        exitSpeedKmh: 148,
        boundaryDistanceMeters: 72,
        fielderSprintSpeedKmh: 31.4,
        cutoffWindowMs: 160,
        targetStumps: 'keeper',
        throwDistanceMeters: 62,
        optimalThrowSpeedKmh: 142,
        difficulty: 'Masterclass',
      },
      {
        id: 'cow_corner_rocket',
        title: 'Deep Mid-Wicket Rope Slide & Stumps Direct Hit',
        batterName: 'Heinrich Klaasen',
        fielderName: 'Glenn Maxwell',
        fielderRole: 'Precision Relay Arm',
        shotType: 'Flat Pull Shot to Cow Corner',
        boundaryZone: 'Deep Mid-Wicket Rope (76m)',
        exitSpeedKmh: 154,
        boundaryDistanceMeters: 78,
        fielderSprintSpeedKmh: 29.8,
        cutoffWindowMs: 145,
        targetStumps: 'non-striker',
        throwDistanceMeters: 68,
        optimalThrowSpeedKmh: 138,
        difficulty: 'International',
      },
      {
        id: 'long_off_tapback',
        title: 'Long-Off Tap-Back & Quick Gather Throw',
        batterName: 'David Miller',
        fielderName: 'Suryakumar Yadav',
        fielderRole: 'Acrobatic Boundary Sweeper',
        shotType: 'High Straight Lofted Drive',
        boundaryZone: 'Long-Off Sight Screen (74m)',
        exitSpeedKmh: 139,
        boundaryDistanceMeters: 75,
        fielderSprintSpeedKmh: 28.6,
        cutoffWindowMs: 190,
        targetStumps: 'striker',
        throwDistanceMeters: 64,
        optimalThrowSpeedKmh: 135,
        difficulty: 'First Class',
      },
      {
        id: 'deep_point_slide',
        title: 'Deep Backward Point Cutoff & Flat Relay Turn',
        batterName: 'Jos Buttler',
        fielderName: 'Mitchell Santner',
        fielderRole: 'Deep Ring Sweeper',
        shotType: 'Square Cut Through Point Gap',
        boundaryZone: 'Deep Backward Point (64m)',
        exitSpeedKmh: 144,
        boundaryDistanceMeters: 66,
        fielderSprintSpeedKmh: 30.2,
        cutoffWindowMs: 170,
        targetStumps: 'striker',
        throwDistanceMeters: 58,
        optimalThrowSpeedKmh: 140,
        difficulty: 'Club Pro',
      },
    ];
  }
}

