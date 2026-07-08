"use client";
import { useState } from "react";
import { useApp } from "../../../context/AppContext";
import { SECTIONS } from "../../../lib/examData";
import SubjectCard from "../../../components/dashboard/SubjectCard";
import ModeSelector from "../../../components/dashboard/ModeSelector";
import StatusFilter from "../../../components/dashboard/StatusFilter";

export default function PracticePage() {
  const {
    counts,
    loading,
    selectedSections,
    sectionStats,
    toggleSection,
    availableTopics,
    selectedTopics,
    setSelectedTopics,
    toggleTopic,
    statusFilter,
    setStatusFilter,
    statusFilterCounts,
    selectedMode,
    setSelectedMode,
    missedQuestionIds,
    questionCount,
    setQuestionCount,
    maxAvailable,
    countAdjusted,
    startTest,
  } = useApp();

  const [topicFilterOpen, setTopicFilterOpen] = useState(false);
  const [topicSearch, setTopicSearch] = useState("");

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Practice</h1>
        <p className="text-gray-500 mt-1">
          Choose your subjects, filters, and mode, then start a session.
        </p>
      </div>

      <div className="space-y-6">
        {/* Subjects */}
        <div>
          <h2 className="font-semibold text-gray-900 mb-4">Select Subjects</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {SECTIONS.map((sec) => {
              const ss = sectionStats[sec.id];
              return (
                <SubjectCard
                  key={sec.id}
                  section={sec}
                  questionCount={counts[sec.id] || 0}
                  selected={selectedSections.includes(sec.id)}
                  completed={ss?.total || 0}
                  accuracy={
                    ss && ss.total > 0
                      ? Math.round((ss.correct / ss.total) * 100)
                      : null
                  }
                  onToggle={() => toggleSection(sec.id)}
                  loading={loading}
                />
              );
            })}
          </div>
        </div>

        {/* Topic Filters */}
        {availableTopics.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <button
              onClick={() => setTopicFilterOpen((o) => !o)}
              className="flex items-center justify-between w-full"
            >
              <h3 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
                Filter by Topic
                {selectedTopics.length > 0 && (
                  <span className="bg-blue-100 text-blue-700 text-[11px] px-2 py-0.5 rounded-full font-medium">
                    {selectedTopics.length} selected
                  </span>
                )}
              </h3>
              <svg className={`w-4 h-4 text-gray-400 transition-transform ${topicFilterOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>
            {topicFilterOpen && (
              <div className="mt-3">
                <div className="flex items-center gap-2 mb-3">
                  <input
                    type="text"
                    value={topicSearch}
                    onChange={(e) => setTopicSearch(e.target.value)}
                    placeholder="Search topics..."
                    className="flex-1 px-3 py-1.5 rounded-lg border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-300"
                  />
                  {selectedTopics.length > 0 && (
                    <button
                      onClick={() => setSelectedTopics([])}
                      className="text-xs text-gray-400 hover:text-gray-600 whitespace-nowrap"
                    >
                      Clear all
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
                  {(() => {
                    const search = topicSearch.toLowerCase();
                    const filtered = availableTopics.filter(
                      (t) => selectedTopics.includes(t.topic) || t.topic.toLowerCase().includes(search)
                    );
                    if (filtered.length === 0) return <p className="text-xs text-gray-400 italic">No topics match your search.</p>;
                    return filtered.map((t) => {
                      const active = selectedTopics.includes(t.topic);
                      return (
                        <button
                          key={`${t.sectionId}:${t.topic}`}
                          onClick={() => toggleTopic(t.topic)}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                            active
                              ? "text-white shadow-sm"
                              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                          }`}
                          style={active ? { backgroundColor: t.color } : {}}
                        >
                          {t.topic}
                        </button>
                      );
                    });
                  })()}
                </div>
                {selectedTopics.length > 0 && (
                  <p className="text-[11px] text-gray-400 mt-2">
                    Passage groups are preserved when filtering by topic.
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Status Filter */}
        {selectedSections.length > 0 && selectedMode !== "review" && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <StatusFilter
              statusFilter={statusFilter}
              onSelect={setStatusFilter}
              counts={statusFilterCounts}
            />
          </div>
        )}

        {/* Mode Selector */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <ModeSelector
            selectedMode={selectedMode}
            onSelect={setSelectedMode}
            missedCount={missedQuestionIds.size}
          />
        </div>

        {/* Question Count & Start */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          {selectedMode !== "review" && selectedSections.length > 0 && maxAvailable === 0 ? (
            <div className="text-center py-2">
              <p className="text-sm text-gray-500">No questions match your current filters.</p>
              <p className="text-xs text-gray-400 mt-1">Try adjusting your topic or status filters.</p>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-end gap-4">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2 text-sm">
                  Number of Questions
                </h3>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    value={questionCount}
                    min={1}
                    max={selectedMode === "review" ? missedQuestionIds.size || 999 : maxAvailable || 999}
                    onChange={(e) =>
                      setQuestionCount(
                        Math.max(1, parseInt(e.target.value) || 1)
                      )
                    }
                    className="w-24 px-3 py-2.5 border border-gray-300 rounded-lg text-center font-mono text-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                  {maxAvailable > 0 && selectedMode !== "review" && (
                    <span className="text-sm text-gray-400">
                      of {maxAvailable} available
                    </span>
                  )}
                  {selectedMode === "review" && (
                    <span className="text-sm text-gray-400">
                      of {missedQuestionIds.size} missed
                    </span>
                  )}
                </div>
                {countAdjusted && (
                  <p className="text-xs text-amber-600 mt-1">Adjusted to match available questions.</p>
                )}
              </div>
              <button
                onClick={startTest}
                disabled={
                  (selectedMode !== "review" && selectedSections.length === 0) ||
                  (selectedMode !== "review" && maxAvailable === 0)
                }
                className="flex-1 py-3 rounded-xl font-semibold text-white text-sm transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                style={{ background: "#1a3a5c" }}
              >
                {selectedMode === "review"
                  ? "Start Reattempt"
                  : selectedMode === "timed" || selectedMode === "exam"
                  ? "Start Test"
                  : "Start Practice"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
