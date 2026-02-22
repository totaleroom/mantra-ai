import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Anti-iframe framebusting — block framing attacks (skip in Lovable preview)
if (window.top !== window.self) {
  const hostname = window.location.hostname;
  const isLovable = hostname.includes('lovableproject.com') || hostname.includes('lovable.app');
  if (!isLovable) {
    document.body.innerHTML = '<h1 style="text-align:center;margin-top:40vh;font-family:sans-serif">Access Denied</h1>';
  } else {
    createRoot(document.getElementById("root")!).render(<App />);
  }
} else {
  createRoot(document.getElementById("root")!).render(<App />);
}
