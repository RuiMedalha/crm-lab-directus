import { ReactNode, forwardRef } from "react";
import { AppSidebar } from "./AppSidebar";
import { BottomNav } from "./BottomNav";
import { CallPopup } from "@/components/CallPopup";
import { QuickActions } from "@/components/QuickActions";
import { useCallListener } from "@/hooks/useCallListener";

interface AppLayoutProps {
  children: ReactNode;
}

export const AppLayout = forwardRef<HTMLDivElement, AppLayoutProps>(function AppLayout({ children }, ref) {
  const { incomingCall, isVisible, dismissCall } = useCallListener();
  
  return (
    <div className="flex min-h-screen w-full bg-background">
      <AppSidebar />
      <main className="flex-1 flex flex-col min-h-screen pb-16 md:pb-0">
        <div className="flex-1 p-4 md:p-6 overflow-auto">
          {children}
        </div>
      </main>
      <BottomNav />
      <QuickActions />
      
      {incomingCall && (
        <CallPopup
          call={incomingCall}
          isVisible={isVisible}
          onDismiss={dismissCall}
        />
      )}
    </div>
  );
});
