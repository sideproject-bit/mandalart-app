import React, { useState, useEffect, useCallback } from "react";
import { ChevronDown, Lock, Users, Maximize2, Minimize2, Sparkles, Eye, Save } from "lucide-react";
import FullGridView from "./FullGridView";
import CompactBlockView from "./CompactBlockView";
import DescriptionEditor from "./DescriptionEditor";
import { useMandalart } from "../hooks/useMandalart";
import { useSound, useCompactDetect } from "../useSound";
import { isHeaderCell, isOuterCenterCell, headerToBlock, blockToHeader } from "../gridUtils";

export default function MandalartGrid({ mandalartId, pal, t, soundOn, readOnly = false, ownerLabel }) {
  const { title, isPublic, grid, descriptions, completed, updateTitle, updateVisibility, updateCell, updateDescription, toggleCompleted, saveState, saveNow } = useMandalart(mandalartId);
  const [descTarget, setDescTarget] = useState(null);
  const [showSaved, setShowSaved] = useState(false);
  const [highlightBlock, setHighlightBlock] = useState(null);
  const [savedAt, setSavedAt] = useState(Date.now());
  const [tick, setTick] = useState(0);
  const [focusBlock, setFocusBlock] = useState([1, 1]);
  const [catOpen, setCatOpen] = useState(false);
  const autoCompact = useCompactDetect();
  const [compactOverride, setCompactOverride] = useState(null);
  const compact = compactOverride === null ? autoCompact : compactOverride;
  const play = useSound(soundOn);

  useEffect(() => {
    const i = setInterval(() => setTick((x) => x + 1), 1000);
    return () => clearInterval(i);
  }, []);

  useEffect(() => {
    if (saveState === "saved") setSavedAt(Date.now());
  }, [saveState]);

  useEffect(() => {
    if (readOnly) return;
    const handler = (e) => {
      if (saveState !== "saved") {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [saveState, readOnly]);

  // Keeps the "convergence" mechanic alive: editing a header cell also
  // writes the matching outer block's center, and vice versa.
  const handleCellChange = useCallback((r, c, val) => {
    if (readOnly) return;
    updateCell(r, c, val);
    if (isHeaderCell(r, c)) {
      const [br, bc] = headerToBlock(r, c);
      updateCell(br, bc, val);
    } else if (isOuterCenterCell(r, c)) {
      const [hr, hc] = blockToHeader(r, c);
      updateCell(hr, hc, val);
    }
  }, [readOnly, updateCell]);

  const openDescription = useCallback((r, c) => setDescTarget([r, c]), []);

  const saveDescription = useCallback((text) => {
    if (readOnly || !descTarget) return;
    updateDescription(descTarget[0], descTarget[1], text);
  }, [readOnly, descTarget, updateDescription]);

  const linkJump = useCallback((r, c) => {
    const br = isHeaderCell(r, c) ? r - 3 : Math.floor(r / 3);
    const bc = isHeaderCell(r, c) ? c - 3 : Math.floor(c / 3);
    setHighlightBlock(`${br}-${bc}`);
    play("E5", "16n");
    if (compact) setFocusBlock([br, bc]);
    setTimeout(() => setHighlightBlock(null), 900);
  }, [play, compact]);

  const insertCategory = useCallback((label) => {
    if (readOnly || !grid) return;
    for (let br = 0; br < 3; br++) {
      for (let bc = 0; bc < 3; bc++) {
        if (br === 1 && bc === 1) continue;
        const hr = 3 + br, hc = 3 + bc;
        if (!grid[hr][hc]) {
          handleCellChange(hr, hc, label);
          play("G5", "32n");
          setCatOpen(false);
          return;
        }
      }
    }
  }, [readOnly, grid, handleCellChange, play]);

  const toggleVisibility = useCallback(() => {
    if (readOnly) return;
    updateVisibility(!isPublic);
    play("D5", "32n");
  }, [readOnly, isPublic, updateVisibility, play]);

  if (!grid) {
    return <p style={{ fontSize: 12, opacity: 0.6, color: pal.ink }}>{t.loading}</p>;
  }

  const secsAgo = Math.max(0, Math.floor((Date.now() - savedAt) / 1000));
  const statusLabel =
    saveState === "unsaved" ? t.grid.unsaved
    : saveState === "saving" ? t.grid.saving
    : secsAgo < 2 ? t.grid.savedJustNow
    : t.grid.savedAgo(secsAgo);

  const categoryGrid = (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {t.catList.map((cat) => (
        <button
          key={cat.k}
          onClick={() => insertCategory(cat.k)}
          style={{ textAlign: "left", background: pal.accent2 + "15", border: `1px solid ${pal.accent2}40`, color: pal.ink, padding: "8px 10px", cursor: "pointer", fontSize: 12 }}
        >
          <div style={{ fontWeight: 700 }}>{cat.k}</div>
          <div style={{ opacity: 0.6, fontSize: 10.5 }}>{cat.d}</div>
        </button>
      ))}
    </div>
  );

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
        {readOnly ? (
          <h2 style={{ fontWeight: 900, fontSize: 24, letterSpacing: "-0.01em", textTransform: "uppercase", margin: 0, color: pal.ink }}>
            {title}
          </h2>
        ) : (
          <input
            value={title}
            onChange={(e) => updateTitle(e.target.value)}
            style={{ background: "transparent", border: "none", outline: "none", color: pal.ink, fontWeight: 900, fontSize: 24, letterSpacing: "-0.01em", textTransform: "uppercase", flex: "1 1 220px", minWidth: 0 }}
          />
        )}
        <button
          onClick={() => { setCompactOverride(!compact); play("D5", "32n"); }}
          style={{ background: "none", border: `1px solid ${pal.ink}40`, color: pal.ink, cursor: "pointer", padding: "6px 10px", display: "flex", alignItems: "center", gap: 6, fontSize: 11, whiteSpace: "nowrap" }}
        >
          {compact ? <Maximize2 size={13} /> : <Minimize2 size={13} />}
          {compact ? t.fullView : t.compactView}
        </button>
      </div>

      {readOnly ? (
        <div style={{ display: "flex", alignItems: "center", gap: 6, margin: "8px 0 16px", fontSize: 11, opacity: 0.6, color: pal.ink }}>
          <Eye size={12} /> {ownerLabel} · {t.friends.viewerBadge}
        </div>
      ) : (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 6, margin: "8px 0 10px" }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: saveState === "saved" ? "#3CA45C" : pal.accent }} />
            <span style={{ fontSize: 11, color: pal.ink, opacity: 0.6 }}>{statusLabel}</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
            <div style={{ display: "flex", border: `1px solid ${pal.ink}40` }}>
              <button
                onClick={() => isPublic && toggleVisibility()}
                style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", fontSize: 11, fontWeight: 700, background: !isPublic ? pal.accent2 : "transparent", color: !isPublic ? "#fff" : pal.ink, border: "none", cursor: "pointer" }}
              >
                <Lock size={12} /> {t.grid.visPrivate}
              </button>
              <button
                onClick={() => !isPublic && toggleVisibility()}
                style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", fontSize: 11, fontWeight: 700, background: isPublic ? pal.accent : "transparent", color: isPublic ? "#fff" : pal.ink, border: "none", cursor: "pointer" }}
              >
                <Users size={12} /> {t.grid.visPublic}
              </button>
            </div>
            <button
              onClick={async () => {
                await saveNow();
                setShowSaved(true);
                setTimeout(() => setShowSaved(false), 2000);
                play("E5", "32n");
              }}
              style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 12px", fontSize: 11, fontWeight: 700, background: showSaved ? "#3CA45C" : pal.accent3, color: "#1a1a1a", border: "none", cursor: "pointer" }}
            >
              <Save size={12} /> {showSaved ? t.grid.savedJustNow : t.grid.save}
            </button>
            <span style={{ fontSize: 11, opacity: 0.55, color: pal.ink }}>
              {isPublic ? t.grid.visHintPublic : t.grid.visHintPrivate}
            </span>
          </div>
        </>
      )}

      <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
        <div style={{ flex: compact ? "1 1 100%" : "1 1 560px", minWidth: 0 }}>
          {console.log("[grid] readOnly:", readOnly, "toggleCompleted type:", typeof toggleCompleted) || compact ? (
            <CompactBlockView
              grid={grid}
              descriptions={descriptions}
              completed={completed}
              focusBlock={focusBlock}
              setFocusBlock={setFocusBlock}
              pal={pal}
              t={t}
              onChange={handleCellChange}
              onLink={linkJump}
              onOpenDesc={openDescription}
              onToggleCompleted={readOnly ? null : toggleCompleted}
              highlightBlock={highlightBlock}
              play={play}
              readOnly={readOnly}
            />
          ) : (
            <FullGridView
              grid={grid}
              descriptions={descriptions}
              completed={completed}
              onChange={handleCellChange}
              onLink={linkJump}
              onOpenDesc={openDescription}
              onToggleCompleted={readOnly ? null : toggleCompleted}
              pal={pal}
              t={t}
              highlightBlock={highlightBlock}
              readOnly={readOnly}
            />
          )}
        </div>

        {!compact && !readOnly && (
          <aside style={{ flex: "0 0 240px" }}>
            <div style={{ border: `1px solid ${pal.ink}33`, padding: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                <Sparkles size={14} color={pal.accent2} />
                <span style={{ fontWeight: 800, fontSize: 12, textTransform: "uppercase", color: pal.ink }}>{t.categories}</span>
              </div>
              <p style={{ fontSize: 11, opacity: 0.6, margin: "0 0 10px", color: pal.ink }}>{t.categoriesHint}</p>
              <div style={{ maxHeight: 320, overflowY: "auto" }}>{categoryGrid}</div>
            </div>
          </aside>
        )}
      </div>

      {compact && !readOnly && (
        <div style={{ marginTop: 16 }}>
          <button
            onClick={() => setCatOpen((o) => !o)}
            style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", background: pal.accent2 + "14", border: `1px solid ${pal.accent2}55`, color: pal.ink, padding: "10px 14px", cursor: "pointer", fontSize: 12, fontWeight: 700 }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Sparkles size={14} color={pal.accent2} /> {t.categories}
            </span>
            <ChevronDown size={14} style={{ transform: catOpen ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
          </button>
          {catOpen && (
            <div style={{ border: `1px solid ${pal.ink}33`, borderTop: "none", padding: 14, maxHeight: 300, overflowY: "auto" }}>
              <p style={{ fontSize: 11, opacity: 0.6, margin: "0 0 10px", color: pal.ink }}>{t.categoriesHint}</p>
              {categoryGrid}
            </div>
          )}
        </div>
      )}

      {descTarget && (
        <DescriptionEditor
          value={descriptions[descTarget[0]][descTarget[1]]}
          onSave={saveDescription}
          onClose={() => setDescTarget(null)}
          pal={pal}
          t={t}
          play={play}
          readOnly={readOnly}
        />
      )}
    </div>
  );
}
