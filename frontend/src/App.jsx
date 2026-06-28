import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import "./App.css";
import Dashboard from "./pages/Dashboard";
import Scans from "./pages/Scans";
import ScanApproval from "./pages/ScanApproval";
import Vulnerabilities from "./pages/Vulnerabilities";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import Chatbot from "./pages/Chatbot";
import History from "./pages/History";

function App() {
  return (
    <Router>
      <Routes>
        <Route path='/' element={<Dashboard />} />
        <Route path='/scans' element={<Scans />} />
        <Route path='/scan-approval' element={<ScanApproval />} />
        <Route path='/vulnerabilities' element={<Vulnerabilities />} />
        <Route path='/reports' element={<Reports />} />
        <Route path='/history' element={<History />} />
        <Route path='/settings' element={<Settings />} />
        <Route path='/chatbot' element={<Chatbot />} />
      </Routes>
    </Router>
  );
}

export default App;
