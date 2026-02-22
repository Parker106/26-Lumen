import { useState, useEffect } from "react";
import { LandingPage } from "./components/LandingPage";
import { CaretakerAuth } from "./components/CaretakerAuth";
import { AccessCodeEntry } from "./components/AccessCodeEntry";
import { FamilyAccessEntry } from "./components/FamilyAccessEntry";
import { PatientVoice } from "./components/PatientVoice";
import { FamilyMessage } from "./components/FamilyMessage";
import { CaretakerDashboard } from "./components/CaretakerDashboard";
import {
  initializeStorage,
  validateAccessCode,
  setCaretakerLoggedIn,
  isCaretakerLoggedIn,
  getPatientName,
  setFamilySession,
  clearFamilySession,
  updateOrCreateProfile,
  saveCaretakerCredentials,
  validateCaretakerLogin,
  getCaretakerCredentials,
} from "./lib/storage";

type Screen =
  | "landing"
  | "caretaker-auth"
  | "patient-code"
  | "family-code"
  | "patient-voice"
  | "family-message"
  | "caretaker-dashboard";

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>("landing");
  const [familyRole, setFamilyRole] = useState("");
  const [patientName, setPatientNameState] = useState("Margaret");
  const [codeError, setCodeError] = useState("");

  // Initialize storage and check for existing sessions on mount
  useEffect(() => {
    initializeStorage();
    setPatientNameState(getPatientName());
    
    // Check if caretaker is already logged in
    if (isCaretakerLoggedIn()) {
      setCurrentScreen("caretaker-dashboard");
    }
  }, []);

  const handleModeSelect = (mode: "patient" | "family" | "caretaker") => {
    setCodeError("");
    if (mode === "patient") {
      setCurrentScreen("patient-code");
    } else if (mode === "family") {
      setCurrentScreen("family-code");
    } else {
      setCurrentScreen("caretaker-auth");
    }
  };

  const handleCaretakerLogin = (email: string, password: string, isSignUp: boolean, patientNameInput?: string) => {
    if (isSignUp) {
      // Sign up - save credentials
      saveCaretakerCredentials(email, password, patientNameInput);
      setCaretakerLoggedIn(true);
      if (patientNameInput) {
        setPatientNameState(patientNameInput);
      }
      setCurrentScreen("caretaker-dashboard");
      return true;
    } else {
      // Login - validate credentials
      const credentials = getCaretakerCredentials();
      if (!credentials) {
        return false; // No account exists
      }
      if (validateCaretakerLogin(email, password)) {
        setCaretakerLoggedIn(true);
        setPatientNameState(getPatientName());
        setCurrentScreen("caretaker-dashboard");
        return true;
      }
      return false; // Invalid credentials
    }
  };

  const handleCaretakerLogout = () => {
    setCaretakerLoggedIn(false);
    setCurrentScreen("landing");
  };

  const handlePatientCodeSubmit = (code: string) => {
    setCodeError("");
    if (validateAccessCode(code)) {
      setCurrentScreen("patient-voice");
    } else {
      setCodeError("Invalid access code. Please try again.");
    }
  };

  const handleFamilyCodeSubmit = (role: string, code: string) => {
    setCodeError("");
    if (validateAccessCode(code)) {
      setFamilyRole(role);
      // Save family session
      setFamilySession(role);
      // Update or create profile for this role
      updateOrCreateProfile(role);
      setCurrentScreen("family-message");
    } else {
      setCodeError("Invalid access code. Please try again.");
    }
  };

  const handleBackToLanding = () => {
    setCurrentScreen("landing");
    setFamilyRole("");
    setCodeError("");
  };

  const handleFamilyLogout = () => {
    clearFamilySession();
    setFamilyRole("");
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
          onLogin={handleCaretakerLogin}
        />
      )}

      {currentScreen === "patient-code" && (
        <AccessCodeEntry
          onBack={handleBackToLanding}
          onCodeSubmit={handlePatientCodeSubmit}
          title="Enter Patient Access Code"
          error={codeError}
        />
      )}

      {currentScreen === "family-code" && (
        <FamilyAccessEntry
          onBack={handleBackToLanding}
          onSubmit={handleFamilyCodeSubmit}
          error={codeError}
        />
      )}

      {currentScreen === "patient-voice" && (
        <PatientVoice onBack={handleBackToLanding} patientName={patientName} />
      )}

      {currentScreen === "family-message" && (
        <FamilyMessage
          onBack={handleBackToLanding}
          onLogout={handleFamilyLogout}
          patientName={patientName}
          senderRole={familyRole}
        />
      )}

      {currentScreen === "caretaker-dashboard" && (
        <CaretakerDashboard onLogout={handleCaretakerLogout} />
      )}
    </div>
  );
}
