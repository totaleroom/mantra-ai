import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import ErrorBoundary from "./components/ErrorBoundary.tsx";
import "./index.css";

function isAllowedFrame(): boolean {
  const hostname = window.location.hostname;
  // Allow: localhost, Lovable preview/app domains, dev environments
  if (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname.includes("lovableproject.com") ||
    hostname.includes("lovable.app") ||
    import.meta.env.DEV
  ) {
    return true;
  }
  return false;
}

function renderApp() {
  const root = document.getElementById("root");
  if (!root) {
    console.error("[MANTRA] #root element not found");
    return;
  }

  // Anti-iframe: block framing on production hosts only
  if (window.top !== window.self && !isAllowedFrame()) {
    root.innerHTML =
      '<h1 style="text-align:center;margin-top:40vh;font-family:sans-serif">Access Denied</h1>';
    return;
  }

  try {
    createRoot(root).render(
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    );
    (window as any).__APP_BOOTED__ = true;
  } catch (err) {
    console.error("[MANTRA] Bootstrap render failed:", err);
    root.innerHTML =
      '<div style="text-align:center;margin-top:40vh;font-family:sans-serif">' +
      "<h1>Gagal Memuat Aplikasi</h1>" +
      '<p style="color:#666">Silakan muat ulang halaman.</p></div>';
  }
}

renderApp();
