"use client";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { createClient } from "../lib/supabase";
import ExamInterface from "../components/ExamInterface";
import StatCards from "../components/dashboard/StatCards";
import SubjectCard from "../components/dashboard/SubjectCard";
import ModeSelector from "../components/dashboard/ModeSelector";
import ReviewQueue from "../components/dashboard/ReviewQueue";
import WeakTopics from "../components/dashboard/WeakTopics";
import RecentResults from "../components/dashboard/RecentResults";

const SECTIONS = [
  { id: "cp", name: "Chemical & Physical Foundations", abbr: "C/P", color: "#0891b2" },
  { id: "cars", name: "Critical Analysis & Reasoning", abbr: "CARS", color: "#7c3aed" },
  { id: "bb", name: "Biological & Biochemical Foundations", abbr: "B/B", color: "#059669" },
  { id: "ps", name: "Psychological, Social & Bio Foundations", abbr: "P/S", color: "#e11d48" },
];

function selectQuestions(allQuestions, count) {
  if (count >= allQuestions.length) return allQuestions;

  const groups = [];
  let current = [];
  for (const q of allQuestions) {
    if (q.passage) {
      if (current.length) groups.push(current);
      current = [q];
    } else if (current.length > 0 && q.batch === current[0].batch && q.section_id === current[0].section_id) {
      current.push(q);
    } else {
      if (current.length) groups.push(current);
      current = [q];
    }
  }
  if (current.length) groups.push(current);

  for (let i = groups.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [groups[i], groups[j]] = [groups[j], groups[i]];
  }

  const selected = [];
  for (const group of groups) {
    if (selected.length >= count) break;
    if (selected.length + group.length <= count) {
      selected.push(...group);
    }
  }

  selected.sort((a, b) => {
    if (a.section_id !== b.section_id) return (a.section_id || "").localeCompare(b.section_id || "");
    if (a.batch !== b.batch) return (a.batch || "").localeCompare(b.batch || "");
    return (a.sort_order || 0) - (b.sort_order || 0);
  });

  return selected;
}

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeExam, setActiveExam] = useState(null);
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedSections, setSelectedSections] = useState([]);
  const [questionCount, setQuestionCount] = useState(20);
  const [recentResults, setRecentResults] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);

  const [selectedMode, setSelectedMode] = useState("practice");
  const [selectedTopics, setSelectedTopics] = useState([]);
  const [stats, setStats] = useState({
    questionsCompleted: 0,
    overallAccuracy: 0,
    studyStreak: 0,
    weakestSection: null,
    weakestSectionId: null,
  });
  const [sectionStats, setSectionStats] = useState({});
  const [topicStats, setTopicStats] = useState([]);
  const [topicsBySection, setTopicsBySection] = useState({});
  const [missedQuestionIds, setMissedQuestionIds] = useState([]);
  const [flaggedQuestionIds, setFlaggedQuestionIds] = useState([]);

  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        window.location.href = "/login";
        return;
      }
      setUser(session.user);
      setAuthLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!user) return;

    async function fetchData() {
      const { data: allQ } = await supabase
        .from("questions")
        .select("id, section_id, topic");

      if (allQ) {
        const c = {};
        allQ.forEach((q) => {
          c[q.section_id] = (c[q.section_id] || 0) + 1;
        });
        setCounts(c);

        const tbs = {};
        allQ.forEach((q) => {
          if (!q.topic) return;
          if (!tbs[q.section_id]) tbs[q.section_id] = new Set();
          tbs[q.section_id].add(q.topic);
        });
        const tbsObj = {};
        Object.keys(tbs).forEach((sid) => {
          tbsObj[sid] = [...tbs[sid]].sort();
        });
        setTopicsBySection(tbsObj);

        const { data: attempts } = await supabase
          .from("question_attempts")
          .select("question_id, is_correct")
          .eq("user_id", user.id);

        if (attempts && attempts.length > 0) {
          const qLookup = {};
          allQ.forEach((q) => {
            qLookup[q.id] = q;
          });

          const total = attempts.length;
          const correct = attempts.filter((a) => a.is_correct).length;
          const secMap = {};
          const topicMap = {};
          const missedSet = new Set();

          attempts.forEach((a) => {
            const q = qLookup[a.question_id];
            if (!q) return;

            if (!secMap[q.section_id]) secMap[q.section_id] = { total: 0, correct: 0 };
            secMap[q.section_id].total++;
            if (a.is_correct) secMap[q.section_id].correct++;
            else missedSet.add(a.question_id);

            if (q.topic) {
              const key = `${q.section_id}:${q.topic}`;
              if (!topicMap[key])
                topicMap[key] = { topic: q.topic, section_id: q.section_id, total: 0, correct: 0 };
              topicMap[key].total++;
              if (a.is_correct) topicMap[key].correct++;
            }
          });

          let weakestId = null;
          let lowestAcc = 101;
          Object.entries(secMap).forEach(([sid, s]) => {
            const acc = s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0;
            if (acc < lowestAcc) {
              lowestAcc = acc;
              weakestId = sid;
            }
          });

          const topicArr = Object.values(topicMap)
            .map((t) => ({
              ...t,
              accuracy: t.total > 0 ? Math.round((t.correct / t.total) * 100) : 0,
            }))
            .sort((a, b) => a.accuracy - b.accuracy);

          setStats((prev) => ({
            ...prev,
            questionsCompleted: total,
            overallAccuracy: total > 0 ? Math.round((correct / total) * 100) : 0,
            weakestSection: weakestId
              ? SECTIONS.find((s) => s.id === weakestId)?.abbr || null
              : null,
            weakestSectionId: weakestId,
          }));
          setSectionStats(secMap);
          setTopicStats(topicArr);
          setMissedQuestionIds([...missedSet]);
        }
      }

      const { data: rData } = await supabase
        .from("exam_sessions")
        .select("*")
        .eq("user_id", user.id)
        .order("completed_at", { ascending: false })
        .limit(10);

      if (rData) {
        setRecentResults(rData);

        // Study streak
        const { data: allSessions } = await supabase
          .from("exam_sessions")
          .select("completed_at")
          .eq("user_id", user.id)
          .order("completed_at", { ascending: false })
          .limit(100);

        if (allSessions && allSessions.length > 0) {
          const daySet = new Set(
            allSessions.map((s) => new Date(s.completed_at).toDateString())
          );
          const days = [...daySet]
            .map((d) => new Date(d))
            .sort((a, b) => b - a);

          let streak = 0;
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          for (let i = 0; i < days.length; i++) {
            const expected = new Date(today);
            expected.setDate(expected.getDate() - i);
            expected.setHours(0, 0, 0, 0);
            const d = new Date(days[i]);
            d.setHours(0, 0, 0, 0);
            if (d.getTime() === expected.getTime()) {
              streak++;
            } else {
              break;
            }
          }
          setStats((prev) => ({ ...prev, studyStreak: streak }));
        }

        // Flagged questions across sessions
        const flagged = new Set();
        rData.forEach((r) => {
          if (r.flagged && typeof r.flagged === "object") {
            Object.entries(r.flagged).forEach(([qId, val]) => {
              if (val) flagged.add(qId);
            });
          }
        });
        setFlaggedQuestionIds([...flagged]);
      }

      setLoading(false);
    }
    fetchData();
  }, [user, refreshKey]);

  const maxAvailable = selectedSections.reduce(
    (sum, id) => sum + (counts[id] || 0),
    0
  );

  const availableTopics = useMemo(() => {
    const seen = new Set();
    const topics = [];
    selectedSections.forEach((sid) => {
      (topicsBySection[sid] || []).forEach((t) => {
        if (!seen.has(t)) {
          seen.add(t);
          topics.push({
            topic: t,
            sectionId: sid,
            color: SECTIONS.find((s) => s.id === sid)?.color,
          });
        }
      });
    });
    return topics;
  }, [selectedSections, topicsBySection]);

  const recommendation = useMemo(() => {
    if (stats.questionsCompleted === 0) {
      return {
        title: "Get Started",
        text: "Begin with a practice session to establish your baseline and start tracking progress.",
        action: "start",
      };
    }
    if (stats.weakestSection && stats.overallAccuracy < 70) {
      return {
        title: `Focus on ${stats.weakestSection}`,
        text: `Your ${stats.weakestSection} section needs the most attention. Targeted practice in this area will have the biggest impact on your score.`,
        action: "weak",
      };
    }
    if (missedQuestionIds.length > 0) {
      return {
        title: "Review Missed Questions",
        text: `You have ${missedQuestionIds.length} missed question${missedQuestionIds.length === 1 ? "" : "s"}. Reviewing these will reinforce weak areas and improve retention.`,
        action: "review",
      };
    }
    return {
      title: "Keep the Momentum",
      text: "You're making solid progress. Try a timed session to build test-day confidence and pacing.",
      action: "timed",
    };
  }, [stats, missedQuestionIds]);

  const toggleSection = (id) => {
    setSelectedSections((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
    setSelectedTopics([]);
  };

  const toggleTopic = (topic) => {
    setSelectedTopics((prev) =>
      prev.includes(topic) ? prev.filter((t) => t !== topic) : [...prev, topic]
    );
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  const reviewSession = async (session) => {
    const { data, error } = await supabase
      .from("questions")
      .select("*")
      .in("id", session.question_ids);

    if (error || !data || data.length === 0) {
      alert("Could not load questions for this session.");
      return;
    }

    const idOrder = {};
    session.question_ids.forEach((id, idx) => {
      idOrder[id] = idx;
    });
    data.sort((a, b) => (idOrder[a.id] ?? 0) - (idOrder[b.id] ?? 0));

    const questions = data.map((q) => ({
      id: q.id,
      passage: q.passage,
      usePrevPassage: q.use_prev_passage,
      stem: q.stem,
      choices: q.choices,
      correct: q.correct_answer,
      explanations: q.explanations,
      topic: q.topic,
      difficulty: q.difficulty,
      batch: q.batch,
      sectionId: q.section_id,
    }));

    const sectionIds = [...new Set(data.map((q) => q.section_id))];
    const firstSection = SECTIONS.find((s) => s.id === sectionIds[0]);

    setActiveExam({
      questions,
      sections: sectionIds,
      sectionName: sectionIds
        .map((id) => SECTIONS.find((s) => s.id === id)?.abbr || id.toUpperCase())
        .join("/"),
      sectionAbbr: sectionIds
        .map((id) => SECTIONS.find((s) => s.id === id)?.abbr || id.toUpperCase())
        .join("/"),
      sectionColor: firstSection?.color || "#1a73e8",
      timeLimit: null,
      testMode: false,
      reviewMode: true,
      savedAnswers: session.answers,
    });
  };

  const saveResults = async (results) => {
    if (!user || !activeExam) return;

    const { data: session, error: sessionError } = await supabase
      .from("exam_sessions")
      .insert({
        user_id: user.id,
        section_id: activeExam.sections[0],
        mode: activeExam.testMode ? "timed" : "practice",
        question_ids: activeExam.questions.map((q) => q.id),
        answers: results.answers,
        flagged: results.flagged || {},
        score_correct: results.score.correct,
        score_total: results.score.total,
        score_percent: results.score.pct,
        completed_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (sessionError) {
      console.error("Failed to save session:", sessionError);
      return;
    }

    const attempts = activeExam.questions
      .filter((q) => results.answers[q.id])
      .map((q) => ({
        user_id: user.id,
        question_id: q.id,
        session_id: session.id,
        selected_answer: results.answers[q.id],
        is_correct: results.answers[q.id] === q.correct,
      }));

    if (attempts.length > 0) {
      const { error: attemptsError } = await supabase
        .from("question_attempts")
        .insert(attempts);
      if (attemptsError) console.error("Failed to save attempts:", attemptsError);
    }
  };

  const startTest = async () => {
    // Review missed mode — loads previously incorrect questions
    if (selectedMode === "review") {
      if (missedQuestionIds.length === 0) {
        alert("No missed questions to review. Complete some practice sessions first.");
        return;
      }

      const { data, error } = await supabase
        .from("questions")
        .select("*")
        .in("id", missedQuestionIds.slice(0, 100));

      if (error || !data || data.length === 0) {
        alert("Could not load missed questions.");
        return;
      }

      for (let i = data.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [data[i], data[j]] = [data[j], data[i]];
      }
      const limited = data.slice(0, questionCount);

      const questions = limited.map((q) => ({
        id: q.id,
        passage: q.passage,
        usePrevPassage: q.use_prev_passage,
        stem: q.stem,
        choices: q.choices,
        correct: q.correct_answer,
        explanations: q.explanations,
        topic: q.topic,
        difficulty: q.difficulty,
        batch: q.batch,
        sectionId: q.section_id,
      }));

      const sectionIds = [...new Set(limited.map((q) => q.section_id))];
      const firstSection = SECTIONS.find((s) => s.id === sectionIds[0]);

      setActiveExam({
        questions,
        sections: sectionIds,
        sectionName: "Review Missed",
        sectionAbbr: "REV",
        sectionColor: firstSection?.color || "#6b7280",
        timeLimit: null,
        testMode: false,
      });
      return;
    }

    // Standard flow — requires section selection
    if (selectedSections.length === 0) return;

    const { data, error } = await supabase
      .from("questions")
      .select("*")
      .in("section_id", selectedSections)
      .order("section_id", { ascending: true })
      .order("batch", { ascending: true })
      .order("sort_order", { ascending: true });

    if (error || !data || data.length === 0) {
      alert("No questions found for selected sections.");
      return;
    }

    // Topic filter — preserves passage groups by including full batch
    let filtered = data;
    if (selectedTopics.length > 0) {
      const matchBatches = new Set();
      data.forEach((q) => {
        if (selectedTopics.includes(q.topic)) {
          matchBatches.add(`${q.section_id}|${q.batch}`);
        }
      });
      filtered = data.filter((q) => matchBatches.has(`${q.section_id}|${q.batch}`));
      if (filtered.length === 0) filtered = data;
    }

    const count = Math.min(questionCount, filtered.length);
    const selected = selectQuestions(filtered, count);

    const questions = selected.map((q) => ({
      id: q.id,
      passage: q.passage,
      usePrevPassage: q.use_prev_passage,
      stem: q.stem,
      choices: q.choices,
      correct: q.correct_answer,
      explanations: q.explanations,
      topic: q.topic,
      difficulty: q.difficulty,
      batch: q.batch,
      sectionId: q.section_id,
    }));

    const sectionNames = selectedSections.map((id) =>
      SECTIONS.find((s) => s.id === id)
    );
    const isTimed = selectedMode === "timed" || selectedMode === "exam";

    setActiveExam({
      questions,
      sections: selectedSections,
      sectionName: sectionNames.map((s) => s.name).join(", "),
      sectionAbbr: sectionNames.map((s) => s.abbr).join("/"),
      sectionColor: sectionNames[0].color,
      timeLimit: isTimed ? questions.length * 95 : null,
      testMode: isTimed,
    });
  };

  const handleRecommendedAction = () => {
    if (recommendation.action === "weak" && stats.weakestSectionId) {
      setSelectedSections([stats.weakestSectionId]);
      setSelectedMode("practice");
    } else if (recommendation.action === "review") {
      setSelectedMode("review");
    } else if (recommendation.action === "timed") {
      setSelectedMode("timed");
    }
  };

  // === RENDER ===

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-400 text-sm">Loading...</div>
      </div>
    );
  }

  if (activeExam) {
    return (
      <ExamInterface
        questions={activeExam.questions}
        sectionName={activeExam.sectionName}
        sectionAbbr={activeExam.sectionAbbr}
        sectionColor={activeExam.sectionColor}
        timeLimit={activeExam.timeLimit}
        testMode={activeExam.testMode}
        initialAnswers={activeExam.savedAnswers || null}
        startInReview={activeExam.reviewMode || false}
        onComplete={
          activeExam.reviewMode
            ? null
            : (results) => {
                saveResults(results);
              }
        }
        onExit={() => {
          setActiveExam(null);
          setRefreshKey((k) => k + 1);
        }}
      />
    );
  }

  const displayName =
    user?.user_metadata?.display_name || user?.email?.split("@")[0] || "Student";

  return (
    <div className="min-h-screen bg-gray-50/80 font-exam">
      {/* Nav */}
      <nav className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-lg font-bold tracking-tight">
            MCAT <span className="text-cyan-600">Mastery</span>
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500 hidden sm:block">{user?.email}</span>
            <button
              onClick={signOut}
              className="text-sm text-gray-400 hover:text-gray-600"
            >
              Sign out
            </button>
            <div className="w-8 h-8 rounded-full bg-cyan-100 flex items-center justify-center text-xs font-bold text-cyan-700">
              {displayName[0].toUpperCase()}
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Welcome */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, {displayName}
          </h1>
          <p className="text-gray-500 mt-1">
            {stats.questionsCompleted > 0
              ? `You've answered ${stats.questionsCompleted} questions so far. Keep building momentum.`
              : "Start practicing to track your MCAT preparation progress."}
          </p>
        </div>

        {/* Stats */}
        <StatCards stats={stats} />

        {/* Main Grid */}
        <div className="grid lg:grid-cols-3 gap-6 mt-8">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Recommended */}
            <div className="bg-gradient-to-br from-blue-800 to-cyan-600 rounded-xl p-6 text-white shadow-md">
              <div className="text-xs font-medium text-blue-200 uppercase tracking-wider mb-1">
                Recommended
              </div>
              <h3 className="text-lg font-bold mb-2">{recommendation.title}</h3>
              <p className="text-sm text-blue-100 leading-relaxed max-w-lg">
                {recommendation.text}
              </p>
              <div className="flex flex-wrap gap-3 mt-4">
                <button
                  onClick={handleRecommendedAction}
                  className="px-4 py-2 bg-white text-blue-800 rounded-lg text-sm font-semibold hover:bg-blue-50 transition-colors"
                >
                  {recommendation.action === "review"
                    ? "Review Missed"
                    : "Start Practice"}
                </button>
                {missedQuestionIds.length > 0 && recommendation.action !== "review" && (
                  <button
                    onClick={() => setSelectedMode("review")}
                    className="px-4 py-2 bg-white/20 text-white rounded-lg text-sm font-medium hover:bg-white/30 transition-colors"
                  >
                    Review Missed ({missedQuestionIds.length})
                  </button>
                )}
              </div>
            </div>

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
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-900 text-sm">
                    Filter by Topic
                  </h3>
                  {selectedTopics.length > 0 && (
                    <button
                      onClick={() => setSelectedTopics([])}
                      className="text-xs text-gray-400 hover:text-gray-600"
                    >
                      Clear all
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {availableTopics.map((t) => {
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
                  })}
                </div>
                {selectedTopics.length > 0 && (
                  <p className="text-[11px] text-gray-400 mt-2">
                    Passage groups are preserved when filtering by topic.
                  </p>
                )}
              </div>
            )}

            {/* Mode Selector */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <ModeSelector
                selectedMode={selectedMode}
                onSelect={setSelectedMode}
                missedCount={missedQuestionIds.length}
              />
            </div>

            {/* Question Count & Start */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
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
                      max={maxAvailable || 999}
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
                        of {missedQuestionIds.length} missed
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={startTest}
                  disabled={
                    selectedMode !== "review" && selectedSections.length === 0
                  }
                  className="flex-1 py-3 rounded-xl font-semibold text-white text-sm transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                  style={{ background: "#2b579a" }}
                >
                  {selectedMode === "review"
                    ? "Start Review"
                    : selectedMode === "timed" || selectedMode === "exam"
                    ? "Start Test"
                    : "Start Practice"}
                </button>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            <ReviewQueue
              missedCount={missedQuestionIds.length}
              flaggedCount={flaggedQuestionIds.length}
              onReviewMissed={() => setSelectedMode("review")}
            />
            <WeakTopics topics={topicStats} sections={SECTIONS} />
          </div>
        </div>

        {/* Recent Results */}
        <div className="mt-8 mb-12">
          <RecentResults
            results={recentResults}
            onReview={reviewSession}
            sections={SECTIONS}
          />
        </div>
      </div>
    </div>
  );
}
