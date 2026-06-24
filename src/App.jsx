import React, { useState, useEffect, useRef, useCallback } from "react";
import { User, Plus, FolderKanban, HelpCircle, ArrowLeft, BookOpen, Lightbulb, Grid3x3, CalendarDays, Timer } from "lucide-react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { paletteFor, THEMES } from "./theme";
import { T } from "./copy";
import { useSound } from "./useSound";
import { useMusicPlayer } from "./useMusic";
import AuthGate from "./components/AuthGate";
import Onboarding from "./components/Onboarding";
import TopControls from "./components/TopControls";
import MandalartGrid from "./components/MandalartGrid";
import Manage from "./components/Manage";
import AboutPage from "./components/AboutPage";
import FriendsPanel from "./components/FriendsPanel";
import FriendMandalartList from "./components/FriendMandalartList";
import { createMandalart } from "./api/mandalartsApi";
import { supabase } from "./lib/supabaseClient";
import FeatureGuide from "./components/FeatureGuide";
import FloatingBlocks from "./components/FloatingBlocks";
import GridTutorial from "./components/GridTutorial";

function AppShell() {
  const { session, profile, loading, signOut } = useAuth();
  const [dark, setDark] = useState(true);
  const [theme, setTheme] = useState("mondrian");
  const [lang, setLang] = useState("en");
  const [soundOn, setSoundOn] = useState(true);
  const [view, setView] = useState("home");
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [currentMandalartId, setCurrentMandalartId] = useState(null);
  const [viewingFriend, setViewingFriend] = useState(null);
  const [viewingMandalart, setViewingMandalart] = useState(null);
  const [signOutConfirm, setSignOutConfirm] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false); // false | "reason" | "final"
  const [deleteReason, setDeleteReason] = useState("");
  const [deleteFeedback, setDeleteFeedback] = useState("");
  const [deletebusy, setDeleteBusy] = useState(false);
  const [featureGuideOpen, setFeatureGuideOpen] = useState(false);
  const [gridTutorialOpen, setGridTutorialOpen] = useState(false);
  const prevUserIdRef = useRef(null);

  const pal = paletteFor(theme, dark);
  const t = T[lang];
  const play = useSound(soundOn);
  const music = useMusicPlayer();

  useEffect(() => { document.documentElement.lang = lang; }, [lang]);

  // Browser history integration: push state on navigation, restore on popstate
  const navigateTo = useCallback((newView, { mandalartId, friend, mandalart, resetConfirm } = {}) => {
    if (mandalartId !== undefined) setCurrentMandalartId(mandalartId);
    if (friend !== undefined) setViewingFriend(friend);
    if (mandalart !== undefined) setViewingMandalart(mandalart);
    if (resetConfirm) setSignOutConfirm(false);
    setView(newView);
    const state = { view: newView, currentMandalartId: mandalartId, viewingFriend: friend, viewingMandalart: mandalart };
    history.pushState(state, "");
  }, []);

  useEffect(() => {
    history.replaceState({ view: "home" }, "");
    const handler = (e) => {
      const s = e.state;
      if (!s?.view) return;
      setView(s.view);
      if ("currentMandalartId" in s) setCurrentMandalartId(s.currentMandalartId ?? null);
      if ("viewingFriend" in s) setViewingFriend(s.viewingFriend ?? null);
      if ("viewingMandalart" in s) setViewingMandalart(s.viewingMandalart ?? null);
      setSignOutConfirm(false);
    };
    window.addEventListener("popstate", handler);
    return () => window.removeEventListener("popstate", handler);
  }, []);

  // Load theme + music from localStorage when user logs in; reset view to home
  useEffect(() => {
    if (!session?.user?.id) return;
    const uid = session.user.id;
    if (uid !== prevUserIdRef.current) {
      prevUserIdRef.current = uid;
      setView("home");
      const savedTheme = localStorage.getItem(`theme_${uid}`);
      if (savedTheme && THEMES[savedTheme]) setTheme(savedTheme);
      const savedMusic = localStorage.getItem(`music_${uid}`);
      if (savedMusic !== null) {
        const idx = parseInt(savedMusic, 10);
        if (!isNaN(idx) && idx >= 0) music.selectTrack(idx);
      }
    }
  }, [session?.user?.id]);

  // Save theme to localStorage keyed by user id
  useEffect(() => {
    if (session?.user?.id) {
      localStorage.setItem(`theme_${session.user.id}`, theme);
    }
  }, [theme, session?.user?.id]);

  // Save music track selection to localStorage
  useEffect(() => {
    if (session?.user?.id) {
      if (music.trackIndex === null) {
        localStorage.removeItem(`music_${session.user.id}`);
      } else {
        localStorage.setItem(`music_${session.user.id}`, String(music.trackIndex));
      }
    }
  }, [music.trackIndex, session?.user?.id]);

  // Open onboarding only on first visit (profile.has_seen_onboarding === false)
  useEffect(() => {
    if (profile && profile.has_seen_onboarding === false) {
      setOnboardingOpen(true);
    }
  }, [profile]);

  const closeOnboarding = async () => {
    setOnboardingOpen(false);
    if (profile && !profile.has_seen_onboarding) {
      await supabase.from("profiles").update({ has_seen_onboarding: true }).eq("id", profile.id);
    }
  };

  const handleSignOut = async () => {
    setSignOutConfirm(false);
    music.stop();
    await signOut();
  };

  const handleDeleteAccount = async () => {
    setDeleteBusy(true);
    music.stop();
    const { error } = await supabase.rpc("delete_own_account");
    if (error) {
      setDeleteBusy(false);
      setDeleteConfirm(false);
      alert(error.message);
      return;
    }
    await signOut();
  };

  if (loading) {
    return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: pal.bg, color: pal.ink }}>{t.loading}</div>;
  }
  if (!session) {
    return <AuthGate play={play} />;
  }

  const myId = session.user.id;
  const myCode = profile ? `${profile.username}#${profile.tag}` : "";

  const TUTORIAL_SKIP_KEY = `gridTutorialSkip_${myId}`;

  const goCreate = async () => {
    const m = await createMandalart(myId, t.grid.untitled);
    if (m) {
      navigateTo("grid", { mandalartId: m.id });
      play("C5", "16n");
      if (!localStorage.getItem(TUTORIAL_SKIP_KEY)) {
        setGridTutorialOpen(true);
      }
    }
  };

  const isKo = lang === "ko";
  const baseFontFamily = isKo ? "'Noto Sans KR', sans-serif" : "Helvetica, Arial, sans-serif";
  const titleFontFamily = isKo ? "'Black Han Sans', sans-serif" : "Helvetica, Arial, sans-serif";

  return (
    <div style={{ background: pal.bg, color: pal.ink, minHeight: "100vh", fontFamily: baseFontFamily, padding: 28, position: "relative" }}>
      <style>{`
        @keyframes pulseOutline { 0%,100% { box-shadow: 0 0 0 0 ${pal.accent}66; } 50% { box-shadow: 0 0 0 6px ${pal.accent}33; } }
        .cell-pulse { animation: pulseOutline 0.9s ease-in-out; }
        .fade-in { animation: fadeIn 0.5s cubic-bezier(0.22,1,0.36,1) both; }
        @keyframes fadeIn { from { opacity:0; transform: translateY(10px);} to { opacity:1; transform:none; } }
        .home-enter { animation: homeEnter 1.1s cubic-bezier(0.22,1,0.36,1) both; }
        @keyframes homeEnter { from { opacity:0; } to { opacity:1; } }
        textarea::placeholder { opacity: 0.4; }
        button:focus-visible, input:focus-visible, textarea:focus-visible { outline: 2px solid ${pal.accent}; }
        @media (prefers-reduced-motion: reduce) { .cell-pulse, .fade-in { animation: none !important; } }
        .home-tile { position: relative; z-index: 1; transition: transform 0.2s cubic-bezier(0.34,1.56,0.64,1), filter 0.15s ease, z-index 0s; }
        .home-tile:hover { transform: scale(0.96); filter: brightness(1.07); z-index: 2; }
        .home-title-block { transition: transform 0.25s cubic-bezier(0.34,1.56,0.64,1), filter 0.2s ease; }
        .home-title-block:hover { transform: scale(0.99); filter: brightness(1.04); }
        @keyframes slideUpIn { from { opacity: 0; transform: translateY(36px); } to { opacity: 1; transform: translateY(0); } }
        .home-title { animation: slideUpIn 0.65s cubic-bezier(0.22,1,0.36,1) both; }
        .home-tagline { animation: slideUpIn 0.65s cubic-bezier(0.22,1,0.36,1) 0.18s both; }
      `}</style>

      {onboardingOpen && <Onboarding t={t} pal={pal} play={play} onClose={closeOnboarding} />}
      {featureGuideOpen && <FeatureGuide t={t} pal={pal} onClose={() => setFeatureGuideOpen(false)} />}
      {gridTutorialOpen && (
        <GridTutorial
          t={t} pal={pal}
          onClose={() => setGridTutorialOpen(false)}
          onDontShow={() => localStorage.setItem(TUTORIAL_SKIP_KEY, "1")}
        />
      )}

      {view === "home" && (() => {
        const feat = pal.homeFeatures;
        // Planner tile inverts with dark/light: dark→black bg, light→white bg
        const plannerBg = dark ? feat.planner[0] : "#fff";
        const plannerFg = dark ? feat.planner[1] : "#1B1A17";
        // Profile button inverts: dark→white bg, light→black bg
        const profileBg = dark ? "#fff" : "#1B1A17";
        const profileFg = dark ? "#1B1A17" : "#fff";
        const featTiles = [
          { key: "planner",   label: t.menu.planner,   Icon: CalendarDays, bg: plannerBg,          fg: plannerFg,          go: () => navigateTo("planner"),  note: "G5" },
          { key: "mandalart", label: t.menu.mandalart, Icon: Grid3x3,      bg: feat.mandalart[0], fg: feat.mandalart[1], go: () => navigateTo("manage"),   note: "B5" },
          { key: "pomodoro",  label: t.menu.pomodoro,  Icon: Timer,        bg: feat.pomodoro[0],  fg: feat.pomodoro[1],  go: () => navigateTo("pomodoro"), note: "E6" },
        ];
        return (
          <div className="home-enter" style={{ margin: -28, height: "100vh", overflow: "hidden",
            background: "#000", display: "grid", gap: 4, padding: 4,
            gridTemplateColumns: "1fr 220px",
            gridTemplateRows: "1fr 72px",
          }}>
            {/* Hero title block */}
            <div
              className="home-title-block"
              onMouseEnter={() => play("C6", "64n")}
              style={{
                gridRow: "1", gridColumn: "1",
                background: pal.homeTitleBg,
                padding: "clamp(20px, 3.5vw, 52px)",
                display: "flex", flexDirection: "column", justifyContent: "space-between",
                position: "relative", overflow: "hidden",
              }}
            >
              <FloatingBlocks pal={pal} theme={theme} />
              <div style={{ position: "relative", zIndex: 1, flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
                <h1 className="home-title" style={{
                  fontWeight: 900,
                  fontSize: "clamp(52px, 9vw, 150px)",
                  letterSpacing: "-0.03em",
                  lineHeight: 0.88,
                  margin: 0,
                  color: "#fff",
                  textTransform: "uppercase",
                  textAlign: "center",
                  fontFamily: "Helvetica, Arial, sans-serif",
                }}>
                  {t.title}
                </h1>
                <p className="home-tagline" style={{ fontSize: 11, letterSpacing: isKo ? "0.04em" : "0.1em", opacity: 0.6, margin: "14px 0 0", color: "#fff", textTransform: "uppercase", textAlign: "center" }}>
                  {t.tagline}
                </p>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12, position: "relative", zIndex: 1 }}>
                <TopControls pal={{ ...pal, ink: "#fff" }} dark={dark} setDark={setDark} lang={lang} setLang={setLang} theme={theme} setTheme={setTheme} soundOn={soundOn} setSoundOn={setSoundOn} t={t} play={play} music={music} dropdownUp={true} />
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 5 }}>
                  <button onClick={() => { setOnboardingOpen(true); play("G4", "16n"); }} style={{ background: "none", border: "none", color: "#fff", opacity: 0.5, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 11 }}>
                    <HelpCircle size={14} /> {t.replay}
                  </button>
                  <button onClick={() => { setFeatureGuideOpen(true); play("E5", "16n"); }} style={{ background: "none", border: "none", color: "#fff", opacity: 0.5, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 11 }}>
                    <Lightbulb size={14} /> {t.guide.btnLabel}
                  </button>
                </div>
              </div>
            </div>

            {/* Feature column — Planner / Mandalart / Pomodoro */}
            <div style={{ gridRow: "1 / 3", gridColumn: "2", display: "flex", flexDirection: "column", gap: 4, background: "#000", minHeight: 0 }}>
              {featTiles.map(({ key, label, Icon, bg, fg, go, note }) => (
                <button key={key} onClick={() => { go(); play("C5", "16n"); }} onMouseEnter={() => play(note, "64n")}
                  className="home-tile"
                  style={{ flex: 1, minHeight: 0, background: bg, border: "none", padding: "clamp(14px,2vw,26px) 20px", cursor: "pointer", color: fg, textAlign: "left", display: "flex", flexDirection: "column", justifyContent: "flex-end", gap: 10 }}>
                  <Icon size={20} color={fg} />
                  <span style={{ fontWeight: 800, fontSize: 14, textTransform: "uppercase", letterSpacing: "0.02em" }}>{label}</span>
                </button>
              ))}
            </div>

            {/* Bottom bar — Profile / About */}
            <div style={{ gridRow: "2", gridColumn: "1", display: "grid", gap: 4, background: "#000", gridTemplateColumns: "1fr 1fr", minHeight: 0 }}>
              <button onClick={() => { navigateTo("profile"); play("C5", "16n"); }} onMouseEnter={() => play("A5", "64n")}
                className="home-tile"
                style={{ background: profileBg, border: "none", padding: "16px 22px", cursor: "pointer", color: profileFg, textAlign: "left", display: "flex", alignItems: "center", gap: 12 }}>
                <User size={18} color={profileFg} />
                <span style={{ fontWeight: 800, fontSize: 13, textTransform: "uppercase" }}>{t.menu.setting}</span>
              </button>
              <button onClick={() => { navigateTo("about"); play("G4", "16n"); }} onMouseEnter={() => play("B5", "64n")}
                className="home-tile"
                style={{ background: pal.bg, border: "none", padding: "16px 22px", cursor: "pointer", color: pal.ink, textAlign: "left", display: "flex", alignItems: "center", gap: 12 }}>
                <BookOpen size={18} color={pal.ink} />
                <span style={{ fontWeight: 800, fontSize: 13, textTransform: "uppercase", opacity: 0.65 }}>{t.menu.about}</span>
              </button>
            </div>
          </div>
        );
      })()}

      {view === "grid" && currentMandalartId && (
        <div className="fade-in">
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 18, flexWrap: "wrap", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <button onClick={() => navigateTo("home")} style={{ background: "none", border: "none", color: pal.ink, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
                <ArrowLeft size={14} /> {t.back}
              </button>
              <button onClick={() => setGridTutorialOpen(true)} style={{ background: "none", border: "none", color: pal.ink, opacity: 0.4, cursor: "pointer", display: "flex", alignItems: "center", gap: 5, fontSize: 11 }}>
                <HelpCircle size={13} /> {t.gridTutorial.showAgain}
              </button>
            </div>
            <TopControls pal={pal} dark={dark} setDark={setDark} lang={lang} setLang={setLang} theme={theme} setTheme={setTheme} soundOn={soundOn} setSoundOn={setSoundOn} t={t} play={play} music={music} dropdownUp={false} />
          </div>
          <MandalartGrid key={currentMandalartId} mandalartId={currentMandalartId} pal={pal} t={t} soundOn={soundOn} />
        </div>
      )}

      {view === "manage" && (
        <div className="fade-in">
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 18, flexWrap: "wrap", gap: 10 }}>
            <button onClick={() => navigateTo("home")} style={{ background: "none", border: "none", color: pal.ink, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
              <ArrowLeft size={14} /> {t.back}
            </button>
            <TopControls pal={pal} dark={dark} setDark={setDark} lang={lang} setLang={setLang} theme={theme} setTheme={setTheme} soundOn={soundOn} setSoundOn={setSoundOn} t={t} play={play} music={music} dropdownUp={false} />
          </div>
          <Manage
            pal={pal}
            t={t}
            myId={myId}
            onOpen={(id) => { navigateTo("grid", { mandalartId: id }); play("C5", "16n"); }}
          />
        </div>
      )}

      {view === "profile" && (
        <div className="fade-in">
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 18, flexWrap: "wrap", gap: 10 }}>
            <button onClick={() => navigateTo("home", { resetConfirm: true })} style={{ background: "none", border: "none", color: pal.ink, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
              <ArrowLeft size={14} /> {t.back}
            </button>
            <TopControls pal={pal} dark={dark} setDark={setDark} lang={lang} setLang={setLang} theme={theme} setTheme={setTheme} soundOn={soundOn} setSoundOn={setSoundOn} t={t} play={play} music={music} dropdownUp={false} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
            <h2 style={{ fontWeight: 900, fontSize: 24, textTransform: "uppercase", margin: 0 }}>{t.menu.profile}</h2>
            {signOutConfirm ? (
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 12, opacity: 0.75, color: pal.ink }}>{t.auth.signOutConfirm}</span>
                <button onClick={handleSignOut} style={{ background: "#C7382E", color: "#fff", border: "none", padding: "6px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>{t.auth.signOutYes}</button>
                <button onClick={() => setSignOutConfirm(false)} style={{ background: "none", border: `1px solid ${pal.ink}40`, color: pal.ink, padding: "6px 12px", fontSize: 11, cursor: "pointer" }}>{t.auth.signOutNo}</button>
              </div>
            ) : (
              <button onClick={() => setSignOutConfirm(true)} style={{ background: "none", border: `1px solid ${pal.ink}40`, color: pal.ink, padding: "6px 12px", fontSize: 11, cursor: "pointer" }}>
                {t.auth.signOut}
              </button>
            )}
          </div>
          <FriendsPanel
            pal={pal}
            t={t}
            play={play}
            myId={myId}
            myCode={myCode}
            onViewFriend={(friend) => { navigateTo("friendList", { friend }); play("C5", "16n"); }}
          />

          {/* Delete account */}
          <div style={{ marginTop: 40, paddingTop: 24, borderTop: `1px solid ${pal.ink}18` }}>
            {deleteConfirm === "reason" ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <p style={{ fontSize: 12, color: pal.ink, margin: 0, opacity: 0.65, lineHeight: 1.6 }}>
                  {t.auth.deleteAccountReasonTitle}
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {t.auth.deleteAccountReasons.map((reason) => (
                    <button
                      key={reason}
                      onClick={() => setDeleteReason(reason)}
                      style={{
                        background: deleteReason === reason ? "#C7382E" : "none",
                        border: `1px solid ${deleteReason === reason ? "#C7382E" : pal.ink + "40"}`,
                        color: deleteReason === reason ? "#fff" : pal.ink,
                        padding: "5px 12px", fontSize: 11, cursor: "pointer",
                        opacity: deleteReason === reason ? 1 : 0.7,
                        transition: "all 0.15s ease",
                      }}
                    >
                      {reason}
                    </button>
                  ))}
                </div>
                <textarea
                  value={deleteFeedback}
                  onChange={(e) => setDeleteFeedback(e.target.value)}
                  placeholder={t.auth.deleteAccountFeedbackPlaceholder}
                  rows={3}
                  style={{
                    background: pal.bg, color: pal.ink, border: `1px solid ${pal.ink}30`,
                    padding: "8px 10px", fontSize: 12, resize: "vertical", fontFamily: "inherit",
                    outline: "none", width: "100%", boxSizing: "border-box",
                  }}
                />
                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    onClick={() => setDeleteConfirm("final")}
                    disabled={!deleteReason}
                    style={{
                      background: deleteReason ? "#C7382E" : pal.ink + "20",
                      color: deleteReason ? "#fff" : pal.ink,
                      border: "none", padding: "7px 14px", fontSize: 11, fontWeight: 700,
                      cursor: deleteReason ? "pointer" : "not-allowed", opacity: deleteReason ? 1 : 0.5,
                      transition: "all 0.15s ease",
                    }}
                  >
                    {t.auth.deleteAccountNext}
                  </button>
                  <button
                    onClick={() => { setDeleteConfirm(false); setDeleteReason(""); setDeleteFeedback(""); }}
                    style={{ background: "none", border: `1px solid ${pal.ink}40`, color: pal.ink, padding: "7px 14px", fontSize: 11, cursor: "pointer" }}
                  >
                    {t.auth.deleteAccountNo}
                  </button>
                </div>
              </div>
            ) : deleteConfirm === "final" ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <p style={{ fontSize: 13, color: "#C7382E", margin: 0, lineHeight: 1.6 }}>
                  {t.auth.deleteAccountConfirm}
                </p>
                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    onClick={handleDeleteAccount}
                    disabled={deletebusy}
                    style={{ background: "#C7382E", color: "#fff", border: "none", padding: "7px 14px", fontSize: 11, fontWeight: 700, cursor: deletebusy ? "not-allowed" : "pointer", opacity: deletebusy ? 0.6 : 1 }}
                  >
                    {deletebusy ? t.auth.deleteAccountDeleting : t.auth.deleteAccountYes}
                  </button>
                  <button
                    onClick={() => { setDeleteConfirm(false); setDeleteReason(""); setDeleteFeedback(""); }}
                    disabled={deletebusy}
                    style={{ background: "none", border: `1px solid ${pal.ink}40`, color: pal.ink, padding: "7px 14px", fontSize: 11, cursor: "pointer" }}
                  >
                    {t.auth.deleteAccountNo}
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => { setSignOutConfirm(false); setDeleteConfirm("reason"); }}
                style={{ background: "none", border: "none", color: "#C7382E", opacity: 0.5, fontSize: 11, cursor: "pointer", padding: 0 }}
              >
                {t.auth.deleteAccount}
              </button>
            )}
          </div>
        </div>
      )}

      {view === "friendList" && (
        <div className="fade-in">
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 18, flexWrap: "wrap", gap: 10 }}>
            <button onClick={() => navigateTo("profile")} style={{ background: "none", border: "none", color: pal.ink, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
              <ArrowLeft size={14} /> {t.back}
            </button>
            <TopControls pal={pal} dark={dark} setDark={setDark} lang={lang} setLang={setLang} theme={theme} setTheme={setTheme} soundOn={soundOn} setSoundOn={setSoundOn} t={t} play={play} music={music} dropdownUp={false} />
          </div>
          <FriendMandalartList
            friend={viewingFriend}
            pal={pal}
            t={t}
            onOpen={(m) => { navigateTo("viewer", { mandalart: m }); play("C5", "16n"); }}
          />
        </div>
      )}

      {view === "about" && (
        <div className="fade-in">
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 18, flexWrap: "wrap", gap: 10 }}>
            <button onClick={() => navigateTo("home")} style={{ background: "none", border: "none", color: pal.ink, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
              <ArrowLeft size={14} /> {t.back}
            </button>
            <TopControls pal={pal} dark={dark} setDark={setDark} lang={lang} setLang={setLang} theme={theme} setTheme={setTheme} soundOn={soundOn} setSoundOn={setSoundOn} t={t} play={play} music={music} dropdownUp={false} />
          </div>
          <AboutPage pal={pal} t={t} />
        </div>
      )}

      {(view === "planner" || view === "pomodoro") && (
        <div className="fade-in">
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 18, flexWrap: "wrap", gap: 10 }}>
            <button onClick={() => navigateTo("home")} style={{ background: "none", border: "none", color: pal.ink, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
              <ArrowLeft size={14} /> {t.back}
            </button>
            <TopControls pal={pal} dark={dark} setDark={setDark} lang={lang} setLang={setLang} theme={theme} setTheme={setTheme} soundOn={soundOn} setSoundOn={setSoundOn} t={t} play={play} music={music} dropdownUp={false} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", gap: 16, textAlign: "center" }}>
            {view === "planner" ? <CalendarDays size={40} color={pal.accent} /> : <Timer size={40} color={pal.accent} />}
            <h2 style={{ fontWeight: 900, fontSize: 26, textTransform: "uppercase", margin: 0, color: pal.ink }}>
              {view === "planner" ? t.menu.planner : t.menu.pomodoro}
            </h2>
            <p style={{ fontSize: 14, color: pal.ink, opacity: 0.55, margin: 0 }}>{t.comingSoon}</p>
          </div>
        </div>
      )}

      {view === "viewer" && viewingMandalart && (
        <div className="fade-in">
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 18, flexWrap: "wrap", gap: 10 }}>
            <button onClick={() => navigateTo("friendList")} style={{ background: "none", border: "none", color: pal.ink, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
              <ArrowLeft size={14} /> {t.back}
            </button>
            <TopControls pal={pal} dark={dark} setDark={setDark} lang={lang} setLang={setLang} theme={theme} setTheme={setTheme} soundOn={soundOn} setSoundOn={setSoundOn} t={t} play={play} music={music} dropdownUp={false} />
          </div>
          <MandalartGrid
            key={`viewer-${viewingMandalart.id}`}
            mandalartId={viewingMandalart.id}
            pal={pal}
            t={t}
            soundOn={soundOn}
            readOnly
            ownerLabel={viewingFriend?.code}
          />
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}
