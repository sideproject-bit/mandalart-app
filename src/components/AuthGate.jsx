import React, { useState, useEffect } from "react";
import { Globe } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";
import { T } from "../copy";
import WelcomeScreen from "./WelcomeScreen";

const BLOCKS = [
  { id: 0, color: "#C7382E", col: "1/3", row: "1/3" },
  { id: 1, color: "#F0EBE0", col: "3/4", row: "1/2" },
  { id: 2, color: "#2B3DCB", col: "4/7", row: "1/3" },
  { id: 3, color: "#F0EBE0", col: "3/4", row: "2/3" },
  { id: 4, color: "#F0EBE0", col: "1/2", row: "3/4" },
  { id: 5, color: "#E3B22E", col: "2/4", row: "3/5" },
  { id: 6, color: "#F0EBE0", col: "4/5", row: "3/4" },
  { id: 7, color: "#C7382E", col: "5/7", row: "3/4" },
  { id: 8, color: "#2B3DCB", col: "1/2", row: "4/5" },
  { id: 9, color: "#F0EBE0", col: "4/7", row: "4/5" },
];
const BLOCK_NOTES = ["C5", "E5", "G5", "A5", "B5", "D5", "F5", "G4", "A4", "C6"];

// Slide direction and stagger delay per block
const BLOCK_ANIMS = [
  { dir: "left",   delay: 0   },
  { dir: "top",    delay: 80  },
  { dir: "right",  delay: 40  },
  { dir: "top",    delay: 160 },
  { dir: "left",   delay: 120 },
  { dir: "bottom", delay: 200 },
  { dir: "right",  delay: 240 },
  { dir: "right",  delay: 100 },
  { dir: "bottom", delay: 280 },
  { dir: "bottom", delay: 320 },
];

const SLIDE_FROM = {
  left:   "translateX(-110vw)",
  right:  "translateX(110vw)",
  top:    "translateY(-110vh)",
  bottom: "translateY(110vh)",
};

function MondrianBg({ play, ready }) {
  const [hovered, setHovered] = useState(null);
  return (
    <div style={{
      position: "fixed", inset: 0,
      display: "grid",
      gridTemplateColumns: "repeat(6, 1fr)",
      gridTemplateRows: "repeat(4, 1fr)",
      gap: 5, padding: 5, background: "#111", zIndex: 0,
      overflow: "hidden",
    }}>
      {BLOCKS.map((b, i) => {
        const anim = BLOCK_ANIMS[i];
        const isIn = ready;
        return (
          <div
            key={b.id}
            onMouseEnter={() => { setHovered(b.id); play?.(BLOCK_NOTES[i % BLOCK_NOTES.length], "64n"); }}
            onMouseLeave={() => setHovered(null)}
            style={{
              gridColumn: b.col, gridRow: b.row,
              background: b.color,
              transform: isIn
                ? (hovered === b.id ? "scale(0.96)" : "scale(1)")
                : SLIDE_FROM[anim.dir],
              filter: hovered === b.id ? "brightness(1.22)" : "brightness(1)",
              transition: isIn
                ? `transform 1.1s cubic-bezier(0.22,1,0.36,1) ${anim.delay}ms, filter 0.2s ease`
                : "none",
              cursor: "default",
            }}
          />
        );
      })}
    </div>
  );
}

// ── Insert page shown after "Get Started" ──────────────
function InsertPage({ onDone }) {
  // phase 0: logo fading in (slow scale+fade)
  // phase 1: logo slides up, title+copy fade in slowly
  // phase 2: everything fades out
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 1800);
    const t2 = setTimeout(() => setPhase(2), 5400);
    const t3 = setTimeout(onDone, 6300);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  return (
    <div style={{
      position: "fixed", inset: 0,
      background: "#0d0d0d",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      fontFamily: "Helvetica, Arial, sans-serif",
      opacity: phase === 2 ? 0 : 1,
      transition: phase === 2 ? "opacity 0.85s ease" : "none",
      zIndex: 10,
    }}>
      <style>{`
        @keyframes ipLogoIn {
          0%   { opacity: 0; transform: scale(0.55); }
          50%  { opacity: 1; }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes ipTitleIn {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes ipCopyIn {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 0.55; transform: translateY(0); }
        }
      `}</style>

      {/*
        Two-layer structure to avoid animation/transform conflict:
        - Outer div: CSS transition for the Y slide (phase 0→1)
        - Inner div: CSS animation for scale+fade (always)
      */}
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        transform: phase >= 1 ? "translateY(-36px)" : "translateY(0)",
        transition: "transform 1s cubic-bezier(0.22,1,0.36,1)",
      }}>
        <div style={{ animation: "ipLogoIn 1.4s cubic-bezier(0.16,1,0.3,1) both" }}>
          <img src="/logo.png" alt="GridA" style={{ width: 240, height: 240, objectFit: "contain", display: "block" }} />
        </div>

        {/* Title + tagline — conditionally rendered at phase 1 */}
        <div style={{
          textAlign: "center", marginTop: 10,
          visibility: phase >= 1 ? "visible" : "hidden",
        }}>
          <div style={{
            fontWeight: 900, fontSize: 30, letterSpacing: "0.55em", paddingLeft: "0.55em",
            color: "#F2EDE1", textTransform: "uppercase", marginBottom: 5,
            animation: phase >= 1 ? "ipTitleIn 1.1s 0.15s cubic-bezier(0.22,1,0.36,1) both" : "none",
          }}>
            GRIDA
          </div>
          <div style={{
            fontStyle: "italic", fontSize: 13,
            color: "rgba(242,237,225,1)",
            letterSpacing: "0.06em", fontWeight: 400,
            animation: phase >= 1 ? "ipCopyIn 1.3s 0.5s cubic-bezier(0.22,1,0.36,1) both" : "none",
          }}>
            Composition with Your Day, Year, and Life
          </div>
        </div>
      </div>
    </div>
  );
}

const KO_AUTH_ERRORS = {
  "Invalid login credentials":              "이메일 또는 비밀번호가 올바르지 않아요.",
  "Email not confirmed":                    "이메일 인증이 필요해요. 받은 편지함을 확인해주세요.",
  "User already registered":                "이미 사용 중인 이메일이에요.",
  "Password should be at least 6 characters": "비밀번호는 6자 이상이어야 해요.",
  "Unable to validate email address: invalid format": "올바른 이메일 형식이 아니에요.",
  "Signup requires a valid password":       "올바른 비밀번호를 입력해주세요.",
  "Email rate limit exceeded":              "잠시 후 다시 시도해주세요.",
  "over_email_send_rate_limit":             "잠시 후 다시 시도해주세요.",
};

function translateAuthError(msg, lang) {
  if (lang !== "ko") return msg;
  for (const [en, ko] of Object.entries(KO_AUTH_ERRORS)) {
    if (msg.toLowerCase().includes(en.toLowerCase())) return ko;
  }
  return msg;
}

function inputStyle() {
  return {
    width: "100%", boxSizing: "border-box",
    background: "rgba(255,255,255,0.07)",
    border: "1px solid rgba(255,255,255,0.2)",
    color: "#F2EDE1",
    padding: "10px 12px", fontSize: 13, marginBottom: 10, outline: "none",
  };
}

export default function AuthGate({ play }) {
  const { signIn, signUp } = useAuth();

  // flow: "welcome" → "insert" → "login"
  const [screen, setScreen] = useState("welcome");
  const [blockReady, setBlockReady] = useState(false);
  const [loginVisible, setLoginVisible] = useState(false);
  const [lang, setLang] = useState("en");
  const t = T[lang];

  const [mode, setMode] = useState("signin"); // "signin" | "signup" | "reset"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [resetDone, setResetDone] = useState(false);

  if (screen === "welcome") {
    return <WelcomeScreen play={play} onFinish={() => setScreen("insert")} />;
  }

  if (screen === "insert") {
    return <InsertPage onDone={() => {
      setScreen("login");
      setTimeout(() => setBlockReady(true), 60);
      setTimeout(() => setLoginVisible(true), 900);
    }} />;
  }

  const INK = "#F2EDE1";
  const ACCENT = "#C7382E";

  const [signUpDone, setSignUpDone] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (mode === "reset") {
      setError(""); setBusy(true);
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
      setBusy(false);
      if (error) { setError(translateAuthError(error.message, lang)); return; }
      setResetDone(true);
      return;
    }
    if (mode === "signup" && !termsAccepted) { setError(t.auth.termsRequired); return; }
    setError("");
    setBusy(true);
    const { error } = mode === "signin"
      ? await signIn(email, password)
      : await signUp(email, password, username);
    setBusy(false);
    if (error) { setError(translateAuthError(error.message, lang)); return; }
    if (mode === "signup") setSignUpDone(true);
  };

  const switchMode = (m) => { setMode(m); setError(""); setTermsAccepted(false); setShowTerms(false); setResetDone(false); };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, position: "relative" }}>
      <MondrianBg play={play} ready={blockReady} />

      {/* Language toggle — fades in with form */}
      <button
        onClick={() => setLang(l => l === "en" ? "ko" : "en")}
        style={{
          position: "fixed", top: 16, right: 16, zIndex: 2,
          display: "flex", alignItems: "center", gap: 5,
          background: "rgba(18,18,18,0.75)", backdropFilter: "blur(6px)",
          border: "1px solid rgba(255,255,255,0.2)", color: "#F2EDE1",
          padding: "6px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer",
          opacity: loginVisible ? 1 : 0,
          transition: "opacity 0.7s ease",
        }}
      >
        <Globe size={12} /> {lang === "en" ? "한국어" : "English"}
      </button>

      {/* Form wrapper — fades in after blocks settle */}
      <div style={{
        width: 340, position: "relative", zIndex: 1,
        opacity: loginVisible ? 1 : 0,
        transition: "opacity 0.7s ease",
      }}>
        <form
          onSubmit={submit}
          style={{
            border: `3px solid ${ACCENT}`,
            padding: 28,
            background: "rgba(18,18,18,0.88)",
            backdropFilter: "blur(8px)",
          }}
        >
          {/* Form header: logo + brand */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "0 0 22px" }}>
            <img src="/logo.png" alt="GridA" style={{ width: 32, height: 32, objectFit: "contain", flexShrink: 0 }} />
            <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
              <span style={{ fontWeight: 900, fontSize: 22, color: INK, textTransform: "uppercase", letterSpacing: "-0.02em" }}>GRIDA</span>
              <span style={{ fontWeight: 400, fontSize: 14, color: INK, opacity: 0.45 }}>.app</span>
            </div>
          </div>

          {mode === "signup" && (
            <>
              <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder={t.auth.username} style={inputStyle()} required />
              <p style={{ fontSize: 11, color: "#F2EDE1", opacity: 0.4, margin: "-6px 0 10px", lineHeight: 1.5 }}>{t.auth.usernameHint}</p>
            </>
          )}
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t.auth.email} style={inputStyle()} required />
          {mode !== "reset" && <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t.auth.password} style={inputStyle()} required minLength={6} />}

          {mode === "signup" && (
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: "flex", alignItems: "flex-start", gap: 8, cursor: "pointer", fontSize: 12, color: INK, lineHeight: 1.5 }}>
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  style={{ marginTop: 2, accentColor: ACCENT, cursor: "pointer" }}
                />
                <span>
                  {t.auth.termsPrefix}{" "}
                  <button type="button" onClick={() => setShowTerms((s) => !s)} style={{ background: "none", border: "none", color: ACCENT, cursor: "pointer", fontSize: 12, padding: 0, textDecoration: "underline" }}>
                    {t.auth.termsLink}
                  </button>
                </span>
              </label>
            </div>
          )}

          {signUpDone && (
            <div style={{ background: "#1a3a1a", border: "1px solid #3CA45C", borderRadius: 4, padding: "12px 14px", marginBottom: 14, fontSize: 12.5, lineHeight: 1.6, color: "#7ed99a" }}>
              {t.auth.signUpDone}
            </div>
          )}
          {resetDone && (
            <div style={{ background: "#1a3a1a", border: "1px solid #3CA45C", borderRadius: 4, padding: "12px 14px", marginBottom: 14, fontSize: 12.5, lineHeight: 1.6, color: "#7ed99a" }}>
              {t.auth.resetDone || (lang === "ko" ? "비밀번호 재설정 링크를 이메일로 보냈어요." : "Password reset email sent — check your inbox.")}
            </div>
          )}
          {error && <p style={{ color: "#ff6b6b", fontSize: 12, margin: "0 0 10px" }}>{error}</p>}

          {!resetDone && (
            <button
              type="submit"
              disabled={busy || (mode === "signup" && !termsAccepted)}
              style={{ width: "100%", background: busy || (mode === "signup" && !termsAccepted) ? ACCENT + "66" : ACCENT, color: "#fff", border: "none", padding: "10px 0", fontWeight: 700, fontSize: 13, cursor: busy || (mode === "signup" && !termsAccepted) ? "not-allowed" : "pointer", marginTop: 4 }}
            >
              {mode === "signin" ? t.auth.signIn : mode === "signup" ? t.auth.signUp : (t.auth.resetSend || (lang === "ko" ? "재설정 이메일 보내기" : "Send reset email"))}
            </button>
          )}
          {mode === "signin" && !resetDone && (
            <button type="button" onClick={() => switchMode("reset")}
              style={{ background: "none", border: "none", color: INK, opacity: 0.4, fontSize: 11, marginTop: 8, cursor: "pointer", width: "100%", textAlign: "right" }}>
              {t.auth.forgotPassword || (lang === "ko" ? "비밀번호를 잊으셨나요?" : "Forgot password?")}
            </button>
          )}
          <button
            type="button"
            onClick={() => switchMode(mode === "signup" ? "signin" : "signup")}
            style={{ background: "none", border: "none", color: INK, opacity: 0.55, fontSize: 12, marginTop: mode === "signin" ? 4 : 12, cursor: "pointer", width: "100%" }}
          >
            {mode === "signin" || mode === "reset" ? t.auth.toSignUp : t.auth.toSignIn}
          </button>
          {mode === "reset" && (
            <button type="button" onClick={() => switchMode("signin")}
              style={{ background: "none", border: "none", color: INK, opacity: 0.4, fontSize: 11, marginTop: 4, cursor: "pointer", width: "100%" }}>
              ← {t.auth.backToSignIn || (lang === "ko" ? "로그인으로 돌아가기" : "Back to sign in")}
            </button>
          )}
        </form>

        {showTerms && mode === "signup" && (
          <div style={{ marginTop: 8, border: "1px solid rgba(255,255,255,0.15)", padding: 20, background: "rgba(18,18,18,0.88)", backdropFilter: "blur(8px)" }}>
            <h3 style={{ fontWeight: 800, fontSize: 13, textTransform: "uppercase", color: INK, margin: "0 0 12px" }}>{t.auth.termsTitle}</h3>
            <ul style={{ margin: 0, padding: "0 0 0 16px", display: "flex", flexDirection: "column", gap: 8 }}>
              {t.auth.termsClauses.map((clause, i) => (
                <li key={i} style={{ fontSize: 12, lineHeight: 1.6, color: INK, opacity: 0.75 }}>{clause}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
