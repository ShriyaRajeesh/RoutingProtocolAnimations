import React from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import OSPFAnimation from "./components/OSPFAnimation";
import DistanceVectorAnimation from "./components/DistanceVectorAnimation";
import EIGRPAnimation from "./components/EIGRPAnimation";

function App() {
  return (
    <Router>
      <div style={{ textAlign: "center", padding: "20px" }}>
        <h1>
          SOFTWARE ENGINEERING (IT303) COURSE PROJECT TITLE: “IMPLEMENTATION OF
          ANIMATION OF ROUTING PROTOCOLS”{" "}
        </h1>
        <h3>carried out by</h3>
        <h2>Ashab muhammed-231IT011</h2>
        <h2>Shriya Rajeesh-231IT069</h2>
        <h2>Chetasi V trivedi-231IT019</h2>

        <nav
          style={{
            marginBottom: "20px",
            display: "flex",
            justifyContent: "center",
            gap: "15px",
          }}
        >
          <Link to="/ospf">
            <button style={buttonStyle}>OSPF Visualization</button>
          </Link>

          <Link to="/distance-vector">
            <button style={buttonStyle}>Distance Vector Visualization</button>
          </Link>

          <Link to="/eigrp">
            <button style={buttonStyle}>EIGRP Visualization</button>
          </Link>
        </nav>

        {/* Route Definitions */}
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/ospf" element={<OSPFAnimation />} />
          <Route
            path="/distance-vector"
            element={<DistanceVectorAnimation />}
          />
          <Route path="/eigrp" element={<EIGRPAnimation />} />
        </Routes>
      </div>
    </Router>
  );
}

// Home Page Component
function HomePage() {
  return (
    <div>
      <h2>Welcome to Routing Protocol Visualizer</h2>
      <p>Select a protocol above to begin the visualization.</p>
    </div>
  );
}

// Simple Button Style
const buttonStyle = {
  padding: "10px 15px",
  fontSize: "16px",
  cursor: "pointer",
  borderRadius: "8px",
  border: "1px solid #ccc",
  backgroundColor: "#007bff",
  color: "white",
};

export default App;
