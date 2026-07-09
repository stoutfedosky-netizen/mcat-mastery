"use client";
import { createContext, useContext, useState, useEffect, useMemo } from "react";
import { createClient } from "../lib/supabase";
import { SECTIONS, mapQuestion, selectQuestions, applyFilters } from "../lib/examData";
import { CONTENT_CATEGORIES, CATEGORY_BY_CODE } from "../lib/contentCategories";
import { categoryForBatch } from "../lib/batchCategories";

const AppContext = createContext(null);

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}

export function AppProvider({ children }) {
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
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [categoriesBySection, setCategoriesBySection] = useState({});
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
  const [missedQuestionIds, setMissedQuestionIds] = useState(new Set());
  const [flaggedQuestionIds, setFlaggedQuestionIds] = useState(new Set());
  const [seenQuestionIds, setSeenQuestionIds] = useState(new Set());
  const [allQuestions, setAllQuestions] = useState([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [countAdjusted, setCountAdjusted] = useState(false);

  const supabase = useMemo(() => createClient(), []);

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
      let allQ = [];
      let from = 0;
      const PAGE = 1000;
      // content_category is added by sql/content-category-migration.sql. Probe for it
      // so the app keeps working if the code ships before the migration is run.
      const probe = await supabase.from("questions").select("content_category").limit(1);
      const cols = probe.error
        ? "id, section_id, topic, batch"
        : "id, section_id, topic, batch, content_category";
      while (true) {
        const { data } = await supabase
          .from("questions")
          .select(cols)
          .range(from, from + PAGE - 1);
        if (!data || data.length === 0) break;
        allQ = allQ.concat(data);
        if (data.length < PAGE) break;
        from += PAGE;
      }

      // Fall back to the generated batch->category map when the DB has no value
      // (e.g. migration not run, or a newly imported batch not yet backfilled).
      allQ.forEach((q) => {
        if (!q.content_category) q.content_category = categoryForBatch(q.batch);
      });

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

        // Which content categories actually have questions, per section.
        const cbs = {};
        allQ.forEach((q) => {
          if (!q.content_category) return;
          if (!cbs[q.section_id]) cbs[q.section_id] = new Set();
          cbs[q.section_id].add(q.content_category);
        });
        const cbsObj = {};
        Object.keys(cbs).forEach((sid) => {
          cbsObj[sid] = CONTENT_CATEGORIES
            .filter((c) => c.section === sid && cbs[sid].has(c.code))
            .map((c) => c.code);
        });
        setCategoriesBySection(cbsObj);
        setAllQuestions(allQ);

        const { data: attempts } = await supabase
          .from("question_attempts")
          .select("question_id, is_correct")
          .eq("user_id", user.id)
          .order("attempted_at", { ascending: false });

        if (attempts && attempts.length > 0) {
          const qLookup = {};
          allQ.forEach((q) => {
            qLookup[q.id] = q;
          });

          const total = attempts.length;
          const correct = attempts.filter((a) => a.is_correct).length;
          const secMap = {};
          const topicMap = {};

          // Aggregate stats use ALL attempts
          attempts.forEach((a) => {
            const q = qLookup[a.question_id];
            if (!q) return;

            if (!secMap[q.section_id]) secMap[q.section_id] = { total: 0, correct: 0 };
            secMap[q.section_id].total++;
            if (a.is_correct) secMap[q.section_id].correct++;

            if (q.topic) {
              const key = `${q.section_id}:${q.topic}`;
              if (!topicMap[key])
                topicMap[key] = { topic: q.topic, section_id: q.section_id, total: 0, correct: 0 };
              topicMap[key].total++;
              if (a.is_correct) topicMap[key].correct++;
            }
          });

          // Most-recent attempt per question for seen/missed sets
          const latestAttempt = {};
          attempts.forEach((a) => {
            if (!latestAttempt[a.question_id]) latestAttempt[a.question_id] = a;
          });
          const seenSet = new Set(Object.keys(latestAttempt));
          const missedSet = new Set();
          Object.entries(latestAttempt).forEach(([qid, a]) => {
            if (!a.is_correct) missedSet.add(qid);
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
          setMissedQuestionIds(missedSet);
          setSeenQuestionIds(seenSet);
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
        setFlaggedQuestionIds(flagged);
      }

      setLoading(false);
    }
    fetchData();
  }, [user, refreshKey]);

  const maxAvailable = useMemo(() => {
    if (selectedSections.length === 0) return 0;
    const sectionQs = allQuestions.filter((q) => selectedSections.includes(q.section_id));
    return applyFilters(sectionQs, {
      selectedCategories,
      selectedTopics,
      statusFilter,
      seenQuestionIds,
      missedQuestionIds,
      flaggedQuestionIds,
    }).length;
  }, [allQuestions, selectedSections, selectedCategories, selectedTopics, statusFilter, seenQuestionIds, missedQuestionIds, flaggedQuestionIds]);

  useEffect(() => {
    const cap = selectedMode === "review" ? missedQuestionIds.size : maxAvailable;
    if (cap > 0 && questionCount > cap) {
      setQuestionCount(cap);
      setCountAdjusted(true);
      const t = setTimeout(() => setCountAdjusted(false), 3000);
      return () => clearTimeout(t);
    }
  }, [maxAvailable, selectedMode, missedQuestionIds.size]);

  const statusFilterCounts = useMemo(() => {
    if (selectedSections.length === 0) return {};
    const sectionQs = allQuestions.filter((q) => selectedSections.includes(q.section_id));
    const topicFiltered = applyFilters(sectionQs, {
      selectedCategories,
      selectedTopics,
      statusFilter: "all",
      seenQuestionIds,
      missedQuestionIds,
      flaggedQuestionIds,
    });
    const ids = topicFiltered.map((q) => q.id);
    return {
      all: topicFiltered.length,
      unseen: ids.filter((id) => !seenQuestionIds.has(id)).length,
      incorrect: ids.filter((id) => missedQuestionIds.has(id)).length,
      flagged: ids.filter((id) => flaggedQuestionIds.has(id)).length,
    };
  }, [allQuestions, selectedSections, selectedCategories, selectedTopics, seenQuestionIds, missedQuestionIds, flaggedQuestionIds]);

  const availableCategories = useMemo(() => {
    const seen = new Set();
    const cats = [];
    selectedSections.forEach((sid) => {
      (categoriesBySection[sid] || []).forEach((code) => {
        if (!seen.has(code)) {
          seen.add(code);
          cats.push({
            code,
            name: CATEGORY_BY_CODE[code]?.name || code,
            sectionId: sid,
            color: SECTIONS.find((s) => s.id === sid)?.color,
          });
        }
      });
    });
    return cats;
  }, [selectedSections, categoriesBySection]);

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
    if (missedQuestionIds.size > 0) {
      return {
        title: "Review Missed Questions",
        text: `You have ${missedQuestionIds.size} missed question${missedQuestionIds.size === 1 ? "" : "s"}. Reviewing these will reinforce weak areas and improve retention.`,
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
    setSelectedCategories([]);
  };

  const toggleTopic = (topic) => {
    setSelectedTopics((prev) =>
      prev.includes(topic) ? prev.filter((t) => t !== topic) : [...prev, topic]
    );
  };

  const toggleCategory = (code) => {
    setSelectedCategories((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
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

    const questions = data.map(mapQuestion);

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

  const saveResults = async (results, exam) => {
    const currentExam = exam || activeExam;
    if (!user || !currentExam) return;

    const { data: session, error: sessionError } = await supabase
      .from("exam_sessions")
      .insert({
        user_id: user.id,
        section_id: currentExam.sections[0],
        mode: currentExam.testMode ? "timed" : "practice",
        question_ids: currentExam.questions.map((q) => q.id),
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

    const attempts = currentExam.questions
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

  // Loads previously missed questions (plus their passage holders) and
  // starts a reattempt session.
  const startReattemptMissed = async () => {
    if (missedQuestionIds.size === 0) {
      alert("No missed questions to review. Complete some practice sessions first.");
      return;
    }

    const { data: missedData, error } = await supabase
      .from("questions")
      .select("*")
      .in("id", [...missedQuestionIds].slice(0, 200));

    if (error || !missedData || missedData.length === 0) {
      alert("Could not load missed questions.");
      return;
    }

    // Find batches that need passage-holder questions added
    const missedIdSet = new Set(missedData.map((q) => q.id));
    const batchesWithPassage = new Set();
    const batchesNeeding = new Set();
    missedData.forEach((q) => {
      const key = `${q.section_id}|${q.batch}`;
      if (q.passage) batchesWithPassage.add(key);
      else if (q.use_prev_passage) batchesNeeding.add(key);
    });

    // Fetch passage holders for batches missing them
    let passageHolders = [];
    const missing = [...batchesNeeding].filter((k) => !batchesWithPassage.has(k));
    if (missing.length > 0) {
      const batchNames = [...new Set(missing.map((k) => k.split("|")[1]))];
      const sIds = [...new Set(missing.map((k) => k.split("|")[0]))];
      const { data: phData } = await supabase
        .from("questions")
        .select("*")
        .in("batch", batchNames)
        .in("section_id", sIds)
        .not("passage", "is", null);
      if (phData) {
        passageHolders = phData.filter(
          (q) => missing.includes(`${q.section_id}|${q.batch}`) && !missedIdSet.has(q.id)
        );
      }
    }

    // Combine missed questions + passage holders, group by passage boundaries
    const combined = [...missedData, ...passageHolders];
    combined.sort((a, b) => {
      if (a.section_id !== b.section_id) return a.section_id.localeCompare(b.section_id);
      if (a.batch !== b.batch) return (a.batch || "").localeCompare(b.batch || "");
      return (a.sort_order || 0) - (b.sort_order || 0);
    });

    // Group by passage boundaries, shuffle groups, then flatten
    const groups = [];
    let cur = [];
    for (const q of combined) {
      if (q.passage) {
        if (cur.length) groups.push(cur);
        cur = [q];
      } else if (cur.length > 0 && q.batch === cur[0].batch && q.section_id === cur[0].section_id) {
        cur.push(q);
      } else {
        if (cur.length) groups.push(cur);
        cur = [q];
      }
    }
    if (cur.length) groups.push(cur);

    for (let i = groups.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [groups[i], groups[j]] = [groups[j], groups[i]];
    }

    const selected = groups.flat();
    const questions = selected.map(mapQuestion);

    const sectionIds = [...new Set(selected.map((q) => q.section_id))];
    const firstSection = SECTIONS.find((s) => s.id === sectionIds[0]);

    setActiveExam({
      questions,
      sections: sectionIds,
      sectionName: "Reattempt Missed",
      sectionAbbr: "REV",
      sectionColor: firstSection?.color || "#6b7280",
      timeLimit: null,
      testMode: false,
    });
  };

  const startTest = async () => {
    if (selectedMode === "review") {
      await startReattemptMissed();
      return;
    }

    // Standard flow — requires section selection
    if (selectedSections.length === 0) return;

    let data = [];
    let error = null;
    let from = 0;
    const PAGE = 1000;
    while (true) {
      const res = await supabase
        .from("questions")
        .select("*")
        .in("section_id", selectedSections)
        .order("section_id", { ascending: true })
        .order("batch", { ascending: true })
        .order("sort_order", { ascending: true })
        .range(from, from + PAGE - 1);
      if (res.error) { error = res.error; break; }
      if (!res.data || res.data.length === 0) break;
      data = data.concat(res.data);
      if (res.data.length < PAGE) break;
      from += PAGE;
    }

    if (error || data.length === 0) {
      alert("No questions found for selected sections.");
      return;
    }

    data.forEach((q) => {
      if (!q.content_category) q.content_category = categoryForBatch(q.batch);
    });

    const filtered = applyFilters(data, {
      selectedCategories,
      selectedTopics,
      statusFilter,
      seenQuestionIds,
      missedQuestionIds,
      flaggedQuestionIds,
    });

    if (filtered.length === 0) {
      alert("No questions match your current filters.");
      return;
    }

    const count = Math.min(questionCount, filtered.length);
    const selected = selectQuestions(filtered, count);
    const questions = selected.map(mapQuestion);

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

  const applyRecommendation = () => {
    if (recommendation.action === "weak" && stats.weakestSectionId) {
      setSelectedSections([stats.weakestSectionId]);
      setSelectedMode("practice");
    } else if (recommendation.action === "review") {
      setSelectedMode("review");
    } else if (recommendation.action === "timed") {
      setSelectedMode("timed");
    }
  };

  const buildMissedSession = (missedIds, sessionAnswers, reviewMode) => {
    if (!activeExam) return;
    const missedIdSet = new Set(missedIds);
    const missed = activeExam.questions.filter((q) => missedIdSet.has(q.id));

    const passageHolderIds = new Set();
    missed.forEach((q) => {
      if (q.usePrevPassage && !q.passage) {
        const batchQs = activeExam.questions.filter(
          (bq) => bq.batch === q.batch && bq.sectionId === q.sectionId && bq.passage
        );
        batchQs.forEach((bq) => passageHolderIds.add(bq.id));
      }
    });

    const extra = activeExam.questions.filter(
      (q) => passageHolderIds.has(q.id) && !missedIdSet.has(q.id)
    );

    const combined = [...extra, ...missed];
    combined.sort((a, b) => {
      const aIdx = activeExam.questions.indexOf(a);
      const bIdx = activeExam.questions.indexOf(b);
      return aIdx - bIdx;
    });

    const answersMap = {};
    if (reviewMode && sessionAnswers) {
      combined.forEach((q) => {
        if (sessionAnswers[q.id]) answersMap[q.id] = sessionAnswers[q.id];
      });
    }

    setActiveExam({
      questions: combined,
      sections: activeExam.sections,
      sectionName: reviewMode ? "Review Missed" : "Reattempt Missed",
      sectionAbbr: activeExam.sectionAbbr,
      sectionColor: activeExam.sectionColor,
      timeLimit: null,
      testMode: false,
      reviewMode,
      savedAnswers: reviewMode ? answersMap : null,
    });
  };

  const exitExam = () => {
    setActiveExam(null);
    setRefreshKey((k) => k + 1);
  };

  const displayName =
    user?.user_metadata?.display_name || user?.email?.split("@")[0] || "Student";

  const value = {
    user,
    authLoading,
    displayName,
    activeExam,
    counts,
    loading,
    selectedSections,
    setSelectedSections,
    questionCount,
    setQuestionCount,
    recentResults,
    selectedMode,
    setSelectedMode,
    selectedTopics,
    setSelectedTopics,
    selectedCategories,
    setSelectedCategories,
    availableCategories,
    toggleCategory,
    stats,
    sectionStats,
    topicStats,
    missedQuestionIds,
    flaggedQuestionIds,
    seenQuestionIds,
    statusFilter,
    setStatusFilter,
    countAdjusted,
    maxAvailable,
    statusFilterCounts,
    availableTopics,
    recommendation,
    toggleSection,
    toggleTopic,
    signOut,
    reviewSession,
    saveResults,
    startTest,
    startReattemptMissed,
    applyRecommendation,
    buildMissedSession,
    exitExam,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
