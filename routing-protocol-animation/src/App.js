import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Network } from "vis-network/peer";

export default function RoutingAnimation() {
  const containerRef = useRef(null);
  const [network, setNetwork] = useState(null);
  const [protocol, setProtocol] = useState("RIP");
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    if (containerRef.current && !network) {
      // Sample topology
      const nodes = [
        { id: 1, label: "R1" },
        { id: 2, label: "R2" },
        { id: 3, label: "R3" },
      ];

      const edges = [
        { from: 1, to: 2 },
        { from: 2, to: 3 },
        { from: 1, to: 3 },
      ];

      const data = { nodes, edges };
      const options = {
        physics: false,
        edges: { arrows: "to", color: { color: "#555" } },
        nodes: {
          shape: "circle",
          size: 30,
          color: { background: "#3498db", border: "#2980b9" },
          font: { color: "#fff" },
        },
      };

      const net = new Network(containerRef.current, data, options);
      setNetwork(net);
    }
  }, [containerRef, network]);

  // Simulate protocol messages
  const runSimulation = () => {
    let steps = [];
    if (protocol === "RIP") {
      steps = [
        { from: 1, to: 2, text: "Distance Vector Update" },
        { from: 2, to: 3, text: "Distance Vector Update" },
      ];
    } else if (protocol === "OSPF") {
      steps = [
        { from: 1, to: 2, text: "LSA Flood" },
        { from: 1, to: 3, text: "LSA Flood" },
      ];
    } else if (protocol === "EIGRP") {
      steps = [
        { from: 2, to: 1, text: "DUAL Query" },
        { from: 3, to: 2, text: "DUAL Reply" },
      ];
    }
    setMessages(steps);
  };

  return (
    <div className="p-6 flex flex-col items-center gap-6">
      <h1 className="text-2xl font-bold">Routing Protocol Animation</h1>

      {/* Protocol Selection */}
      <select
        value={protocol}
        onChange={(e) => setProtocol(e.target.value)}
        className="border p-2 rounded-lg"
      >
        <option value="RIP">RIP</option>
        <option value="OSPF">OSPF</option>
        <option value="EIGRP">EIGRP</option>
      </select>

      {/* Network Topology */}
      <div
        ref={containerRef}
        className="w-[600px] h-[400px] border rounded-lg shadow"
      ></div>

      {/* Simulation Button */}
      <button
        onClick={runSimulation}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg shadow"
      >
        Run {protocol} Simulation
      </button>

      {/* Animated Messages */}
      <div className="w-full flex flex-col gap-2 mt-4">
        {messages.map((msg, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.8 }}
            className="p-2 bg-gray-100 rounded-lg shadow text-sm"
          >
            {`[${protocol}] ${msg.from} → ${msg.to}: ${msg.text}`}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
