import { TopNav } from "./TopNav";
import { Sidebar } from "./Sidebar";
import { RiverFloatingButton } from "@/components/river/RiverFloatingButton";

interface AppShellProps {
  children: React.ReactNode;
  noPadding?: boolean;
}

export function AppShell({ children, noPadding }: AppShellProps) {
  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <TopNav />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className={`flex-1 overflow-auto bg-background ${noPadding ? '' : 'p-6'}`}>
          {children}
        </main>
      </div>
      <RiverFloatingButton />
    </div>
  );
}
