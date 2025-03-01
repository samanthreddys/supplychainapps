import React from 'react';
import { Container, Box, Tabs, Tab } from '@mui/material';
import ApplicationForm from './components/ApplicationForm';
import SupplyChainView from './components/SupplyChainView';

function App() {
  const [value, setValue] = React.useState(0);

  const handleChange = (event, newValue) => {
    setValue(newValue);
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ width: '100%', mt: 3 }}>
        <Tabs value={value} onChange={handleChange}>
          <Tab label="Add Application" />
          <Tab label="View Supply Chain" />
        </Tabs>
        <Box sx={{ mt: 2 }}>
          {value === 0 && <ApplicationForm />}
          {value === 1 && <SupplyChainView />}
        </Box>
      </Box>
    </Container>
  );
}

export default App;