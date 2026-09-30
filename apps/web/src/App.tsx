import { RouterProvider } from "react-router";
import { Toaster } from "sonner";

import { router } from "./routes/router";

export const App = () => (
  <>
    <RouterProvider router={router} />
    <Toaster theme="dark" position="bottom-right" richColors />
  </>
);
