
  import { createRoot } from "react-dom/client";
  import App from "./app/App.tsx";
  import { AuthProvider } from "./app/context/AuthContext";
  import "./styles/index.css";
  import dashboardBg from "./assets/dashboard-bg-web.mp4";

  function preloadVideo(href: string) {
    const link = document.createElement("link");
    link.rel = "preload";
    link.as = "video";
    link.href = href;
    document.head.appendChild(link);
  }
  preloadVideo(dashboardBg);

  createRoot(document.getElementById("root")!).render(
    <AuthProvider>
      <App />
    </AuthProvider>
  );
