import React, { useState } from 'react';
import { TextField, Button, Box } from '@mui/material';
import axios from 'axios';

const ApplicationForm = () => {
  const [formData, setFormData] = useState({
    application_id: '',
    application_name: '',
    capability_name: '',
    api_name: '',
    api_endpoint: '',
    upstream_applications: [],
    downstream_applications: [],
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const addUpstream = () => {
    setFormData({ ...formData, upstream_applications: [...formData.upstream_applications, ''] });
  };

  const handleSubmit = async () => {
    await axios.post('http://localhost:8000/applications', formData);
    alert('Application saved!');
  };

  return (
    <Box>
      <TextField name="application_id" label="Application ID" onChange={handleChange} />
      <TextField name="application_name" label="Application Name" onChange={handleChange} />
      <TextField name="capability_name" label="Capability Name" onChange={handleChange} />
      <TextField name="api_name" label="API Name" onChange={handleChange} />
      <TextField name="api_endpoint" label="API Endpoint" onChange={handleChange} />
      <Button onClick={addUpstream}>Add Upstream App</Button>
      <Button onClick={handleSubmit}>Save</Button>
    </Box>
  );
};

export default ApplicationForm;