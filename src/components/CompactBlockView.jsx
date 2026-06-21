import React from "react";
import Cell from "./Cell";
import { isHeaderCell, isOuterCenterCell, blockLabel } from "../gridUtils";

export default function CompactBlockView({
  grid, descriptions, completed, focusBlock, setFocusBlock, pal, t, onChange, onLink, onOpenDesc, onToggleCompleted, highlightBlock, play, readOnly = false,
}) {
  const [fbr, fbc] = focusBlock;
  return (
    <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
      {/* Left: minimap + label */}
      <div style={{ flexShrink: 0, width: 130 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 5, marginBottom: 12 }}>
          {Array.from({ length: 3 }).map((_, br) =>
            Array.from({ length: 3 }).map((_, bc) => {
              const filled = Array.from({ length: 3 })
                .flatMap((__, cr) => Array.from({ length: 3 }).map((___, cc) => grid[br * 3 + cr][bc * 3 + cc]))
                .filter(Boolean).length;
              const isFocused = br === fbr && bc === fbc;
              const isCenter = br === 1 && bc === 1;
              return (
                <button
                  key={`${br}-${bc}`}
                  onClick={() => { setFocusBlock([br, bc]); play("B4", "32n"); }}
                  style={{
                    aspectRatio: "1/1",
                    background: isFocused
                      ? pal.accent
                      : isCenter
                      ? pal.accent + "33"
                      : pal.accent + (filled ? "22" : "0a"),
                    border: isCenter
                      ? `2px solid ${pal.accent}`
                      : isFocused
                      ? `2px solid ${pal.accent}`
                      : `1px solid ${pal.ink}25`,
                    cursor: "pointer",
                    position: "relative",
                    borderRadius: 2,
                  }}
                  title={`${br}-${bc}`}
                >
                  {isCenter && (
                    <span style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 5, height: 5, borderRadius: "50%", background: isFocused ? "#fff" : pal.ink }} />
                  )}
                </button>
              );
            })
          )}
        </div>
        <div style={{ fontSize: 11, opacity: 0.6, color: pal.ink, textTransform: "uppercase", fontWeight: 700, lineHeight: 1.3, wordBreak: "break-word" }}>
          {fbr === 1 && fbc === 1 ? t.grid.mainGoal : blockLabel(grid, fbr, fbc, t)}
        </div>
      </div>

      {/* Right: 3×3 cell block — fills available width */}
      <div
        className={highlightBlock === `${fbr}-${fbc}` ? "cell-pulse" : ""}
        style={{ flex: 1, display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 2, background: pal.ink + "33", padding: 3, border: `2px solid ${pal.ink}55` }}
      >
        {Array.from({ length: 3 }).map((_, cr) =>
          Array.from({ length: 3 }).map((_, cc) => {
            const r = fbr * 3 + cr, c = fbc * 3 + cc;
            return (
              <div key={`${r}-${c}`} style={{ background: pal.bg }}>
                <Cell
                  r={r} c={c}
                  value={grid[r][c]}
                  isMain={r === 4 && c === 4}
                  isHeader={isHeaderCell(r, c)}
                  isOuterCenter={isOuterCenterCell(r, c)}
                  onChange={onChange}
                  onLink={onLink}
                  description={descriptions[r][c]}
                  onOpenDesc={onOpenDesc}
                  completed={completed?.[r][c] ?? false}
                  onToggleCompleted={onToggleCompleted}
                  pal={pal}
                  t={t}
                  highlighted={false}
                  size="large"
                  readOnly={readOnly}
                />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
