const MODES = [
  {
    id: "practice",
    name: "Practice",
    desc: "Untimed, focus on learning",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
  },
  {
    id: "timed",
    name: "Timed",
    desc: "Countdown, auto-ends",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    id: "review",
    name: "Review Missed",
    desc: "Reattempt wrong answers",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    ),
  },
  {
    id: "exam",
    name: "Exam Simulation",
    desc: "MCAT pacing, 95s/question",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
  },
];

export default function ModeSelector({ selectedMode, onSelect, missedCount = 0 }) {
  return (
    <div>
      <h3 className="font-semibold text-gray-900 mb-3">Test Mode</h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {MODES.map((mode) => {
          const active = selectedMode === mode.id;
          const disabled = mode.id === "review" && missedCount === 0;
          return (
            <button
              key={mode.id}
              onClick={() => !disabled && onSelect(mode.id)}
              disabled={disabled}
              className={`p-3.5 rounded-xl border-2 text-left transition-all ${
                active
                  ? "border-blue-500 bg-blue-50/60"
                  : disabled
                  ? "border-gray-100 bg-gray-50/50 opacity-40 cursor-not-allowed"
                  : "border-gray-200 hover:border-gray-300 bg-white"
              }`}
            >
              <div className={`mb-2 ${active ? "text-blue-600" : "text-gray-400"}`}>
                {mode.icon}
              </div>
              <div
                className={`font-semibold text-sm leading-tight ${
                  active ? "text-blue-900" : "text-gray-800"
                }`}
              >
                {mode.name}
              </div>
              <div className="text-[11px] text-gray-500 mt-0.5 leading-snug">
                {mode.id === "review" && missedCount > 0
                  ? `${missedCount} questions`
                  : mode.desc}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
