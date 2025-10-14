import React, { useState, useRef, useEffect } from "react";
import * as d3 from "d3";
import Papa from "papaparse";

export default function EIGRPAnimation() {
  const [nodes, setNodes] = useState([]);
  const [links, setLinks] = useState([]);
  const [source, setSource] = useState("");
  const [target, setTarget] = useState("");
  const [cost, setCost] = useState("");
  const [localRouter, setLocalRouter] = useState("");
  const [routingTable, setRoutingTable] = useState([]);
  const svgRef = useRef();

  // Visualization
  useEffect(() => {
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = 700;
    const height = 450;

    const simulation = d3
      .forceSimulation(nodes)
      .force("link", d3.forceLink(links).id((d) => d.id).distance(150))
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2));

    const link = svg
      .selectAll(".link")
      .data(links)
      .enter()
      .append("line")
      .attr("class", "link")
      .attr("stroke", "#999")
      .attr("stroke-width", 2);

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

  // Add link manually
  const handleAddLink = () => {
    if (cost < 0) {
      alert("Please enter a valid cost. It cannot be less than zero.");
      return;
    }
    if (!source || !target || !cost) {
      alert("Please fill in all fields.");
      return;
    }
    if (!nodes.find((n) => n.id === source))
      setNodes((prev) => [...prev, { id: source }]);
    if (!nodes.find((n) => n.id === target))
      setNodes((prev) => [...prev, { id: target }]);

    const existing = links.find(
      (l) =>
        (l.source.id === source && l.target.id === target) ||
        (l.source.id === target && l.target.id === source)
    );
    if (existing) {
      const confirmUpdate = window.confirm(
        `A link between ${source} and ${target} already exists. Update cost?`
      );
      if (!confirmUpdate) return;
      setLinks((prev) =>
        prev.map((l) =>
          (l.source.id === source && l.target.id === target) ||
          (l.source.id === target && l.target.id === source)
            ? { ...l, cost: parseInt(cost, 10) }
            : l
        )
      );
    } else {
      setLinks((prev) => [...prev, { source, target, cost: parseInt(cost, 10) }]);
    }
    setSource("");
    setTarget("");
    setCost("");
  };

  // CSV Upload
  const handleCSVUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const data = results.data;
        const newNodes = new Set(nodes.map((n) => n.id));
        const newLinks = [...links];
        data.forEach((row) => {
          const { source, target, cost } = row;
          if (!newNodes.has(source)) newNodes.add(source);
          if (!newNodes.has(target)) newNodes.add(target);
          newLinks.push({ source, target, cost: parseInt(cost, 10) });
        });
        setNodes([...Array.from(newNodes)].map((id) => ({ id })));
        setLinks(newLinks);
      },
    });
  };

  // CSV Download of routing table
  const downloadCSV = () => {
    if (!routingTable.length) return;
    const csv = Papa.unparse(routingTable);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "routing_table.csv";
    link.click();
  };

  // EIGRP Algorithm
  const runEIGRP = async () => {
    const svg = d3.select(svgRef.current);
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));

    if (!localRouter || !nodeMap.has(localRouter)) {
      alert("Please enter a valid Local Router ID present in the graph.");
      return;
    }

    const distTable = {};
    nodes.forEach((n) => {
      distTable[n.id] = {};
      nodes.forEach((m) => {
        distTable[n.id][m.id] = n.id === m.id ? 0 : Infinity;
      });
    });

    links.forEach((l) => {
      distTable[l.source.id][l.target.id] = l.cost;
      distTable[l.target.id][l.source.id] = l.cost;
    });

    let updated = true;
    while (updated) {
      updated = false;
      for (let router of nodes) {
        for (let neighborLink of links.filter(
          (l) => l.source.id === router.id || l.target.id === router.id
        )) {
          const neighborId = neighborLink.source.id === router.id ? neighborLink.target.id : neighborLink.source.id;
          for (let dest of nodes) {
            if (router.id === dest.id) continue;
            const newCost = distTable[router.id][neighborId] + distTable[neighborId][dest.id];
            if (newCost < distTable[router.id][dest.id]) {
              distTable[router.id][dest.id] = newCost;
              updated = true;

              const current = nodeMap.get(router.id);
              const neighbor = nodeMap.get(neighborId);
              const packet = svg.append("circle")
                .attr("r", 6)
                .attr("fill", "orange")
                .attr("cx", current.x)
                .attr("cy", current.y);

              packet.transition().duration(500)
                .attr("cx", neighbor.x)
                .attr("cy", neighbor.y)
                .on("end", () => packet.remove());
            }
          }
        }
      }
      await new Promise((r) => setTimeout(r, 600));
    }

    // Routing table for local router
    const tableData = [];
    nodes.forEach((n) => {
      if (n.id === localRouter) return;
      let nextHop = "-";
      let minCost = distTable[localRouter][n.id];
      for (let neighborLink of links.filter(
        (l) => l.source.id === localRouter || l.target.id === localRouter
      )) {
        const neighborId = neighborLink.source.id === localRouter ? neighborLink.target.id : neighborLink.source.id;
        if (distTable[localRouter][neighborId] + distTable[neighborId][n.id] === minCost) {
          nextHop = neighborId;
          break;
        }
      }
      tableData.push({
        destination: n.id,
        cost: minCost === Infinity ? "∞" : minCost,
        nextHop,
      });
    });
    setRoutingTable(tableData);
  };

  return (
    <div style={{ maxWidth: "900px", margin: "auto" }}>
      <h2>EIGRP Distance Vector Routing</h2>

      <div style={{ marginBottom: 10 }}>
        <label>Local Router ID:</label>
        <input
          type="text"
          value={localRouter}
          onChange={(e) => setLocalRouter(e.target.value.trim())}
          placeholder="Enter Local router ID"
          style={{ marginLeft: 10 }}
        />
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
        <input
          type="text"
          placeholder="Router A"
          value={source}
          onChange={(e) => setSource(e.target.value.trim())}
        />
        <input
          type="text"
          placeholder="Router B"
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

      <div style={{ marginBottom: 10 }}>
        <input type="file" accept=".csv" onChange={handleCSVUpload} />
      </div>

      <svg
        ref={svgRef}
        width={700}
        height={450}
        style={{ border: "1px solid #ccc", background: "#f8f9fa" }}
      />

      <div style={{ marginTop: 20 }}>
        <button onClick={runEIGRP} style={{ padding: "10px 15px" }}>
          Run EIGRP
        </button>
        <button onClick={downloadCSV} style={{ padding: "10px 15px", marginLeft: 10 }}>
          Download Routing Table CSV
        </button>
      </div>

      {routingTable.length > 0 && (
        <div style={{ marginTop: 30 }}>
          <h3>EIGRP Routing Table</h3>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              textAlign: "center",
              background: "#f9f9f9",
            }}
          >
            <thead style={{ background: "#444", color: "white" }}>
              <tr>
                <th style={{ padding: "8px", border: "1px solid #ccc" }}>Destination</th>
                <th style={{ padding: "8px", border: "1px solid #ccc" }}>Cost</th>
                <th style={{ padding: "8px", border: "1px solid #ccc" }}>Next Hop</th>
              </tr>
            </thead>
            <tbody>
              {routingTable.map((row, i) => (
                <tr key={i}>
                  <td style={{ padding: "8px", border: "1px solid #ccc" }}>{row.destination}</td>
                  <td style={{ padding: "8px", border: "1px solid #ccc" }}>{row.cost}</td>
                  <td style={{ padding: "8px", border: "1px solid #ccc" }}>{row.nextHop}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
