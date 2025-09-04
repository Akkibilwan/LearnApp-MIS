import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Avatar,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  LinearProgress,
  Alert
} from '@mui/material';
import {
  Add,
  MoreVert,
  Edit,
  Delete,
  PersonAdd,
  Schedule,
  CheckCircle
} from '@mui/icons-material';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';

interface User {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'user';
  workingHours: {
    start: string;
    end: string;
  };
  workingDays: number[];
  spaces: Array<{
    id: string;
    name: string;
  }>;
  createdAt: string;
}

interface UserStats {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  delayedTasks: number;
  onTimeTasks: number;
  beforeTimeTasks: number;
  totalHoursWorked: number;
  averageTaskCompletionTime: number;
}

const Users: React.FC = () => {
  const { user: currentUser } = useAuth();
  const { showNotification } = useNotification();

  const [users, setUsers] = useState<User[]>([]);
  const [userStats, setUserStats] = useState<{ [key: string]: UserStats }>({});
  const [loading, setLoading] = useState(true);

  // Dialog states
  const [createDialog, setCreateDialog] = useState(false);
  const [editDialog, setEditDialog] = useState<{ open: boolean; user?: User }>({ open: false });
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; user?: User }>({ open: false });
  const [statsDialog, setStatsDialog] = useState<{ open: boolean; user?: User; stats?: UserStats }>({ open: false });

  // Menu state
  const [userMenu, setUserMenu] = useState<{
    anchorEl: HTMLElement | null;
    user?: User;
  }>({ anchorEl: null });

  // Form state
  const [userForm, setUserForm] = useState({
    username: '',
    email: '',
    password: '',
    role: 'user' as 'admin' | 'user',
    workingHours: {
      start: '09:00',
      end: '17:00'
    },
    workingDays: [1, 2, 3, 4, 5] // Monday to Friday
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await axios.get('/users');
      setUsers(response.data);
      
      // Fetch stats for each user
      const statsPromises = response.data.map(async (user: User) => {
        try {
          const statsRes = await axios.get(`/users/${user.id}/stats`);
          return { userId: user.id, stats: statsRes.data };
        } catch (error) {
          console.error(`Error fetching stats for user ${user.id}:`, error);
          return { userId: user.id, stats: null };
        }
      });

      const statsResults = await Promise.all(statsPromises);
      const statsMap = statsResults.reduce((acc, { userId, stats }) => {
        if (stats) acc[userId] = stats;
        return acc;
      }, {} as { [key: string]: UserStats });

      setUserStats(statsMap);
    } catch (error) {
      console.error('Error fetching users:', error);
      showNotification('Failed to load users', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async () => {
    if (!userForm.username.trim() || !userForm.email.trim() || !userForm.password.trim()) {
      showNotification('Please fill in all required fields', 'error');
      return;
    }

    try {
      await axios.post('/auth/register', userForm);
      showNotification('User created successfully', 'success');
      setCreateDialog(false);
      resetForm();
      fetchUsers();
    } catch (error: any) {
      console.error('Error creating user:', error);
      showNotification(
        error.response?.data?.message || 'Failed to create user',
        'error'
      );
    }
  };

  const handleEditUser = async () => {
    const { user } = editDialog;
    if (!user || !userForm.username.trim() || !userForm.email.trim()) return;

    try {
      await axios.put(`/users/${user.id}`, {
        username: userForm.username,
        email: userForm.email,
        role: userForm.role,
        workingHours: userForm.workingHours,
        workingDays: userForm.workingDays
      });
      showNotification('User updated successfully', 'success');
      setEditDialog({ open: false });
      resetForm();
      fetchUsers();
    } catch (error: any) {
      console.error('Error updating user:', error);
      showNotification(
        error.response?.data?.message || 'Failed to update user',
        'error'
      );
    }
  };

  const handleDeleteUser = async () => {
    const { user } = deleteDialog;
    if (!user) return;

    try {
      await axios.delete(`/users/${user.id}`);
      showNotification('User deleted successfully', 'success');
      setDeleteDialog({ open: false });
      fetchUsers();
    } catch (error: any) {
      console.error('Error deleting user:', error);
      showNotification(
        error.response?.data?.message || 'Failed to delete user',
        'error'
      );
    }
  };

  const resetForm = () => {
    setUserForm({
      username: '',
      email: '',
      password: '',
      role: 'user',
      workingHours: {
        start: '09:00',
        end: '17:00'
      },
      workingDays: [1, 2, 3, 4, 5]
    });
  };

  const openEditDialog = (user: User) => {
    setUserForm({
      username: user.username,
      email: user.email,
      password: '', // Don't show existing password
      role: user.role,
      workingHours: user.workingHours,
      workingDays: user.workingDays
    });
    setEditDialog({ open: true, user });
    setUserMenu({ anchorEl: null });
  };

  const openStatsDialog = (user: User) => {
    const stats = userStats[user.id];
    setStatsDialog({ open: true, user, stats });
    setUserMenu({ anchorEl: null });
  };

  const getDayNames = (days: number[]) => {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days.map(day => dayNames[day]).join(', ');
  };

  if (currentUser?.role !== 'admin') {
    return (
      <Alert severity="error">
        Access denied. Only administrators can view this page.
      </Alert>
    );
  }

  if (loading) {
    return <LinearProgress />;
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Users Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<PersonAdd />}
          onClick={() => setCreateDialog(true)}
        >
          Add User
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>User</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Working Hours</TableCell>
              <TableCell>Spaces</TableCell>
              <TableCell>Tasks</TableCell>
              <TableCell>Performance</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((user) => {
              const stats = userStats[user.id];
              return (
                <TableRow key={user.id}>
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={2}>
                      <Avatar sx={{ bgcolor: user.role === 'admin' ? 'primary.main' : 'grey.400' }}>
                        {user.username.charAt(0).toUpperCase()}
                      </Avatar>
                      <Box>
                        <Typography variant="subtitle2" fontWeight={600}>
                          {user.username}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          {user.email}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={user.role}
                      color={user.role === 'admin' ? 'primary' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {user.workingHours.start} - {user.workingHours.end}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      {getDayNames(user.workingDays)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {user.spaces?.length || 0} spaces
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {stats ? (
                      <Box>
                        <Typography variant="body2">
                          {stats.totalTasks} total
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {stats.completedTasks} completed, {stats.inProgressTasks} in progress
                        </Typography>
                      </Box>
                    ) : (
                      <Typography variant="body2" color="textSecondary">
                        Loading...
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    {stats ? (
                      <Box>
                        <Box display="flex" gap={0.5} mb={0.5}>
                          {stats.beforeTimeTasks > 0 && (
                            <Chip label={`${stats.beforeTimeTasks} early`} size="small" color="success" />
                          )}
                          {stats.onTimeTasks > 0 && (
                            <Chip label={`${stats.onTimeTasks} on time`} size="small" color="info" />
                          )}
                          {stats.delayedTasks > 0 && (
                            <Chip label={`${stats.delayedTasks} delayed`} size="small" color="error" />
                          )}
                        </Box>
                        <Typography variant="caption" color="textSecondary">
                          {stats.totalHoursWorked.toFixed(1)}h worked
                        </Typography>
                      </Box>
                    ) : null}
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      onClick={(e) => setUserMenu({ anchorEl: e.currentTarget, user })}
                    >
                      <MoreVert />
                    </IconButton>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {users.length === 0 && (
        <Card sx={{ textAlign: 'center', py: 8, mt: 3 }}>
          <CardContent>
            <PersonAdd sx={{ fontSize: 64, color: 'grey.400', mb: 2 }} />
            <Typography variant="h5" gutterBottom>
              No users found
            </Typography>
            <Typography color="textSecondary" paragraph>
              Add users to manage team access and permissions
            </Typography>
            <Button
              variant="contained"
              startIcon={<PersonAdd />}
              onClick={() => setCreateDialog(true)}
            >
              Add First User
            </Button>
          </CardContent>
        </Card>
      )}

      {/* User Menu */}
      <Menu
        anchorEl={userMenu.anchorEl}
        open={Boolean(userMenu.anchorEl)}
        onClose={() => setUserMenu({ anchorEl: null })}
      >
        <MenuItem onClick={() => {
          if (userMenu.user) {
            openStatsDialog(userMenu.user);
          }
        }}>
          <Schedule sx={{ mr: 1 }} />
          View Statistics
        </MenuItem>
        <MenuItem onClick={() => {
          if (userMenu.user) {
            openEditDialog(userMenu.user);
          }
        }}>
          <Edit sx={{ mr: 1 }} />
          Edit User
        </MenuItem>
        {userMenu.user?.id !== currentUser?.id && (
          <MenuItem onClick={() => {
            setDeleteDialog({ open: true, user: userMenu.user });
            setUserMenu({ anchorEl: null });
          }}>
            <Delete sx={{ mr: 1 }} />
            Delete User
          </MenuItem>
        )}
      </Menu>

      {/* Create User Dialog */}
      <Dialog open={createDialog} onClose={() => setCreateDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add New User</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Username"
            fullWidth
            variant="outlined"
            value={userForm.username}
            onChange={(e) => setUserForm(prev => ({ ...prev, username: e.target.value }))}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Email"
            type="email"
            fullWidth
            variant="outlined"
            value={userForm.email}
            onChange={(e) => setUserForm(prev => ({ ...prev, email: e.target.value }))}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Password"
            type="password"
            fullWidth
            variant="outlined"
            value={userForm.password}
            onChange={(e) => setUserForm(prev => ({ ...prev, password: e.target.value }))}
            sx={{ mb: 2 }}
          />
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Role</InputLabel>
            <Select
              value={userForm.role}
              label="Role"
              onChange={(e) => setUserForm(prev => ({ ...prev, role: e.target.value as 'admin' | 'user' }))}
            >
              <MenuItem value="user">User</MenuItem>
              <MenuItem value="admin">Administrator</MenuItem>
            </Select>
          </FormControl>
          <Box display="flex" gap={2} mb={2}>
            <TextField
              label="Start Time"
              type="time"
              value={userForm.workingHours.start}
              onChange={(e) => setUserForm(prev => ({
                ...prev,
                workingHours: { ...prev.workingHours, start: e.target.value }
              }))}
              InputLabelProps={{ shrink: true }}
              sx={{ flex: 1 }}
            />
            <TextField
              label="End Time"
              type="time"
              value={userForm.workingHours.end}
              onChange={(e) => setUserForm(prev => ({
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
          <Button onClick={handleCreateUser} variant="contained">Add User</Button>
        </DialogActions>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={editDialog.open} onClose={() => setEditDialog({ open: false })} maxWidth="sm" fullWidth>
        <DialogTitle>Edit User</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Username"
            fullWidth
            variant="outlined"
            value={userForm.username}
            onChange={(e) => setUserForm(prev => ({ ...prev, username: e.target.value }))}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Email"
            type="email"
            fullWidth
            variant="outlined"
            value={userForm.email}
            onChange={(e) => setUserForm(prev => ({ ...prev, email: e.target.value }))}
            sx={{ mb: 2 }}
          />
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Role</InputLabel>
            <Select
              value={userForm.role}
              label="Role"
              onChange={(e) => setUserForm(prev => ({ ...prev, role: e.target.value as 'admin' | 'user' }))}
            >
              <MenuItem value="user">User</MenuItem>
              <MenuItem value="admin">Administrator</MenuItem>
            </Select>
          </FormControl>
          <Box display="flex" gap={2} mb={2}>
            <TextField
              label="Start Time"
              type="time"
              value={userForm.workingHours.start}
              onChange={(e) => setUserForm(prev => ({
                ...prev,
                workingHours: { ...prev.workingHours, start: e.target.value }
              }))}
              InputLabelProps={{ shrink: true }}
              sx={{ flex: 1 }}
            />
            <TextField
              label="End Time"
              type="time"
              value={userForm.workingHours.end}
              onChange={(e) => setUserForm(prev => ({
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
          <Button onClick={handleEditUser} variant="contained">Update User</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false })}>
        <DialogTitle>Delete User</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{deleteDialog.user?.username}"? 
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false })}>Cancel</Button>
          <Button onClick={handleDeleteUser} color="error" variant="contained">
            Delete User
          </Button>
        </DialogActions>
      </Dialog>

      {/* User Statistics Dialog */}
      <Dialog open={statsDialog.open} onClose={() => setStatsDialog({ open: false })} maxWidth="md" fullWidth>
        <DialogTitle>
          Statistics for {statsDialog.user?.username}
        </DialogTitle>
        <DialogContent>
          {statsDialog.stats ? (
            <Box>
              <Typography variant="h6" gutterBottom>
                Task Overview
              </Typography>
              <Box display="flex" gap={2} mb={3} flexWrap="wrap">
                <Chip label={`${statsDialog.stats.totalTasks} Total Tasks`} />
                <Chip label={`${statsDialog.stats.completedTasks} Completed`} color="success" />
                <Chip label={`${statsDialog.stats.inProgressTasks} In Progress`} color="primary" />
                <Chip label={`${statsDialog.stats.delayedTasks} Delayed`} color="error" />
              </Box>

              <Typography variant="h6" gutterBottom>
                Performance
              </Typography>
              <Box display="flex" gap={2} mb={3} flexWrap="wrap">
                <Chip label={`${statsDialog.stats.beforeTimeTasks} Before Time`} color="success" />
                <Chip label={`${statsDialog.stats.onTimeTasks} On Time`} color="info" />
                <Chip label={`${statsDialog.stats.delayedTasks} Delayed`} color="error" />
              </Box>

              <Typography variant="h6" gutterBottom>
                Time Tracking
              </Typography>
              <Typography variant="body1" gutterBottom>
                Total Hours Worked: {statsDialog.stats.totalHoursWorked.toFixed(1)} hours
              </Typography>
              {statsDialog.stats.averageTaskCompletionTime > 0 && (
                <Typography variant="body1">
                  Average Task Completion Time: {statsDialog.stats.averageTaskCompletionTime.toFixed(1)} hours
                </Typography>
              )}
            </Box>
          ) : (
            <Typography>No statistics available for this user.</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStatsDialog({ open: false })}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Users;