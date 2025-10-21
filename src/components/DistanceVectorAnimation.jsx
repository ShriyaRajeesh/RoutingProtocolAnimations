import React, { useState, useRef, useEffect } from "react";
import * as d3 from "d3";
import Papa from "papaparse";

/**
 * Animated Distance Vector (RIP-like, Hop-Count only)
 *
 * - Hop-count metric only (link = 1)
 * - Split-horizon with poisoned reverse
 * - Step-by-step and Animated converge modes
 * - Highlights changed entries per round
 *
 * Use "Step Round" to advance one round, or "Animate Converge" to animate until convergence.
 */

export default function DistanceVectorAnimation() {
  const [nodes, setNodes] = useState([]);
  const [links, setLinks] = useState([]); // links: { source, target }
  const [routingTables, setRoutingTables] = useState({});
  const [changedEntries, setChangedEntries] = useState({}); // { round: { router: Set(dest) } }
  const [source, setSource] = useState("");
  const [target, setTarget] = useState("");
  const [localRouter, setLocalRouter] = useState("");
  const [roundCount, setRoundCount] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const svgRef = useRef();

  const maxHop = 15;
  const linkCost = 1;

  // D3 Visualization
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

  function getLinkId(end) {
    return typeof end === "string" ? end : end.id;
  }

  // Add link (every link = 1 hop)
  const handleAddLink = () => {
    if (!source || !target) {
      alert("Fill source and target");
      return;
    }
    if (source === target) {
      alert("Source and target must be different");
      return;
    }
    if (!nodes.find((n) => n.id === source))
      setNodes((prev) => [...prev, { id: source }]);
    if (!nodes.find((n) => n.id === target))
      setNodes((prev) => [...prev, { id: target }]);

    const existing = links.find(
      (l) =>
        (getLinkId(l.source) === source && getLinkId(l.target) === target) ||
        (getLinkId(l.source) === target && getLinkId(l.target) === source)
    );

    if (existing) {
      alert(`Link between ${source} and ${target} already exists`);
      return;
    }

    setLinks((prev) => [...prev, { source, target }]);
    setSource("");
    setTarget("");
  };

  // CSV Upload: expect source,target (ignore cost column)
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

  // CSV Download
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

  // Initialize routing tables when topology changes
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
      const s = typeof l.source === "string" ? l.source : l.source.id;
      const t = typeof l.target === "string" ? l.target : l.target.id;
      if (newTables[s]) {
        newTables[s][t] = { cost: linkCost, nextHop: t, state: "valid" };
      }
      if (newTables[t]) {
        newTables[t][s] = { cost: linkCost, nextHop: s, state: "valid" };
      }
    });

    setRoutingTables(newTables);
    setChangedEntries({});
    setRoundCount(0);
  }, [nodes, links]);

  // neighbors helper
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

  // helper sleep
  const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

  // perform one round and return info about changes (also which dests changed per router)
  function performOneRoundWithDiff(tablesIn) {
    const updatedTables = JSON.parse(JSON.stringify(tablesIn));
    let anyChanged = false;
    const roundChanges = {}; // router -> Set(dest)

    nodes.forEach((node) => {
      const nodeId = node.id;
      const nodeTable = tablesIn[nodeId] || {};
      const neighbors = getNeighborsOf(nodeId);

      neighbors.forEach((neighborId) => {
        // prepare advertisement with poisoned reverse
        const advertised = {};
        Object.keys(nodeTable).forEach((dest) => {
          const entry = nodeTable[dest];
          if (entry.nextHop === neighborId) {
            advertised[dest] = { cost: Infinity, poisoned: true };
          } else {
            advertised[dest] = { cost: entry.cost, poisoned: false };
          }
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

          if (
            advertised[dest].poisoned &&
            current.nextHop === nodeId &&
            current.cost !== Infinity
          ) {
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

    // ensure all destinations exist in each table
    Object.keys(updatedTables).forEach((r) => {
      nodes.forEach((n) => {
        if (!updatedTables[r][n.id]) {
          updatedTables[r][n.id] = {
            cost: Infinity,
            nextHop: "-",
            state: "invalid",
          };
        }
      });
    });

    // convert Sets to arrays for JSON-friendly storage
    const roundChangesObj = {};
    Object.entries(roundChanges).forEach(([r, s]) => {
      roundChangesObj[r] = Array.from(s);
    });

    return {
      updatedTables,
      changed: anyChanged,
      roundChanges: roundChangesObj,
    };
  }

  // animate packet movement for a single round (simple pulses between neighbors)
  async function animatePacketsOneRound(durationPerPacket = 350) {
    const svg = d3.select(svgRef.current);
    // send from each node to each neighbor
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

        // stagger slightly
        // eslint-disable-next-line no-await-in-loop
        await sleep(60);
      }
      // small gap between node batches
      // eslint-disable-next-line no-await-in-loop
      await sleep(30);
    }
  }

  // Step one round (no auto-loop)
  const stepOneRound = async () => {
    if (!nodes.length) {
      alert("Add nodes/links first");
      return;
    }
    if (isAnimating) return;
    setIsAnimating(true);
    const baseTables = JSON.parse(JSON.stringify(routingTables));
    // If uninitialized, initialize neighbor entries
    if (!Object.keys(baseTables).length) {
      nodes.forEach((n) => {
        baseTables[n.id] = {};
        nodes.forEach((d) => {
          baseTables[n.id][d.id] = {
            cost: n.id === d.id ? 0 : Infinity,
            nextHop: n.id === d.id ? n.id : "-",
            state: n.id === d.id ? "valid" : "invalid",
          };
        });
      });
      links.forEach((l) => {
        const s = getLinkId(l.source);
        const t = getLinkId(l.target);
        baseTables[s][t] = { cost: linkCost, nextHop: t, state: "valid" };
        baseTables[t][s] = { cost: linkCost, nextHop: s, state: "valid" };
      });
    }

    // animate packets first
    await animatePacketsOneRound(320);

    const { updatedTables, changed, roundChanges } =
      performOneRoundWithDiff(baseTables);

    // mark changed entries for UI highlight
    const nextRound = roundCount + 1;
    setChangedEntries((prev) => ({ ...prev, [nextRound]: roundChanges }));
    setRoutingTables(JSON.parse(JSON.stringify(updatedTables)));
    setRoundCount(nextRound);

    // clear highlight after a short delay so user sees it
    await sleep(800);
    setChangedEntries((prev) => {
      const copy = { ...copyObject(prev) };
      delete copy[nextRound];
      return copy;
    });

    setIsAnimating(false);
  };

  // Animate converge: run rounds with animation until no changes
  const animateConverge = async () => {
    if (!nodes.length) {
      alert("Add nodes/links first");
      return;
    }
    if (isAnimating) return;
    setIsAnimating(true);

    let tables = JSON.parse(JSON.stringify(routingTables));
    // initialize if needed
    if (!Object.keys(tables).length) {
      tables = {};
      nodes.forEach((n) => {
        tables[n.id] = {};
        nodes.forEach((d) => {
          tables[n.id][d.id] = {
            cost: n.id === d.id ? 0 : Infinity,
            nextHop: n.id === d.id ? n.id : "-",
            state: n.id === d.id ? "valid" : "invalid",
          };
        });
      });
      links.forEach((l) => {
        const s = getLinkId(l.source);
        const t = getLinkId(l.target);
        tables[s][t] = { cost: linkCost, nextHop: t, state: "valid" };
        tables[t][s] = { cost: linkCost, nextHop: s, state: "valid" };
      });
      setRoutingTables(JSON.parse(JSON.stringify(tables)));
    }

    const maxRounds = 200;
    let round = 0;
    while (round < maxRounds) {
      round++;
      // animate packets for this round
      await animatePacketsOneRound(300);

      const { updatedTables, changed, roundChanges } =
        performOneRoundWithDiff(tables);

      setChangedEntries((prev) => ({
        ...prev,
        [roundCount + 1]: roundChanges,
      }));
      setRoutingTables(JSON.parse(JSON.stringify(updatedTables)));
      setRoundCount((c) => c + 1);

      // wait so user sees highlight
      // eslint-disable-next-line no-await-in-loop
      await sleep(700);

      // clear highlight for this round
      setChangedEntries((prev) => {
        const copy = { ...copyObject(prev) };
        delete copy[roundCount + 1];
        return copy;
      });

      tables = updatedTables;
      if (!changed) {
        // converged
        break;
      }
    }

    setIsAnimating(false);
  };

  // helper to deep copy plain object
  function copyObject(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  // helper to check if a given router,dest pair changed in a given round
  const didChangeInRound = (round, router, dest) => {
    if (!changedEntries[round]) return false;
    const arr = changedEntries[round][router];
    if (!arr) return false;
    return arr.includes(dest);
  };

  // UI
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

      <div style={{ marginTop: 12 }}>
        <button
          onClick={stepOneRound}
          disabled={isAnimating}
          style={{ padding: "8px 12px" }}
        >
          Step Round
        </button>
        <button
          onClick={animateConverge}
          disabled={isAnimating}
          style={{ padding: "8px 12px", marginLeft: 8 }}
        >
          Animate Converge
        </button>
        <button
          onClick={() => {
            // reset highlights and round counter (but keep topology)
            setChangedEntries({});
            setRoundCount(0);
            // reinitialize routing tables
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
              if (newTables[s])
                newTables[s][t] = {
                  cost: linkCost,
                  nextHop: t,
                  state: "valid",
                };
              if (newTables[t])
                newTables[t][s] = {
                  cost: linkCost,
                  nextHop: s,
                  state: "valid",
                };
            });
            setRoutingTables(newTables);
          }}
          style={{ padding: "8px 12px", marginLeft: 8 }}
          disabled={isAnimating}
        >
          Reset Tables
        </button>

        <button
          onClick={downloadCSV}
          style={{ padding: "8px 12px", marginLeft: 8 }}
          disabled={isAnimating}
        >
          Download Routing Tables CSV
        </button>
      </div>

      <h3 style={{ marginTop: 18 }}>
        Routing Tables (changed entries highlighted)
      </h3>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: "12px",
          marginTop: "12px",
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
                fontSize: "13px",
              }}
            >
              <thead>
                <tr style={{ background: "#eee" }}>
                  <th style={{ padding: "6px" }}>Destination</th>
                  <th>Cost (hops)</th>
                  <th>Next Hop</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(table).map(([dest, entry]) => {
                  const highlight = didChangeInRound(roundCount, router, dest);
                  return (
                    <tr
                      key={dest}
                      style={{
                        background: highlight
                          ? "rgba(255, 235, 130, 0.9)"
                          : "transparent",
                      }}
                    >
                      <td style={{ padding: "6px" }}>{dest}</td>
                      <td>{entry.cost === Infinity ? "∞" : entry.cost}</td>
                      <td>{entry.nextHop}</td>
                      <td>{entry.state || "valid"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 12, color: "#666", fontSize: 13 }}>
        Notes: Each link equals 1 hop. Split-horizon with poisoned reverse is
        used. The animation shows packets (green dots) representing full-table
        exchanges and highlights entries that changed in the most recent round.
      </div>
    </div>
  );
}
