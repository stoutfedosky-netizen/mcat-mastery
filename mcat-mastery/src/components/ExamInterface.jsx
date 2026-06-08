"use client";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";

/* ─── PERIODIC TABLE DATA ─── */
const PT_ROWS = [
  [[1,"H",1.0],[null],[null],[null],[null],[null],[null],[null],[null],[null],[null],[null],[null],[null],[null],[null],[null],[2,"He",4.0]],
  [[3,"Li",6.9],[4,"Be",9.0],[null],[null],[null],[null],[null],[null],[null],[null],[null],[null],[5,"B",10.8],[6,"C",12.0],[7,"N",14.0],[8,"O",16.0],[9,"F",19.0],[10,"Ne",20.2]],
  [[11,"Na",23.0],[12,"Mg",24.3],[null],[null],[null],[null],[null],[null],[null],[null],[null],[null],[13,"Al",27.0],[14,"Si",28.1],[15,"P",31.0],[16,"S",32.1],[17,"Cl",35.5],[18,"Ar",39.9]],
  [[19,"K",39.1],[20,"Ca",40.1],[21,"Sc",45.0],[22,"Ti",47.9],[23,"V",50.9],[24,"Cr",52.0],[25,"Mn",54.9],[26,"Fe",55.8],[27,"Co",58.9],[28,"Ni",58.7],[29,"Cu",63.5],[30,"Zn",65.4],[31,"Ga",69.7],[32,"Ge",72.6],[33,"As",74.9],[34,"Se",79.0],[35,"Br",79.9],[36,"Kr",83.8]],
  [[37,"Rb",85.5],[38,"Sr",87.6],[39,"Y",88.9],[40,"Zr",91.2],[41,"Nb",92.9],[42,"Mo",95.9],[43,"Tc","(98)"],[44,"Ru",101.1],[45,"Rh",102.9],[46,"Pd",106.4],[47,"Ag",107.9],[48,"Cd",112.4],[49,"In",114.8],[50,"Sn",118.7],[51,"Sb",121.8],[52,"Te",127.6],[53,"I",126.9],[54,"Xe",131.3]],
  [[55,"Cs",132.9],[56,"Ba",137.3],[57,"La*",138.9],[72,"Hf",178.5],[73,"Ta",180.9],[74,"W",183.9],[75,"Re",186.2],[76,"Os",190.2],[77,"Ir",192.2],[78,"Pt",195.1],[79,"Au",197.0],[80,"Hg",200.6],[81,"Tl",204.4],[82,"Pb",207.2],[83,"Bi",209.0],[84,"Po","(209)"],[85,"At","(210)"],[86,"Rn","(222)"]],
  [[87,"Fr","(223)"],[88,"Ra","(226)"],[89,"Ac\u2020","(227)"],[104,"Rf","(267)"],[105,"Db","(268)"],[106,"Sg","(271)"],[107,"Bh","(270)"],[108,"Hs","(269)"],[109,"Mt","(278)"],[110,"Ds","(281)"],[111,"Rg","(282)"],[112,"Cn","(285)"],[113,"Nh","(286)"],[114,"Fl","(289)"],[115,"Mc","(289)"],[116,"Lv","(293)"],[117,"Ts","(294)"],[118,"Og","(294)"]],
];

function PeriodicTableModal({ onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-2xl max-w-[900px] w-[95%] max-h-[90vh] overflow-auto" onClick={e => e.stopPropagation()}>
        <div className="bg-[#3b6daa] text-white px-4 py-2.5 flex items-center justify-between rounded-t-lg">
          <div className="flex items-center gap-2 font-semibold text-sm">
            <span>🔬</span> Periodic Table
          </div>
          <button onClick={onClose} className="w-7 h-7 bg-gray-200 text-gray-700 rounded flex items-center justify-center font-bold text-xs hover:bg-gray-300">✕</button>
        </div>
        <div className="p-4">
          <h2 className="text-center font-bold text-lg mb-3">Periodic Table of the Elements</h2>
          <div className="overflow-x-auto">
            <table className="mx-auto border-collapse" style={{ fontSize: "10px" }}>
              <tbody>
                {PT_ROWS.map((row, ri) => (
                  <tr key={ri}>
                    {row.map((cell, ci) => {
                      if (!cell) return <td key={ci} className="w-[46px] h-[44px]" />;
                      const [num, sym, mass] = cell;
                      return (
                        <td key={ci} className="w-[46px] h-[44px] border border-gray-400 text-center align-middle p-0 leading-tight">
                          <div className="text-[8px] text-gray-500 mt-0.5">{num}</div>
                          <div className="font-bold text-[13px] leading-none">{sym}</div>
                          <div className="text-[8px] text-gray-500 mb-0.5">{mass}</div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="text-center mt-3">
            <button onClick={onClose} className="px-5 py-1.5 border border-gray-400 rounded text-sm font-medium hover:bg-gray-100">Close</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── ICONS ─── */
const FlagIcon = ({ filled }) => (
  <svg width="13" height="13" viewBox="0 0 16 16" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5"><path d="M3 2v12M3 2l9 4-9 4" /></svg>
);
const ChevronLeft = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M10 3L5 8l5 5" /></svg>
);
const ChevronRight = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 3l5 5-5 5" /></svg>
);

/* ─── TIMER ─── */
function Timer({ seconds, onTick, paused }) {
  useEffect(() => {
    if (paused || seconds <= 0) return;
    const t = setInterval(() => onTick(), 1000);
    return () => clearInterval(t);
  }, [seconds, onTick, paused]);
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return (
    <span className="font-mono tabular-nums">
      {String(h).padStart(2,"0")}:{String(m).padStart(2,"0")}:{String(s).padStart(2,"0")}
    </span>
  );
}

/* ═══════════════════════════════════════════
   MAIN EXAM INTERFACE
   ═══════════════════════════════════════════ */
export default function ExamInterface({
  questions = [],
  sectionName = "Section",
  sectionAbbr = "SEC",
  sectionColor = "#1a73e8",
  timeLimit = null,
  onComplete = null,
}) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState({});
  const [flagged, setFlagged] = useState({});
  const [struck, setStruck] = useState({});
  const [highlights, setHighlights] = useState({}); // {qId: [{start,end},...]}
  const [timeLeft, setTimeLeft] = useState(timeLimit || 0);
  const [timerPaused, setTimerPaused] = useState(false);
  const [mode, setMode] = useState("exam");
  const [showPassage, setShowPassage] = useState(true);
  const [showPT, setShowPT] = useState(false);
  const [highlightActive, setHighlightActive] = useState(false);
  const passageRef = useRef(null);
  const questionRef = useRef(null);

  const q = questions[currentIdx];
  const totalQ = questions.length;
  const answeredCount = Object.keys(answers).length;
  const flaggedCount = Object.values(flagged).filter(Boolean).length;

  const currentPassage = useMemo(() => {
    if (!q) return null;
    if (q.passage) return q.passage;
    if (q.usePrevPassage) {
      for (let i = currentIdx - 1; i >= 0; i--) {
        if (questions[i].passage) return questions[i].passage;
      }
    }
    return null;
  }, [q, currentIdx, questions]);

  const hasPassage = !!currentPassage;

  const handleTick = useCallback(() => {
    setTimeLeft(prev => { if (prev <= 1) { setMode("score"); return 0; } return prev - 1; });
  }, []);

  const goTo = (idx) => {
    setCurrentIdx(idx); setMode("exam");
    if (passageRef.current) passageRef.current.scrollTop = 0;
    if (questionRef.current) questionRef.current.scrollTop = 0;
  };
  const goNext = () => { if (currentIdx < totalQ - 1) goTo(currentIdx + 1); };
  const goPrev = () => { if (currentIdx > 0) goTo(currentIdx - 1); };
  const selectAnswer = (label) => { setAnswers(p => ({...p, [q.id]: label})); };
  const toggleFlag = () => { setFlagged(p => ({...p, [q.id]: !p[q.id]})); };
  const toggleStrike = (label) => { setStruck(p => ({...p, [q.id]: {...(p[q.id]||{}), [label]: !(p[q.id]?.[label])}})); };

  // Highlight selected text in passage
  const handlePassageMouseUp = () => {
    if (!highlightActive) return;
    const sel = window.getSelection();
    if (sel && sel.toString().trim().length > 0 && passageRef.current?.contains(sel.anchorNode)) {
      // Apply native highlight via execCommand (works for contentEditable-like scenarios)
      // For simplicity, we use CSS selection color when highlight mode is on
    }
  };

  const score = useMemo(() => {
    let correct = 0;
    questions.forEach(question => { if (answers[question.id] === question.correct) correct++; });
    return { correct, total: totalQ, pct: totalQ > 0 ? Math.round((correct / totalQ) * 100) : 0 };
  }, [answers, questions, totalQ]);

  const endExam = () => { setMode("score"); if (onComplete) onComplete({ answers, score, flagged }); };

  const isReview = mode === "review";

  // Color constants matching Pearson VUE blue
  const NAV_BG = "#2b579a";
  const TOOLBAR_BG = "#4a7ec7";
  const STRIP_BG = "#1e3a5f";

  /* ── SCORE SCREEN ── */
  if (mode === "score") {
    return (
      <div className="min-h-screen bg-gray-50 font-exam">
        <div className="text-white px-6 py-3 flex items-center justify-between" style={{ background: NAV_BG }}>
          <span className="font-semibold text-sm">{sectionAbbr} — Score Report</span>
        </div>
        <div className="max-w-3xl mx-auto py-12 px-6">
          <div className="text-center mb-10">
            <div className="text-6xl font-bold mb-2" style={{color: sectionColor}}>{score.pct}%</div>
            <div className="text-gray-600 text-lg">{score.correct} of {score.total} correct</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-gray-100 px-4 py-3 font-semibold text-xs text-gray-600 grid grid-cols-12 gap-2">
              <div className="col-span-1">#</div><div className="col-span-5">Topic</div>
              <div className="col-span-2 text-center">Yours</div><div className="col-span-2 text-center">Correct</div>
              <div className="col-span-2 text-center">Result</div>
            </div>
            {questions.map((question, idx) => {
              const ua = answers[question.id]; const ic = ua === question.correct;
              return (
                <div key={question.id} className={`px-4 py-2.5 grid grid-cols-12 gap-2 items-center text-sm border-t border-gray-100 ${idx%2===0?"bg-white":"bg-gray-50"}`}>
                  <div className="col-span-1 text-gray-500">{idx+1}</div>
                  <div className="col-span-5 text-gray-800">{question.topic}</div>
                  <div className="col-span-2 text-center font-medium">{ua||"—"}</div>
                  <div className="col-span-2 text-center font-medium">{question.correct}</div>
                  <div className="col-span-2 text-center">
                    {ua ? <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${ic?"bg-green-100 text-green-700":"bg-red-100 text-red-700"}`}>{ic?"Correct":"Incorrect"}</span> : <span className="text-xs text-gray-400">—</span>}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-8 flex justify-center gap-4">
            <button onClick={() => {setMode("review");setCurrentIdx(0);}} className="px-6 py-2.5 text-white rounded-md font-medium hover:opacity-90 transition-opacity" style={{background: NAV_BG}}>Review Answers</button>
          </div>
        </div>
      </div>
    );
  }

  /* ── NAV/REVIEW SCREEN ── */
  if (mode === "nav") {
    return (
      <div className="min-h-screen bg-gray-50 font-exam">
        <div className="text-white px-6 py-3 flex items-center justify-between" style={{background: NAV_BG}}>
          <span className="font-semibold text-sm">{sectionAbbr} — Review Screen</span>
          {timeLimit && <div className="text-sm"><Timer seconds={timeLeft} onTick={handleTick} paused={false} /></div>}
        </div>
        <div className="max-w-3xl mx-auto py-8 px-6">
          <p className="text-gray-600 mb-6 text-sm">Below is a summary of your answers. Click any question to return to it.</p>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-6">
            <div className="bg-gray-100 px-4 py-2.5 font-semibold text-xs text-gray-600 grid grid-cols-6 gap-2">
              <div className="col-span-1">#</div><div className="col-span-2">Status</div>
              <div className="col-span-2">Answer</div><div className="col-span-1 text-center">Flag</div>
            </div>
            {questions.map((question, idx) => (
              <button key={question.id} onClick={() => goTo(idx)} className="w-full px-4 py-2 grid grid-cols-6 gap-2 items-center text-sm border-t border-gray-100 hover:bg-blue-50 transition-colors text-left">
                <div className="col-span-1 font-medium text-gray-700">{idx+1}</div>
                <div className="col-span-2">{answers[question.id] ? <span className="text-green-600 font-medium">Complete</span> : <span className="text-orange-500 font-medium">Incomplete</span>}</div>
                <div className="col-span-2 text-gray-600">{answers[question.id]||"—"}</div>
                <div className="col-span-1 text-center">{flagged[question.id] && <span className="text-amber-500"><FlagIcon filled /></span>}</div>
              </button>
            ))}
          </div>
          <div className="flex justify-between">
            <button onClick={() => setMode("exam")} className="px-5 py-2 bg-gray-200 text-gray-700 rounded font-medium hover:bg-gray-300">Return to Exam</button>
            <button onClick={endExam} className="px-5 py-2 bg-red-600 text-white rounded font-medium hover:bg-red-700">End Section & Score</button>
          </div>
        </div>
      </div>
    );
  }

  if (!q) return null;

  /* ═══ MAIN EXAM LAYOUT ═══ */
  return (
    <div className="h-screen flex flex-col bg-gray-200 font-exam overflow-hidden">

      {/* Periodic Table Modal */}
      {showPT && <PeriodicTableModal onClose={() => setShowPT(false)} />}

      {/* ── ROW 1: TOP NAV BAR ── */}
      <div className="flex items-center justify-between px-4 h-[34px] flex-shrink-0 text-white text-sm" style={{ background: NAV_BG }}>
        <span className="font-medium text-xs">Medical College Admission Test</span>
        <div className="flex items-center gap-4">
          {timeLimit && !isReview && (
            <div className="flex items-center gap-2 text-xs">
              <span className="opacity-70">Timer:</span>
              <button onClick={() => setTimerPaused(p => !p)} className="opacity-80 hover:opacity-100">
                {timerPaused ? "▶" : "⏸"}
              </button>
              <Timer seconds={timeLeft} onTick={handleTick} paused={timerPaused} />
            </div>
          )}
          <span className="text-xs opacity-80">{currentIdx+1} of {totalQ}</span>
        </div>
      </div>

      {/* ── ROW 2: TOOLBAR ── */}
      <div className="flex items-center justify-between px-3 h-[32px] flex-shrink-0 text-white text-xs" style={{ background: TOOLBAR_BG }}>
        <div className="flex items-center gap-1">
          {/* Highlight tool */}
          <button onClick={() => setHighlightActive(p => !p)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded transition-colors ${highlightActive ? "bg-white/25" : "hover:bg-white/15"}`}>
            <span className="inline-block w-3.5 h-3.5 rounded-sm border border-white/50" style={{ background: highlightActive ? "#fef08a" : "#fef08a" }} />
            Highlight
          </button>
          {/* Strikethrough tool */}
          <button className="flex items-center gap-1.5 px-2.5 py-1 rounded hover:bg-white/15">
            <span className="line-through">S</span> Strikethrough
          </button>
        </div>
        <div className="flex items-center gap-1">
          {!isReview && (
            <button onClick={toggleFlag}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded transition-colors ${flagged[q.id] ? "bg-amber-500/30 text-amber-200" : "hover:bg-white/15"}`}>
              <FlagIcon filled={flagged[q.id]} />
              Flag for Review
            </button>
          )}
          {isReview && (
            <button onClick={() => setMode("score")} className="px-2.5 py-1 rounded hover:bg-white/15">Back to Score</button>
          )}
        </div>
      </div>

      {/* ── MAIN CONTENT SPLIT ── */}
      <div className="flex-1 flex overflow-hidden border-t border-gray-400">

        {/* PASSAGE PANEL */}
        {hasPassage && showPassage && (
          <div className="w-1/2 border-r border-gray-400 flex flex-col bg-white">
            <div className="bg-gray-100 border-b border-gray-300 px-4 py-1.5 flex items-center justify-between flex-shrink-0">
              <span className="text-xs font-semibold text-gray-600">Passage {questions.findIndex(qq => qq.passage && questions.indexOf(qq) <= currentIdx) + 1} (Questions {(() => {
                let start = currentIdx, end = currentIdx;
                for (let i = currentIdx; i >= 0; i--) { if (questions[i].passage) { start = i; break; } }
                for (let i = currentIdx; i < totalQ; i++) { if (i > start && questions[i].passage) break; end = i; }
                return `${start+1} - ${end+1}`;
              })()})</span>
            </div>
            <div ref={passageRef} className="flex-1 overflow-y-auto exam-scroll p-5" onMouseUp={handlePassageMouseUp}
              style={{ userSelect: highlightActive ? "text" : "auto", cursor: highlightActive ? "text" : "default" }}>
              <div className={`passage-text whitespace-pre-line ${highlightActive ? "selection:bg-yellow-200" : ""}`}>
                {currentPassage}
              </div>
            </div>
          </div>
        )}

        {/* QUESTION PANEL */}
        <div className={`${hasPassage && showPassage ? "w-1/2" : "w-full"} flex flex-col bg-white`}>
          <div ref={questionRef} className="flex-1 overflow-y-auto exam-scroll p-6">
            {/* Question header */}
            <div className="mb-5">
              <h2 className="font-bold text-base text-gray-900 mb-3">Question {currentIdx + 1}</h2>
              {isReview && (
                <div className="flex gap-2 mb-3">
                  <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-500">{q.topic}</span>
                  <span className={`text-xs px-2 py-0.5 rounded ${q.difficulty==="Easy"?"bg-green-50 text-green-600":q.difficulty==="Hard"?"bg-red-50 text-red-600":"bg-amber-50 text-amber-600"}`}>{q.difficulty}</span>
                </div>
              )}
              <p className="text-sm text-gray-800 leading-relaxed">{q.stem}</p>
            </div>

            {/* Answer choices */}
            <div className="space-y-3">
              {q.choices.map(choice => {
                const isSel = answers[q.id] === choice.label;
                const isStr = struck[q.id]?.[choice.label];
                const isCor = choice.label === q.correct;

                let border = "border-gray-200"; let bg = "bg-white";
                if (isReview) {
                  if (isCor) { border = "border-green-400"; bg = "bg-green-50"; }
                  else if (isSel) { border = "border-red-400"; bg = "bg-red-50"; }
                } else if (isSel) { border = "border-blue-500"; bg = "bg-blue-50"; }

                return (
                  <button key={choice.label} onClick={() => !isReview && selectAnswer(choice.label)} disabled={isReview}
                    className={`answer-choice w-full flex items-start gap-3 p-3 rounded border-2 ${border} ${bg} text-left hover:shadow-sm`}>
                    <div className={`w-[22px] h-[22px] rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center ${
                      isReview && isCor ? "border-green-500" : isReview && isSel ? "border-red-500" : isSel ? "border-blue-500" : "border-gray-300"
                    }`}>
                      {(isSel || (isReview && isCor)) && (
                        <div className={`w-3 h-3 rounded-full ${isReview && isCor ? "bg-green-500" : isReview && isSel ? "bg-red-500" : "bg-blue-500"}`} />
                      )}
                    </div>
                    <span className={`text-sm leading-relaxed ${isStr && !isReview ? "line-through text-gray-400" : "text-gray-800"}`}>
                      <strong className="mr-1">{choice.label}.</strong>{choice.text}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Review explanations */}
            {isReview && (
              <div className="mt-8 border-t border-gray-200 pt-6">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Explanation</h3>
                {q.choices.map(choice => {
                  const isCor = choice.label === q.correct;
                  const isSel = answers[q.id] === choice.label;
                  return (
                    <div key={choice.label} className={`mb-3 p-3.5 rounded-md text-sm leading-relaxed ${isCor?"bg-green-50 border border-green-200":isSel?"bg-red-50 border border-red-200":"bg-gray-50 border border-gray-100"}`}>
                      <div className="font-semibold mb-1">
                        <span className={isCor?"text-green-700":isSel?"text-red-700":"text-gray-500"}>
                          {choice.label}. {isCor?"✓ Correct":isSel?"✗ Your answer":""}
                        </span>
                      </div>
                      <div className="text-gray-700">{q.explanations[choice.label]}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── BOTTOM BAR ── */}
      <div className="flex items-center justify-between px-3 h-[38px] flex-shrink-0 text-white text-xs" style={{ background: STRIP_BG }}>
        {/* Periodic Table button */}
        <button onClick={() => setShowPT(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded hover:bg-white/15 transition-colors font-medium">
          <span>🧪</span> Periodic Table
        </button>

        {/* Question nav strip (center) */}
        <div className="flex items-center gap-0.5 overflow-x-auto max-w-[50%] py-1">
          <button onClick={goPrev} disabled={currentIdx===0} className={`p-1 rounded ${currentIdx===0?"opacity-30":"hover:bg-white/15"}`}><ChevronLeft/></button>
          {questions.map((question, idx) => {
            const isAct = idx === currentIdx;
            const isAns = !!answers[question.id];
            const isFlg = flagged[question.id];
            const isCor = isReview && answers[question.id] === question.correct;
            const isInc = isReview && answers[question.id] && answers[question.id] !== question.correct;
            let bg = "bg-white/10";
            if (isAct) bg = "bg-blue-400";
            else if (isCor) bg = "bg-green-500/60";
            else if (isInc) bg = "bg-red-500/60";
            else if (isAns) bg = "bg-white/25";
            return (
              <button key={question.id} onClick={() => goTo(idx)}
                className={`relative w-6 h-6 rounded text-[10px] font-semibold flex items-center justify-center flex-shrink-0 ${bg} hover:ring-1 hover:ring-white/40`}>
                {idx+1}
                {isFlg && <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-amber-400" />}
              </button>
            );
          })}
          <button onClick={goNext} disabled={currentIdx===totalQ-1} className={`p-1 rounded ${currentIdx===totalQ-1?"opacity-30":"hover:bg-white/15"}`}><ChevronRight/></button>
        </div>

        {/* Navigation + Next */}
        <div className="flex items-center gap-2">
          {!isReview && (
            <button onClick={() => setMode("nav")} className="flex items-center gap-1 px-3 py-1.5 rounded hover:bg-white/15 font-medium">
              ⚙ Navigation
            </button>
          )}
          {currentIdx < totalQ - 1 ? (
            <button onClick={goNext} className="flex items-center gap-1 px-3 py-1.5 rounded font-semibold hover:bg-white/15" style={{background:"rgba(255,255,255,0.15)"}}>
              Next <ChevronRight />
            </button>
          ) : !isReview ? (
            <button onClick={() => setMode("nav")} className="px-3 py-1.5 rounded font-semibold" style={{background:"rgba(255,255,255,0.15)"}}>
              End Section
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
