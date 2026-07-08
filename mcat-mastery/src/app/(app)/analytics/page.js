"use client";
import { useApp } from "../../../context/AppContext";
import { SECTIONS } from "../../../lib/examData";
import StatCards from "../../../components/dashboard/StatCards";
import WeakTopics from "../../../components/dashboard/WeakTopics";
import RecentResults from "../../../components/dashboard/RecentResults";

export default function AnalyticsPage() {
  const {
    stats,
    sectionStats,
    topicStats,
    recentResults,
    reviewSession,
    counts,
  } = useApp();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="text-gray-500 mt-1">
          Track your performance across sections and topics.
        </p>
      </div>

      <StatCards stats={stats} />

      <div className="grid lg:grid-cols-3 gap-6 mt-8">
        <div className="lg:col-span-2 space-y-6">
          {/* Section Performance */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Section Performance</h3>
            <div className="space-y-4">
              {SECTIONS.map((sec) => {
                const ss = sectionStats[sec.id];
                const attempted = ss?.total || 0;
                const accuracy =
                  attempted > 0 ? Math.round((ss.correct / attempted) * 100) : null;
                const totalQs = counts[sec.id] || 0;
                const coverage =
                  totalQs > 0 ? Math.min(100, Math.round((attempted / totalQs) * 100)) : 0;

                return (
                  <div key={sec.id}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span
                          className="text-[11px] font-bold px-2 py-0.5 rounded"
                          style={{
                            backgroundColor: sec.color + "18",
                            color: sec.color,
                          }}
                        >
                          {sec.abbr}
                        </span>
                        <span className="text-sm text-gray-700">{sec.name}</span>
                      </div>
                      <div className="flex items-center gap-4 text-xs">
                        <span className="text-gray-400">
                          {attempted} attempted
                        </span>
                        {accuracy !== null ? (
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
                        ) : (
                          <span className="text-gray-300">--</span>
                        )}
                      </div>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div
                        className="h-2 rounded-full transition-all"
                        style={{ width: `${coverage}%`, backgroundColor: sec.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-[11px] text-gray-400 mt-4">
              Bar shows question bank coverage; percentage shows accuracy.
            </p>
          </div>

          <RecentResults
            results={recentResults}
            onReview={reviewSession}
            sections={SECTIONS}
          />
        </div>

        <div className="space-y-6">
          <WeakTopics topics={topicStats} sections={SECTIONS} />
        </div>
      </div>
    </div>
  );
}
