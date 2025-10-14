import React, { useState, useRef, useEffect } from "react";
import * as d3 from "d3";

export default function DistanceVectorAnimation() {
  const [nodes, setNodes] = useState([]);
  const [links, setLinks] = useState([]);
  const [routingTables, setRoutingTables] = useState({});
  const [source, setSource] = useState("");
  const [target, setTarget] = useState("");
  const [cost, setCost] = useState("");
  const [localRouter, setLocalRouter] = useState("");
  const svgRef = useRef();

  // D3 Visualization Setup
  useEffect(() => {
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = 700;
    const height = 450;

    // Arrow markers
    svg
      .append("defs")
      .append("marker")
      .attr("id", "arrow")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 24)
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", "#555");

    const simulation = d3
      .forceSimulation(nodes)
      .force(
        "link",
        d3
          .forceLink(links)
          .id((d) => d.id)
          .distance(150)
      )
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2));

    const link = svg
      .selectAll(".link")
      .data(links)
      .enter()
      .append("line")
      .attr("class", "link")
      .attr("stroke", "#999")
      .attr("stroke-width", 2)
      .attr("marker-end", "url(#arrow)");

    const linkLabels = svg
      .selectAll(".link-label")
      .data(links)
      .enter()
      .append("text")
      .attr("class", "link-label")
      .attr("font-size", "12px")
      .attr("fill", "#000")
      .text((d) => d.cost);

    const node = svg
      .selectAll("circle")
      .data(nodes)
      .enter()
      .append("circle")
      .attr("r", 22)
      .attr("fill", (d) => (d.id === localRouter ? "tomato" : "steelblue"))
      .attr("stroke", "#222")
      .attr("stroke-width", 1.5)
      .call(
        d3
          .drag()
          .on("start", dragStarted)
          .on("drag", dragged)
          .on("end", dragEnded)
      );

    const labels = svg
      .selectAll(".label")
      .data(nodes)
      .enter()
      .append("text")
      .attr("class", "label")
      .attr("text-anchor", "middle")
      .attr("dy", 5)
      .attr("font-size", "12px")
      .attr("fill", "white")
      .text((d) => d.id);

    simulation.on("tick", () => {
      link
        .attr("x1", (d) => d.source.x)
        .attr("y1", (d) => d.source.y)
        .attr("x2", (d) => d.target.x)
        .attr("y2", (d) => d.target.y);

      linkLabels
        .attr("x", (d) => (d.source.x + d.target.x) / 2)
        .attr("y", (d) => (d.source.y + d.target.y) / 2);

      node.attr("cx", (d) => d.x).attr("cy", (d) => d.y);
      labels.attr("x", (d) => d.x).attr("y", (d) => d.y + 4);
    });

    function dragStarted(event, d) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }
    function dragged(event, d) {
      d.fx = event.x;
      d.fy = event.y;
    }
    function dragEnded(event, d) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

    return () => simulation.stop();
  }, [nodes, links, localRouter]);

  // Add bidirectional link
  const handleAddLink = () => {
    if (!source || !target || !cost) return;

    if (!nodes.find((n) => n.id === source))
      setNodes((prev) => [...prev, { id: source }]);
    if (!nodes.find((n) => n.id === target))
      setNodes((prev) => [...prev, { id: target }]);

    setLinks((prev) => [
      ...prev,
      { source, target, cost: parseInt(cost, 10) },
      { source: target, target: source, cost: parseInt(cost, 10) },
    ]);

    setSource("");
    setTarget("");
    setCost("");
  };

  // Initialize routing tables when nodes/links change
  useEffect(() => {
    const newTables = {};
    nodes.forEach((node) => {
      newTables[node.id] = {};
      nodes.forEach((dest) => {
        if (node.id === dest.id)
          newTables[node.id][dest.id] = { cost: 0, nextHop: node.id };
        else newTables[node.id][dest.id] = { cost: Infinity, nextHop: "-" };
      });
    });

    // Add direct neighbor info
    links.forEach((l) => {
      newTables[l.source.id][l.target.id] = {
        cost: l.cost,
        nextHop: l.target.id,
      };
    });

    setRoutingTables(newTables);
  }, [nodes, links]);

  // Distance Vector Algorithm (RIP)
  const runRIP = () => {
    const svg = d3.select(svgRef.current);
    let updatedTables = JSON.parse(JSON.stringify(routingTables));
    let changed = true;
    let round = 0;

    const runRound = () => {
      if (!changed || round > 10) return; // stop after stable or 10 rounds
      changed = false;
      round++;

      // Animation for this round
      nodes.forEach((node, i) => {
        const outgoing = links.filter((l) => l.source.id === node.id);
        outgoing.forEach((d, j) => {
          setTimeout(() => {
            const packet = svg
              .append("circle")
              .attr("r", 6)
              .attr("fill", "limegreen")
              .attr("cx", d.source.x)
              .attr("cy", d.source.y);

            packet
              .transition()
              .duration(1500)
              .attrTween(
                "cx",
                () => (t) => d.source.x + t * (d.target.x - d.source.x)
              )
              .attrTween(
                "cy",
                () => (t) => d.source.y + t * (d.target.y - d.source.y)
              )
              .on("end", () => packet.remove());
          }, i * 500 + j * 300);
        });
      });

      // Distance vector update logic
      let newTables = JSON.parse(JSON.stringify(updatedTables));

      nodes.forEach((node) => {
        links
          .filter((l) => l.source.id === node.id)
          .forEach((link) => {
            const neighbor = link.target.id;
            const neighborTable = updatedTables[neighbor];
            for (const dest in neighborTable) {
              const newCost = link.cost + neighborTable[dest].cost;
              if (newCost < newTables[node.id][dest].cost) {
                newTables[node.id][dest].cost = newCost;
                newTables[node.id][dest].nextHop = neighbor;
                changed = true;
              }
            }
          });
      });

      setRoutingTables(newTables);
      updatedTables = newTables;

      if (changed) setTimeout(runRound, 2500);
    };

    runRound();
  };

  return (
    <div style={{ maxWidth: "900px", margin: "auto" }}>
      <h2>Distance Vector Routing Protocol (RIP) Visualization</h2>

      <div style={{ marginBottom: 10 }}>
        <label>Local Router ID:</label>
        <input
          type="text"
          value={localRouter}
          onChange={(e) => setLocalRouter(e.target.value.trim())}
          placeholder="Enter local router ID"
          style={{ marginLeft: 10 }}
        />
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
        <input
          type="text"
          placeholder="Source"
          value={source}
          onChange={(e) => setSource(e.target.value.trim())}
        />
        <input
          type="text"
          placeholder="Target"
          value={target}
          onChange={(e) => setTarget(e.target.value.trim())}
        />
        <input
          type="number"
          placeholder="Cost"
          value={cost}
          onChange={(e) => setCost(e.target.value)}
        />
        <button onClick={handleAddLink}>Add Link</button>
      </div>

      <svg
        ref={svgRef}
        width={700}
        height={450}
        style={{ border: "1px solid #ccc", background: "#f8f9fa" }}
      />

      <div style={{ marginTop: 20 }}>
        <button onClick={runRIP} style={{ padding: "10px 15px" }}>
          Run RIP (Distance Vector Updates)
        </button>
      </div>

      <h3 style={{ marginTop: 30 }}>Routing Tables</h3>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "15px",
          marginTop: "15px",
        }}
      >
        {Object.entries(routingTables).map(([router, table]) => (
          <div
            key={router}
            style={{
              border: "1px solid #ccc",
              borderRadius: 8,
              padding: 10,
              background: "#fff",
            }}
          >
            <h4 style={{ textAlign: "center", color: "#333" }}>
              Router {router}
            </h4>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "12px",
              }}
            >
              <thead>
                <tr style={{ background: "#eee" }}>
                  <th>Destination</th>
                  <th>Cost</th>
                  <th>Next Hop</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(table).map(([dest, entry]) => (
                  <tr key={dest}>
                    <td>{dest}</td>
                    <td>{entry.cost === Infinity ? "∞" : entry.cost}</td>
                    <td>{entry.nextHop}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  );
}
