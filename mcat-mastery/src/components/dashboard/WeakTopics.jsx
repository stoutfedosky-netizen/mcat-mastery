export default function WeakTopics({ topics, sections }) {
  if (!topics || topics.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h3 className="font-semibold text-gray-900 mb-3">Weak Areas</h3>
        <p className="text-sm text-gray-400">
          Complete some practice to see your weak areas.
        </p>
      </div>
    );
  }

  const worst = topics.slice(0, 6);

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      <h3 className="font-semibold text-gray-900 mb-4">Weak Areas</h3>
      <div className="space-y-3">
        {worst.map((t) => {
          const section = sections.find((s) => s.id === t.section_id);
          return (
            <div key={`${t.section_id}:${t.topic}`}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0"
                    style={{
                      backgroundColor: (section?.color || "#6b7280") + "18",
                      color: section?.color || "#6b7280",
                    }}
                  >
                    {section?.abbr || t.section_id}
                  </span>
                  <span className="text-sm text-gray-700 truncate">{t.topic}</span>
                </div>
                <span
                  className={`text-xs font-semibold ml-2 flex-shrink-0 ${
                    t.accuracy >= 70
                      ? "text-emerald-600"
                      : t.accuracy >= 50
                      ? "text-amber-600"
                      : "text-red-600"
                  }`}
                >
                  {t.accuracy}%
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5">
                <div
                  className="h-1.5 rounded-full transition-all"
                  style={{
                    width: `${t.accuracy}%`,
                    backgroundColor:
                      t.accuracy >= 70 ? "#059669" : t.accuracy >= 50 ? "#d97706" : "#dc2626",
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
