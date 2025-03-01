import React, { useState, useEffect } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState
} from 'reactflow';
import 'reactflow/dist/style.css';
import {
  Box,
  Container,
  Paper,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import axios from 'axios';

const SupplyChainView = () => {
  const [applications, setApplications] = useState([]);
  const [selectedApp, setSelectedApp] = useState('');
  const [currentApp, setCurrentApp] = useState(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  useEffect(() => {
    const fetchApplications = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/applications');
        console.log('Applications:', response.data);
        setApplications(response.data);
      } catch (error) {
        console.error('Error fetching applications:', error);
      }
    };
    fetchApplications();
  }, []);

  const fetchSupplyChain = async (appId, appName, isFromDropdown = false) => {
    if (!appId) return;

    try {
      console.log('Fetching supply chain for:', appId);
      const response = await axios.get(`http://localhost:5000/api/applications/${appId}/supply-chain`);
      const data = response.data;
      console.log('Supply chain data:', data);

      // Calculate positions based on the number of nodes
      const verticalSpacing = 100;
      const horizontalSpacing = 250;
      
      const newNodes = [];
      const newEdges = [];

      // Position calculations
      const mainNodeY = Math.max(data.upstreamApps.length, data.downstreamApps.length) * verticalSpacing / 2;
      
      // Add main application node
      newNodes.push({
        id: data.mainApp.applicationId,
        type: 'default',
        data: { 
          label: data.mainApp.applicationName,
          type: 'main'
        },
        position: { x: horizontalSpacing, y: mainNodeY },
        style: {
          background: '#2196f3',
          color: 'white',
          border: '1px solid #1976d2',
          padding: 10,
          borderRadius: '5px',
          width: 180,
        }
      });

      // Add upstream nodes and edges
      data.upstreamApps.forEach((app, index) => {
        const nodeId = app.applicationId;
        newNodes.push({
          id: nodeId,
          type: 'default',
          data: { 
            label: app.applicationName,
            type: 'upstream'
          },
          position: { 
            x: 0,
            y: index * verticalSpacing
          },
          style: {
            background: '#4caf50',
            color: 'white',
            border: '1px solid #388e3c',
            padding: 10,
            borderRadius: '5px',
            width: 180,
            cursor: 'pointer'
          }
        });

        newEdges.push({
          id: `e-${nodeId}-${data.mainApp.applicationId}`,
          source: nodeId,
          target: data.mainApp.applicationId,
          type: 'smoothstep',
          animated: true,
          style: { stroke: '#4caf50', strokeWidth: 2 }
        });
      });

      // Add downstream nodes and edges
      data.downstreamApps.forEach((app, index) => {
        const nodeId = app.applicationId;
        newNodes.push({
          id: nodeId,
          type: 'default',
          data: { 
            label: app.applicationName,
            type: 'downstream'
          },
          position: { 
            x: horizontalSpacing * 2,
            y: index * verticalSpacing
          },
          style: {
            background: '#ff9800',
            color: 'white',
            border: '1px solid #f57c00',
            padding: 10,
            borderRadius: '5px',
            width: 180,
            cursor: 'pointer'
          }
        });

        newEdges.push({
          id: `e-${data.mainApp.applicationId}-${nodeId}`,
          source: data.mainApp.applicationId,
          target: nodeId,
          type: 'smoothstep',
          animated: true,
          style: { stroke: '#ff9800', strokeWidth: 2 }
        });
      });

      console.log('Setting nodes:', newNodes);
      console.log('Setting edges:', newEdges);
      
      setNodes(newNodes);
      setEdges(newEdges);
      setCurrentApp({ id: appId, name: appName });

    } catch (error) {
      console.error('Error fetching supply chain:', error);
    }
  };

  const handleAppChange = (event) => {
    const appId = event.target.value;
    const selectedApplication = applications.find(app => app.applicationId === appId);
    setSelectedApp(appId);
    if (selectedApplication) {
      fetchSupplyChain(appId, selectedApplication.applicationName, true);
    }
  };

  const onNodeClick = (event, node) => {
    fetchSupplyChain(node.id, node.data.label, false);
  };

  return (
    <Container maxWidth="lg">
      <Paper elevation={3} sx={{ p: 3, mt: 3 }}>
        <Typography variant="h5" gutterBottom>
          Application Supply Chain Visualization
        </Typography>
        
        <FormControl fullWidth sx={{ mb: 3 }}>
          <InputLabel>Select Application</InputLabel>
          <Select
            value={selectedApp}
            onChange={handleAppChange}
            label="Select Application"
          >
            <MenuItem value="">
              <em>None</em>
            </MenuItem>
            {applications.map((app) => (
              <MenuItem key={app.applicationId} value={app.applicationId}>
                {app.applicationName}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {currentApp && (
          <Typography variant="subtitle1" gutterBottom sx={{ mb: 2 }}>
            Currently Viewing: {currentApp.name}
          </Typography>
        )}

        <Box sx={{ height: 600, border: '1px solid #ccc', bgcolor: '#f5f5f5' }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={onNodeClick}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            minZoom={0.5}
            maxZoom={1.5}
            attributionPosition="bottom-left"
            nodesDraggable={false}
            nodesConnectable={false}
          >
            <Controls />
            <Background color="#aaa" gap={16} />
            <MiniMap 
              nodeStrokeColor={(n) => {
                if (n.data.type === 'main') return '#1976d2';
                if (n.data.type === 'upstream') return '#388e3c';
                if (n.data.type === 'downstream') return '#f57c00';
                return '#eee';
              }}
              nodeColor={(n) => {
                if (n.data.type === 'main') return '#2196f3';
                if (n.data.type === 'upstream') return '#4caf50';
                if (n.data.type === 'downstream') return '#ff9800';
                return '#fff';
              }}
            />
          </ReactFlow>
        </Box>

        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2" color="text.secondary">
            Legend:
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, mt: 1, flexWrap: 'wrap' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ width: 20, height: 20, bgcolor: '#2196f3' }} />
              <Typography variant="body2">Selected Application</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ width: 20, height: 20, bgcolor: '#4caf50' }} />
              <Typography variant="body2">Upstream Applications</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ width: 20, height: 20, bgcolor: '#ff9800' }} />
              <Typography variant="body2">Downstream Applications</Typography>
            </Box>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
};

export default SupplyChainView;