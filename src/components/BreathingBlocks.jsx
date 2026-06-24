import React, { useRef, useEffect } from "react";

const COUNT = 14;
const REPEL_RADIUS = 130;
const REPEL_STRENGTH = 0.5;
const MAX_SPEED = 2.2;

function makeBlocks(w, h, accent) {
  return Array.from({ length: COUNT }, () => ({
    x: Math.random() * w,
    y: Math.random() * h,
    bw: 40 + Math.random() * 110,
    bh: 30 + Math.random() * 85,
    vx: (Math.random() < 0.5 ? 1 : -1) * (0.12 + Math.random() * 0.22),
    vy: (Math.random() < 0.5 ? 1 : -1) * (0.12 + Math.random() * 0.22),
    baseVx: 0,
    baseVy: 0,
    alpha: 0.06 + Math.random() * 0.10,
    angle: (Math.random() - 0.5) * 0.5,
    breathePeriod: 3000 + Math.random() * 5000, // ms
    breathePhase: Math.random() * Math.PI * 2,
  }));
}

export default function BreathingBlocks({ accent }) {
  const canvasRef = useRef(null);
  const stateRef = useRef({ blocks: null, w: 0, h: 0, raf: null, mx: -9999, my: -9999 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const s = stateRef.current;

    s.blocks = null;

    const init = (w, h) => {
      canvas.width = w;
      canvas.height = h;
      s.w = w;
      s.h = h;
      s.blocks = makeBlocks(w, h, accent);
      s.blocks.forEach(b => { b.baseVx = b.vx; b.baseVy = b.vy; });
    };

    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      if (width && height) init(width, height);
    });
    ro.observe(canvas.parentElement);

    const { width, height } = canvas.getBoundingClientRect();
    if (width && height) init(width, height);

    const onMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      s.mx = e.clientX - rect.left;
      s.my = e.clientY - rect.top;
    };
    const onMouseLeave = () => { s.mx = -9999; s.my = -9999; };
    canvas.parentElement.addEventListener("mousemove", onMouseMove);
    canvas.parentElement.addEventListener("mouseleave", onMouseLeave);

    const draw = (now) => {
      const { w, h, blocks, mx, my } = stateRef.current;
      if (!blocks || !w || !h) { s.raf = requestAnimationFrame(draw); return; }

      ctx.clearRect(0, 0, w, h);

      for (const b of blocks) {
        // Mouse repel
        const dx = b.x - mx;
        const dy = b.y - my;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < REPEL_RADIUS && dist > 0) {
          const force = (1 - dist / REPEL_RADIUS) * REPEL_STRENGTH;
          b.vx += (dx / dist) * force;
          b.vy += (dy / dist) * force;
        } else {
          b.vx += (b.baseVx - b.vx) * 0.03;
          b.vy += (b.baseVy - b.vy) * 0.03;
        }

        const speed = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
        if (speed > MAX_SPEED) {
          b.vx = (b.vx / speed) * MAX_SPEED;
          b.vy = (b.vy / speed) * MAX_SPEED;
        }

        b.x += b.vx;
        b.y += b.vy;

        // Wrap around edges (no bouncing)
        const pad = Math.max(b.bw, b.bh);
        if (b.x < -pad) b.x = w + pad;
        if (b.x > w + pad) b.x = -pad;
        if (b.y < -pad) b.y = h + pad;
        if (b.y > h + pad) b.y = -pad;

        // Breathing scale
        const breathe = 1 + 0.28 * Math.sin((now / b.breathePeriod) * Math.PI * 2 + b.breathePhase);

        const hw = (b.bw * breathe) / 2;
        const hh = (b.bh * breathe) / 2;

        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(b.angle);
        ctx.globalAlpha = b.alpha;
        ctx.fillStyle = accent;
        ctx.fillRect(-hw, -hh, hw * 2, hh * 2);
        ctx.restore();
      }

      s.raf = requestAnimationFrame(draw);
    };

    s.raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(s.raf);
      ro.disconnect();
      canvas.parentElement?.removeEventListener("mousemove", onMouseMove);
      canvas.parentElement?.removeEventListener("mouseleave", onMouseLeave);
    };
  }, [accent]);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
    />
  );
}
