import Header from "@/components/layout/Header";
import Main from "@/components/layout/Main";

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Header is rendered outside of SidebarProvider */}
      <Header className="relative z-50" />
      {/* Main contains Sidebar and EdittingBlock */}
      <Main />
    </div>
  );
}
