import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Graph } from 'vis-react';

const SupplyChainView = () => {
  const [selectedApp, setSelectedApp] = useState('');
  const [graphData, setGraphData] = useState({ nodes: [], edges: [] });

  const fetchSupplyChain = async (appId) => {
    const res = await axios.get(`http://localhost:8000/applications/${appId}/supply-chain`);
    const nodes = res.data[0].nodes.map(node => ({
      id: node.application_id,
      label: node.application_name,
    }));
    const edges = res.data[0].relationships.map(rel => ({
      from: rel.start_node.application_id,
      to: rel.end_node.application_id,
    }));
    setGraphData({ nodes, edges });
  };

  const options = {
    edges: { arrows: 'to' },
    height: '500px',
  };

  return (
    <div>
      <input type="text" onChange={(e) => setSelectedApp(e.target.value)} />
      <button onClick={() => fetchSupplyChain(selectedApp)}>Load Supply Chain</button>
      <Graph graph={graphData} options={options} events={{ select: (event) => setSelectedApp(event.nodes[0]) }} />
    </div>
  );
};

export default SupplyChainView;