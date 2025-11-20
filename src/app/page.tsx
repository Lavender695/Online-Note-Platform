import Sidebar from "../components/layout/home/Sidebar";
import EdittingBlock from "../components/layout/home/EdittingBlock";

export default function Home() {
  return (
    <main className="flex">
      <Sidebar />
      <EdittingBlock />
    </main>
  );
}
