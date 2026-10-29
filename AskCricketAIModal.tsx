import React, { useState } from 'react';
import { useGame } from '../../context/GameContext';
import { X, Send, Sparkles, HelpCircle } from 'lucide-react';

interface PrebuiltQuery {
  title: string;
  query: string;
  answer: string;
}

const PREBUILT_QUERIES: PrebuiltQuery[] = [
  {
    title: 'Why did win probability drop after a wicket?',
    query: 'Why did India\'s win probability fall from 68% to 54% after losing a wicket?',
    answer:
      'Losing a set batter produces an immediate compounding statistical shock: 1) The required run rate jumps relative to the new batter\'s settle-in curve (average 4.2 balls to reach 100+ SR). 2) Boundary hazard probability drops by ~14% in the subsequent over. 3) Bowlers are able to pitch fuller attacking deliveries without fear of predetermined scoops.',
  },
  {
    id_tag: 'death-bowler',
    title: 'Who is the world\'s best death bowler?',
    query: 'Who statistically dominates the death overs (overs 16-20) in T20 international cricket?',
    answer:
      'Jasprit Bumrah is historically unrivaled in the death overs with a 6.42 economy rate and 48.6% dot ball percentage. His release point generates an optical illusion with late reverse swing. Mitchell Starc and Arshdeep Singh follow with superior wicket strike rates (a wicket every 8.4 deliveries at the death).',
  } as unknown as PrebuiltQuery,
  {
    title: 'How does heavy evening dew affect chases?',
    query: 'What quantitative advantage does dew provide to the team batting second?',
    answer:
      'Heavy dew increases chasing win probability by approximately +14%. The moisture coats the ball seams, reducing spin rpm by up to 35% and causing fast bowlers\' yorkers to slip into knee-high full tosses. Furthermore, wet outfields reduce ball friction, converting potential 2s into outfield boundaries.',
  },
  {
    title: 'How to counter Jasprit Bumrah\'s yorker?',
    query: 'What is the optimal batting strategy against Bumrah in overs 18-20?',
    answer:
      'Data indicates stepping out of the crease to convert full yorkers into half-volleys yields a high dismissal rate (bowled/LBW). The highest scoring efficiency (+18% boundary rate) comes from deep crease alignment paired with late ramp/scoop attempts behind the wicket, where slip fielders are vacated.',
  },
  {
    title: 'Explain DRS Umpire\'s Call rule',
    query: 'Why does Umpire\'s Call exist in LBW reviews under DRS?',
    answer:
      'Hawkeye ball-tracking technology operates with a calibrated statistical margin of error (~2.5mm - 5mm). Umpire\'s Call is not a referee preference, but a scientific tolerance zone: if less than 50% of the projected ball impacts the stumps, the model cannot disprove the original human on-field decision beyond reasonable doubt.',
  },
];

export const AskCricketAIModal: React.FC = () => {
  const { isAskAiOpen, setAskAiOpen } = useGame();
  const [messages, setMessages] = useState<Array<{ sender: 'user' | 'ai'; text: string }>>([
    {
      sender: 'ai',
      text: 'Welcome to the Cricket AI Intelligence Center. Ask me any tactical query, match prediction logic, player matchup breakdown, or simulation question.',
    },
  ]);
  const [inputVal, setInputVal] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  if (!isAskAiOpen) return null;

  const handleSend = (text: string) => {
    if (!text.trim()) return;

    const userMsg = text.trim();
    setMessages((prev) => [...prev, { sender: 'user', text: userMsg }]);
    setInputVal('');
    setIsTyping(true);

    // Context-sensitive tactical answer generation
    setTimeout(() => {
      let response = '';
      const lower = userMsg.toLowerCase();

      const matchedPrebuilt = PREBUILT_QUERIES.find((q) =>
        lower.includes(q.title.toLowerCase().slice(0, 15)) || userMsg.includes(q.query.slice(0, 20))
      );

      if (matchedPrebuilt) {
        response = matchedPrebuilt.answer;
      } else if (lower.includes('bumrah') || lower.includes('death')) {
        response =
          'Jasprit Bumrah\'s impact score is 98/100. In death overs, his expected runs conceded per over is just 6.4 against elite batters, compared to the tournament average of 11.2. Defending 12+ runs in the 20th over with Bumrah yields an 89.4% win probability.';
      } else if (lower.includes('sky') || lower.includes('suryakumar')) {
        response =
          'Suryakumar Yadav holds an unmatched 360° wagon wheel with 32% of death runs scored behind square leg and fine leg at a strike rate of 215.8. Bowling wide outside off-stump with deep third-man and backward point is the most effective containment field.';
      } else if (lower.includes('toss') || lower.includes('dew') || lower.includes('chase')) {
        response =
          'At venues like Ahmedabad and Eden Gardens, teams winning the toss choose to bowl first 88% of the time due to heavy evening dew. The second innings scoring rate is on average 0.82 runs per over higher than the first innings.';
      } else if (lower.includes('rashid') || lower.includes('spin')) {
        response =
          'Rashid Khan releases his googly at 98-102 km/h, which is 12 km/h faster than standard wrist-spinners. This gives batters only 0.48 seconds to identify rotation off the seam, suppressing sweep execution by 44%.';
      } else {
        response =
          `Tactical Analysis: Based on tournament models, T20 outcomes hinge on death-over execution (overs 16-20 account for 42% of match win probability swings). Teams with greater than 20% boundary frequency and under 35% dot ball rate win 81.3% of matches regardless of pitch conditions.`;
      }

      setMessages((prev) => [...prev, { sender: 'ai', text: response }]);
      setIsTyping(false);
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="relative flex h-[85vh] max-h-[640px] w-full max-w-2xl flex-col rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4 bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/10 border border-sky-500/30 text-sky-400">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-wide">Cricket AI Tactical Assistant</h2>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span>Cricket Intelligence Engine</span>
                <span aria-hidden="true">·</span>
                <span className="text-emerald-400">Online</span>
              </div>
            </div>
          </div>
          <button
            onClick={() => setAskAiOpen(false)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Quick query chips */}
        <div className="border-b border-slate-800/60 bg-slate-900/30 px-5 py-2.5 overflow-x-auto scrollbar-none">
          <div className="flex items-center gap-2 whitespace-nowrap">
            <span className="text-xs text-slate-400 font-medium shrink-0 flex items-center gap-1">
              <HelpCircle className="h-3 w-3" /> Quick Queries:
            </span>
            {PREBUILT_QUERIES.map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(q.query)}
                className="rounded-md border border-slate-800 bg-slate-900 px-2.5 py-1 text-xs text-slate-300 hover:border-sky-500/40 hover:text-sky-300 transition-colors cursor-pointer"
              >
                {q.title}
              </button>
            ))}
          </div>
        </div>

        {/* Message stream */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {messages.map((m, idx) => (
            <div key={idx} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] rounded-xl px-4 py-3 text-xs leading-relaxed ${
                  m.sender === 'user'
                    ? 'bg-sky-500 text-slate-950 font-medium'
                    : 'border border-slate-800 bg-slate-900/90 text-slate-200'
                }`}
              >
                {m.text}
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="flex justify-start">
              <div className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-2.5 text-xs text-slate-400 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-sky-400 animate-pulse" />
                <span>Cricket AI is analyzing matchup data...</span>
              </div>
            </div>
          )}
        </div>

        {/* Input box */}
        <div className="border-t border-slate-800 p-3.5 bg-slate-900/40">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend(inputVal);
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              placeholder="Ask about win probability, death bowling, dew factor, or tactics..."
              className="flex-1 rounded-lg border border-slate-800 bg-slate-950 px-3.5 py-2 text-xs text-slate-200 placeholder-slate-500 focus:border-sky-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={!inputVal.trim()}
              className="flex h-8 items-center gap-1.5 rounded-lg bg-sky-500 px-3.5 text-xs font-semibold text-slate-950 hover:bg-sky-400 disabled:opacity-40 transition-colors cursor-pointer"
            >
              <span>Ask</span>
              <Send className="h-3 w-3" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
