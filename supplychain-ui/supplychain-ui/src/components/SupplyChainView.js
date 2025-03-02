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
  Divider,
} from '@mui/material';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import axios from 'axios';

const SupplyChainView = () => {
  const [applications, setApplications] = useState([]);
  const [selectedApp, setSelectedApp] = useState('');
  const [currentApp, setCurrentApp] = useState(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [navigationHistory, setNavigationHistory] = useState([]);

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/applications');
      const uniqueApps = response.data.reduce((acc, current) => {
        const x = acc.find(item => item.applicationName === current.applicationName);
        if (!x) {
          return acc.concat([current]);
        }
        return acc;
      }, []);
      
      const sortedApps = uniqueApps.sort((a, b) => 
        (a.applicationName || '').localeCompare(b.applicationName || '')
      );
      setApplications(sortedApps);
    } catch (error) {
      console.error('Error fetching applications:', error);
    }
  };

  const fetchSupplyChain = async (appId) => {
    try {
      const response = await axios.get(`http://localhost:5000/api/applications/${appId}/supply-chain`);
      if (response.data) {
        renderSupplyChain(response.data);
      }
    } catch (error) {
      console.error('Error fetching supply chain:', error);
      setNodes([]);
      setEdges([]);
    }
  };

  const handleAppChange = (event) => {
    const newAppId = event.target.value;
    if (newAppId === selectedApp) return;
    
    setSelectedApp(newAppId);
    if (newAppId) {
      const selectedApplication = applications.find(app => app.applicationId === newAppId);
      updateNavigationHistory(selectedApplication);
      fetchSupplyChain(newAppId);
    } else {
      setNodes([]);
      setEdges([]);
      setCurrentApp(null);
      setNavigationHistory([]);
    }
  };

  const updateNavigationHistory = (app) => {
    if (!app) return;
    
    setNavigationHistory(prev => {
      const newHistory = [...prev];
      const existingIndex = newHistory.findIndex(item => item.id === app.applicationId);
      
      if (existingIndex !== -1) {
        // Remove everything after the existing item
        newHistory.splice(existingIndex + 1);
      } else {
        newHistory.push({
          id: app.applicationId,
          name: app.applicationName
        });
      }
      return newHistory;
    });
    
    setCurrentApp({
      id: app.applicationId,
      name: app.applicationName
    });
  };

  const onNodeClick = async (event, node) => {
    // Prevent re-fetching for the same app
    if (node.id === selectedApp) {
      return;
    }

    try {
      // Update selected app and fetch its supply chain
      setSelectedApp(node.id);
      const clickedApp = applications.find(app => app.applicationId === node.id);
      
      if (clickedApp) {
        // Update navigation history
        updateNavigationHistory(clickedApp);
        
        // Fetch and display the supply chain for clicked app
        const response = await axios.get(`http://localhost:5000/api/applications/${node.id}/supply-chain`);
        if (response.data) {
          renderSupplyChain(response.data);
        }
      }
    } catch (error) {
      console.error('Error handling node click:', error);
    }
  };

  const renderSupplyChain = (data) => {
    const nodes = [];
    const edges = [];
    
    // Main application node (center)
    if (data.mainApp) {
      nodes.push({
        id: data.mainApp.applicationId,
        type: 'default',
        data: { 
          label: (
            <div style={{ padding: '10px', textAlign: 'center' }}>
              <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{data.mainApp.applicationName || 'Unknown'}</div>
            </div>
          ),
          type: 'main'
        },
        position: { x: 400, y: 300 },
        style: {
          background: '#2196f3',
          color: 'white',
          border: '1px solid #1976d2',
          borderRadius: '8px',
          width: 200,
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          cursor: 'default' // Main app not clickable
        }
      });
    }

    // Upstream applications (top)
    data.upstreamApps.forEach((app, index) => {
      if (!app.applicationId || !app.applicationName) return;
      
      const spacing = data.upstreamApps.length > 1 ? 250 : 0;
      const x = 400 + (index - (data.upstreamApps.length - 1) / 2) * spacing;
      const y = 100;

      nodes.push({
        id: app.applicationId,
        type: 'default',
        data: { 
          label: (
            <div style={{ 
              padding: '10px', 
              textAlign: 'center',
              cursor: 'pointer' // Indicate clickable
            }}>
              <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{app.applicationName || 'Unknown'}</div>
              <div style={{ fontSize: '12px', marginTop: '4px', color: 'rgba(255,255,255,0.8)' }}>
                Click to view details
              </div>
            </div>
          ),
          type: 'upstream'
        },
        position: { x, y },
        style: {
          background: '#4caf50',
          color: 'white',
          border: '1px solid #388e3c',
          borderRadius: '8px',
          width: 200,
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          cursor: 'pointer',
          '&:hover': {
            boxShadow: '0 6px 8px rgba(0, 0, 0, 0.2)',
            transform: 'translateY(-2px)'
          }
        }
      });

      edges.push({
        id: `e${app.applicationId}-${data.mainApp.applicationId}`,
        source: app.applicationId,
        target: data.mainApp.applicationId,
        type: 'smoothstep',
        animated: true,
        style: { stroke: '#4caf50', strokeWidth: 2 }
      });
    });

    // Downstream applications (bottom)
    data.downstreamApps.forEach((app, index) => {
      if (!app.applicationId || !app.applicationName) return;
      
      const spacing = data.downstreamApps.length > 1 ? 250 : 0;
      const x = 400 + (index - (data.downstreamApps.length - 1) / 2) * spacing;
      const y = 500;

      nodes.push({
        id: app.applicationId,
        type: 'default',
        data: { 
          label: (
            <div style={{ 
              padding: '10px', 
              textAlign: 'center',
              cursor: 'pointer' // Indicate clickable
            }}>
              <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{app.applicationName || 'Unknown'}</div>
              <div style={{ fontSize: '12px', marginTop: '4px', color: 'rgba(255,255,255,0.8)' }}>
                Click to view details
              </div>
            </div>
          ),
          type: 'downstream'
        },
        position: { x, y },
        style: {
          background: '#ff9800',
          color: 'white',
          border: '1px solid #f57c00',
          borderRadius: '8px',
          width: 200,
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          cursor: 'pointer',
          '&:hover': {
            boxShadow: '0 6px 8px rgba(0, 0, 0, 0.2)',
            transform: 'translateY(-2px)'
          }
        }
      });

      edges.push({
        id: `e${data.mainApp.applicationId}-${app.applicationId}`,
        source: data.mainApp.applicationId,
        target: app.applicationId,
        type: 'smoothstep',
        animated: true,
        style: { stroke: '#ff9800', strokeWidth: 2 }
      });
    });

    setNodes(nodes);
    setEdges(edges);
  };

  const handleBreadcrumbClick = (appId) => {
    if (appId === selectedApp) return;
    
    const app = applications.find(a => a.applicationId === appId);
    if (app) {
      setSelectedApp(appId);
      updateNavigationHistory(app);
      fetchSupplyChain(appId);
    }
  };

  return (
    <Container maxWidth="lg">
      <Paper elevation={3} sx={{ p: 3, mt: 3 }}>
        <Typography variant="h5" gutterBottom sx={{ mb: 3, color: '#1976d2' }}>
          Application Supply Chain
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
              <MenuItem 
                key={app.applicationId} 
                value={app.applicationId}
              >
                {app.applicationName || 'Unknown Application'}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {navigationHistory.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Breadcrumbs 
              separator={<NavigateNextIcon fontSize="small" />}
              aria-label="navigation"
            >
              {navigationHistory.map((app, index) => (
                <Link
                  key={app.id}
                  color={index === navigationHistory.length - 1 ? "text.primary" : "inherit"}
                  onClick={() => handleBreadcrumbClick(app.id)}
                  sx={{ 
                    cursor: 'pointer',
                    textDecoration: 'none',
                    '&:hover': {
                      textDecoration: 'underline'
                    }
                  }}
                >
                  {app.name}
                </Link>
              ))}
            </Breadcrumbs>
          </Box>
        )}

        <Divider sx={{ my: 2 }} />

        <Box sx={{ 
          height: 600, 
          border: '1px solid #e0e0e0', 
          borderRadius: '8px',
          bgcolor: '#f8f9fa',
          overflow: 'hidden'
        }}>
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

        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Legend:
          </Typography>
          <Box sx={{ 
            display: 'flex', 
            gap: 3, 
            mt: 1, 
            flexWrap: 'wrap',
            p: 2,
            bgcolor: '#fff',
            borderRadius: '8px',
            border: '1px solid #e0e0e0'
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ 
                width: 24, 
                height: 24, 
                bgcolor: '#2196f3',
                borderRadius: '4px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }} />
              <Typography variant="body2">Selected Application</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ 
                width: 24, 
                height: 24, 
                bgcolor: '#4caf50',
                borderRadius: '4px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }} />
              <Typography variant="body2">Upstream Applications</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ 
                width: 24, 
                height: 24, 
                bgcolor: '#ff9800',
                borderRadius: '4px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }} />
              <Typography variant="body2">Downstream Applications</Typography>
            </Box>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
};

export default SupplyChainView; 