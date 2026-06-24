export default function SubjectCard({
  section,
  questionCount,
  selected,
  completed,
  accuracy,
  onToggle,
  loading,
}) {
  const progress =
    questionCount > 0 ? Math.min(100, Math.round((completed / questionCount) * 100)) : 0;

  return (
    <button
      onClick={onToggle}
      className={`relative p-4 rounded-xl border-2 text-left transition-all overflow-hidden ${
        selected
          ? "border-blue-500 bg-blue-50/40 shadow-sm"
          : "border-gray-200 hover:border-gray-300 bg-white"
      }`}
    >
      <div
        className="absolute left-0 top-0 bottom-0 w-1"
        style={{ backgroundColor: section.color }}
      />

      <div className="pl-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-bold" style={{ color: section.color }}>
            {section.abbr}
          </span>
          <div
            className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
              selected ? "border-blue-500 bg-blue-500" : "border-gray-300"
            }`}
          >
            {selected && (
              <svg
                width="12"
                height="12"
                viewBox="0 0 16 16"
                fill="none"
                stroke="white"
                strokeWidth="2.5"
              >
                <path d="M3 8l3.5 3.5L13 4" />
              </svg>
            )}
          </div>
        </div>

        <div className="text-sm font-medium text-gray-800 mb-0.5 leading-tight">
          {section.name}
        </div>
        <div className="text-xs text-gray-400">
          {loading ? "..." : `${questionCount} questions`}
        </div>

        {completed > 0 && (
          <div className="mt-2.5">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-gray-500">{completed} attempted</span>
              {accuracy !== null && (
                <span
                  className={`font-semibold ${
                    accuracy >= 70
                      ? "text-emerald-600"
                      : accuracy >= 50
                      ? "text-amber-600"
                      : "text-red-500"
                  }`}
                >
                  {accuracy}%
                </span>
              )}
            </div>
            <div className="w-full bg-gray-100 rounded-full h-1.5">
              <div
                className="h-1.5 rounded-full transition-all"
                style={{ width: `${progress}%`, backgroundColor: section.color }}
              />
            </div>
          </div>
        )}
      </div>
    </button>
  );
}
