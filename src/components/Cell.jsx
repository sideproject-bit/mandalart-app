import React, { useState, useEffect, useRef } from "react";
import { Link2, StickyNote, CheckCircle2, Check } from "lucide-react";

export default function Cell({
  r, c, value, isMain, isHeader, isOuterCenter, onChange, onLink,
  description, onOpenDesc, completed = false, onToggleCompleted,
  pal, t, highlighted, size = "normal", readOnly = false,
  showIcons = false, subGoalDone = false,
}) {
  const [editing, setEditing] = useState(false);
  const [localCompleted, setLocalCompleted] = useState(completed);
  const taRef = useRef(null);
  const originalRef = useRef(value);
  const placeholder = isMain ? t.grid.mainGoal : isHeader || isOuterCenter ? t.grid.subGoal : t.grid.detail;
  const isDetail = !isMain && !isHeader && !isOuterCenter;
  const showNote = isDetail && (description || !readOnly);
  const big = size === "large";

  useEffect(() => { setLocalCompleted(completed); }, [completed]);

  useEffect(() => {
    if (editing && taRef.current) {
      taRef.current.style.height = "auto";
      taRef.current.style.height = taRef.current.scrollHeight + "px";
    }
  }, [editing, value]);

  const startEditing = () => {
    if (readOnly) return;
    originalRef.current = value;
    setEditing(true);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Escape") {
      onChange(r, c, originalRef.current);
      setEditing(false);
      e.currentTarget.blur();
    } else if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      setEditing(false);
      e.currentTarget.blur();
    }
  };

  const isMondrian = pal.accent !== pal.accent3;

  const bg = isMain
    ? pal.accent
    : isHeader || isOuterCenter
    ? subGoalDone ? pal.accent + "28" : pal.accent2 + "44"
    : localCompleted
    ? (isMondrian ? pal.accent3 + "66" : pal.accent3 + "42")
    : (isMondrian ? pal.ink + "0e" : pal.accent3 + "0c");

  const border = isMain
    ? `2px solid ${pal.accent}`
    : isHeader || isOuterCenter
    ? subGoalDone ? `2px solid ${pal.accent}` : `1px solid ${pal.accent2}66`
    : localCompleted
    ? (isMondrian ? `1px solid ${pal.accent3}99` : `1px solid ${pal.accent3}60`)
    : (isMondrian ? "1px solid rgba(180,180,180,0.3)" : `1px solid ${pal.accent3}30`);

  return (
    <div
      className={highlighted ? "cell-pulse" : ""}
      style={{
        position: "relative",
        background: bg,
        border,
        color: isMain ? "#fff" : pal.ink,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: big ? 8 : 4,
        minHeight: big ? 110 : "100%",
        height: big ? undefined : "100%",
        boxSizing: "border-box",
        cursor: readOnly ? "default" : "text",
        transition: "background 0.2s ease, border-color 0.2s ease",
      }}
      onClick={startEditing}
    >
      {editing ? (
        <textarea
          ref={taRef}
          autoFocus
          value={value}
          onChange={(e) => onChange(r, c, e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => setEditing(false)}
          rows={1}
          style={{
            width: "100%",
            background: "transparent",
            color: "inherit",
            border: "none",
            outline: "none",
            resize: "none",
            textAlign: "center",
            font: "inherit",
            fontWeight: isMain ? 800 : 500,
            fontSize: big ? (isMain ? 15 : 13) : (isMain ? 12 : 11),
            overflow: "hidden",
          }}
        />
      ) : (
        <>
          <span
            style={{
              fontSize: big ? (isMain ? 15 : 13) : (isMain ? 12 : 11),
              fontWeight: isMain ? 800 : 500,
              textTransform: isMain ? "uppercase" : "none",
              opacity: value ? (localCompleted ? 0.45 : 1) : 0.4,
              textAlign: "center",
              wordBreak: "break-word",
              overflow: "hidden",
              display: "-webkit-box",
              WebkitLineClamp: big ? (description ? 3 : 5) : 3,
              WebkitBoxOrient: "vertical",
              transition: "opacity 0.2s ease",
              position: "relative",
              zIndex: 1,
            }}
          >
            {value || placeholder}
          </span>

          {big && description && (
            <p
              style={{
                fontSize: 10,
                color: pal.ink,
                opacity: localCompleted ? 0.3 : 0.45,
                margin: "5px 0 0",
                textAlign: "center",
                wordBreak: "break-word",
                overflow: "hidden",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                fontStyle: "italic",
                lineHeight: 1.35,
                width: "100%",
                whiteSpace: "pre-wrap",
                position: "relative",
                zIndex: 1,
              }}
            >
              {description}
            </p>
          )}

          {/* Watermark checkmark for completed detail cells */}
          {isDetail && localCompleted && (
            <div style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              pointerEvents: "none",
              overflow: "hidden",
              zIndex: 0,
            }}>
              <Check
                size={big ? 72 : 40}
                color={isMondrian ? pal.accent3 : pal.accent}
                style={{ opacity: 0.55 }}
                strokeWidth={4.0}
              />
            </div>
          )}
        </>
      )}

      {(isHeader || isOuterCenter) && (
        <button
          aria-label="link"
          onClick={(e) => {
            e.stopPropagation();
            onLink(r, c);
          }}
          style={{
            position: "absolute", top: 2, right: 2, background: "none", border: "none",
            color: pal.ink, opacity: 0.45, cursor: "pointer", padding: big ? 4 : 2,
          }}
        >
          <Link2 size={big ? 13 : 11} />
        </button>
      )}

      {/* Sub-goal done badge */}
      {(isHeader || isOuterCenter) && subGoalDone && (
        <div style={{
          position: "absolute",
          bottom: big ? 6 : 3,
          left: big ? 6 : 3,
          width: big ? 18 : 11,
          height: big ? 18 : 11,
          borderRadius: "50%",
          background: pal.accent,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}>
          <CheckCircle2 size={big ? 11 : 7} color="#fff" strokeWidth={2.5} />
        </div>
      )}

      {/* Memo dot (always visible when description exists) */}
      {isDetail && description && (
        <span
          title={description}
          style={{
            position: "absolute", top: 4, right: 4, width: 5, height: 5,
            borderRadius: "50%", background: pal.accent,
            opacity: localCompleted ? 0.5 : 1,
          }}
        />
      )}

      {/* Note button — focus view only */}
      {isDetail && showNote && showIcons && (
        <button
          aria-label="note"
          onClick={(e) => {
            e.stopPropagation();
            onOpenDesc(r, c);
          }}
          style={{
            position: "absolute", bottom: 2,
            right: big ? 26 : 16,
            background: "none", border: "none",
            color: pal.ink, opacity: description ? 0.6 : 0.3, cursor: "pointer", padding: big ? 4 : 2,
          }}
        >
          <StickyNote size={big ? 16 : 10} />
        </button>
      )}

      {/* Check button — focus view only */}
      {isDetail && !readOnly && showIcons && (
        <button
          aria-label={localCompleted ? "uncheck" : "check"}
          onClick={(e) => {
            e.stopPropagation();
            setLocalCompleted((v) => !v);
            onToggleCompleted?.(r, c);
          }}
          style={{
            position: "absolute", bottom: 2, right: 2, background: "none", border: "none",
            color: localCompleted ? pal.accent : pal.ink,
            opacity: localCompleted ? 0.9 : 0.25,
            cursor: "pointer", padding: big ? 4 : 2,
            transition: "opacity 0.15s ease, color 0.15s ease",
          }}
        >
          <CheckCircle2 size={big ? 16 : 11} />
        </button>
      )}
    </div>
  );
}
