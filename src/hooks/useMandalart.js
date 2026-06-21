import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "../lib/supabaseClient";

function emptyGrid() {
  return Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => ""));
}

// The single source of truth for one mandalart: loads its title,
// visibility, and 81 cells from Supabase, and exposes update*()
// functions that update local state instantly and flush debounced
// writes back to the database. Works for both the owner (editable)
// and a viewer (call update* less — the UI layer decides what's
// reachable, RLS decides what's actually allowed to write).
function emptyBool() {
  return Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => false));
}

export function useMandalart(mandalartId) {
  const [title, setTitle] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [grid, setGrid] = useState(null);
  const [descriptions, setDescriptions] = useState(null);
  const [completed, setCompleted] = useState(null);
  const [saveState, setSaveState] = useState("saved"); // "saved" | "unsaved" | "saving"

  // Refs mirror the latest grid/description state so a debounced flush
  // always sends a cell's full current content + description, even if
  // only one of the two fields actually changed.
  const gridRef = useRef(null);
  const descRef = useRef(null);
  const compRef = useRef(null);
  const pendingCellKeys = useRef(new Set());
  const cellFlushTimer = useRef(null);
  const titleFlushTimer = useRef(null);
  const pendingTitleRef = useRef(null);

  useEffect(() => { gridRef.current = grid; }, [grid]);
  useEffect(() => { descRef.current = descriptions; }, [descriptions]);
  useEffect(() => { compRef.current = completed; }, [completed]);

  useEffect(() => {
    if (!mandalartId) return;
    let cancelled = false;
    (async () => {
      const [{ data: meta, error: metaErr }, { data: cells, error: cellsErr }] = await Promise.all([
        supabase.from("mandalarts").select("title, is_public").eq("id", mandalartId).single(),
        supabase.from("mandalart_cells").select("row, col, content, description, completed").eq("mandalart_id", mandalartId),
      ]);
      if (cancelled) return;
      if (metaErr) console.error(metaErr);
      if (cellsErr) console.error(cellsErr);
      if (meta) {
        setTitle(meta.title);
        setIsPublic(meta.is_public);
      }
      const g = emptyGrid();
      const d = emptyGrid();
      const comp = emptyBool();
      (cells || []).forEach((cell) => {
        g[cell.row][cell.col] = cell.content;
        d[cell.row][cell.col] = cell.description ?? "";
        comp[cell.row][cell.col] = cell.completed ?? false;
      });
      const completedCells = (cells || []).filter(c => c.completed);
      console.log("[load] cellsErr:", cellsErr, "| cells:", cells?.length, "| completed cells:", completedCells.map(c => `(${c.row},${c.col})=${c.completed}`));
      setGrid(g);
      setDescriptions(d);
      setCompleted(comp);
    })();
    return () => { cancelled = true; };
  }, [mandalartId]);

  const flushCells = useCallback(async () => {
    if (pendingCellKeys.current.size === 0) return;
    setSaveState("saving");
    const rows = Array.from(pendingCellKeys.current).map((key) => {
      const [row, col] = key.split("-").map(Number);
      return {
        mandalart_id: mandalartId,
        row,
        col,
        content: gridRef.current[row][col],
        description: descRef.current[row][col],
        completed: compRef.current?.[row][col] ?? false,
      };
    });
    pendingCellKeys.current.clear();
    const { error } = await supabase
      .from("mandalart_cells")
      .upsert(rows, { onConflict: "mandalart_id,row,col" });
    setSaveState(error ? "unsaved" : "saved");
    if (error) console.error(error);
  }, [mandalartId]);

  const queueCell = useCallback((r, c) => {
    pendingCellKeys.current.add(`${r}-${c}`);
    setSaveState("unsaved");
    clearTimeout(cellFlushTimer.current);
    cellFlushTimer.current = setTimeout(flushCells, 800);
  }, [flushCells]);

  const updateCell = useCallback((r, c, content) => {
    setGrid((g) => {
      const next = g.map((row) => row.slice());
      next[r][c] = content;
      return next;
    });
    queueCell(r, c);
    // Keep title in sync with the main goal cell
    if (r === 4 && c === 4) {
      const next = content.trim();
      setTitle(next);
      pendingTitleRef.current = next;
      setSaveState("unsaved");
      clearTimeout(titleFlushTimer.current);
      titleFlushTimer.current = setTimeout(async () => {
        pendingTitleRef.current = null;
        const { error } = await supabase.from("mandalarts").update({ title: next }).eq("id", mandalartId);
        if (error) console.error(error);
      }, 800);
    }
  }, [queueCell, mandalartId]);

  const updateDescription = useCallback((r, c, description) => {
    setDescriptions((d) => {
      const next = d.map((row) => row.slice());
      next[r][c] = description;
      return next;
    });
    queueCell(r, c);
  }, [queueCell]);

  const toggleCompleted = useCallback((r, c) => {
    // Read current value from ref (always in sync) and compute new value BEFORE setState
    const newVal = !(compRef.current?.[r]?.[c] ?? false);
    console.log("[toggleCompleted] r:", r, "c:", c, "newVal:", newVal);

    // Update local state
    setCompleted((prev) => {
      const next = (prev || emptyBool()).map((row) => row.slice());
      next[r][c] = newVal;
      compRef.current = next;
      return next;
    });

    // Save directly to DB
    supabase
      .from("mandalart_cells")
      .upsert({
        mandalart_id: mandalartId,
        row: r,
        col: c,
        content: gridRef.current?.[r][c] ?? "",
        description: descRef.current?.[r][c] ?? "",
        completed: newVal,
      }, { onConflict: "mandalart_id,row,col" })
      .then(({ error }) => {
        console.log("[toggleCompleted] DB saved completed:", newVal, "error:", error);
      });
  }, [mandalartId]);

  const updateTitle = useCallback((text) => {
    setTitle(text);
    pendingTitleRef.current = text;
    setSaveState("unsaved");
    clearTimeout(titleFlushTimer.current);
    titleFlushTimer.current = setTimeout(async () => {
      pendingTitleRef.current = null;
      setSaveState("saving");
      const { error } = await supabase.from("mandalarts").update({ title: text }).eq("id", mandalartId);
      setSaveState(error ? "unsaved" : "saved");
      if (error) console.error(error);
    }, 800);
  }, [mandalartId]);

  const updateVisibility = useCallback(async (nextIsPublic) => {
    setIsPublic(nextIsPublic);
    setSaveState("saving");
    const { error } = await supabase.from("mandalarts").update({ is_public: nextIsPublic }).eq("id", mandalartId);
    setSaveState(error ? "unsaved" : "saved");
    if (error) console.error(error);
  }, [mandalartId]);

  const saveNow = useCallback(async () => {
    clearTimeout(cellFlushTimer.current);
    clearTimeout(titleFlushTimer.current);
    setSaveState("saving");
    const flushTitle = pendingTitleRef.current !== null
      ? supabase.from("mandalarts").update({ title: pendingTitleRef.current }).eq("id", mandalartId).then(({ error }) => { if (error) console.error(error); })
      : Promise.resolve();
    pendingTitleRef.current = null;
    await Promise.all([flushCells(), flushTitle]);
    setSaveState("saved");
  }, [flushCells, mandalartId]);

  // Flush immediately on unmount so nothing is lost on navigation.
  useEffect(() => () => { flushCells(); }, [flushCells]);

  return { title, isPublic, grid, descriptions, completed, updateTitle, updateVisibility, updateCell, updateDescription, toggleCompleted, saveState, saveNow };
}

// Subscribe to live changes on a mandalart's cells — the seed for
// Phase 3 real-time collaboration. Not called anywhere yet; wire it
// in once collaborator editing UI exists.
export function useMandalartRealtime(mandalartId, onCellChange) {
  useEffect(() => {
    if (!mandalartId) return;
    const channel = supabase
      .channel(`mandalart:${mandalartId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "mandalart_cells", filter: `mandalart_id=eq.${mandalartId}` },
        (payload) => onCellChange?.(payload.new)
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [mandalartId, onCellChange]);
}
