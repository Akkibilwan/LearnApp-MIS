import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  Grid,
  Fab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Menu,
  MenuItem,
  Chip,
  Avatar,
  LinearProgress
} from '@mui/material';
import {
  Add,
  MoreVert,
  Business,
  Group,
  Assignment,
  Edit,
  Delete,
  FileCopy
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';

interface Space {
  _id: string;
  name: string;
  description: string;
  admin: {
    _id: string;
    username: string;
  };
  members: Array<{
    user: {
      _id: string;
      username: string;
    };
    role: string;
  }>;
  groups: any[];
  workingHours: {
    start: string;
    end: string;
  };
  workingDays: number[];
  createdAt: string;
}

const Spaces: React.FC = () => {
  const { user } = useAuth();
  const { showNotification } = useNotification();
  const navigate = useNavigate();

  const [spaces, setSpaces] = useState<Space[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Dialog states
  const [createDialog, setCreateDialog] = useState(false);
  const [editDialog, setEditDialog] = useState<{ open: boolean; space?: Space }>({ open: false });
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; space?: Space }>({ open: false });
  
  // Menu state
  const [spaceMenu, setSpaceMenu] = useState<{
    anchorEl: HTMLElement | null;
    space?: Space;
  }>({ anchorEl: null });

  // Form state
  const [spaceForm, setSpaceForm] = useState({
    name: '',
    description: '',
    workingHours: {
      start: '09:00',
      end: '17:00'
    },
    workingDays: [1, 2, 3, 4, 5] // Monday to Friday
  });

  useEffect(() => {
    fetchSpaces();
  }, []);

  const fetchSpaces = async () => {
    try {
      const response = await axios.get('/spaces');
      setSpaces(response.data);
    } catch (error) {
      console.error('Error fetching spaces:', error);
      showNotification('Failed to load spaces', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSpace = async () => {
    if (!spaceForm.name.trim()) {
      showNotification('Space name is required', 'error');
      return;
    }

    try {
      await axios.post('/spaces', spaceForm);
      showNotification('Space created successfully', 'success');
      setCreateDialog(false);
      resetForm();
      fetchSpaces();
    } catch (error: any) {
      console.error('Error creating space:', error);
      showNotification(
        error.response?.data?.message || 'Failed to create space',
        'error'
      );
    }
  };

  const handleEditSpace = async () => {
    const { space } = editDialog;
    if (!space || !spaceForm.name.trim()) return;

    try {
      await axios.put(`/spaces/${space._id}`, spaceForm);
      showNotification('Space updated successfully', 'success');
      setEditDialog({ open: false });
      resetForm();
      fetchSpaces();
    } catch (error: any) {
      console.error('Error updating space:', error);
      showNotification(
        error.response?.data?.message || 'Failed to update space',
        'error'
      );
    }
  };

  const handleDeleteSpace = async () => {
    const { space } = deleteDialog;
    if (!space) return;

    try {
      await axios.delete(`/spaces/${space._id}`);
      showNotification('Space deleted successfully', 'success');
      setDeleteDialog({ open: false });
      fetchSpaces();
    } catch (error: any) {
      console.error('Error deleting space:', error);
      showNotification(
        error.response?.data?.message || 'Failed to delete space',
        'error'
      );
    }
  };

  const handleDuplicateSpace = async (space: Space) => {
    try {
      const response = await axios.post(`/spaces/${space._id}/duplicate`, {
        name: `${space.name} (Copy)`
      });
      showNotification('Space duplicated successfully', 'success');
      fetchSpaces();
    } catch (error: any) {
      console.error('Error duplicating space:', error);
      showNotification(
        error.response?.data?.message || 'Failed to duplicate space',
        'error'
      );
    }
  };

  const resetForm = () => {
    setSpaceForm({
      name: '',
      description: '',
      workingHours: {
        start: '09:00',
        end: '17:00'
      },
      workingDays: [1, 2, 3, 4, 5]
    });
  };

  const openEditDialog = (space: Space) => {
    setSpaceForm({
      name: space.name,
      description: space.description,
      workingHours: space.workingHours,
      workingDays: space.workingDays
    });
    setEditDialog({ open: true, space });
    setSpaceMenu({ anchorEl: null });
  };

  const isSpaceAdmin = (space: Space) => {
    return space.admin._id === user?._id;
  };

  const getDayNames = (days: number[]) => {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days.map(day => dayNames[day]).join(', ');
  };

  if (loading) {
    return <LinearProgress />;
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Spaces
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setCreateDialog(true)}
        >
          Create Space
        </Button>
      </Box>

      {spaces.length === 0 ? (
        <Card sx={{ textAlign: 'center', py: 8 }}>
          <CardContent>
            <Business sx={{ fontSize: 64, color: 'grey.400', mb: 2 }} />
            <Typography variant="h5" gutterBottom>
              No spaces yet
            </Typography>
            <Typography color="textSecondary" paragraph>
              Create your first space to start managing video production timelines
            </Typography>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => setCreateDialog(true)}
            >
              Create Your First Space
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={3}>
          {spaces.map((space) => (
            <Grid item xs={12} sm={6} md={4} key={space._id}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  cursor: 'pointer',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: 4
                  }
                }}
                onClick={() => navigate(`/spaces/${space._id}`)}
              >
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                    <Typography variant="h6" component="h2" sx={{ fontWeight: 600 }}>
                      {space.name}
                    </Typography>
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSpaceMenu({ anchorEl: e.currentTarget, space });
                      }}
                    >
                      <MoreVert />
                    </IconButton>
                  </Box>

                  {space.description && (
                    <Typography color="textSecondary" paragraph>
                      {space.description.length > 100 
                        ? `${space.description.substring(0, 100)}...`
                        : space.description
                      }
                    </Typography>
                  )}

                  <Box mb={2}>
                    <Typography variant="body2" color="textSecondary" gutterBottom>
                      Admin: {space.admin.username}
                    </Typography>
                    <Typography variant="body2" color="textSecondary" gutterBottom>
                      Members: {space.members.length + 1}
                    </Typography>
                    <Typography variant="body2" color="textSecondary" gutterBottom>
                      Groups: {space.groups?.length || 0}
                    </Typography>
                  </Box>

                  <Box mb={2}>
                    <Typography variant="caption" color="textSecondary" display="block">
                      Working Hours: {space.workingHours.start} - {space.workingHours.end}
                    </Typography>
                    <Typography variant="caption" color="textSecondary" display="block">
                      Working Days: {getDayNames(space.workingDays)}
                    </Typography>
                  </Box>

                  <Box display="flex" gap={1} flexWrap="wrap">
                    {isSpaceAdmin(space) && (
                      <Chip label="Admin" size="small" color="primary" />
                    )}
                    <Chip 
                      label={`${space.groups?.length || 0} Groups`}
                      size="small" 
                      variant="outlined"
                      icon={<Group />}
                    />
                  </Box>
                </CardContent>

                <CardActions>
                  <Button 
                    size="small" 
                    startIcon={<Assignment />}
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/spaces/${space._id}`);
                    }}
                  >
                    View Board
                  </Button>
                  {isSpaceAdmin(space) && (
                    <Button 
                      size="small" 
                      startIcon={<Edit />}
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditDialog(space);
                      }}
                    >
                      Edit
                    </Button>
                  )}
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Space Menu */}
      <Menu
        anchorEl={spaceMenu.anchorEl}
        open={Boolean(spaceMenu.anchorEl)}
        onClose={() => setSpaceMenu({ anchorEl: null })}
      >
        <MenuItem onClick={() => {
          if (spaceMenu.space) {
            navigate(`/spaces/${spaceMenu.space._id}`);
          }
          setSpaceMenu({ anchorEl: null });
        }}>
          <Assignment sx={{ mr: 1 }} />
          View Board
        </MenuItem>
        {spaceMenu.space && isSpaceAdmin(spaceMenu.space) && (
          <>
            <MenuItem onClick={() => {
              if (spaceMenu.space) {
                openEditDialog(spaceMenu.space);
              }
            }}>
              <Edit sx={{ mr: 1 }} />
              Edit Space
            </MenuItem>
            <MenuItem onClick={() => {
              if (spaceMenu.space) {
                handleDuplicateSpace(spaceMenu.space);
              }
              setSpaceMenu({ anchorEl: null });
            }}>
              <FileCopy sx={{ mr: 1 }} />
              Duplicate Space
            </MenuItem>
            <MenuItem onClick={() => {
              setDeleteDialog({ open: true, space: spaceMenu.space });
              setSpaceMenu({ anchorEl: null });
            }}>
              <Delete sx={{ mr: 1 }} />
              Delete Space
            </MenuItem>
          </>
        )}
      </Menu>

      {/* Create Space Dialog */}
      <Dialog open={createDialog} onClose={() => setCreateDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Space</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Space Name"
            fullWidth
            variant="outlined"
            value={spaceForm.name}
            onChange={(e) => setSpaceForm(prev => ({ ...prev, name: e.target.value }))}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Description"
            fullWidth
            multiline
            rows={3}
            variant="outlined"
            value={spaceForm.description}
            onChange={(e) => setSpaceForm(prev => ({ ...prev, description: e.target.value }))}
            sx={{ mb: 2 }}
          />
          <Box display="flex" gap={2} mb={2}>
            <TextField
              label="Start Time"
              type="time"
              value={spaceForm.workingHours.start}
              onChange={(e) => setSpaceForm(prev => ({
                ...prev,
                workingHours: { ...prev.workingHours, start: e.target.value }
              }))}
              InputLabelProps={{ shrink: true }}
              sx={{ flex: 1 }}
            />
            <TextField
              label="End Time"
              type="time"
              value={spaceForm.workingHours.end}
              onChange={(e) => setSpaceForm(prev => ({
                ...prev,
                workingHours: { ...prev.workingHours, end: e.target.value }
              }))}
              InputLabelProps={{ shrink: true }}
              sx={{ flex: 1 }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialog(false)}>Cancel</Button>
          <Button onClick={handleCreateSpace} variant="contained">Create Space</Button>
        </DialogActions>
      </Dialog>

      {/* Edit Space Dialog */}
      <Dialog open={editDialog.open} onClose={() => setEditDialog({ open: false })} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Space</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Space Name"
            fullWidth
            variant="outlined"
            value={spaceForm.name}
            onChange={(e) => setSpaceForm(prev => ({ ...prev, name: e.target.value }))}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Description"
            fullWidth
            multiline
            rows={3}
            variant="outlined"
            value={spaceForm.description}
            onChange={(e) => setSpaceForm(prev => ({ ...prev, description: e.target.value }))}
            sx={{ mb: 2 }}
          />
          <Box display="flex" gap={2} mb={2}>
            <TextField
              label="Start Time"
              type="time"
              value={spaceForm.workingHours.start}
              onChange={(e) => setSpaceForm(prev => ({
                ...prev,
                workingHours: { ...prev.workingHours, start: e.target.value }
              }))}
              InputLabelProps={{ shrink: true }}
              sx={{ flex: 1 }}
            />
            <TextField
              label="End Time"
              type="time"
              value={spaceForm.workingHours.end}
              onChange={(e) => setSpaceForm(prev => ({
                ...prev,
                workingHours: { ...prev.workingHours, end: e.target.value }
              }))}
              InputLabelProps={{ shrink: true }}
              sx={{ flex: 1 }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialog({ open: false })}>Cancel</Button>
          <Button onClick={handleEditSpace} variant="contained">Update Space</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false })}>
        <DialogTitle>Delete Space</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{deleteDialog.space?.name}"? 
            This action cannot be undone and will delete all groups and tasks in this space.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false })}>Cancel</Button>
          <Button onClick={handleDeleteSpace} color="error" variant="contained">
            Delete Space
          </Button>
        </DialogActions>
      </Dialog>

      {/* Floating Action Button for mobile */}
      <Fab
        color="primary"
        aria-label="add space"
        sx={{
          position: 'fixed',
          bottom: 16,
          right: 16,
          display: { xs: 'flex', sm: 'none' }
        }}
        onClick={() => setCreateDialog(true)}
      >
        <Add />
      </Fab>
    </Box>
  );
};

export default Spaces;