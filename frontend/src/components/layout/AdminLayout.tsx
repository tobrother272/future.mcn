import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { C } from "@/styles/theme";
import { ToastContainer } from "@/components/notifications/ToastContainer";

export function AdminLayout() {
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: C.bg }}>
      <Sidebar />
      <main style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column" }}>
        <Outlet />
      </main>
      <ToastContainer />
    </div>
  );
}
