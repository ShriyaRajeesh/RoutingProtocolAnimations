import React, { useState, useRef, useEffect } from "react";
import * as d3 from "d3";
import Papa from "papaparse";

/**
 * Animated Distance Vector Routing (RIP-like)
 * - Hop-count metric only (link = 1)
 * - Split-horizon with poisoned reverse
 * - Step-by-step and animated converge modes
 * - Highlights changed entries per round
 */

export default function DistanceVectorAnimation() {
  const [nodes, setNodes] = useState([]);
  const [links, setLinks] = useState([]);
  const [routingTables, setRoutingTables] = useState({});
  const [changedEntries, setChangedEntries] = useState({});
  const [source, setSource] = useState("");
  const [target, setTarget] = useState("");
  const [localRouter, setLocalRouter] = useState("");
  const [roundCount, setRoundCount] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const svgRef = useRef();

  const maxHop = 15;
  const linkCost = 1;

  /** ----------------- TOPOLOGY FUNCTIONS ----------------- */

  const clearTopology = () => {
    setNodes([]);
    setLinks([]);
    setRoutingTables({});
    setLocalRouter("");
    setRoundCount(0);
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
  };

  const getLinkId = (end) => (typeof end === "string" ? end : end.id);

  const handleAddLink = () => {
    if (!source || !target) return alert("Fill source and target");
    if (source === target) return alert("Source and target must differ");

    
    if (!nodes.find((n) => n.id === source))
      setNodes((prev) => [
        ...prev,
        { id: source, x: Math.random() * 700, y: Math.random() * 450 },
      ]);
    if (!nodes.find((n) => n.id === target))
      setNodes((prev) => [
        ...prev,
        { id: target, x: Math.random() * 700, y: Math.random() * 450 },
      ]);

    const exists = links.find(
      (l) =>
        (getLinkId(l.source) === source && getLinkId(l.target) === target) ||
        (getLinkId(l.source) === target && getLinkId(l.target) === source)
    );
    if (exists) return alert(`Link between ${source} and ${target} exists`);

    setLinks((prev) => [...prev, { source, target }]);
    setSource("");
    setTarget("");
  };

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
          const s = row.source?.toString().trim();
          const t = row.target?.toString().trim();
          if (!s || !t || s === t) return;
          if (!newNodes.has(s)) newNodes.add(s);
          if (!newNodes.has(t)) newNodes.add(t);
          const exists = newLinks.find(
            (l) =>
              (l.source === s && l.target === t) ||
              (l.source === t && l.target === s)
          );
          if (!exists) newLinks.push({ source: s, target: t });
        });
        setNodes([...Array.from(newNodes)].map((id) => ({ id })));
        setLinks(newLinks);
      },
    });
  };

  const downloadCSV = () => {
    if (!Object.keys(routingTables).length) return;
    let allData = [];
    Object.entries(routingTables).forEach(([router, table]) => {
      Object.entries(table).forEach(([dest, entry]) => {
        allData.push({
          router,
          destination: dest,
          cost: entry.cost === Infinity ? "∞" : entry.cost,
          nextHop: entry.nextHop,
          state: entry.state || "valid",
        });
      });
    });
    const csv = Papa.unparse(allData);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "distance_vector_routing.csv";
    link.click();
  };

  /** ----------------- ROUTING LOGIC ----------------- */

  const getNeighborsOf = (nodeId) =>
    links
      .filter(
        (l) => getLinkId(l.source) === nodeId || getLinkId(l.target) === nodeId
      )
      .map((l) =>
        getLinkId(l.source) === nodeId
          ? getLinkId(l.target)
          : getLinkId(l.source)
      );

  const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

  const performOneRoundWithDiff = (tablesIn) => {
    const updatedTables = JSON.parse(JSON.stringify(tablesIn));
    let anyChanged = false;
    const roundChanges = {};

    nodes.forEach((node) => {
      const nodeId = node.id;
      const nodeTable = tablesIn[nodeId] || {};
      const neighbors = getNeighborsOf(nodeId);

      neighbors.forEach((neighborId) => {
        const advertised = {};
        Object.keys(nodeTable).forEach((dest) => {
          const entry = nodeTable[dest];
          advertised[dest] = {
            cost: entry.nextHop === neighborId ? Infinity : entry.cost,
            poisoned: entry.nextHop === neighborId,
          };
        });

        const neighborTable = updatedTables[neighborId] || {};

        Object.keys(advertised).forEach((dest) => {
          const advCost = advertised[dest].cost;
          let candidateCost =
            advCost === Infinity ? Infinity : advCost + linkCost;
          if (candidateCost > maxHop) candidateCost = Infinity;

          const current = neighborTable[dest] || {
            cost: Infinity,
            nextHop: "-",
            state: "invalid",
          };

          const isBetter =
            candidateCost < current.cost ||
            (current.cost === Infinity && candidateCost < Infinity) ||
            (current.state === "invalid" && candidateCost < Infinity);

          if (isBetter) {
            neighborTable[dest] = {
              cost: candidateCost,
              nextHop: candidateCost === Infinity ? "-" : nodeId,
              state: candidateCost === Infinity ? "invalid" : "valid",
            };
            anyChanged = true;
            roundChanges[neighborId] = roundChanges[neighborId] || new Set();
            roundChanges[neighborId].add(dest);
          }

          if (advertised[dest].poisoned && current.nextHop === nodeId) {
            neighborTable[dest] = {
              cost: Infinity,
              nextHop: "-",
              state: "invalid",
            };
            anyChanged = true;
            roundChanges[neighborId] = roundChanges[neighborId] || new Set();
            roundChanges[neighborId].add(dest);
          }
        });

        updatedTables[neighborId] = neighborTable;
      });
    });

    Object.keys(updatedTables).forEach((r) => {
      nodes.forEach((n) => {
        if (!updatedTables[r][n.id])
          updatedTables[r][n.id] = {
            cost: Infinity,
            nextHop: "-",
            state: "invalid",
          };
      });
    });

    const roundChangesObj = {};
    Object.entries(roundChanges).forEach(([r, s]) => {
      roundChangesObj[r] = Array.from(s);
    });

    return { updatedTables, changed: anyChanged, roundChanges: roundChangesObj };
  };

  const copyObject = (obj) => JSON.parse(JSON.stringify(obj));

  const didChangeInRound = (round, router, dest) => {
    if (!changedEntries[round]) return false;
    const arr = changedEntries[round][router];
    if (!arr) return false;
    return arr.includes(dest);
  };

  /** ----------------- ANIMATION ----------------- */

  const animatePacketsOneRound = async (durationPerPacket = 350) => {
    const svg = d3.select(svgRef.current);
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      const neighLinks = links.filter(
        (l) =>
          getLinkId(l.source) === node.id || getLinkId(l.target) === node.id
      );
      for (let j = 0; j < neighLinks.length; j++) {
        const d = neighLinks[j];
        const sObj = getLinkId(d.source) === node.id ? d.source : d.target;
        const tObj = getLinkId(d.source) === node.id ? d.target : d.source;
        if (!sObj.x || !tObj.x) continue;

        const packet = svg
          .append("circle")
          .attr("r", 5)
          .attr("fill", "limegreen")
          .attr("cx", sObj.x)
          .attr("cy", sObj.y);

        packet
          .transition()
          .duration(durationPerPacket)
          .attrTween("cx", () => (tt) => sObj.x + tt * (tObj.x - sObj.x))
          .attrTween("cy", () => (tt) => sObj.y + tt * (tObj.y - sObj.y))
          .on("end", () => packet.remove());

        await sleep(60);
      }
      await sleep(30);
    }
  };

  const stepOneRound = async () => {
    if (!nodes.length) return alert("Add nodes/links first");
    if (isAnimating) return;
    setIsAnimating(true);

    let baseTables = JSON.parse(JSON.stringify(routingTables));
    const { updatedTables, changed, roundChanges } =
      performOneRoundWithDiff(baseTables);

    const nextRound = roundCount + 1;
    setChangedEntries((prev) => ({ ...prev, [nextRound]: roundChanges }));
    setRoutingTables(JSON.parse(JSON.stringify(updatedTables)));
    setRoundCount(nextRound);

    await sleep(800);
    setChangedEntries((prev) => {
      const copy = { ...copyObject(prev) };
      delete copy[nextRound];
      return copy;
    });

    setIsAnimating(false);
  };

  const animateConverge = async () => {
    if (!nodes.length) return alert("Add nodes/links first");
    if (isAnimating) return;
    setIsAnimating(true);

    let tables = JSON.parse(JSON.stringify(routingTables));
    const maxRounds = 200;
    let round = 0;
    while (round < maxRounds) {
      round++;
      await animatePacketsOneRound(300);
      const { updatedTables, changed, roundChanges } =
        performOneRoundWithDiff(tables);

      setChangedEntries((prev) => ({
        ...prev,
        [roundCount + 1]: roundChanges,
      }));
      setRoutingTables(JSON.parse(JSON.stringify(updatedTables)));
      setRoundCount((c) => c + 1);

      await sleep(700);
      setChangedEntries((prev) => {
        const copy = { ...copyObject(prev) };
        delete copy[roundCount + 1];
        return copy;
      });

      tables = updatedTables;
      if (!changed) break;
    }
    setIsAnimating(false);
  };

  /** ----------------- D3 VISUALIZATION ----------------- */

  useEffect(() => {
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    const width = 700;
    const height = 450;

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
          .distance(140)
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
      .text(() => "1");

    const node = svg
      .selectAll("image")
      .data(nodes)
      .enter()
      .append("image")
      .attr("xlink:href", (d) =>
        d.id === localRouter ? "/modem.png" : "/modem.png"
      )
      .attr("width", 45)
      .attr("height", 45)
      .attr("x", (d) => d.x - 22)
      .attr("y", (d) => d.y - 22)
      .attr("filter", (d) =>
        d.id === localRouter ? "drop-shadow(0 0 6px tomato)" : null
      )
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
      .attr("dy", 35)
      .attr("font-size", "12px")
      .attr("fill", "black")
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

     node
        .attr("x", (d) => d.x - 22) // center the image
        .attr("y", (d) => d.y - 22);

      labels
        .attr("x", (d) => d.x)
        .attr("y", (d) => d.y + 35); // slightly below the router icon
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

  /** ----------------- ROUTING TABLE INIT ----------------- */
  useEffect(() => {
    const newTables = {};
    nodes.forEach((node) => {
      newTables[node.id] = {};
      nodes.forEach((dest) => {
        newTables[node.id][dest.id] = {
          cost: node.id === dest.id ? 0 : Infinity,
          nextHop: node.id === dest.id ? node.id : "-",
          state: node.id === dest.id ? "valid" : "invalid",
        };
      });
    });

    links.forEach((l) => {
      const s = getLinkId(l.source);
      const t = getLinkId(l.target);
      if (newTables[s]) newTables[s][t] = { cost: linkCost, nextHop: t, state: "valid" };
      if (newTables[t]) newTables[t][s] = { cost: linkCost, nextHop: s, state: "valid" };
    });

    setRoutingTables(newTables);
    setChangedEntries({});
    setRoundCount(0);
  }, [nodes, links]);

  /** ----------------- UI ----------------- */
  return (
    <div style={{ maxWidth: "1000px", margin: "auto" }}>
      <h2>Distance Vector Routing — Animated Convergence</h2>

      <div style={{ marginBottom: 10 }}>
        <label>Local Router ID:</label>
        <input
          type="text"
          value={localRouter}
          onChange={(e) => setLocalRouter(e.target.value.trim())}
          placeholder="Enter local router ID"
          style={{ marginLeft: 10 }}
        />
        <span style={{ marginLeft: 20, fontSize: 13, color: "#555" }}>
          Round: <strong>{roundCount}</strong>
        </span>
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
        <button onClick={handleAddLink}>Add Link (hop = 1)</button>
        <input type="file" accept=".csv" onChange={handleCSVUpload} />
      </div>

      <svg
        ref={svgRef}
        width={820}
        height={420}
        style={{ border: "1px solid #ccc", background: "#f8f9fa" }}
      />

      <div style={{ marginTop: 10, display: "flex", gap: 10 }}>
        <button onClick={stepOneRound}>Step 1 Round</button>
        <button onClick={animateConverge}>Animate Converge</button>
        <button onClick={clearTopology}>Clear Topology</button>
        <button onClick={downloadCSV}>Download CSV</button>
      </div>
    </div>
  );
}
