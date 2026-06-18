"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "../lib/supabase";
import ExamInterface from "../components/ExamInterface";

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
    } else if (q.use_prev_passage && current.length > 0 && q.batch === current[0].batch && q.section_id === current[0].section_id) {
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
  const [timed, setTimed] = useState(false);
  const [recentResults, setRecentResults] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);

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
      const { data: qData } = await supabase
        .from("questions")
        .select("section_id");
      if (qData) {
        const c = {};
        qData.forEach((q) => {
          c[q.section_id] = (c[q.section_id] || 0) + 1;
        });
        setCounts(c);
      }

      const { data: rData } = await supabase
        .from("exam_sessions")
        .select("*")
        .eq("user_id", user.id)
        .order("completed_at", { ascending: false })
        .limit(10);
      if (rData) setRecentResults(rData);

      setLoading(false);
    }
    fetchData();
  }, [user, refreshKey]);

  const maxAvailable = selectedSections.reduce(
    (sum, id) => sum + (counts[id] || 0),
    0
  );

  const toggleSection = (id) => {
    setSelectedSections((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  const startTest = async () => {
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

    const count = Math.min(questionCount, data.length);
    const selected = selectQuestions(data, count);

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
    }));

    const sectionNames = selectedSections.map((id) =>
      SECTIONS.find((s) => s.id === id)
    );
    setActiveExam({
      questions,
      sections: selectedSections,
      sectionName: sectionNames.map((s) => s.name).join(", "),
      sectionAbbr: sectionNames.map((s) => s.abbr).join("/"),
      sectionColor: sectionNames[0].color,
      timeLimit: timed ? questions.length * 95 : null,
      testMode: timed,
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
        onComplete={(results) => {
          saveResults(results);
        }}
        onExit={() => {
          setActiveExam(null);
          setRefreshKey((k) => k + 1);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-exam">
      <nav className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <Link href="/" className="text-lg font-bold tracking-tight">
          MCAT <span className="text-cyan-600">Mastery</span>
        </Link>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">{user?.email}</span>
          <button
            onClick={signOut}
            className="text-sm text-gray-400 hover:text-gray-600"
          >
            Sign out
          </button>
          <div className="w-8 h-8 rounded-full bg-cyan-100 flex items-center justify-center text-xs font-bold text-cyan-700">
            {(user?.email || "U")[0].toUpperCase()}
          </div>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Create Test</h1>
        <p className="text-gray-500 mb-8">
          Select sections and configure your practice session.
        </p>

        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="font-semibold text-gray-900 mb-4">Subjects</h2>
          <div className="grid grid-cols-2 gap-3">
            {SECTIONS.map((sec) => {
              const checked = selectedSections.includes(sec.id);
              const sectionCount = counts[sec.id] || 0;
              return (
                <button
                  key={sec.id}
                  onClick={() => toggleSection(sec.id)}
                  className={`flex items-center gap-3 p-4 rounded-lg border-2 text-left transition-all ${
                    checked
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                      checked
                        ? "border-blue-500 bg-blue-500"
                        : "border-gray-300"
                    }`}
                  >
                    {checked && (
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
                  <div>
                    <div
                      className="font-bold text-sm"
                      style={{ color: sec.color }}
                    >
                      {sec.abbr}
                    </div>
                    <div className="text-xs text-gray-600">{sec.name}</div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {loading ? "..." : `${sectionCount} questions`}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <div className="grid grid-cols-2 gap-8">
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">
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
                  className="w-24 px-3 py-2 border border-gray-300 rounded text-center font-mono text-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
                {maxAvailable > 0 && (
                  <span className="text-sm text-gray-500">
                    of {maxAvailable} available
                  </span>
                )}
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-3">
                Test Settings
              </h3>
              <button
                onClick={() => setTimed((t) => !t)}
                className="flex items-center gap-3"
              >
                <div
                  className={`relative w-11 h-6 rounded-full transition-colors ${
                    timed ? "bg-blue-500" : "bg-gray-300"
                  }`}
                >
                  <div
                    className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                      timed ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </div>
                <span className="text-sm font-medium text-gray-700">
                  Timed
                </span>
              </button>
              <p className="text-xs text-gray-400 mt-2">
                {timed
                  ? "Countdown timer — section ends when time runs out"
                  : "Count-up timer for self-pacing (no auto-end)"}
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={startTest}
          disabled={selectedSections.length === 0}
          className="w-full py-3.5 rounded-xl font-semibold text-white text-lg transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: "#2b579a" }}
        >
          {timed ? "Start Test" : "Start Practice"}
        </button>

        {recentResults.length > 0 && (
          <div className="mt-10">
            <h2 className="font-semibold text-gray-900 mb-4">
              Recent Results
            </h2>
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="bg-gray-50 px-4 py-2.5 text-xs font-semibold text-gray-500 grid grid-cols-12 gap-2">
                <div className="col-span-3">Date</div>
                <div className="col-span-3">Sections</div>
                <div className="col-span-2 text-center">Score</div>
                <div className="col-span-2 text-center">Questions</div>
                <div className="col-span-2 text-center">Mode</div>
              </div>
              {recentResults.map((r) => (
                <div
                  key={r.id}
                  className="px-4 py-2.5 text-sm grid grid-cols-12 gap-2 items-center border-t border-gray-100"
                >
                  <div className="col-span-3 text-gray-600">
                    {new Date(r.completed_at).toLocaleDateString()}
                  </div>
                  <div className="col-span-3 text-gray-800 uppercase text-xs font-medium">
                    {r.section_id}
                  </div>
                  <div className="col-span-2 text-center">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${
                        r.score_percent >= 70
                          ? "bg-green-100 text-green-700"
                          : r.score_percent >= 50
                          ? "bg-amber-100 text-amber-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {Math.round(r.score_percent)}%
                    </span>
                  </div>
                  <div className="col-span-2 text-center text-gray-600">
                    {r.score_correct}/{r.score_total}
                  </div>
                  <div className="col-span-2 text-center text-gray-500 text-xs">
                    {r.mode === "timed" ? "Timed" : "Practice"}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
