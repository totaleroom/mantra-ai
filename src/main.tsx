import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Anti-iframe framebusting — block framing attacks
if (window.top !== window.self) {
  document.body.innerHTML = '<h1 style="text-align:center;margin-top:40vh;font-family:sans-serif">Access Denied</h1>';
} else {
  createRoot(document.getElementById("root")!).render(<App />);
}
