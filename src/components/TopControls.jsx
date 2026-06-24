import React, { useState } from "react";
import { Volume2, VolumeX, Moon, Sun, Globe, Music2 } from "lucide-react";
import { THEMES } from "../theme";

const hex6 = (c) => (c && c.length === 4 ? "#" + c[1] + c[1] + c[2] + c[2] + c[3] + c[3] : c);
const BOX = (color, active = false, bare = false) => {
  const c = hex6(color);
  return {
    width: 40, height: 40,
    display: "flex", alignItems: "center", justifyContent: "center",
    background: active ? c + "22" : "none",
    border: bare ? "1px solid rgba(255,255,255,0.35)" : `1px solid ${c}44`,
    cursor: "pointer",
    color,
    flexShrink: 0,
    padding: 0,
  };
};

export default function TopControls({ pal, dark, setDark, lang, setLang, theme, setTheme, soundOn, setSoundOn, t, play, music, dropdownUp = false, onHome }) {
  const [themeOpen, setThemeOpen] = useState(false);
  const [musicOpen, setMusicOpen] = useState(false);
  const dropdownInk = pal.bg === "#F4F0E4" ? "#1B1A17" : "#F2EDE1";
  const dropPos = dropdownUp ? { bottom: "calc(100% + 6px)" } : { top: "calc(100% + 6px)" };
  const closeAll = () => { setThemeOpen(false); setMusicOpen(false); };
  const ink = pal.ink;
  const bare = dropdownUp; // home view: no borders

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4, position: "relative" }}>

      {/* Sound */}
      <button onClick={() => { setSoundOn((s) => !s); play("A4", "32n"); }} title={t.sound} style={BOX(ink, !soundOn, bare)}>
        {soundOn ? <Volume2 size={18} /> : <VolumeX size={18} />}
      </button>

      {/* Music */}
      {music && (
        <div style={{ position: "relative", display: "flex" }}>
          <button
            onClick={() => { setMusicOpen((o) => !o); setThemeOpen(false); }}
            title="Music"
            style={{ ...BOX(ink, music.trackIndex !== null, bare), gap: 5, minWidth: 40, width: "auto", paddingLeft: music.trackIndex !== null ? 8 : 0, paddingRight: music.trackIndex !== null ? 8 : 0 }}
          >
            <Music2 size={18} />
            {music.trackIndex !== null && (
              <span style={{ fontSize: 10, fontWeight: 700, maxWidth: 72, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {music.trackName}
              </span>
            )}
          </button>
          {musicOpen && (
            <div style={{ position: "absolute", ...dropPos, left: 0, background: pal.bg, border: `1px solid ${dropdownInk}40`, padding: 6, display: "flex", flexDirection: "column", gap: 2, zIndex: 50, minWidth: 180, maxHeight: 280, overflowY: "auto" }}>
              <div style={{ fontSize: 10, opacity: 0.5, color: dropdownInk, padding: "2px 8px 6px", borderBottom: `1px solid ${dropdownInk}20`, marginBottom: 2 }}>
                {t.music?.loopNote || "Loops until stopped"}
              </div>
              <button onClick={() => { music.stop(); closeAll(); }} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", padding: "4px 8px", color: dropdownInk, fontSize: 11, fontWeight: music.trackIndex === null ? 800 : 400, textAlign: "left" }}>
                — {t.music?.off || "Off"}
              </button>
              {music.tracks.map((name, i) => (
                <button key={name} onClick={() => { music.selectTrack(i); closeAll(); }}
                  style={{ display: "flex", alignItems: "center", gap: 6, background: music.trackIndex === i ? dropdownInk + "15" : "none", border: "none", cursor: "pointer", padding: "4px 8px", color: dropdownInk, fontSize: 11, fontWeight: music.trackIndex === i ? 800 : 400, textAlign: "left", whiteSpace: "nowrap" }}>
                  {music.trackIndex === i ? "▶ " : ""}{name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Dark / Light */}
      <button onClick={() => { setDark((d) => !d); play("C5", "32n"); }} title={dark ? t.light : t.dark} style={BOX(ink, false, bare)}>
        {dark ? <Sun size={18} /> : <Moon size={18} />}
      </button>

      {/* Language */}
      <button
        onClick={() => { setLang((l) => (l === "en" ? "ko" : "en")); play("B4", "32n"); }}
        title={t.lang}
        style={{ ...BOX(ink, false, bare), width: "auto", paddingLeft: 10, paddingRight: 10, gap: 5, fontSize: 12, fontWeight: 700 }}
      >
        <Globe size={18} /> {lang.toUpperCase()}
      </button>

      {/* Theme swatch */}
      <div style={{ position: "relative" }}>
        <button
          onClick={() => { setThemeOpen((o) => !o); setMusicOpen(false); play("F5", "32n"); }}
          title={t.theme}
          style={BOX(ink, false, bare)}
        >
          <span style={{ width: 22, height: 22, display: "flex", overflow: "hidden", boxShadow: "inset 0 0 0 1.5px rgba(255,255,255,0.55)" }}>
            {theme === "mondrian" ? (
              <>
                <span style={{ flex: 1, background: "#C7382E" }} />
                <span style={{ flex: 1, background: "#2B3DCB" }} />
                <span style={{ flex: 1, background: "#E3B22E" }} />
              </>
            ) : (
              <span style={{ flex: 1, background: pal.accent }} />
            )}
          </span>
        </button>
        {themeOpen && (
          <div style={{ position: "absolute", ...dropPos, right: 0, background: pal.bg, border: `1px solid ${dropdownInk}40`, padding: 8, display: "flex", flexDirection: "column", gap: 4, zIndex: 50, minWidth: 130 }}>
            {Object.entries(THEMES).map(([key, val]) => (
              <button key={key} onClick={() => { setTheme(key); closeAll(); play("E5", "32n"); }}
                style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", cursor: "pointer", padding: "4px 6px", color: dropdownInk, fontSize: 11, fontWeight: theme === key ? 800 : 400 }}>
                <span style={{ width: 12, height: 12, display: "inline-flex", overflow: "hidden", border: "1px solid #0003" }}>
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
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Logo — rightmost, only on non-home screens */}
      {onHome && (
        <button onClick={onHome} title="Home" style={{ ...BOX(ink, false, bare), padding: 6 }}>
          <img src="/logo.png" alt="GridA" style={{ width: 26, height: 26, objectFit: "contain" }} />
        </button>
      )}
    </div>
  );
}
