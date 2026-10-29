import { useState, useCallback, useRef } from 'react';
import { BallEvent, Player } from '../types/cricket';
import { audioManager } from '../services/AudioManager';
import { cricketAudio } from '../utils/audioSystem';

export type CommentaryEventType = 'SIX' | 'FOUR' | 'WICKET' | 'DOT' | 'RUNS' | 'DRS' | 'MILESTONE';

export interface CommentaryEntry {
  id: string;
  over: string;
  ballInOver: number;
  text: string;
  eventType: CommentaryEventType;
  runs: number;
  isWicket: boolean;
  strikerName: string;
  bowlerName: string;
  timestamp: number;
}

export interface MatchCommentaryContext {
  runsNeeded?: number;
  ballsRemaining?: number;
  currentOver?: number;
  totalOvers?: number;
  target?: number;
  wickets?: number;
  battingTeam?: string;
  bowlingTeam?: string;
}

export interface UseDynamicCommentaryOptions {
  enableVoice?: boolean;
  enableAudioCues?: boolean;
  maxEntries?: number;
  onCommentary?: (entry: CommentaryEntry) => void;
}

// Crisp, realistic sports broadcast phrases
const SIX_PHRASES = [
  (b: string, s: string) => `SMASHED! ${s} launches ${b} deep into the stands for a huge maximum!`,
  (b: string, s: string) => `SIX! Right out of the screws from ${s}! That is soaring over the ropes!`,
  (b: string, s: string) => `MASSIVE! ${s} connects cleanly off ${b} and clears the boundary with disdain!`,
  (b: string, s: string) => `HIGH AND HANDSOME! Magnificent strike from ${s}, into the top tier!`,
];

const FOUR_PHRASES = [
  (b: string, s: string) => `CRACKED! Pure timing from ${s}, carving through extra cover for four!`,
  (b: string, s: string) => `FOUR! ${s} finds the gap with precision, racing away to the boundary rope!`,
  (b: string, s: string) => `SHOT! Sublime stroke play by ${s} beating the diving sweeper for four!`,
  (b: string, s: string) => `BEAUTIFULLY TIMED! ${s} punches ${b} through point for a classy boundary!`,
];

const WICKET_PHRASES = [
  (b: string, s: string, w = 'OUT') => `GONE! ${b} strikes! Clean breakthrough, ${s} has to walk back!`,
  (b: string, s: string, w = 'OUT') => `OUT! Timber! ${b} shatters the defense of ${s}, massive moment in the match!`,
  (b: string, s: string, w = 'OUT') => `WICKET! Edged and taken! ${b} celebrates as ${s} departs!`,
  (b: string, s: string, w = 'OUT') => `IN THE AIR AND CAUGHT! ${b} outfoxes ${s}, crucial wicket goes down!`,
];

const DOT_PHRASES = [
  (b: string, s: string) => `Beaten! ${b} gets steep bounce past the outside edge of ${s}. Dot ball.`,
  (b: string, s: string) => `Play and a miss! Excellent probing corridor from ${b}.`,
  (b: string, s: string) => `Defended solidly right back down the pitch. No run.`,
  (b: string, s: string) => `Good length, tightly tucked to mid-wicket, fielders prevent the single.`,
];

const RUNS_PHRASES = [
  (b: string, s: string, r: number) => `Pushed into the gap, ${s} hustles through for ${r === 1 ? 'a quick single' : `${r} sharp runs`}.`,
  (b: string, s: string, r: number) => `Turned away off the pads for ${r === 1 ? 'a single' : `${r} runs`}, keeping the strike rotating.`,
  (b: string, s: string, r: number) => `Driven firmly down the ground for ${r === 1 ? 'one' : `${r} runs`}.`,
];

/**
 * useDynamicCommentary Hook
 * Generates concise event-based commentary and triggers synchronized audio cues.
 */
export function useDynamicCommentary(options: UseDynamicCommentaryOptions = {}) {
  const {
    enableVoice = true,
    enableAudioCues = true,
    maxEntries = 35,
    onCommentary,
  } = options;

  const [commentaryList, setCommentaryList] = useState<CommentaryEntry[]>([]);
  const [latestEntry, setLatestEntry] = useState<CommentaryEntry | null>(null);
  const [isVoiceActive, setIsVoiceActive] = useState<boolean>(false);

  const counterRef = useRef<number>(0);

  /**
   * Process a ball event: Generates text commentary and fires audio cues
   */
  const processBallEvent = useCallback(
    (event: BallEvent, context?: MatchCommentaryContext): CommentaryEntry => {
      counterRef.current += 1;
      const bName = event.bowler?.name || 'Bowler';
      const sName = event.batter?.name || 'Batter';
      const runs = event.runsScored;
      const isWkt = event.isWicket;

      let eventType: CommentaryEventType = 'RUNS';
      let text = '';

      if (isWkt) {
        eventType = 'WICKET';
        if (event.wicketType === 'Run Out' || event.wicketType === 'Stumped') {
          text = event.commentary;
        } else {
          const pickFn = WICKET_PHRASES[Math.floor(Math.random() * WICKET_PHRASES.length)];
          text = pickFn(bName, sName, event.wicketType || 'OUT');
        }

        if (enableAudioCues) {
          audioManager.playWicketFall();
          audioManager.playCloseCallGasp('Wicket Fallen');
        }

        if (enableVoice && !audioManager.isDrsReviewActive()) {
          setIsVoiceActive(true);
          audioManager.speakAiCommentary(text, {
            mood: 'excited',
            rate: 1.12,
            onEnd: () => setIsVoiceActive(false),
          });
        }
      } else if (event.extraType === 'noBall') {
        eventType = (event.batterRuns || 0) >= 6 ? 'SIX' : (event.batterRuns || 0) >= 4 ? 'FOUR' : 'RUNS';
        text = event.commentary;
        if (enableAudioCues) {
          if ((event.batterRuns || 0) >= 6) audioManager.playSixRoar();
          else if ((event.batterRuns || 0) >= 4) audioManager.playBoundaryApplause();
          else cricketAudio.playBatHit();
        }
      } else if (event.extraType === 'wide' || event.extraType === 'bye' || event.extraType === 'legBye') {
        eventType = runs >= 4 ? 'FOUR' : 'RUNS';
        text = event.commentary;
        if (enableAudioCues) {
          cricketAudio.playBatHit();
        }
      } else if (runs === 6) {
        eventType = 'SIX';
        const pickFn = SIX_PHRASES[Math.floor(Math.random() * SIX_PHRASES.length)];
        text = pickFn(bName, sName);

        if (enableAudioCues) {
          audioManager.playBatHit();
          audioManager.playSixRoar();
        }

        if (enableVoice && !audioManager.isDrsReviewActive()) {
          setIsVoiceActive(true);
          audioManager.speakAiCommentary(text, {
            mood: 'excited',
            rate: 1.15,
            onEnd: () => setIsVoiceActive(false),
          });
        }
      } else if (runs === 4) {
        eventType = 'FOUR';
        const pickFn = FOUR_PHRASES[Math.floor(Math.random() * FOUR_PHRASES.length)];
        text = pickFn(bName, sName);

        if (enableAudioCues) {
          audioManager.playBatHit();
          audioManager.playBoundaryApplause();
        }

        if (enableVoice && !audioManager.isDrsReviewActive()) {
          setIsVoiceActive(true);
          audioManager.speakAiCommentary(text, {
            mood: 'technical',
            rate: 1.05,
            onEnd: () => setIsVoiceActive(false),
          });
        }
      } else if (runs === 0) {
        eventType = 'DOT';
        const pickFn = DOT_PHRASES[Math.floor(Math.random() * DOT_PHRASES.length)];
        text = pickFn(bName, sName);

        if (enableAudioCues) {
          audioManager.playBatHit();
        }
      } else {
        eventType = 'RUNS';
        const pickFn = RUNS_PHRASES[Math.floor(Math.random() * RUNS_PHRASES.length)];
        text = pickFn(bName, sName, runs);

        if (enableAudioCues) {
          cricketAudio.playBatHit();
        }
      }

      // Add situational context if tight chase in death overs
      if (context?.runsNeeded !== undefined && context.ballsRemaining !== undefined && context.ballsRemaining <= 18 && context.runsNeeded > 0) {
        text += ` [${context.runsNeeded} needed off ${context.ballsRemaining} balls]`;
      }

      const overStr = `${event.overNumber}.${event.ballInOver}`;
      const entry: CommentaryEntry = {
        id: `comm-${Date.now()}-${counterRef.current}`,
        over: overStr,
        ballInOver: event.ballInOver,
        text,
        eventType,
        runs,
        isWicket: isWkt,
        strikerName: sName,
        bowlerName: bName,
        timestamp: Date.now(),
      };

      setLatestEntry(entry);
      setCommentaryList((prev) => [entry, ...prev.slice(0, maxEntries - 1)]);

      if (onCommentary) {
        onCommentary(entry);
      }

      return entry;
    },
    [enableVoice, enableAudioCues, maxEntries, onCommentary]
  );

  /**
   * Inject DRS or custom umpire commentary
   */
  const triggerDrsCommentary = useCallback(
    (customText: string, overStr = 'DRS') => {
      const entry: CommentaryEntry = {
        id: `comm-drs-${Date.now()}`,
        over: overStr,
        ballInOver: 0,
        text: customText,
        eventType: 'DRS',
        runs: 0,
        isWicket: false,
        strikerName: 'Third Umpire',
        bowlerName: 'DRS Review',
        timestamp: Date.now(),
      };

      setLatestEntry(entry);
      setCommentaryList((prev) => [entry, ...prev.slice(0, maxEntries - 1)]);
      if (onCommentary) onCommentary(entry);
    },
    [maxEntries, onCommentary]
  );

  const clearCommentary = useCallback(() => {
    setCommentaryList([]);
    setLatestEntry(null);
  }, []);

  return {
    latestEntry,
    commentaryList,
    isVoiceActive,
    processBallEvent,
    triggerDrsCommentary,
    clearCommentary,
  };
}
