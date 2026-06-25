import React, { useState, useEffect } from "react";
import { X, Download, Share } from "lucide-react";

// Returns true if already running as installed PWA
function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches
    || window.navigator.standalone === true;
}

function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export default function InstallBanner({ t, pal, dark }) {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [show, setShow] = useState(false);
  const [showIOS, setShowIOS] = useState(false);
  const txt = t.install;

  useEffect(() => {
    if (isStandalone()) return; // already installed

    if (isIOS()) {
      setShowIOS(true);
      return;
    }

    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShow(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setShow(false);
    setDeferredPrompt(null);
  };

  const bannerStyle = {
    position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 80,
    background: dark ? "#111" : "#1B1A17",
    color: "#fff",
    padding: "14px 16px 18px",
    display: "flex", alignItems: "center", gap: 12,
    boxShadow: "0 -4px 20px rgba(0,0,0,0.4)",
    borderTop: "2px solid #2B3DCB",
  };

  if (show) return (
    <div style={bannerStyle}>
      <img src="/pwa-192.png" alt="GridA" style={{ width: 40, height: 40, borderRadius: 8, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 800, fontSize: 13, letterSpacing: "0.02em" }}>{txt.title}</div>
        <div style={{ fontSize: 11, opacity: 0.6, marginTop: 2 }}>{txt.body}</div>
      </div>
      <button onClick={handleInstall} style={{
        flexShrink: 0, background: "#2B3DCB", color: "#fff", border: "none",
        padding: "8px 14px", fontWeight: 800, fontSize: 12, cursor: "pointer",
        display: "flex", alignItems: "center", gap: 6, textTransform: "uppercase",
        letterSpacing: "0.04em",
      }}>
        <Download size={13} /> {txt.install}
      </button>
      <button onClick={() => setShow(false)} style={{
        flexShrink: 0, background: "none", border: "none",
        color: "#fff", opacity: 0.4, cursor: "pointer", padding: 4,
      }}>
        <X size={16} />
      </button>
    </div>
  );

  if (showIOS) return (
    <div style={bannerStyle}>
      <img src="/pwa-192.png" alt="GridA" style={{ width: 40, height: 40, borderRadius: 8, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 800, fontSize: 13 }}>{txt.title}</div>
        <div style={{ fontSize: 11, opacity: 0.65, marginTop: 3, lineHeight: 1.5 }}>
          {txt.iosHint} <Share size={11} style={{ display: "inline", verticalAlign: "middle", opacity: 0.9 }} /> {txt.iosHint2}
        </div>
      </div>
      <button onClick={() => setShowIOS(false)} style={{
        flexShrink: 0, background: "none", border: "none",
        color: "#fff", opacity: 0.4, cursor: "pointer", padding: 4,
      }}>
        <X size={16} />
      </button>
    </div>
  );

  return null;
}
