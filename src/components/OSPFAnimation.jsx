import React, { useState, useRef, useEffect } from 'react';
import * as d3 from 'd3';
import Papa from 'papaparse';

export default function OSPFAnimation() {
  const [nodes, setNodes] = useState([]);
  const [links, setLinks] = useState([]);
  const [source, setSource] = useState('');
  const [target, setTarget] = useState('');
  const [cost, setCost] = useState('');
  const [localRouter, setLocalRouter] = useState('');
  const [routingTable, setRoutingTable] = useState([]);
  const svgRef = useRef();

  const clearTopology = () => {
    setNodes([]);
    setLinks([]);
    setRoutingTable([]);
    setLocalRouter('');
    d3.select(svgRef.current).selectAll('*').remove();
    console.log('Topology cleared.');
  };

  // D3 Visualization
  useEffect(() => {
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = 700;
    const height = 450;

    const simulation = d3
      .forceSimulation(nodes)
      .force('link', d3.forceLink(links).id(d => d.id).distance(150))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2));

    // Links
    const link = svg
      .selectAll('.link')
      .data(links)
      .enter()
      .append('line')
      .attr('class', 'link')
      .attr('stroke', '#999')
      .attr('stroke-width', 2);

    const linkLabels = svg
      .selectAll('.link-label')
      .data(links)
      .enter()
      .append('text')
      .attr('class', 'link-label')
      .attr('font-size', '12px')
      .attr('fill', '#000')
      .text(d => d.cost);

    // Nodes (routers)
    const node = svg
      .selectAll('image')
      .data(nodes)
      .enter()
      .append('image')
      .attr('xlink:href', d => '/modem.png')
      .attr('width', 45)
      .attr('height', 45)
      .attr('x', d => d.x - 22)
      .attr('y', d => d.y - 22)
      .attr('filter', d => (d.id === localRouter ? 'drop-shadow(0 0 6px tomato)' : null))
      .call(
        d3
          .drag()
          .on('start', dragStarted)
          .on('drag', dragged)
          .on('end', dragEnded)
      );

    // Labels
    const labels = svg
      .selectAll('.label')
      .data(nodes)
      .enter()
      .append('text')
      .attr('class', 'label')
      .attr('text-anchor', 'middle')
      .attr('dy', 5)
      .attr('font-size', '12px')
      .attr('fill', 'black')
      .text(d => d.id);

    simulation.on('tick', () => {
      link
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y);

      linkLabels
        .attr('x', d => (d.source.x + d.target.x) / 2)
        .attr('y', d => (d.source.y + d.target.y) / 2);

      node.attr('x', d => d.x - 22).attr('y', d => d.y - 22);

      labels.attr('x', d => d.x).attr('y', d => d.y + 35);
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

  const handleAddLink = () => {
    if (!source || !target || !cost) {
      alert('Please fill in all fields.');
      return;
    }

    const parsedCost = parseInt(cost, 10);
    if (parsedCost < 0) {
      alert('Cost cannot be negative.');
      return;
    }

    if (!nodes.find(n => n.id === source)) {
      setNodes(prev => [...prev, { id: source, x: Math.random() * 700, y: Math.random() * 450 }]);
    }

    if (!nodes.find(n => n.id === target)) {
      setNodes(prev => [...prev, { id: target, x: Math.random() * 700, y: Math.random() * 450 }]);
    }

    const existing = links.find(
      l =>
        (l.source.id === source && l.target.id === target) ||
        (l.source.id === target && l.target.id === source)
    );

    if (existing) {
      const confirmUpdate = window.confirm(`Link between ${source} and ${target} exists. Update cost?`);
      if (!confirmUpdate) return;

      setLinks(prev =>
        prev.map(l =>
          (l.source.id === source && l.target.id === target) || (l.source.id === target && l.target.id === source)
            ? { ...l, cost: parsedCost }
            : l
        )
      );
    } else {
      setLinks(prev => [...prev, { source, target, cost: parsedCost }]);
    }

    setSource('');
    setTarget('');
    setCost('');
  };

  const handleCSVUpload = e => {
    const file = e.target.files[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: results => {
        const data = results.data;
        const newNodes = new Set(nodes.map(n => n.id));
        const newLinks = [...links];

        data.forEach(row => {
          const { source: src, target: tgt, cost: c } = row;
          if (!newNodes.has(src)) newNodes.add(src);
          if (!newNodes.has(tgt)) newNodes.add(tgt);
          newLinks.push({ source: src, target: tgt, cost: parseInt(c, 10) });
        });

        setNodes([...Array.from(newNodes)].map(id => ({ id })));
        setLinks(newLinks);
      },
    });
  };

  const downloadCSV = () => {
    if (!routingTable.length) return;
    const csv = Papa.unparse(routingTable);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'routing_table.csv';
    link.click();
  };

  const runOSPF = async () => {
    const svg = d3.select(svgRef.current);
    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    const visited = new Set();

    if (!localRouter || !nodeMap.has(localRouter)) {
      alert('Please enter a valid Local Router ID present in the graph.');
      return;
    }

    async function flood(currentId) {
      if (visited.has(currentId)) return;
      visited.add(currentId);

      const current = nodeMap.get(currentId);
      const neighbors = links.filter(l => l.source.id === currentId || l.target.id === currentId);

      const promises = neighbors.map(
        link =>
          new Promise(resolve => {
            const neighborId = link.source.id === currentId ? link.target.id : link.source.id;
            const neighbor = nodeMap.get(neighborId);

            const packet = svg
              .append('circle')
              .attr('r', 6)
              .attr('fill', 'orange')
              .attr('cx', current.x)
              .attr('cy', current.y);

            packet
              .transition()
              .duration(1000)
              .attr('cx', neighbor.x)
              .attr('cy', neighbor.y)
              .on('end', () => {
                packet.remove();
                flood(neighborId).then(resolve);
              });
          })
      );

      await Promise.all(promises);
    }

    await flood(localRouter);
    runDijkstra(svg, nodeMap);
  };

  const runDijkstra = (svg, nodeMap) => {
    const dist = {};
    const prev = {};
    const unvisited = new Set(nodes.map(n => n.id));

    nodes.forEach(n => {
      dist[n.id] = Infinity;
    });

    dist[localRouter] = 0;

    while (unvisited.size > 0) {
      const current = Array.from(unvisited).reduce((a, b) => (dist[a] < dist[b] ? a : b));
      unvisited.delete(current);

      const neighbors = links.filter(
        l =>
          (l.source.id === current && unvisited.has(l.target.id)) ||
          (l.target.id === current && unvisited.has(l.source.id))
      );

      neighbors.forEach(link => {
        const neighborId = link.source.id === current ? link.target.id : link.source.id;
        const alt = dist[current] + link.cost;
        if (alt < dist[neighborId]) {
          dist[neighborId] = alt;
          prev[neighborId] = current;
        }
      });
    }

    svg.selectAll('.link').attr('stroke', '#999').attr('stroke-width', 2);

    Object.keys(prev).forEach(nodeId => {
      const parent = prev[nodeId];
      if (!parent) return;

      svg
        .selectAll('.link')
        .filter(d => (d.source.id === nodeId && d.target.id === parent) || (d.source.id === parent && d.target.id === nodeId))
        .attr('stroke', 'green')
        .attr('stroke-width', 3);
    });

    svg.selectAll('.distance-label').remove();

    nodes.forEach(n => {
      const router = nodeMap.get(n.id);
      svg
        .append('text')
        .attr('class', 'distance-label')
        .attr('x', router.x + 25)
        .attr('y', router.y - 15)
        .attr('font-size', '11px')
        .attr('fill', 'green')
        .text(dist[n.id] === Infinity ? '∞' : `Cost: ${dist[n.id]}`);
    });

    const tableData = [];
    nodes.forEach(n => {
      if (n.id === localRouter) return;
      let hop = n.id;
      let parent = prev[hop];
      while (parent && parent !== localRouter) {
        hop = parent;
        parent = prev[hop];
      }
      tableData.push({
        destination: n.id,
        cost: dist[n.id] === Infinity ? '∞' : dist[n.id],
        nextHop: dist[n.id] === Infinity ? '-' : hop,
      });
    });

    setRoutingTable(tableData);
  };

  return (
    <div style={{ maxWidth: '900px', margin: 'auto' }}>
      <h2>OSPF Link-State Routing</h2>

      <div style={{ marginBottom: 10 }}>
        <label>Local Router ID:</label>
        <input
          type="text"
          value={localRouter}
          onChange={e => setLocalRouter(e.target.value.trim())}
          placeholder="Enter Local router ID"
          style={{ marginLeft: 10 }}
        />
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
        <input
          type="text"
          placeholder="Router A"
          value={source}
          onChange={e => setSource(e.target.value.trim())}
        />
        <input
          type="text"
          placeholder="Router B"
          value={target}
          onChange={e => setTarget(e.target.value.trim())}
        />
        <input
          type="number"
          placeholder="Cost"
          value={cost}
          onChange={e => setCost(e.target.value)}
        />
        <button onClick={handleAddLink}>Add Link</button>
      </div>

      <div style={{ marginBottom: 10 }}>
        <input type="file" accept=".csv" onChange={handleCSVUpload} />
      </div>

      <svg ref={svgRef} width={700} height={450} style={{ border: '1px solid #ccc', background: '#f8f9fa' }} />

      <div style={{ marginTop: 20 }}>
        <button onClick={runOSPF} style={{ padding: '10px 15px' }}>
          Run OSPF
        </button>
        <button onClick={downloadCSV} style={{ padding: '10px 15px', marginLeft: 10 }}>
          Download Routing Table CSV
        </button>
        <button onClick={clearTopology} style={{ padding: '10px 15px', marginLeft: 10 }}>
          Clear Topology
        </button>
      </div>

      {routingTable.length > 0 && (
        <div style={{ marginTop: 30 }}>
          <h3>OSPF Routing Table</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', background: '#f9f9f9' }}>
            <thead style={{ background: '#444', color: 'white' }}>
              <tr>
                <th style={{ padding: '8px', border: '1px solid #ccc' }}>Destination</th>
                <th style={{ padding: '8px', border: '1px solid #ccc' }}>Cost</th>
                <th style={{ padding: '8px', border: '1px solid #ccc' }}>Next Hop</th>
              </tr>
            </thead>
            <tbody>
              {routingTable.map((row, i) => (
                <tr key={i}>
                  <td style={{ padding: '8px', border: '1px solid #ccc' }}>{row.destination}</td>
                  <td style={{ padding: '8px', border: '1px solid #ccc' }}>{row.cost}</td>
                  <td style={{ padding: '8px', border: '1px solid #ccc' }}>{row.nextHop}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
