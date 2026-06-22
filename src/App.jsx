import React, { useState, useEffect, useRef } from "react";
import { User, Plus, FolderKanban, HelpCircle, ArrowLeft, BookOpen, Lightbulb } from "lucide-react";
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
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deletebusy, setDeleteBusy] = useState(false);
  const [featureGuideOpen, setFeatureGuideOpen] = useState(false);
  const [gridTutorialOpen, setGridTutorialOpen] = useState(false);
  const [splashed, setSplashed] = useState(false);
  const prevUserIdRef = useRef(null);

  const pal = paletteFor(theme, dark);
  const t = T[lang];
  const play = useSound(soundOn);
  const music = useMusicPlayer();

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
      setCurrentMandalartId(m.id);
      setView("grid");
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

      {view === "home" && !splashed && (
        <div
          className="fade-in"
          onClick={async () => { await import("tone").then(m => m.start()); setSplashed(true); }}
          style={{
            position: "fixed", inset: 0, zIndex: 100,
            background: "#000",
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            cursor: "pointer", gap: 24,
          }}
        >
          <h1 style={{
            fontFamily: titleFontFamily,
            fontWeight: 900, fontSize: "clamp(56px,12vw,160px)",
            letterSpacing: "-0.03em", lineHeight: 0.88,
            color: pal.accent, margin: 0, textTransform: "uppercase",
          }}>
            {t.title}
          </h1>
          <p style={{ fontSize: "clamp(11px,1.2vw,14px)", letterSpacing: "0.1em", color: "#fff", opacity: 0.45, textTransform: "uppercase", margin: 0 }}>
            {t.tagline}
          </p>
          <p style={{ fontSize: "clamp(11px,1.1vw,13px)", color: "#fff", opacity: 0.25, margin: "32px 0 0", letterSpacing: "0.06em", textTransform: "uppercase" }}>
            {t.splash.cta}
          </p>
        </div>
      )}

      {view === "home" && (() => {
        const newBg = theme === "yellow" ? "#C9991A" : "#E3B22E";
        return (
          <div className="home-enter" style={{ margin: -28, height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{
              flex: 1, minHeight: 0,
              background: "#000", display: "grid", gap: 4, padding: 4,
              gridTemplateColumns: "3fr 1fr",
              gridTemplateRows: "1fr 1fr",
            }}>
              {/* Title block — spans both rows */}
              <div
                className="home-title-block"
                onMouseEnter={() => play("C6", "64n")}
                style={{
                  gridRow: "1 / 3", gridColumn: "1",
                  background: pal.accent2,
                  padding: "clamp(20px, 4vw, 56px)",
                  display: "flex", flexDirection: "column", justifyContent: "space-between",
                  position: "relative",
                }}
              >
                <FloatingBlocks pal={pal} theme={theme} />
                <div style={{ position: "relative", zIndex: 1 }}>
                  <h1 className="home-title" style={{
                    fontWeight: 900,
                    fontSize: "clamp(60px, 11vw, 180px)",
                    letterSpacing: "-0.03em",
                    lineHeight: 0.88,
                    margin: 0,
                    color: "#fff",
                    textTransform: "uppercase",
                    textAlign: "center",
                  }}>
                    {t.title}
                  </h1>
                  <p className="home-tagline" style={{ fontSize: 11, letterSpacing: isKo ? "0.04em" : "0.12em", opacity: 0.6, margin: "14px 0 0", color: "#fff", textTransform: "uppercase", textAlign: "center" }}>
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

              {/* Profile — top right */}
              <button onClick={() => { setView("profile"); play("C5", "16n"); }} onMouseEnter={() => play("E6", "64n")}
                className="home-tile"
                style={{ gridRow: "1", gridColumn: "2", background: pal.bg, border: "none", padding: "clamp(16px,2.5vw,32px) 20px", cursor: "pointer", color: pal.ink, textAlign: "left", display: "flex", flexDirection: "column", gap: 10 }}>
                <User size={20} color={pal.ink} />
                <span style={{ fontWeight: 800, fontSize: 13, textTransform: "uppercase" }}>{t.menu.profile}</span>
              </button>

              {/* New Mandalart — always yellow, bottom right */}
              <button onClick={goCreate} onMouseEnter={() => play("G6", "64n")}
                className="home-tile"
                style={{ gridRow: "2", gridColumn: "2", background: newBg, border: "none", padding: "clamp(16px,2.5vw,32px) 20px", cursor: "pointer", color: "#1a1a1a", textAlign: "left", display: "flex", flexDirection: "column", gap: 10 }}>
                <Plus size={20} color="#1a1a1a" />
                <span style={{ fontWeight: 800, fontSize: 13, textTransform: "uppercase" }}>{t.menu.create}</span>
              </button>
            </div>

            {/* Bottom bar */}
            <div style={{ background: "#000", display: "grid", gap: 4, padding: "0 4px 4px", gridTemplateColumns: "1fr 1fr", flexShrink: 0 }}>
              <button onClick={() => { setView("manage"); play("C5", "16n"); }} onMouseEnter={() => play("A5", "64n")}
                className="home-tile"
                style={{ background: pal.accent, border: "none", padding: "18px 24px", cursor: "pointer", color: "#fff", textAlign: "left", display: "flex", alignItems: "center", gap: 12 }}>
                <FolderKanban size={18} color="#fff" />
                <span style={{ fontWeight: 800, fontSize: 13, textTransform: "uppercase" }}>{t.menu.manage}</span>
              </button>
              <button onClick={() => { setView("about"); play("G4", "16n"); }} onMouseEnter={() => play("B5", "64n")}
                className="home-tile"
                style={{ background: pal.bg, border: "none", padding: "18px 24px", cursor: "pointer", color: pal.ink, textAlign: "left", display: "flex", alignItems: "center", gap: 12 }}>
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
              <button onClick={() => setView("home")} style={{ background: "none", border: "none", color: pal.ink, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
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
            <button onClick={() => setView("home")} style={{ background: "none", border: "none", color: pal.ink, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
              <ArrowLeft size={14} /> {t.back}
            </button>
            <TopControls pal={pal} dark={dark} setDark={setDark} lang={lang} setLang={setLang} theme={theme} setTheme={setTheme} soundOn={soundOn} setSoundOn={setSoundOn} t={t} play={play} music={music} dropdownUp={false} />
          </div>
          <Manage
            pal={pal}
            t={t}
            myId={myId}
            onOpen={(id) => { setCurrentMandalartId(id); setView("grid"); play("C5", "16n"); }}
          />
        </div>
      )}

      {view === "profile" && (
        <div className="fade-in">
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 18, flexWrap: "wrap", gap: 10 }}>
            <button onClick={() => { setView("home"); setSignOutConfirm(false); }} style={{ background: "none", border: "none", color: pal.ink, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
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
            onViewFriend={(friend) => { setViewingFriend(friend); setView("friendList"); play("C5", "16n"); }}
          />

          {/* Delete account */}
          <div style={{ marginTop: 40, paddingTop: 24, borderTop: `1px solid ${pal.ink}18` }}>
            {deleteConfirm ? (
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
                    onClick={() => setDeleteConfirm(false)}
                    disabled={deletebusy}
                    style={{ background: "none", border: `1px solid ${pal.ink}40`, color: pal.ink, padding: "7px 14px", fontSize: 11, cursor: "pointer" }}
                  >
                    {t.auth.deleteAccountNo}
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => { setSignOutConfirm(false); setDeleteConfirm(true); }}
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
            <button onClick={() => setView("profile")} style={{ background: "none", border: "none", color: pal.ink, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
              <ArrowLeft size={14} /> {t.back}
            </button>
            <TopControls pal={pal} dark={dark} setDark={setDark} lang={lang} setLang={setLang} theme={theme} setTheme={setTheme} soundOn={soundOn} setSoundOn={setSoundOn} t={t} play={play} music={music} dropdownUp={false} />
          </div>
          <FriendMandalartList
            friend={viewingFriend}
            pal={pal}
            t={t}
            onOpen={(m) => { setViewingMandalart(m); setView("viewer"); play("C5", "16n"); }}
          />
        </div>
      )}

      {view === "about" && (
        <div className="fade-in">
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 18, flexWrap: "wrap", gap: 10 }}>
            <button onClick={() => setView("home")} style={{ background: "none", border: "none", color: pal.ink, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
              <ArrowLeft size={14} /> {t.back}
            </button>
            <TopControls pal={pal} dark={dark} setDark={setDark} lang={lang} setLang={setLang} theme={theme} setTheme={setTheme} soundOn={soundOn} setSoundOn={setSoundOn} t={t} play={play} music={music} dropdownUp={false} />
          </div>
          <AboutPage pal={pal} t={t} />
        </div>
      )}

      {view === "viewer" && viewingMandalart && (
        <div className="fade-in">
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 18, flexWrap: "wrap", gap: 10 }}>
            <button onClick={() => setView("friendList")} style={{ background: "none", border: "none", color: pal.ink, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
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
