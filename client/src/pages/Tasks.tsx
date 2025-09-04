import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Chip,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
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
  Tabs,
  Tab,
  Paper,
  Tooltip,
  Grid
} from '@mui/material';
import {
  MoreVert,
  Schedule,
  CheckCircle,
  Warning,
  Person,
  PlayArrow,
  Pause,
  Stop,
  Visibility
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import moment from 'moment';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';

interface Task {
  _id: string;
  title: string;
  description?: string;
  currentStatus: string;
  currentGroup: {
    _id: string;
    name: string;
  };
  space: {
    _id: string;
    name: string;
  };
  owner?: {
    _id: string;
    username: string;
  };
  priority: string;
  timeline: {
    startTime?: string;
    dueTime?: string;
    completionTime?: string;
    actualHours?: number;
    estimatedHours?: number;
  };
  completionStatus: string;
  createdAt: string;
}

interface Space {
  _id: string;
  name: string;
}

const Tasks: React.FC = () => {
  const { user } = useAuth();
  const { showNotification } = useNotification();
  const navigate = useNavigate();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);

  // Filters
  const [filters, setFilters] = useState({
    space: '',
    status: '',
    owner: '',
    priority: ''
  });

  // Menu state
  const [taskMenu, setTaskMenu] = useState<{
    anchorEl: HTMLElement | null;
    task?: Task;
  }>({ anchorEl: null });

  // Status update dialog
  const [statusDialog, setStatusDialog] = useState<{
    open: boolean;
    task?: Task;
  }>({ open: false });
  const [statusNotes, setStatusNotes] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [filters]);

  const fetchData = async () => {
    try {
      const spacesRes = await axios.get('/spaces');
      setSpaces(spacesRes.data);
      await fetchTasks();
    } catch (error) {
      console.error('Error fetching data:', error);
      showNotification('Failed to load data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchTasks = async () => {
    try {
      const allTasks: Task[] = [];

      for (const space of spaces) {
        try {
          const params = new URLSearchParams();
          if (filters.status) params.append('status', filters.status);
          if (filters.owner) params.append('owner', filters.owner);

          const tasksRes = await axios.get(`/tasks/space/${space._id}?${params}`);
          const spaceTasks = tasksRes.data.map((task: any) => ({
            ...task,
            space: { _id: space._id, name: space.name }
          }));
          
          allTasks.push(...spaceTasks);
        } catch (error) {
          console.error(`Error fetching tasks for space ${space._id}:`, error);
        }
      }

      // Apply space filter
      let filteredTasks = allTasks;
      if (filters.space) {
        filteredTasks = allTasks.filter(task => task.space._id === filters.space);
      }

      // Apply priority filter
      if (filters.priority) {
        filteredTasks = filteredTasks.filter(task => task.priority === filters.priority);
      }

      // Sort by creation date (newest first)
      filteredTasks.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      setTasks(filteredTasks);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      showNotification('Failed to load tasks', 'error');
    }
  };

  const handleUpdateTaskStatus = async (taskId: string, status: string, notes?: string) => {
    try {
      await axios.put(`/tasks/${taskId}/status`, { status, notes });
      showNotification('Task status updated', 'success');
      fetchTasks();
    } catch (error: any) {
      console.error('Error updating task status:', error);
      showNotification(
        error.response?.data?.message || 'Failed to update task status',
        'error'
      );
    }
  };

  const getFilteredTasks = () => {
    switch (activeTab) {
      case 0: // All tasks
        return tasks;
      case 1: // My tasks
        return tasks.filter(task => task.owner?.id === user?.id);
      case 2: // In progress
        return tasks.filter(task => task.currentStatus === 'In-progress');
      case 3: // Completed
        return tasks.filter(task => task.currentStatus === 'Completed');
      case 4: // Delayed
        return tasks.filter(task => task.completionStatus === 'delayed');
      default:
        return tasks;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'default';
      default: return 'default';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed': return 'success';
      case 'in-progress': return 'primary';
      case 'delayed': return 'error';
      case 'approved': return 'success';
      case 'rejected': return 'error';
      case 'pause': return 'warning';
      default: return 'default';
    }
  };

  const getCompletionColor = (status: string) => {
    switch (status) {
      case 'before-time': return 'success';
      case 'on-time': return 'info';
      case 'delayed': return 'error';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed': return <CheckCircle color="success" />;
      case 'in-progress': return <Schedule color="primary" />;
      case 'delayed': return <Warning color="error" />;
      case 'pause': return <Pause color="warning" />;
      default: return <Schedule />;
    }
  };

  const TaskCard: React.FC<{ task: Task }> = ({ task }) => (
    <Card sx={{ mb: 2, cursor: 'pointer' }} onClick={() => navigate(`/tasks/${task._id}`)}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
          <Box flex={1}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
              {task.title}
            </Typography>
            <Typography variant="body2" color="textSecondary" gutterBottom>
              {task.space.name} • {task.currentGroup.name}
            </Typography>
            {task.description && (
              <Typography variant="body2" color="textSecondary" paragraph>
                {task.description.length > 150 
                  ? `${task.description.substring(0, 150)}...`
                  : task.description
                }
              </Typography>
            )}
          </Box>
          <IconButton
            onClick={(e) => {
              e.stopPropagation();
              setTaskMenu({ anchorEl: e.currentTarget, task });
            }}
          >
            <MoreVert />
          </IconButton>
        </Box>

        <Box display="flex" flexWrap="wrap" gap={1} mb={2}>
          <Chip
            label={task.currentStatus}
            size="small"
            color={getStatusColor(task.currentStatus) as any}
            icon={getStatusIcon(task.currentStatus)}
          />
          <Chip
            label={task.priority}
            size="small"
            color={getPriorityColor(task.priority) as any}
            variant="outlined"
          />
          {task.completionStatus !== 'in-progress' && (
            <Chip
              label={task.completionStatus.replace('-', ' ')}
              size="small"
              color={getCompletionColor(task.completionStatus) as any}
            />
          )}
        </Box>

        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box display="flex" alignItems="center" gap={2}>
            {task.owner ? (
              <Box display="flex" alignItems="center" gap={1}>
                <Avatar sx={{ width: 24, height: 24, fontSize: '0.75rem' }}>
                  {task.owner.username.charAt(0).toUpperCase()}
                </Avatar>
                <Typography variant="body2" color="textSecondary">
                  {task.owner.username}
                </Typography>
              </Box>
            ) : (
              <Box display="flex" alignItems="center" gap={1}>
                <Avatar sx={{ width: 24, height: 24, bgcolor: 'grey.300' }}>
                  <Person fontSize="small" />
                </Avatar>
                <Typography variant="body2" color="textSecondary">
                  Unassigned
                </Typography>
              </Box>
            )}
          </Box>

          <Box textAlign="right">
            {task.timeline.dueTime && (
              <Typography variant="caption" color="textSecondary" display="block">
                Due: {moment(task.timeline.dueTime).format('MMM DD, HH:mm')}
              </Typography>
            )}
            {task.timeline.actualHours && (
              <Typography variant="caption" color="textSecondary" display="block">
                {task.timeline.actualHours.toFixed(1)}h / {task.timeline.estimatedHours}h
              </Typography>
            )}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  if (loading) {
    return <LinearProgress />;
  }

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Tasks
      </Typography>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Space</InputLabel>
              <Select
                value={filters.space}
                label="Space"
                onChange={(e) => setFilters(prev => ({ ...prev, space: e.target.value }))}
              >
                <MenuItem value="">All Spaces</MenuItem>
                {spaces.map((space) => (
                  <MenuItem key={space._id} value={space._id}>
                    {space.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select
                value={filters.status}
                label="Status"
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              >
                <MenuItem value="">All Statuses</MenuItem>
                <MenuItem value="In-progress">In Progress</MenuItem>
                <MenuItem value="Completed">Completed</MenuItem>
                <MenuItem value="Pause">Paused</MenuItem>
                <MenuItem value="Approved">Approved</MenuItem>
                <MenuItem value="Rejected">Rejected</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Priority</InputLabel>
              <Select
                value={filters.priority}
                label="Priority"
                onChange={(e) => setFilters(prev => ({ ...prev, priority: e.target.value }))}
              >
                <MenuItem value="">All Priorities</MenuItem>
                <MenuItem value="low">Low</MenuItem>
                <MenuItem value="medium">Medium</MenuItem>
                <MenuItem value="high">High</MenuItem>
                <MenuItem value="urgent">Urgent</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid xs={12} sm={6} md={3}>
            <Button
              variant="outlined"
              onClick={() => setFilters({ space: '', status: '', owner: '', priority: '' })}
              fullWidth
            >
              Clear Filters
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Tabs */}
      <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)} sx={{ mb: 3 }}>
        <Tab label={`All (${tasks.length})`} />
        <Tab label={`My Tasks (${tasks.filter(t => t.owner?.id === user?.id).length})`} />
        <Tab label={`In Progress (${tasks.filter(t => t.currentStatus === 'In-progress').length})`} />
        <Tab label={`Completed (${tasks.filter(t => t.currentStatus === 'Completed').length})`} />
        <Tab label={`Delayed (${tasks.filter(t => t.completionStatus === 'delayed').length})`} />
      </Tabs>

      {/* Tasks List */}
      <Box>
        {getFilteredTasks().length === 0 ? (
          <Card sx={{ textAlign: 'center', py: 8 }}>
            <CardContent>
              <Schedule sx={{ fontSize: 64, color: 'grey.400', mb: 2 }} />
              <Typography variant="h5" gutterBottom>
                No tasks found
              </Typography>
              <Typography color="textSecondary">
                {activeTab === 1 
                  ? "You don't have any assigned tasks yet"
                  : "No tasks match the current filters"
                }
              </Typography>
            </CardContent>
          </Card>
        ) : (
          <Grid container spacing={2}>
            {getFilteredTasks().map((task) => (
              <Grid xs={12} md={6} lg={4} key={task._id}>
                <TaskCard task={task} />
              </Grid>
            ))}
          </Grid>
        )}
      </Box>

      {/* Task Menu */}
      <Menu
        anchorEl={taskMenu.anchorEl}
        open={Boolean(taskMenu.anchorEl)}
        onClose={() => setTaskMenu({ anchorEl: null })}
      >
        <MenuItem onClick={() => {
          if (taskMenu.task) {
            navigate(`/tasks/${taskMenu.task._id}`);
          }
          setTaskMenu({ anchorEl: null });
        }}>
          <Visibility sx={{ mr: 1 }} />
          View Details
        </MenuItem>
        {taskMenu.task?.owner?.id === user?.id && (
          <>
            <MenuItem onClick={() => {
              setStatusDialog({ open: true, task: taskMenu.task });
              setTaskMenu({ anchorEl: null });
            }}>
              <PlayArrow sx={{ mr: 1 }} />
              Update Status
            </MenuItem>
            {taskMenu.task?.currentStatus === 'In-progress' && (
              <MenuItem onClick={() => {
                if (taskMenu.task) {
                  handleUpdateTaskStatus(taskMenu.task._id, 'Pause');
                }
                setTaskMenu({ anchorEl: null });
              }}>
                <Pause sx={{ mr: 1 }} />
                Pause Task
              </MenuItem>
            )}
            {taskMenu.task?.currentStatus === 'Pause' && (
              <MenuItem onClick={() => {
                if (taskMenu.task) {
                  handleUpdateTaskStatus(taskMenu.task._id, 'Resume');
                }
                setTaskMenu({ anchorEl: null });
              }}>
                <PlayArrow sx={{ mr: 1 }} />
                Resume Task
              </MenuItem>
            )}
            <MenuItem onClick={() => {
              if (taskMenu.task) {
                handleUpdateTaskStatus(taskMenu.task._id, 'Completed');
              }
              setTaskMenu({ anchorEl: null });
            }}>
              <CheckCircle sx={{ mr: 1 }} />
              Mark Completed
            </MenuItem>
          </>
        )}
      </Menu>

      {/* Status Update Dialog */}
      <Dialog open={statusDialog.open} onClose={() => setStatusDialog({ open: false })} maxWidth="sm" fullWidth>
        <DialogTitle>Update Task Status</DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            Update status for: {statusDialog.task?.title}
          </Typography>
          <TextField
            margin="dense"
            label="Notes (optional)"
            fullWidth
            multiline
            rows={3}
            variant="outlined"
            value={statusNotes}
            onChange={(e) => setStatusNotes(e.target.value)}
            placeholder="Add any notes about this status update..."
          />
          <Box display="flex" gap={1} mt={2} flexWrap="wrap">
            <Button
              variant="outlined"
              onClick={() => {
                if (statusDialog.task) {
                  handleUpdateTaskStatus(statusDialog.task._id, 'In-progress', statusNotes);
                  setStatusDialog({ open: false });
                  setStatusNotes('');
                }
              }}
            >
              In Progress
            </Button>
            <Button
              variant="outlined"
              onClick={() => {
                if (statusDialog.task) {
                  handleUpdateTaskStatus(statusDialog.task._id, 'Pause', statusNotes);
                  setStatusDialog({ open: false });
                  setStatusNotes('');
                }
              }}
            >
              Pause
            </Button>
            <Button
              variant="outlined"
              color="success"
              onClick={() => {
                if (statusDialog.task) {
                  handleUpdateTaskStatus(statusDialog.task._id, 'Completed', statusNotes);
                  setStatusDialog({ open: false });
                  setStatusNotes('');
                }
              }}
            >
              Completed
            </Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStatusDialog({ open: false })}>Cancel</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Tasks;