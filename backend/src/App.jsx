import { useEffect, useState } from "react";
import "./App.css";

function App() {
  const [status, setStatus] = useState("Connecting to backend...");

  useEffect(() => {
    fetch("http://localhost:3001/health")
      .then((res) => res.json())
      .then((data) => {
        setStatus(`Backend status: ${data.status}`);
      })
      .catch((err) => {
        console.error(err);
        setStatus("Backend not reachable");
      });
  }, []);

  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>Boardium</h1>
      <p>{status}</p>
    </div>
  );
}

export default App;
