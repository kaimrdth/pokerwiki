import React, { useState, useEffect, useRef } from 'react';
import { Trophy, Users, DollarSign, Activity, Menu, X, Grid } from 'lucide-react';

// --- CONFIGURATION: SCENARIOS ---
const POKER_SCENARIOS = [
  {
    id: 'set-mining',
    title: 'The "Set Mine"',
    difficulty: 'Beginner',
    heroCards: [{r:'7', s:'♠'}, {r:'7', s:'♦'}],
    villainCards: [{r:'?',s:'?'}, {r:'?',s:'?'}],
    position: 'BTN',
    steps: [
      {
        stage: 'Pre-Flop',
        pot: 6,
        board: [],
        action: 'UTG Raises to 3BB. Folds to you.',
        strategy: 'Call.',
        lesson: 'With small pairs, call to see a cheap flop. You are looking to hit a Set (3 of a kind).'
      },
      {
        stage: 'The Flop',
        pot: 13,
        board: [{r:'K',s:'♣'}, {r:'7',s:'♥'}, {r:'2',s:'♠'}],
        action: 'Villain Bets 8BB.',
        strategy: 'Raise!',
        lesson: 'Jackpot. You have a Set. Raise now to build the pot against their likely King.'
      }
    ]
  },
  {
    id: 'premium-preflop',
    title: 'Playing "Big Slick" (AK)',
    difficulty: 'Intermediate',
    heroCards: [{r:'A', s:'♥'}, {r:'K', s:'♣'}],
    villainCards: [{r:'?',s:'?'}, {r:'?',s:'?'}],
    position: 'UTG',
    steps: [
      {
        stage: 'Pre-Flop',
        pot: 1.5,
        board: [],
        action: 'First to act.',
        strategy: 'Raise.',
        lesson: 'AK is a premium drawing hand. Raise to thin the field.'
      },
      {
        stage: 'The Flop',
        pot: 7,
        board: [{r:'J',s:'♠'}, {r:'9',s:'♠'}, {r:'4',s:'♦'}],
        action: 'One caller. Out of position.',
        strategy: 'Check.',
        lesson: 'You missed. This board hits opponents. Checking is safer than bluffing here.'
      }
    ]
  },
  {
    id: 'flush-draw',
    title: 'Chasing a Draw',
    difficulty: 'Intermediate',
    heroCards: [{r:'A', s:'♦'}, {r:'4', s:'♦'}],
    villainCards: [{r:'?',s:'?'}, {r:'?',s:'?'}],
    position: 'CO',
    steps: [
      {
        stage: 'The Flop',
        pot: 10,
        board: [{r:'K',s:'♦'}, {r:'9',s:'♦'}, {r:'2',s:'♠'}],
        action: 'Villain Bets 5BB.',
        strategy: 'Call.',
        lesson: 'You have the Nut Flush Draw. Getting 2:1 odds, calling is mathematically correct.'
      },
      {
        stage: 'The Turn',
        pot: 20,
        board: [{r:'K',s:'♦'}, {r:'9',s:'♦'}, {r:'2',s:'♠'}, {r:'J',s:'♠'}],
        action: 'Villain Bets 15BB.',
        strategy: 'Fold.',
        lesson: 'You missed. The price is too high to chase one more card.'
      }
    ]
  }
];

// --- GTO DATA ---
const RANKS = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];

// Raise-leaning hands (semi-mixed)
const RAISE_RANGES = {
  UTG: [
    'AA','KK','QQ','JJ','TT','99','88','77',
    'AKs','AQs','AJs','ATs','KQs','KJs','QJs','JTs','T9s',
    'AKo','AQo'
  ],
  CO: [
    'AA','KK','QQ','JJ','TT','99','88','77','66','55','44','33','22',
    'AKs','AQs','AJs','ATs','A9s','A8s','A7s','A6s','A5s','A4s','A3s','A2s',
    'KQs','KJs','KTs','K9s','QJs','QTs','Q9s','JTs','J9s','T9s','98s','87s','76s','65s',
    'AKo','AQo','AJo','ATo','KQo','KJo','QJo'
  ],
  BTN: [
    'AA','KK','QQ','JJ','TT','99','88','77','66','55','44','33','22',
    'AKs','AQs','AJs','ATs','A9s','A8s','A7s','A6s','A5s','A4s','A3s','A2s',
    'KQs','KJs','KTs','K9s','K8s','K7s','QJs','QTs','Q9s','Q8s','JTs','J9s','J8s','T9s','T8s','98s','97s','87s','86s','76s','75s','65s','54s',
    'AKo','AQo','AJo','ATo','A9o','A8o','KQo','KJo','KTo','K9o','QJo','QTo','JTo'
  ]
};

// Call-leaning hands (adds color and mixes)
const CALL_RANGES = {
  UTG: ['AQs','KQs','AJs','TT','99','88','AQo','KQo'],
  CO: ['ATs','A9s','A8s','KJs','KTs','QJs','QTs','JTs','T9s','98s','87s','76s','AQo','AJo','KQo','QJo'],
  BTN: ['ATo','KJo','QJo','JTo','T9o','98o','A5s','A4s','A3s','A2s','K9s','Q9s','J9s','T8s','98s','97s','87s','86s','76s','65s','54s']
};

// --- Shared Components ---

const Card = ({ rank, suit, size = 'md', isHidden = false, className = '' }) => {
  const isRed = suit === '♥' || suit === '♦';
  
  // Proportions: 2.5 x 3.5 ratio approx
  const sizeClasses = { 
    xs: 'w-6 h-9 text-[9px] rounded-[2px]', 
    sm: 'w-10 h-14 text-xs rounded', 
    md: 'w-14 h-20 text-base rounded-md', 
    lg: 'w-20 h-28 text-2xl rounded-lg' 
  };
  
  const textSizes = { 
    xs: 'text-[8px] font-bold', 
    sm: 'text-[10px]',
    md: 'text-sm',
    lg: 'text-xl' 
  };

  const centerSizes = {
    xs: 'text-[10px]', 
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-4xl'
  };

  if (isHidden) {
    return (
      <div className={`${sizeClasses[size]} ${className} bg-indigo-950 border border-indigo-800 rounded shadow-md flex items-center justify-center relative overflow-hidden`}>
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle,_var(--tw-gradient-stops))] from-indigo-500 to-transparent" />
        <div className="w-4 h-4 rounded-full bg-indigo-500/30" />
      </div>
    );
  }

  return (
    <div className={`${sizeClasses[size]} ${className} bg-zinc-100 border border-zinc-300 shadow-sm flex flex-col justify-between p-0.5 select-none relative`}>
      <div className={`leading-none ${isRed ? 'text-red-700' : 'text-zinc-900'} ${textSizes[size]} pl-0.5 pt-0.5`}>{rank}</div>
      <div className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 ${isRed ? 'text-red-700' : 'text-zinc-900'} ${centerSizes[size]}`}>{suit}</div>
      {/* Hide bottom rank for XS to reduce clutter */}
      {size !== 'xs' && <div className={`leading-none rotate-180 self-end ${isRed ? 'text-red-700' : 'text-zinc-900'} ${textSizes[size]} pr-0.5 pb-0.5`}>{rank}</div>}
    </div>
  );
};

// --- Page Components ---

const TERMS = {
  UTG: 'Under the Gun: first seat to act pre-flop.',
  MP: 'Middle Position: seats after UTG, before Cutoff.',
  CO: 'Cutoff: seat right before the Button.',
  BTN: 'Button: dealer position, acts last post-flop.',
  SB: 'Small Blind: forced small bet, acts first post-flop.',
  BB: 'Big Blind: forced big bet; standard bet unit.',
  BBs: 'Big Blinds: standard stack/bet unit.',
  '3-bet': 'Re-raise after an initial raise.',
  '3bet': 'Re-raise after an initial raise.',
  'c-bet': 'Continuation bet by the pre-flop aggressor.',
  'Continuation Bet': 'Bet by pre-flop aggressor on later street.',
  'Pre-flop': 'Before any community cards are dealt.',
  Flop: 'First three community cards.',
  Turn: 'Fourth community card.',
  River: 'Fifth community card.',
  'In position': 'Act after your opponent on later streets.',
  'Out of position': 'Act before your opponent on later streets.',
  Steal: 'Open-raise mainly to win blinds/antes.',
  Offsuit: 'Two cards of different suits.',
  offsuit: 'Two cards of different suits.',
  'Value bet': 'Bet to get called by worse hands.',
  'value bet': 'Bet to get called by worse hands.',
  'Implied odds': 'Future money you expect to win if you hit.',
  'implied odds': 'Future money you expect to win if you hit.',
  'Pot odds': 'Price the pot is offering for a call.',
  'pot odds': 'Price the pot is offering for a call.',
  'Flush draw': 'Four cards to a flush; need one more.',
  'flush draw': 'Four cards to a flush; need one more.',
  'Open-ended straight draw': 'Four in a row needing either end card.',
  'open-ended straight draw': 'Four in a row needing either end card.',
  'Premium': 'Top-end starting hands (e.g., AA, KK, QQ, AKs).',
  premium: 'Top-end starting hands (e.g., AA, KK, QQ, AKs).',
  Outs: 'Cards left in the deck that improve your hand.',
  outs: 'Cards left in the deck that improve your hand.',
  Kicker: 'Side card that decides ties when pairs are equal.',
  kicker: 'Side card that decides ties when pairs are equal.',
};

const Term = ({ label }) => {
  const text = TERMS[label] || label;
  return (
    <span className="relative inline-flex items-center group">
      <span className="underline decoration-dotted cursor-help">{label}</span>
      <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 -top-7 whitespace-nowrap text-[11px] bg-black/80 text-white px-2 py-1 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-30">
        {text}
      </span>
    </span>
  );
};

const annotateText = (text) => {
  const keys = Object.keys(TERMS).sort((a, b) => b.length - a.length);
  if (!keys.length) return text;
  const pattern = new RegExp(`\\b(${keys.map(k => k.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')).join('|')})\\b`, 'g');
  const parts = [];
  let lastIndex = 0;
  let match;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    parts.push(<Term key={`${match.index}-${match[1]}`} label={match[1]} />);
    lastIndex = pattern.lastIndex;
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  return parts;
};

const HandRankings = () => {
  const hands = [
    { title: "ROYAL FLUSH", cards: [{r:'A',s:'♠'}, {r:'K',s:'♠'}, {r:'Q',s:'♠'}, {r:'J',s:'♠'}, {r:'10',s:'♠'}] },
    { title: "STRAIGHT FLUSH", cards: [{r:'8',s:'♥'}, {r:'7',s:'♥'}, {r:'6',s:'♥'}, {r:'5',s:'♥'}, {r:'4',s:'♥'}] },
    { title: "FOUR OF A KIND", cards: [{r:'J',s:'♣'}, {r:'J',s:'♦'}, {r:'J',s:'♥'}, {r:'J',s:'♠'}, {r:'4',s:'♦'}] },
    { title: "FULL HOUSE", cards: [{r:'10',s:'♦'}, {r:'10',s:'♠'}, {r:'10',s:'♥'}, {r:'9',s:'♣'}, {r:'9',s:'♦'}] },
    { title: "FLUSH", cards: [{r:'K',s:'♦'}, {r:'J',s:'♦'}, {r:'9',s:'♦'}, {r:'4',s:'♦'}, {r:'2',s:'♦'}] },
    { title: "STRAIGHT", cards: [{r:'9',s:'♣'}, {r:'8',s:'♦'}, {r:'7',s:'♠'}, {r:'6',s:'♦'}, {r:'5',s:'♥'}] },
    { title: "THREE OF A KIND", cards: [{r:'7',s:'♣'}, {r:'7',s:'♠'}, {r:'7',s:'♦'}, {r:'K',s:'♥'}, {r:'3',s:'♦'}] },
    { title: "TWO PAIR", cards: [{r:'4',s:'♥'}, {r:'4',s:'♠'}, {r:'J',s:'♦'}, {r:'J',s:'♣'}, {r:'A',s:'♦'}] },
    { title: "PAIR", cards: [{r:'A',s:'♥'}, {r:'A',s:'♣'}, {r:'8',s:'♦'}, {r:'4',s:'♠'}, {r:'2',s:'♦'}] },
    { title: "HIGH CARD", cards: [{r:'K',s:'♠'}, {r:'J',s:'♦'}, {r:'9',s:'♣'}, {r:'5',s:'♥'}, {r:'3',s:'♦'}] },
  ];

  return (
    <div className="max-w-md mx-auto">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-sm">
        {hands.map((hand, idx) => (
          <div 
            key={idx} 
            className="flex items-center justify-between px-5 py-3 border-b border-zinc-800/50 last:border-0 hover:bg-zinc-800/30 transition-colors"
          >
            <span className="text-xs md:text-sm font-bold text-zinc-400 tracking-wider w-32 md:w-40 flex-shrink-0">{hand.title}</span>
            <div className="flex gap-1">
              {hand.cards.map((c, i) => <Card key={i} rank={c.r} suit={c.s} size="sm" />)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const TableDiagram = () => {
  const [selectedPos, setSelectedPos] = useState('BTN');
  const positions = [
    { id: 'UTG', top: '10%', left: '15%', name: 'Under the Gun', desc: 'Open tight, premium-heavy; avoid weak offsuit hands.', strategy: 'Tight / Aggressive' },
    { id: 'MP', top: '0%', left: '50%', name: 'Middle Position', desc: 'Solid range; add a few suited connectors and big suited aces.', strategy: 'Solid Hands' },
    { id: 'CO', top: '10%', left: '85%', name: 'Cutoff', desc: 'Attack with suited/connected hands; steal when blinds are passive.', strategy: 'Wide Range' },
    { id: 'BTN', top: '50%', left: '95%', name: 'Button (Dealer)', desc: 'Widest opens; leverage position to value bet thin and steal often.', strategy: 'Widest Range' },
    { id: 'SB', top: '90%', left: '75%', name: 'Small Blind', desc: 'Complete or 3-bet selectively; avoid bloating pots out of position.', strategy: 'Defensive' },
    { id: 'BB', top: '90%', left: '25%', name: 'Big Blind', desc: 'Defend with suited/connected vs small opens; tighten vs big sizes.', strategy: 'Defensive' },
  ];
  const currentInfo = positions.find(p => p.id === selectedPos);

  return (
    <div className="flex flex-col items-center gap-6 md:gap-8">
      <div className="relative w-full max-w-3xl md:max-w-4xl aspect-[16/10] md:aspect-[21/10] mb-4 md:mb-8 select-none">
        <div className="absolute inset-4 md:inset-6 bg-emerald-900 rounded-[110px] md:rounded-[140px] border-4 border-zinc-700 shadow-2xl flex items-center justify-center">
          <div className="text-emerald-950/40 font-bold text-4xl md:text-5xl tracking-widest">TABLE</div>
        </div>
        {positions.map((pos) => (
          <button
            key={pos.id}
            onClick={() => setSelectedPos(pos.id)}
            style={{ top: pos.top, left: pos.left }}
            className={`absolute -translate-x-1/2 -translate-y-1/2 w-12 h-12 md:w-14 md:h-14 lg:w-16 lg:h-16 rounded-full flex items-center justify-center font-bold text-xs md:text-sm lg:text-base shadow-lg transition-all duration-200 border
            ${selectedPos === pos.id 
              ? 'bg-amber-500 text-zinc-900 border-amber-400 scale-110 z-20 shadow-[0_0_15px_rgba(245,158,11,0.4)]' 
              : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:bg-zinc-700 hover:text-white'}`}
          >
            <Term label={pos.id} />
          </button>
        ))}
      </div>
      
      <div className="w-full max-w-2xl bg-zinc-900/50 rounded-lg border-l-4 border-amber-500 p-6 md:p-7 animate-in fade-in slide-in-from-bottom-2">
        <div className="flex justify-between items-baseline mb-2">
          <h3 className="text-xl md:text-2xl font-bold text-white">{currentInfo.name}</h3>
          <span className="text-amber-500 font-bold text-sm md:text-base">{currentInfo.strategy}</span>
        </div>
        <p className="text-zinc-300 md:text-base">{annotateText(currentInfo.desc)}</p>
      </div>
    </div>
  );
};

const GameSimulator = () => {
  const [currentScenario, setCurrentScenario] = useState(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [userChoice, setUserChoice] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [showHint, setShowHint] = useState(false);

  useEffect(() => { loadRandomScenario(); }, []);

  const loadRandomScenario = () => {
    const randomIndex = Math.floor(Math.random() * POKER_SCENARIOS.length);
    setCurrentScenario(POKER_SCENARIOS[randomIndex]);
    setStepIndex(0);
    setUserChoice(null);
    setShowResult(false);
    setIsCorrect(false);
    setShowHint(false);
  };

  const nextStep = () => {
    if (currentScenario && stepIndex < currentScenario.steps.length - 1) {
      setStepIndex(s => s + 1);
    } else {
      loadRandomScenario();
    }
    setUserChoice(null);
    setShowResult(false);
    setIsCorrect(false);
    setShowHint(false);
  };

  const normalizeAction = (strategy) => {
    const s = strategy.toLowerCase();
    if (s.includes('raise')) return 'Raise';
    if (s.includes('call')) return 'Call';
    if (s.includes('check')) return 'Check';
    if (s.includes('bet')) return 'Bet';
    if (s.includes('fold')) return 'Fold';
    return 'Call';
  };

  if (!currentScenario) return <div className="p-10 text-center text-zinc-500">Shuffling...</div>;

  const currentStep = currentScenario.steps[stepIndex];
  const correctAction = normalizeAction(currentStep.strategy);
  const isLastStep = stepIndex === currentScenario.steps.length - 1;
  const progressLabel = `Scenario: ${currentScenario.title} • Step ${stepIndex + 1}/${currentScenario.steps.length}`;

  const handleChoice = (choice) => {
    if (showResult) return;
    setUserChoice(choice);
    setShowResult(true);
    setIsCorrect(choice === correctAction);
  };

  const choices = ['Check', 'Bet', 'Call', 'Raise', 'Fold'];

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto">
      <div className="bg-zinc-900 rounded-xl p-6 md:p-8 flex flex-col items-center relative overflow-hidden shadow-xl border border-zinc-800 min-h-[400px]">
        
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#27272a_0%,_#09090b_100%)] opacity-50"></div>
        
        {/* Header */}
        <div className="z-10 w-full flex flex-col gap-2 md:flex-row md:items-center md:justify-between text-[11px] md:text-xs font-bold uppercase tracking-widest mb-6 text-zinc-500">
          <div className="flex flex-wrap items-center gap-2">
          <span className="md:text-sm">{annotateText(currentScenario.difficulty)}</span>
          <span className="text-amber-500 md:text-sm">{progressLabel}</span>
        </div>
          <span className="text-emerald-400 md:text-sm">Pot: {currentStep.pot} BB</span>
        </div>

        {/* Board Area */}
        <div className="z-10 flex flex-col items-center gap-8 mb-auto w-full">
           {/* Villain */}
           <div className="flex gap-2 opacity-70">
             <Card rank="" suit="" size="xs" isHidden />
             <Card rank="" suit="" size="xs" isHidden />
           </div>

           {/* Community Cards */}
           <div className="flex gap-2 h-24 items-center">
            {currentStep.board.length === 0 ? (
               <div className="text-zinc-700 text-[11px] md:text-sm font-mono tracking-widest uppercase">Pre-Flop</div>
            ) : (
               currentStep.board.map((card, idx) => (
                 <Card key={idx} rank={card.r} suit={card.s} size="md" className="animate-in zoom-in duration-300" />
               ))
            )}
           </div>
        </div>

        {/* Hero */}
        <div className="z-10 flex flex-col items-center mt-8">
           <div className="flex gap-2 -space-x-4 hover:space-x-1 transition-all duration-300">
              {currentScenario.heroCards.map((card, idx) => (
                <Card key={idx} rank={card.r} suit={card.s} size="lg" className={`shadow-2xl border-emerald-500/30 ${idx===0 ? '-rotate-3' : 'rotate-3'}`} />
              ))}
          </div>
          <div className="mt-4 text-xs md:text-sm font-bold text-emerald-500 uppercase tracking-widest">{annotateText(`${currentScenario.position} (Hero)`)}</div>
        </div>
      </div>

      {/* Action Box */}
      <div className="bg-zinc-900 border border-zinc-800 p-6 md:p-8 rounded-xl animate-in fade-in">
        <div className="flex justify-between items-center mb-4">
           <div className="text-white font-bold text-lg md:text-xl">{annotateText(currentStep.action)}</div>
           <div className="flex items-center gap-2">
             <button
               onClick={() => setShowHint(h => !h)}
               className="text-[11px] md:text-xs border border-blue-900 bg-blue-950/60 text-blue-200 px-2.5 py-1.5 rounded hover:border-blue-700 transition-colors"
             >
               {showHint ? 'Hide hint' : 'Hint'}
             </button>
             <div className="text-amber-400 font-mono text-xs md:text-sm border border-amber-900 bg-amber-950/60 px-2.5 py-1.5 rounded">What do you do?</div>
           </div>
        </div>

        {showHint && (
          <div className="mb-4 text-[12px] md:text-sm text-blue-200 bg-blue-950/40 border border-blue-900 rounded-lg px-3 py-2">
            Think about position ({annotateText(currentScenario.position)}), board texture, and whether this board helps you or villain. Compare the price to your outs/pot.
          </div>
        )}

        <p className="text-zinc-300 text-sm md:text-base mb-6 leading-relaxed">{annotateText(currentStep.lesson)}</p>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
          {choices.map((choice) => {
            const isSelected = userChoice === choice;
            const isAnswer = showResult && choice === correctAction;
            return (
              <button
                key={choice}
                onClick={() => handleChoice(choice)}
                className={`
                  w-full py-2.5 rounded-lg border text-sm font-semibold transition-all
                  ${isAnswer ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300 shadow-[0_0_0_1px_rgba(16,185,129,0.35)]' : ''}
                  ${isSelected && !isAnswer ? 'border-zinc-600 bg-zinc-800 text-white' : ''}
                  ${!isSelected && !isAnswer ? 'border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-zinc-700 hover:text-white' : ''}
                `}
                disabled={showResult}
              >
                {choice}
              </button>
            );
          })}
        </div>

        {showResult && (
            <div className="space-y-2 mb-4">
              <div className={`px-3 py-2 rounded-lg border text-sm font-semibold inline-flex items-center gap-2
                ${isCorrect ? 'border-emerald-700 bg-emerald-900/40 text-emerald-200' : 'border-red-700 bg-red-900/30 text-red-200'}`}>
                {isCorrect ? 'Nice. That matches the recommended line.' : `Correct action: ${correctAction}`}
              </div>
              <div className="px-3 py-2 rounded-lg border border-zinc-800 bg-zinc-900 text-[12px] md:text-sm text-zinc-200">
              Why: {annotateText(currentStep.lesson)}
              </div>
            </div>
        )}
        
        <button 
          onClick={nextStep}
          disabled={!showResult}
          className={`w-full py-3.5 rounded-lg font-bold text-sm md:text-base transition-colors
            ${isLastStep 
              ? 'bg-amber-500 text-zinc-950 hover:bg-amber-400 disabled:bg-amber-900 disabled:text-amber-200' 
              : 'bg-zinc-100 text-zinc-950 hover:bg-white disabled:bg-zinc-800 disabled:text-zinc-500'}`}
        >
          {isLastStep ? 'Next Scenario' : 'Next Action'}
        </button>
      </div>
    </div>
  );
};

const AdvancedGTO = () => {
  const [selectedRange, setSelectedRange] = useState('UTG');
  const [hoveredHand, setHoveredHand] = useState(null);

  const getHandLabel = (row, col) => {
    const rank1 = RANKS[row];
    const rank2 = RANKS[col];
    if (row === col) return `${rank1}${rank2}`;
    if (row < col) return `${rank1}${rank2}s`;
    return `${rank2}${rank1}o`;
  };

  const getMix = (label) => {
    const raiseList = RAISE_RANGES[selectedRange] || [];
    const callList = CALL_RANGES[selectedRange] || [];
    const isRaise = raiseList.includes(label);
    const isCall = callList.includes(label);

    if (isRaise && isCall) return { raise: 60, call: 30, fold: 10 };
    if (isRaise) return { raise: 80, call: 10, fold: 10 };
    if (isCall) return { raise: 15, call: 65, fold: 20 };
    return { raise: 0, call: 0, fold: 100 };
  };

  const getDominantAction = (mix) => {
    const entries = Object.entries(mix);
    return entries.reduce((a, b) => (b[1] > a[1] ? b : a))[0];
  };

  const gradientForMix = (mix) => {
    const segments = [];
    let cursor = 0;
    const addSegment = (color, amount) => {
      if (!amount) return;
      segments.push(`${color} ${cursor}% ${cursor + amount}%`);
      cursor += amount;
    };
    addSegment('#22c55e', mix.raise); // emerald-500
    addSegment('#3b82f6', mix.call); // blue-500
    addSegment('#18181b', mix.fold); // zinc-900
    return segments.length ? `linear-gradient(90deg, ${segments.join(', ')})` : undefined;
  };

  const positions = Object.keys(RAISE_RANGES);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {positions.map(pos => (
          <button
            key={pos}
            onClick={() => setSelectedRange(pos)}
            className={`px-4 py-2 rounded font-bold text-xs md:text-sm transition-all border ${
              selectedRange === pos 
                ? 'bg-indigo-600 text-white border-indigo-500' 
                : 'bg-zinc-900 text-zinc-500 border-zinc-800 hover:text-zinc-300'
            }`}
          >
            {pos}
          </button>
        ))}
      </div>

      <div className="bg-zinc-900 p-3 md:p-5 rounded-lg border border-zinc-800 mx-auto w-fit overflow-auto">
          <div className="grid grid-cols-[repeat(13,minmax(0,1fr))] gap-px bg-zinc-800 border border-zinc-800">
             {RANKS.map((rowRank, rIndex) => (
                RANKS.map((colRank, cIndex) => {
                  const label = getHandLabel(rIndex, cIndex);
                  const mix = getMix(label);
                  const dominant = getDominantAction(mix);
                  
                  return (
                    <div 
                      key={`${rIndex}-${cIndex}`}
                      onMouseEnter={() => setHoveredHand({ label, mix })}
                      onMouseLeave={() => setHoveredHand(null)}
                      className={`
                        w-7 h-7 sm:w-9 sm:h-9 md:w-12 md:h-12 flex items-center justify-center text-[8px] sm:text-[10px] md:text-[12px] font-semibold cursor-default transition-all
                        border border-zinc-800
                        ${dominant === 'raise' ? 'text-white shadow-[0_0_0_1px_rgba(34,197,94,0.35)]' : ''}
                        ${dominant === 'call' ? 'text-white shadow-[0_0_0_1px_rgba(59,130,246,0.3)]' : ''}
                        ${dominant === 'fold' ? 'text-zinc-500' : ''}
                      `}
                      style={{ background: gradientForMix(mix) }}
                    >
                      {label}
                    </div>
                  );
                })
             ))}
          </div>
      </div>

      <div className="flex items-center justify-center gap-4 text-xs md:text-sm text-zinc-400">
        <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-emerald-500" /> Raise</span>
        <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-blue-500" /> Call</span>
        <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-zinc-800 border border-zinc-700" /> Fold</span>
      </div>

      <div className="h-10 md:h-12 text-center">
        {hoveredHand ? (
          <div className="text-sm md:text-base font-bold text-white flex items-center justify-center gap-3">
            <span>{hoveredHand.label}</span>
            <span className="text-emerald-400">Raise {hoveredHand.mix.raise}%</span>
            <span className="text-blue-400">Call {hoveredHand.mix.call}%</span>
            <span className="text-zinc-400">Fold {hoveredHand.mix.fold}%</span>
          </div>
        ) : (
          <div className="text-xs md:text-sm text-zinc-600">Hover for per-hand mix</div>
        )}
      </div>
    </div>
  );
};

const BettingActions = () => (
  <div className="max-w-2xl mx-auto bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden divide-y divide-zinc-800">
    {[
      { label: 'CHECK', color: 'bg-zinc-500', desc: "Pass action to next player. Allowed if no bets placed." },
      { label: 'BET', color: 'bg-emerald-500', desc: "First to put money in the pot this round." },
      { label: 'CALL', color: 'bg-blue-500', desc: "Match the current highest bet to stay in." },
      { label: 'RAISE', color: 'bg-orange-500', desc: "Increase the current bet, forcing others to pay more." },
      { label: 'FOLD', color: 'bg-red-500', desc: "Discard hand and forfeit pot." }
    ].map((action, idx) => (
      <div key={idx} className="flex items-center p-3 md:p-3.5 hover:bg-zinc-800/30 transition-colors">
        <div className="w-24 flex-shrink-0 flex items-center gap-2">
          <div className={`w-1.5 h-1.5 rounded-full ${action.color}`}></div>
          <span className="text-xs md:text-sm font-bold text-zinc-300 tracking-wider">{action.label}</span>
        </div>
        <div className="text-xs md:text-sm text-zinc-400">{action.desc}</div>
      </div>
    ))}
  </div>
);

const DeepDive = () => {
  const cards = [
    {
      title: 'What is EV?',
      gradient: 'from-amber-500/15 via-amber-500/5 to-amber-900/10',
      body: 'EV (expected value) is the average profit of a play. Compare the price you pay to the chance you win.',
      bullets: [],
      quick: [
        'Price example: Pot 100, villain bets 50 → you call 50 to win 150 total → need >33% to continue.',
        'Flush draw: 9 outs on turn ≈18% (one card). With river to come ≈36% (two cards).',
        'Decision: 18% < 33% → fold turn if no river. If both cards to come, 36% > 33% → call.',
        'Implied odds: if villain pays when you hit, thin calls become better.'
      ],
      hand: [{r:'A',s:'♦'}, {r:'4',s:'♦'}],
      board: [{r:'K',s:'♦'}, {r:'9',s:'♦'}, {r:'2',s:'♠'}, {r:'7',s:'♣'}],
      action: 'Flush draw on turn facing half-pot: fold with one card; call if you see both cards.'
    },
    {
      title: 'Estimating Percentages',
      gradient: 'from-indigo-500/15 via-indigo-500/5 to-indigo-900/10',
      body: 'Use fast rules of thumb to spot good or bad calls.',
      bullets: [],
      quick: [
        'Outs → %: two cards to come ≈ outs × 4; one card ≈ outs × 2.',
        'Common draws: open-ended straight (8 outs) ≈ 32% (two cards) / 16% (one card); flush draw (9 outs) ≈ 36% / 18%.',
        'Half-pot bet needs ~25% equity; pot-sized bet needs ~33%; 2x pot needs ~40%.',
        'Combining draws: if draw makes a higher straight and a flush, count only clean outs (avoid double-counting when a card fills both but is blocked).'
      ],
      hand: [{r:'J',s:'♣'}, {r:'T',s:'♣'}],
      board: [{r:'Q',s:'♦'}, {r:'9',s:'♠'}, {r:'2',s:'♣'}, {r:'5',s:'♥'}],
      action: 'OESD with one card to come: ~16% to hit. Facing 1/2 pot (need 25%) → fold unless implied odds are high.'
    },
    {
      title: 'Trash vs. Good Hands',
      gradient: 'from-emerald-500/12 via-emerald-500/4 to-emerald-900/10',
      body: 'Good hands make top pair with a strong kicker or strong draws. Trash is weak, off-suit, and unconnected.',
      bullets: [],
      quick: [
        'Fold: off-suit, far apart ranks (83o), weak Ax/Kx early, random gappers.',
        'Open early: big pairs, big suited aces, AK/AQ, TT+; add 99–77 cautiously.',
        'Open late: suited connectors/broadways (T9s, QJs), suited aces down to A5s.'
      ],
      hand: [{r:'8',s:'♠'}, {r:'3',s:'♦'}],
      board: [],
      action: 'Offsuit 83o UTG: snap fold pre-flop'
    },
    {
      title: 'Position Guidance',
      gradient: 'from-blue-500/12 via-blue-500/4 to-blue-900/10',
      body: 'Position gives information; acting last lets you control pot size and extract value.',
      bullets: [],
      quick: [
        'UTG/MP: open strong, bluff rarely; favor hands that play well post-flop.',
        'CO/BTN: steal wider; c-bet more in position; value bet thinner.',
        'Blinds: defend suited/connected vs small opens; 3-bet premiums; avoid marginal offsuit hands.'
      ],
      hand: [{r:'J',s:'♥'}, {r:'T',s:'♥'}],
      board: [{r:'9',s:'♣'}, {r:'4',s:'♦'}, {r:'2',s:'♠'}],
      action: 'BTN opener: JT suited = fine open; IP control post-flop'
    }
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-4 md:space-y-6">
      {cards.map((card, idx) => (
        <div key={idx} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 md:p-6 shadow-sm relative overflow-hidden select-none cursor-default transition-transform duration-200 hover:-translate-y-1 hover:border-emerald-700/70">
          <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient} pointer-events-none`} />
          <div className="relative flex flex-col md:flex-row gap-5 md:gap-8">
            <div className="flex-1">
              <h3 className="text-xl md:text-2xl font-bold text-white mb-2">{card.title}</h3>
              <p className="text-zinc-200 text-sm md:text-base mb-3">{card.body}</p>
              <div className="space-y-1.5 text-zinc-300 text-sm md:text-base">
                {card.quick.map((line, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="mt-[6px] w-1.5 h-1.5 rounded-full bg-emerald-400/70 flex-shrink-0" />
                    <span>{annotateText(line)}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex-shrink-0 flex flex-col items-center gap-3 bg-zinc-950/70 border border-zinc-800 rounded-lg p-3 md:p-4 shadow-inner w-full md:w-64">
              <div className="flex gap-1">
                {card.hand.map((c, i) => (
                  <Card key={i} rank={c.r} suit={c.s} size="sm" className={i === 0 ? '-rotate-3' : 'rotate-3'} />
                ))}
              </div>
              <div className="flex gap-1">
                {card.board.length ? card.board.map((c, i) => <Card key={i} rank={c.r} suit={c.s} size="xs" />) : <span className="text-[11px] text-zinc-500">Pre-flop</span>}
              </div>
              <div className="text-[11px] md:text-xs text-center text-zinc-300 leading-snug">{card.action}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// --- Main App Shell ---

const TabIntro = ({ title, items }) => (
  <div className="mb-6 md:mb-8 bg-zinc-900 border border-zinc-800 rounded-xl p-4 md:p-5 text-sm md:text-base text-zinc-200 shadow-sm">
    <div className="flex items-center justify-between mb-3">
      <div className="font-semibold text-white text-base md:text-lg">{title}</div>
      <span className="text-[11px] md:text-xs text-emerald-400 uppercase tracking-widest border border-emerald-800 bg-emerald-900/30 px-2 py-1 rounded"></span>
    </div>
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {items.map((item, idx) => (
        <div 
          key={idx} 
          className="group relative overflow-hidden border border-zinc-800 rounded-lg bg-zinc-950/60 p-3 transition-transform duration-200 hover:-translate-y-1 hover:border-emerald-700 select-none cursor-default"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
          <div className="relative">
            <div className="text-[11px] text-emerald-300 uppercase tracking-widest font-semibold mb-1">{item.label}</div>
            <div className="text-zinc-200 text-sm leading-relaxed">{item.text}</div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const CheatSheet = () => {
  const handExamples = [
    { label: 'Trash', hand: [{r:'8',s:'♠'}, {r:'3',s:'♦'}], note: 'Fold: off-suit, far apart, weak kicker.' },
    { label: 'Playable', hand: [{r:'J',s:'♥'}, {r:'T',s:'♥'}], note: 'Raise late: suited and next-door ranks can make strong straights/flushes.' },
    { label: 'Strong', hand: [{r:'A',s:'♠'}, {r:'K',s:'♠'}], note: 'Raise big: two top cards, suited, top kicker.' },
  ];

  const cards = [
    {
      title: 'Hand Rankings',
      gradient: 'from-emerald-500/12 via-emerald-500/4 to-emerald-900/10',
      bullets: [

      ],
      visual: <HandRankings />
    },
    {
      title: 'Hand Guide',
      gradient: 'from-indigo-500/12 via-indigo-500/4 to-indigo-900/10',
      bullets: [
        'Fold hands that are off-suit, weak, and far apart.',
        'Raise late with suited, connected cards.',
        'Raise bigger with top pairs and big aces; charge draws.'
      ],
      visual: (
        <div className="grid sm:grid-cols-3 gap-3">
          {handExamples.map((item, idx) => (
            <div key={idx} className="border border-zinc-800 rounded-lg bg-zinc-950/60 p-3 select-none">
              <div className="text-[11px] text-emerald-300 uppercase tracking-widest font-semibold mb-2">{item.label}</div>
              <div className="flex gap-1 mb-2">
                {item.hand.map((c, i) => (
                  <Card key={i} rank={c.r} suit={c.s} size="sm" className={i === 0 ? '-rotate-3' : 'rotate-3'} />
                ))}
              </div>
              <div className="text-[11px] text-zinc-300 leading-snug">{annotateText(item.note)}</div>
            </div>
          ))}
        </div>
      )
    },
    {
      title: 'Betting Actions',
      gradient: 'from-amber-500/12 via-amber-500/4 to-amber-900/10',
      bullets: [
        'Check when you miss or want a smaller pot.',
        'Call only if the price is fair for your draw/hand.',
        'Raise when ahead or when your draw has real outs.'
      ],
      visual: <BettingActions />
    }
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-4 md:space-y-6">
      {cards.map((card, idx) => (
        <div key={idx} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 md:p-5 shadow-sm relative overflow-hidden select-none transition-transform duration-200 hover:-translate-y-1 hover:border-emerald-700/70">
          <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient} pointer-events-none`} />
          <div className="relative space-y-3">
            <h3 className="text-lg md:text-xl font-bold text-white">{card.title}</h3>
            <ul className="space-y-1 text-zinc-200 text-sm md:text-base list-disc list-inside">
              {card.bullets.map((b, i) => <li key={i}>{b}</li>)}
            </ul>
            <div className="bg-zinc-950/60 border border-zinc-800 rounded-lg p-3 md:p-4">
              {card.visual}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

const App = () => {
  const [activeTab, setActiveTab] = useState('cheat');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mainContentRef = useRef(null);

  const navItems = [
    { id: 'cheat', label: 'Cheat Sheet', icon: Trophy },
    { id: 'positions', label: 'Positions', icon: Users },
    { id: 'deep', label: 'Deep Dive', icon: Grid },
  ];

  useEffect(() => { if (mainContentRef.current) mainContentRef.current.scrollTop = 0; }, [activeTab]);

  const renderContent = () => {
    switch(activeTab) {
      case 'cheat':
        return <CheatSheet />;
      case 'positions':
        return (
          <>
            <TabIntro
              title="Position quick rules"
              items={[
                { label: 'Early = tight', text: 'UTG/MP: premiums and solid suited Ax; skip junk and weak offsuit gappers.' },
                { label: 'Late = attack', text: 'CO/BTN: widen steals with suited/connected hands; isolate limpers.' },
                { label: 'Blinds = discipline', text: 'Defend suited/connected vs. small opens; be fit-or-fold post-flop.' },
              ]}
            />
            <TableDiagram />
          </>
        );
      case 'deep':
        return <DeepDive />;
      default: return <CheatSheet />;
    }
  };

  const activeItem = navItems.find(i => i.id === activeTab);

  return (
    <div className="fixed inset-0 bg-zinc-950 font-sans text-zinc-100 flex flex-col md:flex-row overflow-hidden selection:bg-emerald-500/30">
      
      {/* Mobile Header */}
      <div className="md:hidden bg-zinc-900 border-b border-zinc-800 text-white p-4 flex items-center justify-between z-50">
        <button onClick={() => setMobileMenuOpen(true)} className="text-zinc-400"><Menu size={24} /></button>
        <div className="font-bold flex items-center gap-2">♠ Wiki</div>
        <div className="w-6" /> {/* spacer for symmetry */}
      </div>

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 w-64 bg-zinc-900 border-r border-zinc-800 flex flex-col transition-transform duration-300 z-50
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="p-8 font-bold text-xl text-white hidden md:flex items-center gap-2 tracking-tight">
          <div className="w-6 h-6 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded flex items-center justify-center text-sm shadow-lg">♠</div>
          Poker Wiki
        </div>
        
        <div className="flex md:hidden justify-between items-center p-6 border-b border-zinc-800">
           <span className="font-bold text-white text-lg">Menu</span>
           <button onClick={() => setMobileMenuOpen(false)}><X size={24}/></button>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => { setActiveTab(item.id); setMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-lg transition-all text-left text-sm md:text-base font-medium ${
                  isActive ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                }`}
              >
                <Icon size={18} className={isActive ? 'text-emerald-400' : 'opacity-70'} />
                {item.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Main Content */}
      <main ref={mainContentRef} className="flex-1 overflow-y-auto w-full bg-zinc-950 scroll-smooth md:ml-64">
        <div className="p-6 md:p-12 max-w-6xl mx-auto w-full min-h-full flex flex-col">
          <header className="mb-10">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-3 tracking-tight">{activeItem?.label}</h1>
            <div className="h-1 w-12 bg-emerald-500 rounded-full opacity-70"></div>
          </header>

          <div className="flex-1">
            {renderContent()}
          </div>
        </div>
      </main>
      
      {mobileMenuOpen && <div className="fixed inset-0 bg-black/80 z-40 md:hidden" onClick={() => setMobileMenuOpen(false)} />}
    </div>
  );
};

export default App;
