import React, { useState } from "react";
import { Volume2, VolumeX, Moon, Sun, Globe, Music2, Bell, BellOff, BookOpen, X, ChevronRight, User, Lock, Check } from "lucide-react";
import { THEMES } from "../theme";
import { supabase } from "../lib/supabaseClient";

const CATS = ["appearance", "planner", "pomodoro", "notifications", "music", "profile", "guide"];

const CAT_LABELS = {
  en: { appearance: "Appearance", planner: "Planner", pomodoro: "Pomodoro", notifications: "Notifications", music: "Music", profile: "Profile", guide: "Guide" },
  ko: { appearance: "화면", planner: "플래너", pomodoro: "뽀모도로", notifications: "알림", music: "음악", profile: "프로필", guide: "가이드" },
};

export default function DesktopSettings({
  pal, dark, setDark, lang, setLang, theme, setTheme,
  soundOn, setSoundOn, notifOn, toggleNotif,
  startView, setStartView, weeklyCompact, onToggleWeeklyCompact,
  music, t, play, onClose, onPlannerReset, onNavigate,
}) {
  const [cat, setCat] = useState("appearance");
  const [pwNew, setPwNew] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [pwStatus, setPwStatus] = useState(null); // null | "ok" | "error" | "mismatch" | "saving"
  const ink = pal.ink;
  const acc = pal.accent;
  const bg = pal.bg;
  const border = `1px solid ${ink}18`;
  const labels = CAT_LABELS[lang] ?? CAT_LABELS.en;

  const Row = ({ onClick, active, children, danger }) => (
    <button onClick={onClick} style={{
      width: "100%", display: "flex", alignItems: "center", gap: 12,
      background: active ? acc + "18" : "none",
      border: `1px solid ${active ? acc + "44" : ink + "18"}`,
      color: danger ? "#C7382E" : ink,
      padding: "11px 14px", cursor: "pointer",
      textAlign: "left", fontSize: 13, fontWeight: 600, fontFamily: "inherit",
      marginBottom: 6, borderRadius: 6,
    }}>{children}</button>
  );

  const Section = ({ title, children }) => (
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", opacity: 0.4, marginBottom: 10 }}>{title}</div>
      {children}
    </div>
  );

  const renderContent = () => {
    if (cat === "appearance") return (
      <>
        <Section title={lang === "ko" ? "언어" : "Language"}>
          <div style={{ display: "flex", gap: 6 }}>
            {[["en", "English"], ["ko", "한국어"]].map(([key, label]) => (
              <button key={key} onClick={() => { setLang(key); play?.("B4", "32n"); }} style={{
                flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                background: lang === key ? acc : "none", color: lang === key ? "#fff" : ink,
                border: `1px solid ${lang === key ? acc : ink + "30"}`, padding: "11px 0",
                cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: "inherit", borderRadius: 6,
              }}>
                <Globe size={15} /> {label}
              </button>
            ))}
          </div>
        </Section>

        <Section title={lang === "ko" ? "테마" : "Theme"}>
          {Object.entries(THEMES).map(([key, val]) => (
            <Row key={key} onClick={() => { setTheme(key); play?.("E5", "32n"); }} active={theme === key}>
              <span style={{ width: 20, height: 20, display: "inline-flex", overflow: "hidden", border: `1px solid ${ink}33`, flexShrink: 0, borderRadius: 2 }}>
                {key === "mondrian" ? (
                  <>
                    <span style={{ flex: 1, background: val.accents[0] }} />
                    <span style={{ flex: 1, background: val.accents[1] }} />
                    <span style={{ flex: 1, background: val.accents[2] }} />
                  </>
                ) : <span style={{ flex: 1, background: val.accents[0] }} />}
              </span>
              {val.name[lang]}
              {theme === key && <span style={{ marginLeft: "auto", color: acc, fontWeight: 800 }}>✓</span>}
            </Row>
          ))}
        </Section>

        <Section title={lang === "ko" ? "화면 모드" : "Display"}>
          <Row onClick={() => { setDark(d => !d); play?.("C5", "32n"); }}>
            {dark ? <Sun size={16} /> : <Moon size={16} />}
            {dark ? (t.light || (lang === "ko" ? "라이트 모드" : "Light mode")) : (t.dark || (lang === "ko" ? "다크 모드" : "Dark mode"))}
            <span style={{ marginLeft: "auto", fontSize: 11, opacity: 0.5 }}>{dark ? "DARK" : "LIGHT"}</span>
          </Row>
          <Row onClick={() => { setSoundOn(s => !s); play?.("A4", "32n"); }} active={soundOn}>
            {soundOn ? <Volume2 size={16} /> : <VolumeX size={16} />}
            {t.sound || (lang === "ko" ? "효과음" : "Sound effects")}
            <span style={{ marginLeft: "auto", fontSize: 11, fontWeight: 700, opacity: 0.6 }}>{soundOn ? "ON" : "OFF"}</span>
          </Row>
        </Section>
      </>
    );

    if (cat === "planner") return (
      <>
        <Section title={lang === "ko" ? "시작 화면" : "Start screen"}>
          {[["home", lang === "ko" ? "홈" : "Home"], ["planner", lang === "ko" ? "플래너" : "Planner"]].map(([key, label]) => (
            <Row key={key} onClick={() => { setStartView?.(key); play?.("E5", "32n"); }} active={startView === key}>
              {label}
              {startView === key && <span style={{ marginLeft: "auto", color: acc, fontWeight: 800 }}>✓</span>}
            </Row>
          ))}
        </Section>

        <Section title={lang === "ko" ? "주간 뷰 간격" : "Weekly view density"}>
          {[["wide", lang === "ko" ? "넓은 간격" : "Wide"], ["compact", lang === "ko" ? "좁은 간격" : "Compact"]].map(([key, label]) => (
            <Row key={key} onClick={() => { if ((key === "compact") !== weeklyCompact) { onToggleWeeklyCompact?.(); play?.("E5", "32n"); } }} active={(key === "compact") === !!weeklyCompact}>
              {label}
              {(key === "compact") === !!weeklyCompact && <span style={{ marginLeft: "auto", color: acc, fontWeight: 800 }}>✓</span>}
            </Row>
          ))}
        </Section>

        <Section title={lang === "ko" ? "데이터" : "Data"}>
          <Row onClick={onPlannerReset} danger>
            {lang === "ko" ? "플래너 데이터 초기화" : "Reset all planner data"}
            <ChevronRight size={14} style={{ marginLeft: "auto", opacity: 0.4 }} />
          </Row>
        </Section>
      </>
    );

    if (cat === "profile") return (
      <>
        <Section title={lang === "ko" ? "계정" : "Account"}>
          <Row onClick={() => { onNavigate?.("profile"); onClose(); }}>
            <User size={16} />
            {lang === "ko" ? "프로필 편집 (아이디, 소개 등)" : "Edit profile (username, bio, etc.)"}
            <ChevronRight size={14} style={{ marginLeft: "auto", opacity: 0.4 }} />
          </Row>
        </Section>
        <Section title={lang === "ko" ? "비밀번호 변경" : "Change password"}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[
              [pwNew, setPwNew, lang === "ko" ? "새 비밀번호" : "New password"],
              [pwConfirm, setPwConfirm, lang === "ko" ? "비밀번호 확인" : "Confirm password"],
            ].map(([val, setter, placeholder]) => (
              <input key={placeholder} type="password" value={val} onChange={e => { setter(e.target.value); setPwStatus(null); }}
                placeholder={placeholder}
                style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", fontSize: 13, fontFamily: "inherit", border: `1px solid ${ink}22`, borderRadius: 6, background: "transparent", color: ink, outline: "none" }} />
            ))}
            {pwStatus === "mismatch" && <div style={{ fontSize: 11, color: "#C7382E" }}>{lang === "ko" ? "비밀번호가 일치하지 않아요." : "Passwords do not match."}</div>}
            {pwStatus === "error"    && <div style={{ fontSize: 11, color: "#C7382E" }}>{lang === "ko" ? "변경에 실패했어요. 다시 시도해주세요." : "Failed to update. Please try again."}</div>}
            {pwStatus === "ok"       && <div style={{ fontSize: 11, color: "#4caf50", display: "flex", alignItems: "center", gap: 4 }}><Check size={12} />{lang === "ko" ? "비밀번호가 변경됐어요!" : "Password updated!"}</div>}
            <button
              disabled={pwStatus === "saving" || !pwNew}
              onClick={async () => {
                if (pwNew !== pwConfirm) { setPwStatus("mismatch"); return; }
                if (pwNew.length < 6) { setPwStatus("error"); return; }
                setPwStatus("saving");
                const { error } = await supabase.auth.updateUser({ password: pwNew });
                if (error) { setPwStatus("error"); } else { setPwStatus("ok"); setPwNew(""); setPwConfirm(""); }
              }}
              style={{ padding: "10px", background: pwStatus === "saving" ? ink + "44" : acc, color: "#fff", border: "none", fontWeight: 800, fontSize: 12, cursor: pwStatus === "saving" ? "not-allowed" : "pointer", fontFamily: "inherit", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              {pwStatus === "saving" ? (lang === "ko" ? "저장 중…" : "Saving…") : (lang === "ko" ? "변경" : "Update")}
            </button>
          </div>
        </Section>
      </>
    );

    if (cat === "guide") return (
      <>
        <Section title={lang === "ko" ? "사용 가이드" : "User guide"}>
          <Row onClick={() => { onNavigate?.("about", { tab: "guide" }); onClose(); }}>
            <BookOpen size={16} />
            {lang === "ko" ? "전체 기능 가이드 보기" : "View full feature guide"}
            <ChevronRight size={14} style={{ marginLeft: "auto", opacity: 0.4 }} />
          </Row>
        </Section>
        <div style={{ fontSize: 12, opacity: 0.35, lineHeight: 1.75 }}>
          {lang === "ko"
            ? "플래너, 만다라트, 뽀모도로, 소셜 등 GridA의 모든 기능에 대한 설명을 확인할 수 있어요."
            : "Learn about all GridA features — Planner, Mandalart, Pomodoro, Social, and more."}
        </div>
      </>
    );

    if (cat === "pomodoro") return (
      <div style={{ fontSize: 12, opacity: 0.35, lineHeight: 1.8 }}>
        {lang === "ko"
          ? "뽀모도로 설정은 준비 중입니다. 현재는 타이머 시작 시 1분=1칸, 최대 45분(5칸×9줄)으로 드래그해 설정할 수 있습니다."
          : "Pomodoro settings are coming soon. Currently you can drag to set 1 min = 1 block, max 45 min (5×9 grid)."}
      </div>
    );

    if (cat === "notifications") return (
      <>
        <Section title={lang === "ko" ? "브라우저 알림" : "Browser notifications"}>
          <Row onClick={() => toggleNotif?.()} active={notifOn}>
            {notifOn ? <Bell size={16} /> : <BellOff size={16} />}
            {lang === "ko" ? "뽀모도로 종료 알림" : "Pomodoro completion alert"}
            <span style={{ marginLeft: "auto", fontSize: 11, fontWeight: 700, opacity: 0.6 }}>{notifOn ? "ON" : "OFF"}</span>
          </Row>
          <div style={{ fontSize: 11, opacity: 0.35, lineHeight: 1.6, marginTop: 4 }}>
            {lang === "ko"
              ? "브라우저 알림 권한이 필요합니다. 처음 켜면 권한 요청 팝업이 나타납니다."
              : "Requires browser notification permission. A permission prompt will appear the first time you enable this."}
          </div>
        </Section>
      </>
    );

    if (cat === "music") return (
      <>
        {music ? (
          <>
            <div style={{ fontSize: 11, opacity: 0.4, marginBottom: 12 }}>{t.music?.loopNote || "Loops until stopped"}</div>
            <Row onClick={() => { music.stop(); }} active={music.trackIndex === null}>
              <Music2 size={16} /> {t.music?.off || (lang === "ko" ? "끄기" : "Off")}
            </Row>
            {music.tracks.map((name, i) => (
              <Row key={name} onClick={() => music.selectTrack(i)} active={music.trackIndex === i}>
                <span style={{ width: 16, color: acc, fontWeight: 700, fontSize: 11 }}>{music.trackIndex === i ? "▶" : ""}</span>
                {name}
              </Row>
            ))}
          </>
        ) : (
          <div style={{ fontSize: 12, opacity: 0.35 }}>{lang === "ko" ? "음악 없음" : "No tracks available"}</div>
        )}
      </>
    );

    return null;
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 120,
      background: "rgba(0,0,0,0.55)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "inherit",
    }}
      onClick={onClose}>
    <div onClick={e => e.stopPropagation()} style={{
      position: "relative", width: 680, maxWidth: "96vw", height: "82vh",
      background: bg, color: ink,
      display: "flex", flexDirection: "column",
      border: `2px solid ${ink}18`,
      boxShadow: "0 20px 70px rgba(0,0,0,0.45)",
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 24px 14px", borderBottom: border, flexShrink: 0 }}>
        <span style={{ fontWeight: 900, fontSize: 18, textTransform: "uppercase", letterSpacing: "-0.01em" }}>
          {t.settings || (lang === "ko" ? "설정" : "Settings")}
        </span>
        <button onClick={onClose} aria-label="Close" style={{ background: "none", border: "none", color: ink, cursor: "pointer", padding: 4, display: "flex" }}>
          <X size={22} />
        </button>
      </div>

      {/* Body: sidebar + content */}
      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        {/* Category sidebar */}
        <div style={{ width: 180, flexShrink: 0, borderRight: border, padding: "16px 12px", overflowY: "auto", overscrollBehavior: "contain" }}>
          {CATS.map(c => (
            <button key={c} onClick={() => setCat(c)} style={{
              width: "100%", textAlign: "left", padding: "10px 12px",
              background: cat === c ? acc + "18" : "none",
              border: "none", borderRadius: 6,
              color: cat === c ? acc : ink,
              cursor: "pointer", fontSize: 13, fontWeight: cat === c ? 800 : 500,
              fontFamily: "inherit", marginBottom: 2,
            }}>
              {labels[c]}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto", overscrollBehavior: "contain", padding: "24px 28px" }}>
          <div style={{ fontWeight: 900, fontSize: 15, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 20, opacity: 0.7 }}>
            {labels[cat]}
          </div>
          {renderContent()}
        </div>
      </div>
    </div>
    </div>
  );
}
