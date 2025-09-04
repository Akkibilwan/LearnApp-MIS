import React from 'react';
import { Box, Typography, Card, CardContent, Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import { ExpandMore } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

interface DebugInfoProps {
  space?: any;
  groups?: any[];
  isAdmin?: boolean;
}

const DebugInfo: React.FC<DebugInfoProps> = ({ space, groups, isAdmin }) => {
  const { user } = useAuth();

  if (process.env.NODE_ENV === 'production') {
    return null; // Don't show in production
  }

  return (
    <Box sx={{ position: 'fixed', bottom: 16, right: 16, zIndex: 1000, maxWidth: 300 }}>
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Typography variant="body2">Debug Info</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ fontSize: '0.75rem' }}>
            <Typography variant="caption" display="block" gutterBottom>
              <strong>Current User:</strong>
            </Typography>
            <Typography variant="caption" display="block" gutterBottom>
              ID: {user?._id || 'null'}
            </Typography>
            <Typography variant="caption" display="block" gutterBottom>
              Username: {user?.username || 'null'}
            </Typography>
            <Typography variant="caption" display="block" gutterBottom>
              Role: {user?.role || 'null'}
            </Typography>
            
            <Typography variant="caption" display="block" gutterBottom sx={{ mt: 2 }}>
              <strong>Space Info:</strong>
            </Typography>
            <Typography variant="caption" display="block" gutterBottom>
              Space ID: {space?._id || 'null'}
            </Typography>
            <Typography variant="caption" display="block" gutterBottom>
              Admin ID: {space?.admin._id || 'null'}
            </Typography>
            <Typography variant="caption" display="block" gutterBottom>
              Is Admin: {isAdmin ? 'true' : 'false'}
            </Typography>
            <Typography variant="caption" display="block" gutterBottom>
              Groups Count: {groups?.length || 0}
            </Typography>
            
            <Typography variant="caption" display="block" gutterBottom sx={{ mt: 2 }}>
              <strong>Admin Check:</strong>
            </Typography>
            <Typography variant="caption" display="block" gutterBottom>
              user?._id: {user?._id}
            </Typography>
            <Typography variant="caption" display="block" gutterBottom>
              space?.admin._id: {space?.admin._id}
            </Typography>
            <Typography variant="caption" display="block" gutterBottom>
              Match: {space?.admin._id === user?._id ? 'YES' : 'NO'}
            </Typography>
          </Box>
        </AccordionDetails>
      </Accordion>
    </Box>
  );
};

export default DebugInfo;