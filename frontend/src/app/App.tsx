import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { ThemeProvider } from "./lib/theme";
import { TopNav } from "./components/TopNav";
import { Sidebar, BottomTabBar, PageId } from "./components/Sidebar";
import { CommandPalette } from "./components/CommandPalette";
import { FarmerProfile } from "./components/FarmerProfile";
import { OverviewPage } from "./pages/OverviewPage";
import { DistrictMapPage } from "./pages/DistrictMapPage";
import { YieldNutritionPage } from "./pages/YieldNutritionPage";
import { IdentityAdminPage } from "./pages/IdentityAdminPage";
import { LandDetailsPage } from "./pages/LandDetailsPage";
import { FertilizerMethodPage } from "./pages/FertilizerMethodPage";
import { ClimateDetailsPage } from "./pages/ClimateDetailsPage";
import { useAuth } from "./context/AuthContext";
import { LoginPage } from "./components/LoginPage";
import { LandingPage } from "./components/Landingpage";
import { VerifierApp } from "./components/VerifierApp";
import { RegisterPage } from "./components/RegisterPage";
import { PendingApprovalPage } from "./components/PendingApprovalPage";
import { VerifiersPage } from "./pages/VerifiersPage";
import { RegisteredPage } from "./components/RegisteredPage";

const VALID_PAGES: PageId[] = [
  "overview", "district_map", "yield_nutrition", "identity_admin",
  "land_details", "fertilizer_method", "climate_details", "verifiers",
];

export default function App() {
  const { user, loading: authLoading, logout } = useAuth();
  const [screen, setScreen] = useState<"landing" | "login" | "register">("landing");
  const [selectedSurveyId, setSelectedSurveyId] = useState<number | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const reduceMotion = useReducedMotion();

  // Every fresh page load (refresh, first visit, pasted URL) always lands on
  // Overview — this initializer only runs once per real mount, so in-app
  // navigation via handleNavigate below (which doesn't remount App) is
  // unaffected and still moves freely between pages.
  const [activePage, setActivePage] = useState<PageId>("overview");
  if (window.location.hash.startsWith("#/registered")) return <RegisteredPage />;
  useEffect(() => {
    if (window.location.hash.replace("#/", "").replace("#", "") !== "overview") {
      window.history.replaceState(null, "", "#/overview");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Instant multi-page route switching with URL hash sync
  const handleNavigate = useCallback((id: PageId) => {
    setActivePage(id);
    window.location.hash = `#/${id}`;
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, []);

  // Sync hash changes (browser back/forward buttons)
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace("#/", "").replace("#", "") as PageId;
      if (VALID_PAGES.includes(hash)) {
        setActivePage(hash);
      }
    };
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const pageTransition = reduceMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.2 } }
    : {
        initial: { opacity: 0, y: 8 },
        animate: { opacity: 1, y: 0, transition: { duration: 0.28, ease: [0.16, 1, 0.3, 1] as const } },
        exit: { opacity: 0, transition: { duration: 0.15 } },
      };

  if (authLoading) return null;

  if (!user) {
    if (screen === "register") {
      return <RegisterPage onDone={() => setScreen("login")} onBack={() => setScreen("login")} />;
    }
    return screen === "login" ? (
      <LoginPage onBack={() => setScreen("landing")} onRegister={() => setScreen("register")} />
    ) : (
      <LandingPage onLoginClick={() => setScreen("login")} />
    );
  }

  if (user.role === "verifier" && user.status !== "approved") {
    return <PendingApprovalPage email={user.email} onSignOut={logout} />;
  }

  if (user.role === "verifier") {
    return <VerifierApp userName={user.name} onLogout={logout} />;
  }


  return (
    <ThemeProvider>
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary selection:text-white">
      {/* Icon rail (desktop) / bottom tab bar (mobile) */}
      <Sidebar activePage={activePage} onNavigate={handleNavigate} userName={user.name} onLogout={logout} />
      <BottomTabBar activePage={activePage} onNavigate={handleNavigate} />

      <div className="md:pl-16">
        {/* Sticky Top Header */}
        <TopNav activePage={activePage} onOpenPalette={() => setPaletteOpen(true)} onNavigate={handleNavigate} />

        {/* Dedicated Multi-Page Active Route Area — blank-beat transition between pages */}
        <main className="max-w-[1400px] mx-auto px-4 md:px-8 py-8 pb-24 md:pb-8">
          <AnimatePresence mode="wait">
            <motion.div key={activePage} {...pageTransition}>
              {activePage === "overview" && <OverviewPage onSelectFarmer={setSelectedSurveyId} />}
              {activePage === "district_map" && <DistrictMapPage />}
              {activePage === "yield_nutrition" && <YieldNutritionPage onRowClick={setSelectedSurveyId} />}
              {activePage === "identity_admin" && <IdentityAdminPage onRowClick={setSelectedSurveyId} />}
              {activePage === "land_details" && <LandDetailsPage onRowClick={setSelectedSurveyId} />}
              {activePage === "fertilizer_method" && <FertilizerMethodPage onRowClick={setSelectedSurveyId} />}
              {activePage === "climate_details" && <ClimateDetailsPage onRowClick={setSelectedSurveyId} />}
              {activePage === "verifiers" && <VerifiersPage />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <CommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        onNavigate={handleNavigate}
        onSelectFarmer={setSelectedSurveyId}
      />

      {/* Farmer Profile Modal */}
      {selectedSurveyId !== null && (
        <FarmerProfile
          surveyId={selectedSurveyId}
          onClose={() => setSelectedSurveyId(null)}
        />
      )}
    </div>
    </ThemeProvider>
  );
}