import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Autocomplete,
  Grid,
  Chip,
  IconButton,
  Alert,
  Snackbar,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import axios from 'axios';

const AddApplication = () => {
  const [applications, setApplications] = useState([]);
  const [formData, setFormData] = useState({
    applicationId: '',
    applicationName: '',
    capabilityName: '',
    apiName: '',
    apiEndpoint: '',
    upstreamApps: [],
    downstreamApps: []
  });
  const [notification, setNotification] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  // Predefined capabilities for dropdown
  const capabilities = [
    'PaymentProcessing',
    'UserManagement',
    'OrderProcessing',
    'InventoryManagement',
    'NotificationService',
    'Authentication',
    'Reporting',
    'Analytics',
    'DataStorage',
    'Integration'
  ];

  // API name patterns for auto-suggestion
  const apiPatterns = [
    'Get',
    'Create',
    'Update',
    'Delete',
    'Process',
    'Manage',
    'Search',
    'List',
    'Validate',
    'Calculate'
  ];

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/applications');
      setApplications(response.data);
    } catch (error) {
      console.error('Error fetching applications:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Auto-generate API endpoint when API name changes
    if (name === 'apiName') {
      const endpoint = generateApiEndpoint(value);
      setFormData(prev => ({
        ...prev,
        apiEndpoint: endpoint
      }));
    }
  };

  const generateApiEndpoint = (apiName) => {
    if (!apiName) return '';
    const cleanName = apiName
      .replace(/API$/i, '')
      .replace(/([A-Z])/g, '-$1')
      .toLowerCase()
      .replace(/^-/, '');
    return `/api/v1${cleanName}`;
  };

  const handleUpstreamChange = (event, value) => {
    setFormData(prev => ({
      ...prev,
      upstreamApps: value.map(app => ({
        appId: app.applicationId,
        appName: app.applicationName
      }))
    }));
  };

  const handleDownstreamChange = (event, value) => {
    setFormData(prev => ({
      ...prev,
      downstreamApps: value.map(app => ({
        appId: app.applicationId,
        appName: app.applicationName
      }))
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:5000/api/applications', formData);
      setNotification({
        open: true,
        message: 'Application created successfully!',
        severity: 'success'
      });
      // Reset form
      setFormData({
        applicationId: '',
        applicationName: '',
        capabilityName: '',
        apiName: '',
        apiEndpoint: '',
        upstreamApps: [],
        downstreamApps: []
      });
      fetchApplications(); // Refresh applications list
    } catch (error) {
      setNotification({
        open: true,
        message: 'Error creating application: ' + error.message,
        severity: 'error'
      });
    }
  };

  const handleCloseNotification = () => {
    setNotification(prev => ({ ...prev, open: false }));
  };

  return (
    <Container maxWidth="lg">
      <Paper elevation={3} sx={{ p: 3, mt: 3 }}>
        <Typography variant="h5" gutterBottom>
          Add New Application
        </Typography>

        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            {/* Basic Application Details */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Basic Application Details
              </Typography>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Application ID"
                name="applicationId"
                value={formData.applicationId}
                onChange={handleInputChange}
                required
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Application Name"
                name="applicationName"
                value={formData.applicationName}
                onChange={handleInputChange}
                required
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <Autocomplete
                freeSolo
                options={capabilities}
                value={formData.capabilityName}
                onChange={(event, newValue) => {
                  setFormData(prev => ({
                    ...prev,
                    capabilityName: newValue
                  }));
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Capability Name"
                    name="capabilityName"
                    required
                  />
                )}
              />
            </Grid>

            {/* API Details */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                API Details
              </Typography>
            </Grid>

            <Grid item xs={12} md={6}>
              <Autocomplete
                freeSolo
                options={apiPatterns.map(pattern => `${pattern}${formData.applicationName.replace(/\s+/g, '')}API`)}
                value={formData.apiName}
                onChange={(event, newValue) => {
                  setFormData(prev => ({
                    ...prev,
                    apiName: newValue,
                    apiEndpoint: generateApiEndpoint(newValue)
                  }));
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="API Name"
                    name="apiName"
                    required
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="API Endpoint"
                name="apiEndpoint"
                value={formData.apiEndpoint}
                onChange={handleInputChange}
                required
              />
            </Grid>

            {/* Supply Chain Details */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Application Supply Chain Details
              </Typography>
            </Grid>

            <Grid item xs={12} md={6}>
              <Autocomplete
                multiple
                options={applications}
                getOptionLabel={(option) => {
                  if (typeof option === 'string') return option;
                  return option.applicationName || option.appName || '';
                }}
                value={formData.upstreamApps.map(app => ({
                  applicationId: app.appId,
                  applicationName: app.appName
                }))}
                onChange={handleUpstreamChange}
                isOptionEqualToValue={(option, value) => {
                  const optionId = option.applicationId || option.appId;
                  const valueId = value.applicationId || value.appId;
                  return optionId === valueId;
                }}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => {
                    const label = option.applicationName || option.appName;
                    return label ? (
                      <Chip
                        key={option.appId}
                        label={label}
                        {...getTagProps({ index })}
                        onDelete={() => {
                          const newUpstreamApps = formData.upstreamApps.filter(
                            (_, i) => i !== index
                          );
                          setFormData(prev => ({
                            ...prev,
                            upstreamApps: newUpstreamApps
                          }));
                        }}
                      />
                    ) : null;
                  }).filter(Boolean)
                }
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Upstream Applications"
                    placeholder="Select upstream applications"
                  />
                )}
                renderOption={(props, option) => (
                  <li {...props}>
                    {option.applicationName || option.appName}
                  </li>
                )}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <Autocomplete
                multiple
                options={applications}
                getOptionLabel={(option) => {
                  if (typeof option === 'string') return option;
                  return option.applicationName || option.appName || '';
                }}
                value={formData.downstreamApps.map(app => ({
                  applicationId: app.appId,
                  applicationName: app.appName
                }))}
                onChange={handleDownstreamChange}
                isOptionEqualToValue={(option, value) => {
                  const optionId = option.applicationId || option.appId;
                  const valueId = value.applicationId || value.appId;
                  return optionId === valueId;
                }}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => {
                    const label = option.applicationName || option.appName;
                    return label ? (
                      <Chip
                        key={option.appId}
                        label={label}
                        {...getTagProps({ index })}
                        onDelete={() => {
                          const newDownstreamApps = formData.downstreamApps.filter(
                            (_, i) => i !== index
                          );
                          setFormData(prev => ({
                            ...prev,
                            downstreamApps: newDownstreamApps
                          }));
                        }}
                      />
                    ) : null;
                  }).filter(Boolean)
                }
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Downstream Applications"
                    placeholder="Select downstream applications"
                  />
                )}
                renderOption={(props, option) => (
                  <li {...props}>
                    {option.applicationName || option.appName}
                  </li>
                )}
              />
            </Grid>

            <Grid item xs={12}>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                size="large"
                sx={{ mt: 2 }}
              >
                Create Application
              </Button>
            </Grid>
          </Grid>
        </form>

        <Snackbar
          open={notification.open}
          autoHideDuration={6000}
          onClose={handleCloseNotification}
        >
          <Alert
            onClose={handleCloseNotification}
            severity={notification.severity}
            sx={{ width: '100%' }}
          >
            {notification.message}
          </Alert>
        </Snackbar>
      </Paper>
    </Container>
  );
};

export default AddApplication; 