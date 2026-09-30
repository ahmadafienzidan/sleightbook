import { Outlet } from "react-router";

import { Sidebar } from "../../components/Sidebar/Sidebar";
import { TopBar } from "../../components/TopBar/TopBar";

export const AppLayout = () => (
  <div className="min-h-screen md:grid md:grid-cols-[235px_minmax(0,1fr)]">
    <Sidebar />
    <div className="min-w-0">
      <TopBar />
      <main className="mx-auto w-full max-w-[1450px] px-4 pb-14 md:px-10">
        <Outlet />
      </main>
    </div>
  </div>
);
