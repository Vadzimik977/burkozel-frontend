import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import router from "./router.jsx";
import "./scss/style.scss";
import "./css/libs.min.css";
// import "./i18n.js";


createRoot(document.getElementById("root")).render(
  <RouterProvider router={router} />
);

(async () => {
  if (viewport?.requestFullscreen?.isAvailable()) {
    try {
      await viewport.requestFullscreen();
    } catch (e) {
      console.warn("Fullscreen request failed:", e);
    }
  }
})();


    const tg = window.Telegram.WebApp;
    if (tg.requestFullscreen.isAvailable()) {
      tg.requestFullscreen();
    }
