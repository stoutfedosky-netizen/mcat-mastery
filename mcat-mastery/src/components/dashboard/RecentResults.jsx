export default function RecentResults({ results, onReview, sections }) {
  if (!results || results.length === 0) return null;

  return (
    <div>
      <h2 className="font-semibold text-gray-900 mb-4">Recent Results</h2>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="bg-gray-50/80 px-5 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider grid grid-cols-12 gap-2">
          <div className="col-span-2">Date</div>
          <div className="col-span-2">Section</div>
          <div className="col-span-2 text-center">Score</div>
          <div className="col-span-2 text-center">Questions</div>
          <div className="col-span-2 text-center">Mode</div>
          <div className="col-span-2 text-center"></div>
        </div>
        {results.map((r) => {
          const section = sections?.find((s) => s.id === r.section_id);
          const answeredCount = r.answers ? Object.keys(r.answers).length : 0;
          const isIncomplete = answeredCount === 0 && r.score_total > 0;

          return (
            <div
              key={r.id}
              className="px-5 py-3 text-sm grid grid-cols-12 gap-2 items-center border-t border-gray-50 hover:bg-gray-50/50 transition-colors"
            >
              <div className="col-span-2 text-gray-500 text-xs">
                {new Date(r.completed_at).toLocaleDateString()}
              </div>
              <div className="col-span-2">
                <span
                  className="text-[11px] font-bold px-2 py-0.5 rounded"
                  style={{
                    backgroundColor: (section?.color || "#6b7280") + "18",
                    color: section?.color || "#6b7280",
                  }}
                >
                  {section?.abbr || r.section_id?.toUpperCase()}
                </span>
              </div>
              <div className="col-span-2 text-center">
                {isIncomplete ? (
                  <span className="text-xs text-gray-400 italic">Incomplete</span>
                ) : (
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${
                      r.score_percent >= 70
                        ? "bg-emerald-50 text-emerald-700"
                        : r.score_percent >= 50
                        ? "bg-amber-50 text-amber-700"
                        : "bg-red-50 text-red-700"
                    }`}
                  >
                    {Math.round(r.score_percent)}%
                  </span>
                )}
              </div>
              <div className="col-span-2 text-center text-gray-500 text-xs">
                {r.score_correct}/{r.score_total}
              </div>
              <div className="col-span-2 text-center">
                <span
                  className={`text-[11px] font-medium px-2 py-0.5 rounded ${
                    r.mode === "timed"
                      ? "bg-blue-50 text-blue-600"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {r.mode === "timed" ? "Timed" : "Practice"}
                </span>
              </div>
              <div className="col-span-2 text-center">
                <button
                  onClick={() => onReview(r)}
                  className="text-blue-600 hover:text-blue-800 text-xs font-medium hover:underline"
                >
                  Review
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
