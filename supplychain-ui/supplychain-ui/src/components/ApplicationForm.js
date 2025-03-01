import React, { useState } from 'react';
import {
  Typography,
  TextField,
  Button,
  Box,
  Grid,
  IconButton,
  Container,
  Paper
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import axios from 'axios';

const ApplicationForm = () => {
  const [formData, setFormData] = useState({
    applicationId: '',
    applicationName: '',
    capabilityName: '',
    apiName: '',
    apiEndpoint: '',
    upstreamApps: [{ appId: '', appName: '' }],
    downstreamApps: [{ appId: '', appName: '' }]
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleUpstreamChange = (index, field, value) => {
    const newUpstreamApps = [...formData.upstreamApps];
    newUpstreamApps[index][field] = value;
    setFormData({
      ...formData,
      upstreamApps: newUpstreamApps
    });
  };

  const handleDownstreamChange = (index, field, value) => {
    const newDownstreamApps = [...formData.downstreamApps];
    newDownstreamApps[index][field] = value;
    setFormData({
      ...formData,
      downstreamApps: newDownstreamApps
    });
  };

  const addUpstreamApp = () => {
    setFormData({
      ...formData,
      upstreamApps: [...formData.upstreamApps, { appId: '', appName: '' }]
    });
  };

  const addDownstreamApp = () => {
    setFormData({
      ...formData,
      downstreamApps: [...formData.downstreamApps, { appId: '', appName: '' }]
    });
  };

  const removeUpstreamApp = (index) => {
    const newUpstreamApps = formData.upstreamApps.filter((_, i) => i !== index);
    setFormData({
      ...formData,
      upstreamApps: newUpstreamApps
    });
  };

  const removeDownstreamApp = (index) => {
    const newDownstreamApps = formData.downstreamApps.filter((_, i) => i !== index);
    setFormData({
      ...formData,
      downstreamApps: newDownstreamApps
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      console.log('Sending data:', formData);
      const response = await axios.post('http://localhost:5000/api/applications', formData, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Response:', response.data);
      
      if (response.status === 200 || response.status === 201) {
        alert('Application saved successfully');
        setFormData({
          applicationId: '',
          applicationName: '',
          capabilityName: '',
          apiName: '',
          apiEndpoint: '',
          upstreamApps: [{ appId: '', appName: '' }],
          downstreamApps: [{ appId: '', appName: '' }]
        });
      }
    } catch (error) {
      console.error('Error details:', error.response || error);
      alert(`Error saving application: ${error.response?.data?.message || error.message}`);
    }
  };

  return (
    <Container maxWidth="md">
      <Paper elevation={3} sx={{ p: 3, mt: 3 }}>
        <Typography variant="h5" gutterBottom>
          Application Supply Chain Details
        </Typography>
        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Application ID"
                name="applicationId"
                value={formData.applicationId}
                onChange={handleInputChange}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Application Name"
                name="applicationName"
                value={formData.applicationName}
                onChange={handleInputChange}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Capability Name"
                name="capabilityName"
                value={formData.capabilityName}
                onChange={handleInputChange}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="API Name"
                name="apiName"
                value={formData.apiName}
                onChange={handleInputChange}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="API Endpoint"
                name="apiEndpoint"
                value={formData.apiEndpoint}
                onChange={handleInputChange}
              />
            </Grid>

            {/* Upstream Applications */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Upstream Applications
              </Typography>
              {formData.upstreamApps.map((app, index) => (
                <Box key={index} sx={{ display: 'flex', gap: 2, mb: 2 }}>
                  <TextField
                    label="App ID"
                    value={app.appId}
                    onChange={(e) => handleUpstreamChange(index, 'appId', e.target.value)}
                  />
                  <TextField
                    label="App Name"
                    value={app.appName}
                    onChange={(e) => handleUpstreamChange(index, 'appName', e.target.value)}
                  />
                  <IconButton 
                    onClick={() => removeUpstreamApp(index)} 
                    color="error"
                    disabled={formData.upstreamApps.length === 1}
                  >
                    <RemoveIcon />
                  </IconButton>
                </Box>
              ))}
              <Button
                startIcon={<AddIcon />}
                onClick={addUpstreamApp}
                variant="outlined"
                sx={{ mt: 1 }}
              >
                Add Upstream App
              </Button>
            </Grid>

            {/* Downstream Applications */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Downstream Applications
              </Typography>
              {formData.downstreamApps.map((app, index) => (
                <Box key={index} sx={{ display: 'flex', gap: 2, mb: 2 }}>
                  <TextField
                    label="App ID"
                    value={app.appId}
                    onChange={(e) => handleDownstreamChange(index, 'appId', e.target.value)}
                  />
                  <TextField
                    label="App Name"
                    value={app.appName}
                    onChange={(e) => handleDownstreamChange(index, 'appName', e.target.value)}
                  />
                  <IconButton 
                    onClick={() => removeDownstreamApp(index)} 
                    color="error"
                    disabled={formData.downstreamApps.length === 1}
                  >
                    <RemoveIcon />
                  </IconButton>
                </Box>
              ))}
              <Button
                startIcon={<AddIcon />}
                onClick={addDownstreamApp}
                variant="outlined"
                sx={{ mt: 1 }}
              >
                Add Downstream App
              </Button>
            </Grid>

            <Grid item xs={12}>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                fullWidth
                sx={{ mt: 2 }}
              >
                Save Application
              </Button>
            </Grid>
          </Grid>
        </form>
      </Paper>
    </Container>
  );
};

export default ApplicationForm;