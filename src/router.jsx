import { createBrowserRouter } from "react-router-dom";
import Layout from "./components/Layout";
import Main from "./pages/Main";
import Friends from "./pages/Friend";
import Settings from "./pages/Settings";
import Balance from "./pages/Balance";

const router = createBrowserRouter([
  {
    element: <Layout />, // общий layout с header/footer
    children: [
      { path: "/frontend/", element: <Main /> },
      { path: "/frontend/friends", element: <Friends /> },
      { path: "/frontend/settings", element: <Settings /> },
      { path: "/frontend/balance", element: <Balance /> },
    ],
  },
]);

export default router;
