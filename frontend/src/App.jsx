import { useEffect, useState } from "react";
import { HashRouter as Router, Routes, Route } from "react-router-dom";
import "./App.css";
import MainMenu from './components/MainMenu';
import GamePage from './components/GamePage';
import GuidePage from "./components/GuidePage";

function App() {
  const [status, setStatus] = useState("Connecting to backend...");

  useEffect(() => {
    fetch("https://student.csc.liv.ac.uk/~sgzpate3/proxy.php?path=health/health")
      .then((res) => res.json())
      .then((data) => {
        setStatus(`Backend status: ${data.status}`);
      })
      .catch(() => {
        setStatus("Backend not reachable");
      });
  }, []);

  return (
    <Router>
      <div style={{ position: 'fixed', bottom: 10, right: 10, fontSize: '12px', color: '#888' , }}>
        {status}
      </div>

      <Routes>
        <Route path="/" element={<MainMenu />} />
        <Route path="/guide" element={<GuidePage />} />
        <Route path="/game/:gameType" element={<GamePage />} />
        
      </Routes>
    </Router>
  );
}

export default App;
