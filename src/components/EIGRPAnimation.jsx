import React, { useState, useRef, useEffect } from 'react';
import * as d3 from 'd3';
import Papa from 'papaparse';



export default function EIGRPAnimation() {
  const [nodes, setNodes] = useState([]);
  const [links, setLinks] = useState([]);
  const [source, setSource] = useState('');
  const [target, setTarget] = useState('');
  const [cost, setCost] = useState('');
  const [localRouter, setLocalRouter] = useState('');
  const [routingTable, setRoutingTable] = useState([]);
  const svgRef = useRef();
  const fileInputRef = useRef(null);

  const clearTopology = () => {
  setNodes([]);
  setLinks([]);
  setRoutingTable([]);
  setLocalRouter('');

  
  d3.select(svgRef.current).selectAll('*').remove();

  
  if (fileInputRef.current) {
    fileInputRef.current.value = '';
  }

  console.log('Topology cleared.');
};


  useEffect(() => {
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = 700;
    const height = 450;

    const simulation = d3
      .forceSimulation(nodes)
      .force('link', d3.forceLink(links).id((d) => d.id).distance(150))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2));

    
    const link = svg
      .selectAll('.link')
      .data(links)
      .enter()
      .append('line')
      .attr('class', 'link')
      .attr('stroke', '#888')
      .attr('stroke-width', 2);

    
    const linkLabels = svg
      .selectAll('.link-label')
      .data(links)
      .enter()
      .append('text')
      .attr('class', 'link-label')
      .attr('font-size', '12px')
      .attr('fill', '#000')
      .text((d) => d.cost);

    
    const routerNode = svg
      .selectAll('image')
      .data(nodes)
      .enter()
      .append('image')
      .attr('xlink:href', '/modem.png')
      .attr('width', 45)
      .attr('height', 45)
      .attr('x', (d) => d.x - 22)
      .attr('y', (d) => d.y - 22)
      .attr('filter', (d) => (d.id === localRouter ? 'drop-shadow(0 0 6px tomato)' : null))
      .call(
        d3
          .drag()
          .on('start', dragStarted)
          .on('drag', dragged)
          .on('end', dragEnded)
      );

    
    const labels = svg
      .selectAll('.label')
      .data(nodes)
      .enter()
      .append('text')
      .attr('class', 'label')
      .attr('text-anchor', 'middle')
      .attr('dy', 5)
      .attr('font-size', '13px')
      .attr('fill', '#000000ff')
      .text((d) => d.id);

    simulation.on('tick', () => {
      link
        .attr('x1', (d) => d.source.x)
        .attr('y1', (d) => d.source.y)
        .attr('x2', (d) => d.target.x)
        .attr('y2', (d) => d.target.y);

      linkLabels
        .attr('x', (d) => (d.source.x + d.target.x) / 2)
        .attr('y', (d) => (d.source.y + d.target.y) / 2);

      routerNode
        .attr('x', (d) => d.x - 22)
        .attr('y', (d) => d.y - 22);

      labels.attr('x', (d) => d.x).attr('y', (d) => d.y + 35);
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

    if (parseInt(cost, 10) < 0) {
      alert('Cost cannot be negative.');
      return;
    }

    if (!nodes.find((n) => n.id === source)) {
      setNodes((prev) => [...prev, { id: source, x: Math.random() * 700, y: Math.random() * 450 }]);
    }

    if (!nodes.find((n) => n.id === target)) {
      setNodes((prev) => [...prev, { id: target, x: Math.random() * 700, y: Math.random() * 450 }]);
    }

    const existing = links.find(
      (l) =>
        (l.source.id === source && l.target.id === target) ||
        (l.source.id === target && l.target.id === source)
    );

    if (existing) {
      const confirmUpdate = window.confirm(`Link between ${source} and ${target} exists. Update cost?`);
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

    setSource('');
    setTarget('');
    setCost('');
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
      const errors = [];

      data.forEach((row, index) => {
        const src = row.source?.trim();
        const tgt = row.target?.trim();
        const c = parseInt(row.cost, 10);

        
        if (!src || !tgt || isNaN(c)) {
          errors.push(` Row ${index + 2}: Missing or invalid fields.`);
          return;
        }
        if (src === tgt) {
          errors.push(` Row ${index + 2}: Source and target cannot be the same (${src}).`);
          return;
        }
        if (c < 0) {
          errors.push(` Row ${index + 2}: Cost cannot be negative (${c}).`);
          return;
        }

        
        const duplicate = newLinks.find(
          (l) =>
            (l.source === src && l.target === tgt) ||
            (l.source === tgt && l.target === src)
        );
        if (duplicate) {
          errors.push(` Row ${index + 2}: Duplicate link between ${src} and ${tgt}.`);
          return;
        }

        
        newNodes.add(src);
        newNodes.add(tgt);
        newLinks.push({ source: src, target: tgt, cost: c });
      });

      if (errors.length > 0) {
        alert(`CSV upload failed with the following errors:\n\n${errors.join('\n')}`);
        console.warn("Invalid CSV entries:", errors);
        return;
      }

      setNodes([...Array.from(newNodes)].map((id) => ({ id })));
      setLinks(newLinks);
      alert(" CSV uploaded successfully!");
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

  const runEIGRP = async () => {
  const svg = d3.select(svgRef.current);
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  if (!localRouter || !nodeMap.has(localRouter)) {
    alert('Please enter a valid local router ID.');
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
  let iteration = 1;

  while (updated) {
    console.log(`🔄 EIGRP Update Round ${iteration++}`);
    updated = false;

    for (const router of nodes) {
      const connectedLinks = links.filter(
        (l) => l.source.id === router.id || l.target.id === router.id
      );

      for (const link of connectedLinks) {
        const neighborId =
          link.source.id === router.id ? link.target.id : link.source.id;

        for (const dest of nodes) {
          if (router.id === dest.id) continue;

          const newCost =
            distTable[router.id][neighborId] + distTable[neighborId][dest.id];

          if (newCost < distTable[router.id][dest.id]) {
            distTable[router.id][dest.id] = newCost;
            updated = true;

            
            const current = nodeMap.get(router.id);
            const neighbor = nodeMap.get(neighborId);

            const packet = svg
              .append('circle')
              .attr('r', 7)
              .attr('fill', 'orange')
              .attr('cx', current.x)
              .attr('cy', current.y)
              .style('opacity', 0.9);

            
            const trail = svg
              .append('line')
              .attr('x1', current.x)
              .attr('y1', current.y)
              .attr('x2', current.x)
              .attr('y2', current.y)
              .attr('stroke', 'orange')
              .attr('stroke-width', 2)
              .attr('opacity', 0.5);

            packet
              .transition()
              .duration(1500) // 
              .ease(d3.easeSin)
              .attr('cx', neighbor.x)
              .attr('cy', neighbor.y)
              .on('end', () => {
                packet.remove();
                trail
                  .transition()
                  .duration(500)
                  .attr('x2', neighbor.x)
                  .attr('y2', neighbor.y)
                  .style('opacity', 0)
                  .remove();
              });

            
            await new Promise((r) => setTimeout(r, 1200));
          }
        }
      }
    }

   
    await new Promise((r) => setTimeout(r, 2000));
  }

  
  const tableData = [];
  nodes.forEach((n) => {
    if (n.id === localRouter) return;
    const minCost = distTable[localRouter][n.id];
    let nextHop = '-';

    const connectedLinks = links.filter(
      (l) => l.source.id === localRouter || l.target.id === localRouter
    );
    for (const link of connectedLinks) {
      const neighborId =
        link.source.id === localRouter ? link.target.id : link.source.id;
      if (
        distTable[localRouter][neighborId] + distTable[neighborId][n.id] ===
        minCost
      ) {
        nextHop = neighborId;
        break;
      }
    }

    tableData.push({
      destination: n.id,
      cost: minCost === Infinity ? '∞' : minCost,
      nextHop,
    });
  });

  setRoutingTable(tableData);
};

  return (
    <div style={{ maxWidth: '900px', margin: 'auto', fontFamily: 'Inter, sans-serif' }}>
      <h2 style={{  alignItems: 'center', gap: 8 }}>EIGRP Visualization</h2>

      <div style={{ marginBottom: 10 }}>
        <label>Local Router ID: </label>
        <input
          type="text"
          value={localRouter}
          onChange={(e) => setLocalRouter(e.target.value.trim())}
          placeholder="Enter local router ID"
          style={{ marginLeft: 10 }}
        />
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 10 , justifyContent: 'center',    alignItems: 'center'}}>
        <input type="text" placeholder="Router A" value={source} onChange={(e) => setSource(e.target.value.trim())} />
        <input type="text" placeholder="Router B" value={target} onChange={(e) => setTarget(e.target.value.trim())} />
        <input type="number" placeholder="Cost" value={cost} onChange={(e) => setCost(e.target.value)} />
        <button type="button" onClick={handleAddLink}>Add Link</button>
      </div>

      <div style={{ marginBottom: 10 }}>
        <input type="file" accept=".csv" onChange={handleCSVUpload} ref={fileInputRef} />

      </div>

      <svg
        ref={svgRef}
        width={700}
        height={450}
        style={{ border: '1px solid #ccc', background: '#f8f9fa', borderRadius: '8px' }}
      />

      <div style={{ marginTop: 20 }}>
        <button type="button" onClick={runEIGRP} style={{ padding: '10px 15px' }}>Run EIGRP</button>
        <button type="button" onClick={downloadCSV} style={{ padding: '10px 15px', marginLeft: 10 }}>Download Routing Table</button>
        <button type="button" onClick={clearTopology} style={{ padding: '10px 15px', marginLeft: 10 }}>Clear Topology</button>
      </div>

      {routingTable.length > 0 && (
        <div style={{ marginTop: 30 }}>
          <h3>Final Routing Table</h3>
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
