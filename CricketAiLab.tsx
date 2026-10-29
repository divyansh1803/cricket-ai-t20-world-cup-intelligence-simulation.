import React, { useState } from 'react';
import { useGame } from '../../context/GameContext';
import { TEAMS, STADIUMS } from '../../data/cricketData';
import { COACHES, STADIUM_DNAS } from '../../data/cricketLabData';
import { Team, Stadium, Coach } from '../../types/cricket';
import { CountryFlag, TeamCrest, PlayerCardAvatar, getTeamDisplayName } from '../common/CricketIdentity';
import { PitchInspector } from '../common/PitchInspector';
import { calculateTeamChemistry, generateMatchStory } from '../../utils/playerAnalytics';
import { cricketAudio } from '../../utils/audioSystem';
import {
  Cpu,
  Sparkles,
  Shield,
  RotateCcw,
  Play,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Layers,
  Award,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Zap,
} from 'lucide-react';

import { TacticalDrillLibrary } from './TacticalDrillLibrary';
import { CustomDrillEditor } from './CustomDrillEditor';

export const CricketAiLab: React.FC = () => {
  const { addXp, setActiveView } = useGame();

  // Step state: 1: Setup -> 2: Tactical Drills -> 3: Custom Drill Editor -> 4: Dressing Room -> 5: Decision IQ -> 6: Alternate Reality & Story
  const [activeTab, setActiveTab] = useState<'setup' | 'drills' | 'custom_drills' | 'tactics' | 'decisions' | 'alternate' | 'story'>('setup');

  // Match Setup State
  const [teamA, setTeamA] = useState<Team>(TEAMS[0]); // India
  const [teamB, setTeamB] = useState<Team>(TEAMS[1]); // Australia
  const [selectedCoach, setSelectedCoach] = useState<Coach>(COACHES[0]); // Gautam Gambhir
  const [selectedStadium, setSelectedStadium] = useState<Stadium>(STADIUMS[0]);
  const [matchOvers, setMatchOvers] = useState<number>(20);
  const [pitchCondition, setPitchCondition] = useState<'Flat Hard' | 'Slow Gripping' | 'Green Seamer'>('Flat Hard');
  const [dewLevel, setDewLevel] = useState<'Low' | 'Moderate' | 'Heavy'>('Heavy');
  const [weatherTemp, setWeatherTemp] = useState<number>(29);
  const [showPitchInspector, setShowPitchInspector] = useState<boolean>(false);

  // Chemistry calculation
  const chemistry = calculateTeamChemistry(teamA.squad);

  // Decision IQ State
  const [decisionStep, setDecisionStep] = useState<number>(0);
  const [userDecisionChoice, setUserDecisionChoice] = useState<number | null>(null);
  const [decisionIqScore, setDecisionIqScore] = useState<number | null>(null);

  // Alternate Reality State
  const [altScenarioId, setAltScenarioId] = useState<string>('bumrah_18th');

  const labDecisions = [
    {
      situation: 'Overs 16.0: Opposition needs 48 runs from 24 balls with two aggressive batters at crease.',
      question: 'Who should bowl the 17th over?',
      options: [
        { label: 'Jasprit Bumrah (Frontline Death Spearhead)', score: 94, reason: 'Striking now breaks the set partnership before the required rate eases.', probDelta: '+12.4%' },
        { label: 'Sixth Bowler / Part-time Spinner', score: 38, reason: 'High risk of leaking 16+ runs against set hitters.', probDelta: '-18.2%' },
        { label: 'Hardik Pandya (Cross-seam Cutters into the Pitch)', score: 82, reason: 'Viable containment option saving Bumrah for 18th & 20th overs.', probDelta: '+6.1%' },
      ],
    },
    {
      situation: 'Overs 6.2: Early wicket of opener at 44/1 in the Powerplay. Opponent spinner introduced.',
      question: 'Batting Order Adjustment:',
      options: [
        { label: 'Promote Pinch Hitter / Spin-basher to #3', score: 91, reason: 'Disrupts bowler rhythm and capitalizes on field restrictions.', probDelta: '+8.2%' },
        { label: 'Send Traditional Anchor to steady innings', score: 74, reason: 'Guarantees stability but suppresses powerplay scoring velocity.', probDelta: '+2.4%' },
        { label: 'Demote key finisher down to #7', score: 48, reason: 'Leaves high-impact batter with too few balls to face.', probDelta: '-11.0%' },
      ],
    },
  ];

  const currentDecision = labDecisions[decisionStep % labDecisions.length];

  const handleMakeDecision = (optIdx: number) => {
    if (userDecisionChoice !== null) return;
    setUserDecisionChoice(optIdx);
    const chosen = currentDecision.options[optIdx];
    setDecisionIqScore(chosen.score);

    cricketAudio.playBatHit();
    if (chosen.score >= 85) {
      setTimeout(() => cricketAudio.playVictory(), 200);
      addXp(180, `Masterclass Decision IQ: ${chosen.score}/100!`);
    } else {
      setTimeout(() => cricketAudio.playBoundary(), 200);
      addXp(80, `Tactical call logged: ${chosen.score}/100.`);
    }
  };

  const handleResetDecision = () => {
    setUserDecisionChoice(null);
    setDecisionIqScore(null);
    setDecisionStep((prev) => (prev + 1) % labDecisions.length);
  };

  const stadiumDna = STADIUM_DNAS[selectedStadium.id] || {
    pace: 82,
    spin: 64,
    boundaries: 88,
    dew: 90,
    chase: 86,
    powerplay: 84,
  };

  // Alternate reality calculations
  const altRealities: Record<string, { originalProb: number; altProb: number; title: string; narrative: string }> = {
    bumrah_18th: {
      originalProb: 61,
      altProb: 74,
      title: 'Bumrah Bowls Over 18 instead of Over 19',
      narrative: 'Bowling Bumrah in over 18 breaks the set partnership 6 balls earlier, forcing new batter to face death cutters, lifting win probability from 61% to 74%.',
    },
    hardik_at_3: {
      originalProb: 58,
      altProb: 66,
      title: 'Promote Hardik Pandya to #3',
      narrative: 'Targeting middle overs spin aggressively yields an extra 14 runs across overs 7-11.',
    },
    slow_deck: {
      originalProb: 64,
      altProb: 71,
      title: 'Pitch Baked Dry & Turning 4.2°',
      narrative: 'Subcontinental spin stranglehold suppresses opponent boundary conversion from 24% down to 14%.',
    },
  };

  const activeAlt = altRealities[altScenarioId] || altRealities.bumrah_18th;

  // Match story chapters
  const storyChapters = generateMatchStory([], teamA, teamB, 194, 5, 191);

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-16">
      {/* Title */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-purple-400 font-bold">
            <Cpu className="h-4 w-4" />
            <span>CRICKET AI LAB</span>
            <span aria-hidden="true">·</span>
            <span>STRATEGY & SIMULATION LABORATORY</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-1">
            Tactical Command Center
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Don't just watch cricket — control it. Command coaches, optimize team chemistry, test Decision IQ, and explore alternate realities.
          </p>
        </div>

        {/* Lab Navigation Switcher */}
        <div className="flex flex-wrap items-center gap-1 rounded-xl border border-slate-800 bg-slate-900 p-1 text-xs font-semibold">
          {[
            { id: 'setup', label: '1. Match Setup' },
            { id: 'drills', label: '2. Tactical Drill Library' },
            { id: 'custom_drills', label: '3. Custom Drill Editor' },
            { id: 'tactics', label: '4. Dressing Room' },
            { id: 'decisions', label: '5. Decision IQ' },
            { id: 'alternate', label: '6. Alternate Reality' },
            { id: 'story', label: '7. Match Story' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as unknown as typeof activeTab)}
              className={`rounded-lg px-3 py-1.5 transition-colors cursor-pointer ${
                activeTab === tab.id ? 'bg-purple-600 text-white font-bold shadow-md shadow-purple-600/30' : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* --- TAB 2: TACTICAL DRILL LIBRARY --- */}
      {activeTab === 'drills' && (
        <div className="rounded-2xl border border-purple-500/20 bg-slate-900/60 p-6 backdrop-blur-md">
          <TacticalDrillLibrary />
        </div>
      )}

      {/* --- TAB 3: CUSTOM DRILL EDITOR --- */}
      {activeTab === 'custom_drills' && (
        <div className="rounded-2xl border border-cyan-500/20 bg-slate-900/60 p-6 backdrop-blur-md">
          <CustomDrillEditor />
        </div>
      )}

      {/* --- TAB 1: SETUP & CHEMISTRY & STADIUM DNA --- */}
      {activeTab === 'setup' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Setup Controls */}
            <div className="lg:col-span-2 rounded-2xl border border-slate-800 bg-slate-900/80 p-6 space-y-5 backdrop-blur-md">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-purple-400" />
                <span>Simulation Configuration</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="text-slate-400 font-mono block mb-1">TEAM A (YOU)</label>
                  <select
                    value={teamA.id}
                    onChange={(e) => setTeamA(TEAMS.find((t) => t.id === e.target.value) || TEAMS[0])}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-bold text-white focus:border-purple-500 cursor-pointer"
                  >
                    {TEAMS.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} (Rank #{t.ranking})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 font-mono block mb-1">TEAM B (OPPONENT)</label>
                  <select
                    value={teamB.id}
                    onChange={(e) => setTeamB(TEAMS.find((t) => t.id === e.target.value) || TEAMS[1])}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-bold text-white focus:border-purple-500 cursor-pointer"
                  >
                    {TEAMS.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} (Rank #{t.ranking})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 font-mono block mb-1">HEAD COACH</label>
                  <select
                    value={selectedCoach.id}
                    onChange={(e) => setSelectedCoach(COACHES.find((c) => c.id === e.target.value) || COACHES[0])}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-bold text-white focus:border-purple-500 cursor-pointer"
                  >
                    {COACHES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({getTeamDisplayName(c.countryCode)})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 font-mono block mb-1">STADIUM VENUE</label>
                  <select
                    value={selectedStadium.id}
                    onChange={(e) => setSelectedStadium(STADIUMS.find((s) => s.id === e.target.value) || STADIUMS[0])}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-bold text-white focus:border-purple-500 cursor-pointer"
                  >
                    {STADIUMS.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}, {s.city}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 font-mono block mb-1">PITCH PROFILE</label>
                  <select
                    value={pitchCondition}
                    onChange={(e) => setPitchCondition(e.target.value as unknown as typeof pitchCondition)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-bold text-white focus:border-purple-500 cursor-pointer"
                  >
                    <option value="Flat Hard">Flat Hard (High Scoring 190+)</option>
                    <option value="Slow Gripping">Slow Gripping (Spin Turn 3.8°)</option>
                    <option value="Green Seamer">Green Seamer (Seam & Bounce)</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 font-mono block mb-1">DEW & ENVIRONMENT</label>
                  <select
                    value={dewLevel}
                    onChange={(e) => setDewLevel(e.target.value as unknown as typeof dewLevel)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-bold text-white focus:border-purple-500 cursor-pointer"
                  >
                    <option value="Heavy">Heavy Evening Dew (+12% Chase Advantage)</option>
                    <option value="Moderate">Moderate Dew</option>
                    <option value="Low">Dry Outfield</option>
                  </select>
                </div>
              </div>

              {/* Interactive 22-Yard Pitch Inspector Drawer Trigger */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs">
                <div className="min-w-0">
                  <span className="font-bold text-emerald-400 block">22-Yard Pitch Physics Inspector</span>
                  <p className="text-[11px] text-slate-300 mt-0.5">
                    Tweak moisture, grass blanket, cracks & dew micro-conditions in real time.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPitchInspector(!showPitchInspector)}
                  className="rounded-lg bg-emerald-500 px-3.5 py-2 font-bold text-slate-950 hover:bg-emerald-400 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  {showPitchInspector ? 'Hide Inspector' : 'Inspect 22 Yards'}
                </button>
              </div>

              {/* Coach Tactical Profile Summary */}
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <CountryFlag countryCode={selectedCoach.countryCode} size="sm" />
                    <span className="font-bold text-white">{selectedCoach.name} · Coach Brain Profile</span>
                  </div>
                  <span className="text-purple-400 font-mono font-bold">Aggression: {selectedCoach.tacticalProfile.aggression}/100</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed font-sans">{selectedCoach.coachingPhilosophy}</p>
                <div className="grid grid-cols-3 gap-2 text-[11px] font-mono text-slate-400 pt-1">
                  <div>Spin Focus: {selectedCoach.tacticalProfile.spinDependency}%</div>
                  <div>Youth Usage: {selectedCoach.tacticalProfile.youthUsage}%</div>
                  <div>Chasing Strategy: {selectedCoach.tacticalProfile.chasingStrategy}%</div>
                </div>
              </div>
            </div>

            {/* Stadium DNA & Team Chemistry */}
            <div className="space-y-6">
              {/* Team Chemistry Card */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 space-y-4 backdrop-blur-md">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-purple-400 font-bold">TEAM CHEMISTRY SCORE</span>
                  <span className="text-xl font-black text-white tabular-nums">{chemistry.overall}/100</span>
                </div>

                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 to-sky-500 transition-all duration-500"
                    style={{ width: `${chemistry.overall}%` }}
                  />
                </div>

                <div className="space-y-1.5 text-[11px] font-mono text-slate-400">
                  <div className="flex justify-between">
                    <span>Batting Balance:</span>
                    <span className="text-white font-bold">{chemistry.battingBalance}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Bowling Balance:</span>
                    <span className="text-white font-bold">{chemistry.bowlingBalance}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Left/Right Mix:</span>
                    <span className="text-white font-bold">{chemistry.leftRightBalance}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Finishing Depth:</span>
                    <span className="text-white font-bold">{chemistry.finishingDepth}%</span>
                  </div>
                </div>

                {chemistry.keySynergies.length > 0 && (
                  <div className="border-t border-slate-800 pt-2 text-[11px] text-emerald-400">
                    ✓ {chemistry.keySynergies[0]}
                  </div>
                )}
              </div>

              {/* Stadium DNA Card */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 space-y-3 backdrop-blur-md">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-sky-400 font-bold">VENUE DNA RADAR</span>
                  <span className="text-xs text-slate-400 font-mono">{selectedStadium.city}</span>
                </div>

                <div className="space-y-2 text-[11px] font-mono">
                  <div>
                    <div className="flex justify-between text-slate-400 mb-0.5">
                      <span>Pace & Bounce:</span>
                      <span className="text-white">{stadiumDna.pace}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                      <div className="h-full bg-sky-500" style={{ width: `${stadiumDna.pace}%` }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-slate-400 mb-0.5">
                      <span>Spin Grip:</span>
                      <span className="text-white">{stadiumDna.spin}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                      <div className="h-full bg-purple-500" style={{ width: `${stadiumDna.spin}%` }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-slate-400 mb-0.5">
                      <span>Chasing Advantage:</span>
                      <span className="text-white">{stadiumDna.chase}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                      <div className="h-full bg-emerald-500" style={{ width: `${stadiumDna.chase}%` }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Full-Width 22-Yard Pitch Physics Inspector */}
          {showPitchInspector && (
            <div className="animate-in fade-in duration-300">
              <PitchInspector
                stadiumName={`${selectedStadium.name} (${selectedStadium.city})`}
                onApplyConditions={(cond) => {
                  if (cond.grassCoverage >= 55) setPitchCondition('Green Seamer' as any);
                  else if (cond.pitchWear >= 50 || cond.turnDeg >= 3.2) setPitchCondition('Slow Gripping' as any);
                  else setPitchCondition('Flat Hard' as any);

                  if (cond.dewLevel >= 60) setDewLevel('Heavy' as any);
                  else if (cond.dewLevel >= 25) setDewLevel('Moderate' as any);
                  else setDewLevel('Low' as any);
                }}
              />
            </div>
          )}
        </div>
      )}

      {/* --- TAB 2: DRESSING ROOM TACTICAL PLAN --- */}
      {activeTab === 'tactics' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 space-y-6 backdrop-blur-md">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <span className="text-xs font-mono text-purple-400 font-bold">AI TACTICAL ROOM</span>
                <h2 className="text-lg font-bold text-white mt-0.5">
                  Pre-Match Masterplan: {teamA.name} vs {teamB.name}
                </h2>
              </div>
              <span className="text-xs font-mono text-slate-400">COACH: {selectedCoach.name}</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-2">
                <span className="font-bold text-sky-400 block">1. Powerplay Protocol (Overs 1-6)</span>
                <p className="text-slate-300 leading-relaxed font-sans">
                  Attack opposition new-ball bowler immediately. Target the extra-cover region with lofted drives. Expected powerplay benchmark: 58-64 runs with maximum 1 wicket loss.
                </p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-2">
                <span className="font-bold text-purple-400 block">2. Middle-Overs Spin Trap (Overs 7-14)</span>
                <p className="text-slate-300 leading-relaxed font-sans">
                  Deploy tandem spin options from both ends. Position deep backward point and cow-corner sweepers to choke boundaries down to under 12%.
                </p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-2">
                <span className="font-bold text-rose-400 block">3. Death Overs Reservation (Overs 16-20)</span>
                <p className="text-slate-300 leading-relaxed font-sans">
                  Preserve Bumrah or primary pacer strictly for overs 18 and 20. Execute wide yorkers outside fifth stump to eliminate straight lofted sixes.
                </p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-2">
                <span className="font-bold text-amber-400 block">4. Sixth Bowler Exploit Target</span>
                <p className="text-slate-300 leading-relaxed font-sans">
                  Identify {teamB.name}'s weak fifth/sixth bowling option. Target their overs for an expected 14+ run surge.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => {
                  cricketAudio.playBoundary();
                  addXp(120, 'Accepted AI Tactical Dressing Room Directives');
                  setActiveTab('decisions');
                }}
                className="rounded-xl bg-purple-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-purple-500 transition-colors cursor-pointer"
              >
                Accept Directive & Proceed to Decision IQ →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- TAB 3: DECISION IQ CALLS --- */}
      {activeTab === 'decisions' && (
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 space-y-6 backdrop-blur-md">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <span className="text-xs font-mono text-purple-400 font-bold">LIVE MATCH DECISION IQ</span>
                <h2 className="text-lg font-bold text-white mt-0.5">Tactical Situation Call</h2>
              </div>
              <span className="text-xs font-mono text-amber-400">+180 XP POTENTIAL</span>
            </div>

            {/* Situation Header */}
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-2">
              <p className="text-xs text-slate-400 font-mono">SITUATION IN THE MIDDLE:</p>
              <p className="text-sm font-bold text-white">{currentDecision.situation}</p>
              <p className="text-xs text-sky-400 font-semibold">{currentDecision.question}</p>
            </div>

            {/* Options */}
            <div className="space-y-3">
              {currentDecision.options.map((opt, idx) => {
                const isChosen = userDecisionChoice === idx;
                return (
                  <button
                    key={idx}
                    onClick={() => handleMakeDecision(idx)}
                    disabled={userDecisionChoice !== null}
                    className={`w-full text-left p-4 rounded-xl border transition-all cursor-pointer ${
                      userDecisionChoice !== null
                        ? isChosen
                          ? opt.score >= 85
                            ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300'
                            : 'border-amber-500 bg-amber-500/20 text-amber-300'
                          : 'border-slate-800 bg-slate-950 text-slate-500 opacity-60'
                        : 'border-slate-800 bg-slate-950 text-slate-200 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span>{opt.label}</span>
                      {userDecisionChoice !== null && isChosen && (
                        <span className="font-mono text-sm">{opt.score}/100 IQ</span>
                      )}
                    </div>
                    {userDecisionChoice !== null && isChosen && (
                      <p className="mt-2 text-xs text-slate-300 font-sans leading-relaxed">
                        {opt.reason} (Prob impact: {opt.probDelta})
                      </p>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Feedback and next */}
            {decisionIqScore !== null && (
              <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                <span className="text-xs font-mono text-slate-300">
                  Decision IQ Result:{' '}
                  <strong className={decisionIqScore >= 85 ? 'text-emerald-400' : 'text-amber-400'}>
                    {decisionIqScore}/100
                  </strong>
                </span>

                <button
                  onClick={handleResetDecision}
                  className="rounded-xl bg-purple-600 px-4 py-2 text-xs font-bold text-white hover:bg-purple-500 cursor-pointer"
                >
                  Next Tactical Call →
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- TAB 4: ALTERNATE REALITY SIMULATOR --- */}
      {activeTab === 'alternate' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 space-y-6 backdrop-blur-md">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <span className="text-xs font-mono text-purple-400 font-bold">ALTERNATE REALITY ENGINE</span>
                <h2 className="text-lg font-bold text-white mt-0.5">What If You Changed This Key Decision?</h2>
              </div>
              <span className="text-xs text-slate-400 font-mono">1,000 MULTIVERSE RUNS</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { id: 'bumrah_18th', label: 'Bumrah in Over 18', delta: '+13%' },
                { id: 'hardik_at_3', label: 'Hardik Promoted to #3', delta: '+8%' },
                { id: 'slow_deck', label: 'Pitch Turned 4.2°', delta: '+7%' },
              ].map((sc) => (
                <button
                  key={sc.id}
                  onClick={() => {
                    setAltScenarioId(sc.id);
                    cricketAudio.playBatHit();
                  }}
                  className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                    altScenarioId === sc.id
                      ? 'border-purple-500 bg-purple-500/20 text-white font-bold'
                      : 'border-slate-800 bg-slate-950 text-slate-300'
                  }`}
                >
                  <span className="text-xs block">{sc.label}</span>
                  <span className="text-[11px] font-mono text-emerald-400">{sc.delta} Win Shift</span>
                </button>
              ))}
            </div>

            {/* Comparison Display */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-5 space-y-2">
                <span className="text-xs font-mono text-slate-400">ORIGINAL MATCH TIMELINE</span>
                <p className="text-3xl font-black text-white tabular-nums">{activeAlt.originalProb}%</p>
                <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div className="h-full bg-slate-500" style={{ width: `${activeAlt.originalProb}%` }} />
                </div>
              </div>

              <div className="rounded-xl border border-purple-500/40 bg-purple-500/10 p-5 space-y-2">
                <span className="text-xs font-mono text-purple-300 font-bold">ALTERNATE REALITY OUTCOME</span>
                <p className="text-3xl font-black text-emerald-400 tabular-nums">{activeAlt.altProb}%</p>
                <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div className="h-full bg-emerald-500" style={{ width: `${activeAlt.altProb}%` }} />
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 text-xs text-slate-300 leading-relaxed font-sans">
              <strong className="text-white block mb-1">{activeAlt.title}</strong>
              {activeAlt.narrative}
            </div>
          </div>
        </div>
      )}

      {/* --- TAB 5: MATCH STORY GENERATOR --- */}
      {activeTab === 'story' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 space-y-6 backdrop-blur-md">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <span className="text-xs font-mono text-purple-400 font-bold">CINEMATIC MATCH STORY GENERATOR</span>
                <h2 className="text-lg font-bold text-white mt-0.5">
                  The Story of the Clash: {teamA.name} vs {teamB.name}
                </h2>
              </div>
              <span className="text-xs font-mono text-slate-400">4 CHAPTERS</span>
            </div>

            <div className="space-y-4">
              {storyChapters.map((ch, idx) => (
                <div key={idx} className="rounded-xl border border-slate-800 bg-slate-950 p-5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-purple-400">{ch.title}</span>
                    <span className="text-xs font-mono text-slate-500">{ch.oversRange}</span>
                  </div>
                  <h3 className="text-sm font-bold text-white">{ch.headline}</h3>
                  <p className="text-xs text-slate-300 leading-relaxed font-sans">{ch.narrative}</p>
                  <div className="flex items-center justify-between border-t border-slate-900 pt-2 text-[11px] font-mono text-slate-400">
                    <span>Key Moment: {ch.keyMoment}</span>
                    <span className="text-emerald-400 font-bold">{ch.winProbShift}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
