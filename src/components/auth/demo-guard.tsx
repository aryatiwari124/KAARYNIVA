"use client";

import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { Lock, LogIn } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface DemoGuardContextType {
  isDemo: boolean;
  role?: string;
  requireLogin: (message?: string) => boolean;
  showLoginModal: (message?: string) => void;
}

const DemoGuardContext = createContext<DemoGuardContextType>({
  isDemo: false,
  requireLogin: () => false,
  showLoginModal: () => {},
});

export function DemoGuardProvider({
  isDemo,
  role,
  children,
}: {
  isDemo: boolean;
  role?: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [customMessage, setCustomMessage] = useState<string | null>(null);

  function showLoginModal(message?: string) {
    if (message) setCustomMessage(message);
    else setCustomMessage(null);
    setModalOpen(true);
  }

  function requireLogin(message?: string): boolean {
    if (isDemo) {
      showLoginModal(message);
      return true;
    }
    return false;
  }

  async function handleGoToLogin() {
    setModalOpen(false);
    await signOut({ redirect: false });
    router.push("/login");
    router.refresh();
  }

  const roleLabel = role === "OWNER" ? "Owner" : "Staff";

  return (
    <DemoGuardContext.Provider value={{ isDemo, role, requireLogin, showLoginModal }}>
      {children}

      <Dialog
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Login Required"
      >
        <div className="flex flex-col items-center text-center py-2 space-y-4">
          <div className="h-12 w-12 rounded-full bg-accent-soft text-accent flex items-center justify-center">
            <Lock className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-display text-lg font-semibold text-ink">
              Authentication Required
            </h3>
            <p className="text-sm text-ink-muted mt-2">
              {customMessage ||
                `You are currently exploring in Demo Mode as ${roleLabel}. To use this feature or save changes, please log in with a registered account.`}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full pt-4 border-t border-border">
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => setModalOpen(false)}
            >
              Continue Demo
            </Button>
            <Button
              type="button"
              className="w-full sm:w-auto gap-2"
              onClick={handleGoToLogin}
            >
              <LogIn className="h-4 w-4" />
              Log In Now
            </Button>
          </div>
        </div>
      </Dialog>
    </DemoGuardContext.Provider>
  );
}

export function useDemoGuard() {
  return useContext(DemoGuardContext);
}
