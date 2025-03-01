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
  Breadcrumbs,
  Link,
  Tooltip
} from '@mui/material';
import axios from 'axios';

const SupplyChainView = () => {
  const [applications, setApplications] = useState([]);
  const [selectedApp, setSelectedApp] = useState('');
  const [currentApp, setCurrentApp] = useState(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [applicationHistory, setApplicationHistory] = useState([]);

  useEffect(() => {
    const fetchApplications = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/applications');
        setApplications(response.data);
      } catch (error) {
        console.error('Error fetching applications:', error);
      }
    };
    fetchApplications();
  }, []);

  const fetchSupplyChain = async (appId, appName, isFromDropdown = false) => {
    if (!appId) return;

    if (!isFromDropdown && currentApp && currentApp.id === appId) {
      return;
    }

    try {
      const response = await axios.get(`http://localhost:5000/api/applications/${appId}/supply-chain`);
      const data = response.data;

      const hasConnections = data.upstreamApps.length > 0 || data.downstreamApps.length > 0;
      setCurrentApp({ id: appId, name: appName });

      if (!isFromDropdown) {
        setSelectedApp('');
      }

      const newNodes = [];
      const newEdges = [];

      // Add main application node
      newNodes.push({
        id: data.mainApp.applicationId,
        data: { 
          label: data.mainApp.applicationName,
          type: 'main',
          hasConnections
        },
        position: { x: 300, y: 200 },
        style: {
          background: '#2196f3',
          color: 'white',
          border: '1px solid #1976d2',
          padding: 10,
          cursor: hasConnections ? 'pointer' : 'default',
          opacity: hasConnections ? 1 : 0.7
        }
      });

      // Add upstream application nodes
      for (const app of data.upstreamApps) {
        try {
          const upstreamResponse = await axios.get(`http://localhost:5000/api/applications/${app.applicationId}/supply-chain`);
          const hasUpstreamConnections = upstreamResponse.data.upstreamApps.length > 0;

          newNodes.push({
            id: app.applicationId,
            data: { 
              label: app.applicationName,
              type: 'upstream',
              hasConnections: hasUpstreamConnections
            },
            position: { x: 100, y: 100 + (newNodes.length * 100) },
            style: {
              background: '#4caf50',
              color: 'white',
              border: '1px solid #388e3c',
              padding: 10,
              cursor: hasUpstreamConnections ? 'pointer' : 'default',
              opacity: hasUpstreamConnections ? 1 : 0.7
            }
          });

          newEdges.push({
            id: `${app.applicationId}-${data.mainApp.applicationId}`,
            source: app.applicationId,
            target: data.mainApp.applicationId,
            animated: true,
            style: { stroke: '#4caf50' }
          });
        } catch (error) {
          console.error('Error checking upstream connections:', error);
        }
      }

      // Add downstream application nodes
      for (const app of data.downstreamApps) {
        try {
          const downstreamResponse = await axios.get(`http://localhost:5000/api/applications/${app.applicationId}/supply-chain`);
          const hasDownstreamConnections = downstreamResponse.data.downstreamApps.length > 0;

          newNodes.push({
            id: app.applicationId,
            data: { 
              label: app.applicationName,
              type: 'downstream',
              hasConnections: hasDownstreamConnections
            },
            position: { x: 500, y: 100 + ((newNodes.length - 1) * 100) },
            style: {
              background: '#ff9800',
              color: 'white',
              border: '1px solid #f57c00',
              padding: 10,
              cursor: hasDownstreamConnections ? 'pointer' : 'default',
              opacity: hasDownstreamConnections ? 1 : 0.7
            }
          });

          newEdges.push({
            id: `${data.mainApp.applicationId}-${app.applicationId}`,
            source: data.mainApp.applicationId,
            target: app.applicationId,
            animated: true,
            style: { stroke: '#ff9800' }
          });
        } catch (error) {
          console.error('Error checking downstream connections:', error);
        }
      }

      setNodes(newNodes);
      setEdges(newEdges);

      if (hasConnections) {
        if (isFromDropdown) {
          setApplicationHistory([{ id: appId, name: appName }]);
        } else {
          setApplicationHistory(prev => [...prev, { id: appId, name: appName }]);
        }
      }

    } catch (error) {
      console.error('Error fetching supply chain:', error);
    }
  };

  const handleAppChange = (event) => {
    const appId = event.target.value;
    const selectedApplication = applications.find(app => app.id === appId);
    setSelectedApp(appId);
    if (selectedApplication) {
      fetchSupplyChain(appId, selectedApplication.name, true);
    }
  };

  const onNodeClick = (event, node) => {
    if (node.data.hasConnections) {
      fetchSupplyChain(node.id, node.data.label, false);
    }
  };

  const handleBreadcrumbClick = (appId, appName, index) => {
    setApplicationHistory(prev => prev.slice(0, index + 1));
    fetchSupplyChain(appId, appName, false);
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
              <MenuItem key={app.id} value={app.id}>
                {app.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {currentApp && (
          <Typography variant="subtitle1" gutterBottom sx={{ mb: 2 }}>
            Currently Viewing: {currentApp.name}
          </Typography>
        )}

        {applicationHistory.length > 0 && (
          <Breadcrumbs sx={{ mb: 2 }}>
            {applicationHistory.map((app, index) => (
              <Link
                key={app.id}
                component="button"
                onClick={() => handleBreadcrumbClick(app.id, app.name, index)}
                color={index === applicationHistory.length - 1 ? "text.primary" : "inherit"}
                underline={index === applicationHistory.length - 1 ? "none" : "hover"}
                sx={{ cursor: 'pointer' }}
              >
                {app.name}
              </Link>
            ))}
          </Breadcrumbs>
        )}

        <Box sx={{ height: 600, border: '1px solid #ccc' }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={onNodeClick}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable={true}
            fitView
          >
            <Background />
            <Controls />
            <MiniMap />
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
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ width: 20, height: 20, bgcolor: '#2196f3', opacity: 0.7 }} />
              <Typography variant="body2">No Further Connections</Typography>
            </Box>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
};

export default SupplyChainView; 