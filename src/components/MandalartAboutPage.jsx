import React from "react";
import { Target, GitBranch, PenLine, Lightbulb, BookOpen } from "lucide-react";
import OhtaniMandalart from "./OhtaniMandalart";
import { useViewport } from "../hooks/useViewport";

const ICONS = [Target, GitBranch, PenLine, BookOpen];

export default function MandalartAboutPage({ pal, t }) {
  const about = t.mandalartAbout;
  const { isMobile } = useViewport();
  return (
    <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 340px", gap: isMobile ? 24 : 32, alignItems: "start", maxWidth: 960, margin: "0 auto" }}>
      {/* Left: main text */}
      <div>
        <h2 style={{ fontWeight: 900, fontSize: 28, textTransform: "uppercase", margin: "0 0 20px", color: pal.ink, letterSpacing: "-0.01em" }}>
          {about.title}
        </h2>
        <div style={{ borderTop: `3px solid ${pal.ink}`, marginBottom: 28 }} />
        {about.body.map((para, i) => {
          const Icon = ICONS[i];
          return (
            <div key={i} style={{ display: "flex", gap: 14, marginBottom: 24 }}>
              <div style={{ flexShrink: 0, width: 32, height: 32, background: pal.accent2 + "22", border: `1px solid ${pal.accent2}44`, display: "flex", alignItems: "center", justifyContent: "center", marginTop: 2 }}>
                <Icon size={15} color={pal.accent2} />
              </div>
              <p style={{ fontSize: 14, lineHeight: 1.75, color: pal.ink, margin: 0, opacity: 0.88 }}>
                {para}
              </p>
            </div>
          );
        })}
      </div>

      {/* Right: quick-start tips */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ border: `2px solid ${pal.ink}22`, padding: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <Lightbulb size={16} color={pal.accent3} />
            <span style={{ fontWeight: 800, fontSize: 12, textTransform: "uppercase", color: pal.ink }}>{about.tipsTitle}</span>
          </div>
          <ol style={{ margin: 0, padding: "0 0 0 18px", display: "flex", flexDirection: "column", gap: 10 }}>
            {about.tips.map((tip, i) => (
              <li key={i} style={{ fontSize: 12.5, lineHeight: 1.6, color: pal.ink, opacity: 0.8 }}>{tip}</li>
            ))}
          </ol>
        </div>

        <div style={{ background: pal.accent + "12", border: `1px solid ${pal.accent}30`, padding: 16 }}>
          <div style={{ fontWeight: 800, fontSize: 11, textTransform: "uppercase", color: pal.accent, marginBottom: 8 }}>{about.ohtaniLabel}</div>
          <p style={{ fontSize: 12, lineHeight: 1.65, color: pal.ink, margin: 0, opacity: 0.75 }}>{about.ohtani}</p>
        </div>
      </div>
      <div style={{ gridColumn: "1 / -1" }}>
        <OhtaniMandalart pal={pal} t={t} />
      </div>
    </div>
  );
}
