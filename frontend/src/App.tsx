import { useState, useEffect } from "react";
import { LandingPage } from "./components/LandingPage";
import { CaretakerAuth } from "./components/CaretakerAuth";
import { FamilyAccessEntry } from "./components/FamilyAccessEntry";
import { PatientElevenLabs } from "./components/PatientElevenLabs";
import { FamilyMessage } from "./components/FamilyMessage";
import { CaretakerDashboard } from "./components/CaretakerDashboard";
import {
  initializeStorage,
  getAuthUser,
  getAuthPatient,
  getAuthToken,
  clearAuthSession,
  getPatientName,
} from "./lib/storage";

type Screen =
  | "landing"
  | "caretaker-auth"
  | "family-auth"
  | "patient"
  | "family-message"
  | "caretaker-dashboard";

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>("landing");

  useEffect(() => {
    initializeStorage();
    const user = getAuthUser();
    const token = getAuthToken();
    if (token && user) {
      if (user.role === "caregiver") setCurrentScreen("caretaker-dashboard");
      else if (user.role === "family" && getAuthPatient()) setCurrentScreen("family-message");
    }
  }, []);

  const handleModeSelect = (mode: "patient" | "family" | "caretaker") => {
    if (mode === "patient") setCurrentScreen("patient");
    else if (mode === "family") setCurrentScreen("family-auth");
    else setCurrentScreen("caretaker-auth");
  };

  const handleBackToLanding = () => setCurrentScreen("landing");

  const handleCaregiverAuthSuccess = () => setCurrentScreen("caretaker-dashboard");

  const handleFamilyAuthSuccess = () => setCurrentScreen("family-message");

  const handleLogout = () => {
    clearAuthSession();
    setCurrentScreen("landing");
  };

  return (
    <div className="min-h-screen">
      {currentScreen === "landing" && (
        <LandingPage onSelectMode={handleModeSelect} />
      )}

      {currentScreen === "caretaker-auth" && (
        <CaretakerAuth
          onBack={handleBackToLanding}
          onSuccess={handleCaregiverAuthSuccess}
        />
      )}

      {currentScreen === "family-auth" && (
        <FamilyAccessEntry
          onBack={handleBackToLanding}
          onSuccess={handleFamilyAuthSuccess}
        />
      )}

      {currentScreen === "patient" && (
        <PatientElevenLabs onBack={handleBackToLanding} />
      )}

      {currentScreen === "family-message" && (
        <FamilyMessage
          onBack={handleBackToLanding}
          onLogout={handleLogout}
          patientName={getAuthPatient()?.name || getPatientName()}
          senderRole={getAuthUser()?.name || "Family"}
        />
      )}

      {currentScreen === "caretaker-dashboard" && (
        <CaretakerDashboard onLogout={handleLogout} />
      )}
    </div>
  );
}
