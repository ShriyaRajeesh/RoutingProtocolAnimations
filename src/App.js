import React, { useState } from "react";
import EIGRPAnimation from "./components/EIGRPAnimation";
// import OSPFAnimation from "./components/OSPFAnimation";
// import RIPAnimation from "./components/RIPAnimation";

export default function App() {
  const [selectedProtocol, setSelectedProtocol] = useState("EIGRP");

  const renderProtocol = () => {
    switch (selectedProtocol) {
      case "EIGRP":
        return <EIGRPAnimation />;
        
      default:
        return <EIGRPAnimation />;
    }
  };

  return (
    <div style={{ textAlign: "center", fontFamily: "Arial, sans-serif" }}>
      <h1 style={{ marginTop: 20 }}>Routing Protocol Visualizer</h1>

      <div style={{ margin: "20px 0" }}>
        <button
          onClick={() => setSelectedProtocol("EIGRP")}
          style={{
            margin: 5,
            padding: "10px 15px",
            backgroundColor: "#4CAF50",
            color: "white",
            border: "none",
            borderRadius: 5,
            cursor: "pointer",
          }}
        >
          EIGRP
        </button>
      </div>

      <div style={{ padding: 20 }}>{renderProtocol()}</div>
    </div>
  );
}
