import { createBrowserRouter } from "react-router";

import { ROUTE_TRICK } from "../constants/routes";
import { HomeRedirect } from "../contents/Home/HomeRedirect";
import { AppLayout } from "../contents/Layout/AppLayout";
import { NotFound } from "../contents/NotFound/NotFound";
import { TrickDetail } from "../contents/TrickDetail/TrickDetail";

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { index: true, element: <HomeRedirect /> },
      { path: ROUTE_TRICK, element: <TrickDetail /> },
      { path: "*", element: <NotFound /> },
    ],
  },
]);
