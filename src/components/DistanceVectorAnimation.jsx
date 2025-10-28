import React, { useState, useRef, useEffect } from "react";
import * as d3 from "d3";
import Papa from "papaparse";

export default function DistanceVectorAnimation() {
  const [nodes, setNodes] = useState([]);
  const [links, setLinks] = useState([]);
  const [routingTables, setRoutingTables] = useState({});
  const [changedEntries, setChangedEntries] = useState({});
  const [localRouter, setLocalRouter] = useState("");
  const [roundCount, setRoundCount] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [source, setSource] = useState("");
  const [target, setTarget] = useState("");
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

  const handleCSVUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const data = results.data;
        const nodeSet = new Set(nodes.map((n) => n.id));
        const newLinks = [...links];

        data.forEach((row) => {
          const sourceId = row.source?.toString().trim();
          const targetId = row.target?.toString().trim();
          if (!sourceId || !targetId || sourceId === targetId) return;

          if (!nodeSet.has(sourceId)) nodeSet.add(sourceId);
          if (!nodeSet.has(targetId)) nodeSet.add(targetId);

          const exists = newLinks.some(
            (link) =>
              (getLinkId(link.source) === sourceId &&
                getLinkId(link.target) === targetId) ||
              (getLinkId(link.source) === targetId &&
                getLinkId(link.target) === sourceId)
          );
          if (!exists) newLinks.push({ source: sourceId, target: targetId });
        });

        setNodes(
          [...Array.from(nodeSet)].map((id) => ({
            id,
            x: Math.random() * 700,
            y: Math.random() * 450,
          }))
        );
        setLinks(newLinks);
      },
    });
  };

  const handleAddLink = () => {
    if (!source || !target) {
      alert("Please fill in source and target.");
      return;
    }
    if (source === target) {
      alert("Source and target cannot be same.");
      return;
    }

    if (!nodes.find((n) => n.id === source)) {
      setNodes((prev) => [
        ...prev,
        { id: source, x: Math.random() * 700, y: Math.random() * 450 },
      ]);
    }

    if (!nodes.find((n) => n.id === target)) {
      setNodes((prev) => [
        ...prev,
        { id: target, x: Math.random() * 700, y: Math.random() * 450 },
      ]);
    }

    const exists = links.some(
      (l) =>
        (getLinkId(l.source) === source && getLinkId(l.target) === target) ||
        (getLinkId(l.source) === target && getLinkId(l.target) === source)
    );

    if (exists) {
      const confirmUpdate = window.confirm(
        `Link between ${source} and ${target} already exists. Do nothing?`
      );
      if (!confirmUpdate) return;
    } else {
      setLinks((prev) => [...prev, { source, target }]);
    }

    setSource("");
    setTarget("");
  };

  const downloadCSV = () => {
    if (!Object.keys(routingTables).length) return;

    const allData = [];

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

  /** ----------------- ROUTING LOGIC (Distance Vector / RIP-like) ----------------- */
  const getNeighborsOf = (nodeId) =>
    links
      .filter(
        (link) =>
          getLinkId(link.source) === nodeId || getLinkId(link.target) === nodeId
      )
      .map((link) =>
        getLinkId(link.source) === nodeId
          ? getLinkId(link.target)
          : getLinkId(link.source)
      );

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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

        // node advertises its table to neighbor
        Object.keys(nodeTable).forEach((dest) => {
          const entry = nodeTable[dest];
          // split horizon with poisoned reverse
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

    // Ensure every router has entries for all destinations
    Object.keys(updatedTables).forEach((router) => {
      nodes.forEach((n) => {
        if (!updatedTables[router][n.id]) {
          updatedTables[router][n.id] = {
            cost: Infinity,
            nextHop: "-",
            state: "invalid",
          };
        }
      });
    });

    const roundChangesObj = {};
    Object.entries(roundChanges).forEach(([router, destSet]) => {
      roundChangesObj[router] = Array.from(destSet);
    });

    return {
      updatedTables,
      changed: anyChanged,
      roundChanges: roundChangesObj,
    };
  };

  const copyObject = (obj) => JSON.parse(JSON.stringify(obj));

  /** ----------------- ANIMATION ----------------- */
  const animatePacketsOneRound = async (durationPerPacket = 700) => {
    const svg = d3.select(svgRef.current);

    for (let i = 0; i < nodes.length; i += 1) {
      const node = nodes[i];
      const neighLinks = links.filter(
        (link) =>
          getLinkId(link.source) === node.id ||
          getLinkId(link.target) === node.id
      );

      for (let j = 0; j < neighLinks.length; j += 1) {
        const link = neighLinks[j];
        const sourceObj =
          getLinkId(link.source) === node.id ? link.source : link.target;
        const targetObj =
          getLinkId(link.source) === node.id ? link.target : link.source;

        if (!sourceObj.x || !targetObj.x) continue;

        const packet = svg
          .append("circle")
          .attr("r", 5)
          .attr("fill", "limegreen")
          .attr("cx", sourceObj.x)
          .attr("cy", sourceObj.y);

        packet
          .transition()
          .duration(durationPerPacket)
          .attrTween(
            "cx",
            () => (t) => sourceObj.x + t * (targetObj.x - sourceObj.x)
          )
          .attrTween(
            "cy",
            () => (t) => sourceObj.y + t * (targetObj.y - sourceObj.y)
          )
          .on("end", () => packet.remove());

        await sleep(100);
      }
      await sleep(50);
    }
  };

  const animateConverge = async () => {
    if (!nodes.length) return alert("Add nodes/links first");
    if (isAnimating) return;

    setIsAnimating(true);
    let tables = copyObject(routingTables);
    const maxRounds = 200;
    let round = 0;

    while (round < maxRounds) {
      round += 1;
      await animatePacketsOneRound(600);

      const { updatedTables, changed, roundChanges } =
        performOneRoundWithDiff(tables);

      setChangedEntries((prev) => ({
        ...prev,
        [roundCount + 1]: roundChanges,
      }));
      setRoutingTables(copyObject(updatedTables));
      setRoundCount((c) => c + 1);

      await sleep(1000);
      setChangedEntries((prev) => {
        const copy = copyObject(prev);
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

    const nodeImages = svg
      .selectAll("image")
      .data(nodes)
      .enter()
      .append("image")
      .attr("xlink:href", "/modem.png")
      .attr("width", 45)
      .attr("height", 45)
      .attr("x", (d) => d.x - 22)
      .attr("y", (d) => d.y - 22);

    const nodeLabels = svg
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

      nodeImages.attr("x", (d) => d.x - 22).attr("y", (d) => d.y - 22);
      nodeLabels.attr("x", (d) => d.x).attr("y", (d) => d.y + 35);
    });

    return () => simulation.stop();
  }, [nodes, links]);

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

    links.forEach((link) => {
      const sourceId = getLinkId(link.source);
      const targetId = getLinkId(link.target);
      if (newTables[sourceId])
        newTables[sourceId][targetId] = {
          cost: linkCost,
          nextHop: targetId,
          state: "valid",
        };
      if (newTables[targetId])
        newTables[targetId][sourceId] = {
          cost: linkCost,
          nextHop: sourceId,
          state: "valid",
        };
    });

    setRoutingTables(newTables);
    setChangedEntries({});
    setRoundCount(0);
  }, [nodes, links]);

  /** ----------------- UI ----------------- */
  return (
    <div style={{ maxWidth: "900px", margin: "auto" }}>
      <h2>RIP / Distance Vector </h2>

      <div style={{ marginBottom: 10 }}>
        <label>Local Router ID:</label>
        <input
          type="text"
          value={localRouter}
          onChange={(e) => setLocalRouter(e.target.value.trim())}
          placeholder="Enter Local router ID"
          style={{ marginLeft: 10 }}
        />
        <span style={{ marginLeft: 20, fontSize: 13, color: "#555" }}>
          Round: <strong>{roundCount}</strong>
        </span>
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 10 ,justifyContent: 'center',  alignItems: 'center' }}>
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
        <button onClick={animateConverge} style={{ padding: "10px 15px" }}>
          Run Distance Vector 
        </button>
        <button
          onClick={downloadCSV}
          style={{ padding: "10px 15px", marginLeft: 10 }}
        >
          Download CSV
        </button>
        <button
          onClick={clearTopology}
          style={{ padding: "10px 15px", marginLeft: 10 }}
        >
          Clear Topology
        </button>
      </div>

      <div style={{ marginTop: 20 }}>
        <h3>Routing Tables</h3>
        {Object.keys(routingTables).length === 0 ? (
          <p>No routing tables available.</p>
        ) : (
          <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
            {Object.entries(routingTables).map(([router, table]) => (
              <table
                key={router}
                style={{ borderCollapse: "collapse", border: "1px solid #ccc" }}
              >
                <thead>
                  <tr>
                    <th
                      colSpan={4}
                      style={{ border: "1px solid #ccc", padding: 5 }}
                    >
                      Router {router}
                    </th>
                  </tr>
                  <tr>
                    <th style={{ border: "1px solid #ccc", padding: 5 }}>
                      Destination
                    </th>
                    <th style={{ border: "1px solid #ccc", padding: 5 }}>
                      Cost
                    </th>
                    <th style={{ border: "1px solid #ccc", padding: 5 }}>
                      Next Hop
                    </th>
                    <th style={{ border: "1px solid #ccc", padding: 5 }}>
                      State
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(table).map(([dest, entry]) => (
                    <tr key={dest}>
                      <td style={{ border: "1px solid #ccc", padding: 5 }}>
                        {dest}
                      </td>
                      <td style={{ border: "1px solid #ccc", padding: 5 }}>
                        {entry.cost === Infinity ? "∞" : entry.cost}
                      </td>
                      <td style={{ border: "1px solid #ccc", padding: 5 }}>
                        {entry.nextHop}
                      </td>
                      <td style={{ border: "1px solid #ccc", padding: 5 }}>
                        {entry.state}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
