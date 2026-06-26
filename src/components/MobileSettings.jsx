import React from "react";
import { X, Volume2, VolumeX, Moon, Sun, Globe, Music2, Bell, BellOff } from "lucide-react";
import { THEMES } from "../theme";

// Full-screen settings sheet for mobile — replaces the desktop TopControls bar.
export default function MobileSettings({ pal, dark, setDark, lang, setLang, theme, setTheme, soundOn, setSoundOn, notifOn, toggleNotif, t, play, music, startView, setStartView, onClose }) {
  const ink = pal.ink;
  const acc = pal.accent;
  const border = `1px solid ${ink}22`;

  const Section = ({ title, children }) => (
    <div style={{ marginBottom: 22 }}>
      <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", opacity: 0.5, marginBottom: 10 }}>{title}</div>
      {children}
    </div>
  );

  const Row = ({ onClick, active, children }) => (
    <button onClick={onClick} style={{
      width: "100%", display: "flex", alignItems: "center", gap: 12,
      background: active ? acc + "1f" : "none",
      border, color: ink, padding: "13px 14px", cursor: "pointer",
      textAlign: "left", fontSize: 14, fontWeight: 600, fontFamily: "inherit",
      marginBottom: 6,
    }}>{children}</button>
  );

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 120,
      background: pal.bg, color: ink,
      display: "flex", flexDirection: "column",
      fontFamily: "inherit",
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 18px 14px", borderBottom: border }}>
        <span style={{ fontWeight: 900, fontSize: 18, textTransform: "uppercase", letterSpacing: "-0.01em" }}>{t.settings || "Settings"}</span>
        <button onClick={onClose} aria-label="Close" style={{ background: "none", border: "none", color: ink, cursor: "pointer", padding: 4, display: "flex" }}>
          <X size={22} />
        </button>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: "auto", padding: 18 }}>

        {/* Language */}
        <Section title={t.lang || "Language"}>
          <div style={{ display: "flex", gap: 6 }}>
            {[["en", "English"], ["ko", "한국어"]].map(([key, label]) => (
              <button key={key} onClick={() => { setLang(key); play("B4", "32n"); }} style={{
                flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                background: lang === key ? acc : "none", color: lang === key ? "#fff" : ink,
                border: `1px solid ${lang === key ? acc : ink + "30"}`, padding: "12px 0",
                cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: "inherit",
              }}>
                <Globe size={15} /> {label}
              </button>
            ))}
          </div>
        </Section>

        {/* Theme */}
        <Section title={t.theme || "Theme"}>
          {Object.entries(THEMES).map(([key, val]) => (
            <Row key={key} onClick={() => { setTheme(key); play("E5", "32n"); }} active={theme === key}>
              <span style={{ width: 22, height: 22, display: "inline-flex", overflow: "hidden", border: `1px solid ${ink}44`, flexShrink: 0 }}>
                {key === "mondrian" ? (
                  <>
                    <span style={{ flex: 1, background: val.accents[0] }} />
                    <span style={{ flex: 1, background: val.accents[1] }} />
                    <span style={{ flex: 1, background: val.accents[2] }} />
                  </>
                ) : (
                  <span style={{ flex: 1, background: val.accents[0] }} />
                )}
              </span>
              {val.name[lang]}
              {theme === key && <span style={{ marginLeft: "auto", color: acc, fontWeight: 800 }}>✓</span>}
            </Row>
          ))}
        </Section>

        {/* Appearance */}
        <Section title={t.appearance || (lang === "ko" ? "화면" : "Appearance")}>
          <Row onClick={() => { setDark(d => !d); play("C5", "32n"); }}>
            {dark ? <Sun size={18} /> : <Moon size={18} />}
            {dark ? t.light : t.dark}
          </Row>
          <Row onClick={() => { setSoundOn(s => !s); play("A4", "32n"); }} active={soundOn}>
            {soundOn ? <Volume2 size={18} /> : <VolumeX size={18} />}
            {t.sound || (lang === "ko" ? "효과음" : "Sound")}
            <span style={{ marginLeft: "auto", fontSize: 12, fontWeight: 700, opacity: 0.6 }}>{soundOn ? "ON" : "OFF"}</span>
          </Row>
          <Row onClick={() => toggleNotif?.()} active={notifOn}>
            {notifOn ? <Bell size={18} /> : <BellOff size={18} />}
            {t.notifications || (lang === "ko" ? "알림" : "Notifications")}
            <span style={{ marginLeft: "auto", fontSize: 12, fontWeight: 700, opacity: 0.6 }}>{notifOn ? "ON" : "OFF"}</span>
          </Row>
        </Section>

        {/* Start screen */}
        <Section title={lang === "ko" ? "시작 화면" : "Start Screen"}>
          {[["home", lang === "ko" ? "홈" : "Home"], ["planner", lang === "ko" ? "플래너" : "Planner"]].map(([key, label]) => (
            <Row key={key} onClick={() => { setStartView?.(key); play("E5", "32n"); }} active={startView === key}>
              {label}
              {startView === key && <span style={{ marginLeft: "auto", color: acc, fontWeight: 800 }}>✓</span>}
            </Row>
          ))}
        </Section>

        {/* Music */}
        {music && (
          <Section title={lang === "ko" ? "음악" : "Music"}>
            <div style={{ fontSize: 11, opacity: 0.45, marginBottom: 8 }}>{t.music?.loopNote || "Loops until stopped"}</div>
            <Row onClick={() => { music.stop(); }} active={music.trackIndex === null}>
              <Music2 size={18} /> {t.music?.off || (lang === "ko" ? "끄기" : "Off")}
            </Row>
            {music.tracks.map((name, i) => (
              <Row key={name} onClick={() => music.selectTrack(i)} active={music.trackIndex === i}>
                <span style={{ width: 18, textAlign: "center", color: acc }}>{music.trackIndex === i ? "▶" : ""}</span>
                {name}
              </Row>
            ))}
          </Section>
        )}
      </div>
    </div>
  );
}
