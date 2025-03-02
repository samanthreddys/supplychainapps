import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link as RouterLink } from 'react-router-dom';
import SupplyChainView from './components/SupplyChainView';
import ApplicationForm from './components/ApplicationForm';
import { AppBar, Toolbar, Typography, Button, Box, Container } from '@mui/material';

function App() {
  return (
    <Router>
      <Box sx={{ flexGrow: 1 }}>
        <AppBar position="static">
          <Toolbar>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              Supply Chain Management
            </Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button 
                color="inherit" 
                component={RouterLink} 
                to="/"
              >
                View Supply Chain
              </Button>
              <Button 
                color="inherit" 
                component={RouterLink} 
                to="/add-application"
              >
                Add Application
              </Button>
            </Box>
          </Toolbar>
        </AppBar>

        <Container maxWidth="lg" sx={{ mt: 4 }}>
          <Routes>
            <Route path="/" element={<SupplyChainView />} />
            <Route path="/add-application" element={<ApplicationForm />} />
          </Routes>
        </Container>
      </Box>
    </Router>
  );
}

export default App; 