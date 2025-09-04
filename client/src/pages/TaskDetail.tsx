import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Chip,
  Avatar,
  Grid,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  LinearProgress,
  Alert,
  Paper,
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot
} from '@mui/material';
import {
  ArrowBack,
  Schedule,
  CheckCircle,
  Warning,
  Person,
  PlayArrow,
  Pause,
  Edit,
  History,
  Comment
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
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
    estimatedHours: number;
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
    pausedDuration?: number;
  };
  completionStatus: string;
  delayedHours?: number;
  statusHistory: Array<{
    status: string;
    timestamp: string;
    user: {
      username: string;
    };
    notes?: string;
  }>;
  groupHistory: Array<{
    group: {
      name: string;
    };
    enteredAt: string;
    exitedAt?: string;
    owner?: {
      username: string;
    };
    hoursSpent?: number;
    completionStatus?: string;
  }>;
  approvalStatus: string;
  approvedBy?: {
    username: string;
  };
  approvalNotes?: string;
  createdAt: string;
}

const TaskDetail: React.FC = () => {
  const { taskId } = useParams<{ taskId: string }>();
  const { user } = useAuth();
  const { showNotification } = useNotification();
  const navigate = useNavigate();

  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Dialog states
  const [statusDialog, setStatusDialog] = useState(false);
  const [editDialog, setEditDialog] = useState(false);
  
  // Form states
  const [statusNotes, setStatusNotes] = useState('');
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    priority: 'medium'
  });

  useEffect(() => {
    if (taskId) {
      fetchTask();
    }
  }, [taskId]);

  const fetchTask = async () => {
    try {
      const response = await axios.get(`/tasks/${taskId}`);
      setTask(response.data);
      
      setEditForm({
        title: response.data.title,
        description: response.data.description || '',
        priority: response.data.priority
      });
    } catch (error: any) {
      console.error('Error fetching task:', error);
      showNotification('Failed to load task', 'error');
      if (error.response?.status === 404) {
        navigate('/tasks');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (status: string) => {
    try {
      await axios.put(`/tasks/${taskId}/status`, { 
        status, 
        notes: statusNotes || undefined 
      });
      showNotification('Task status updated', 'success');
      setStatusDialog(false);
      setStatusNotes('');
      fetchTask();
    } catch (error: any) {
      console.error('Error updating task status:', error);
      showNotification(
        error.response?.data?.message || 'Failed to update task status',
        'error'
      );
    }
  };

  const handleUpdateTask = async () => {
    try {
      await axios.put(`/tasks/${taskId}`, editForm);
      showNotification('Task updated successfully', 'success');
      setEditDialog(false);
      fetchTask();
    } catch (error: any) {
      console.error('Error updating task:', error);
      showNotification(
        error.response?.data?.message || 'Failed to update task',
        'error'
      );
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
      case 'completed': return <CheckCircle />;
      case 'in-progress': return <Schedule />;
      case 'delayed': return <Warning />;
      case 'pause': return <Pause />;
      default: return <Schedule />;
    }
  };

  const canUpdateTask = () => {
    return task?.owner?._id === user?._id || user?.role === 'admin';
  };

  const calculateProgress = () => {
    if (!task?.timeline.estimatedHours || !task?.timeline.actualHours) return 0;
    return Math.min((task.timeline.actualHours / task.timeline.estimatedHours) * 100, 100);
  };

  if (loading) {
    return <LinearProgress />;
  }

  if (!task) {
    return (
      <Alert severity="error">
        Task not found or you don't have access to this task.
      </Alert>
    );
  }

  return (
    <Box>
      <Box display="flex" alignItems="center" mb={3}>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate('/tasks')}
          sx={{ mr: 2 }}
        >
          Back to Tasks
        </Button>
        <Typography variant="h4" component="h1" sx={{ flexGrow: 1 }}>
          {task.title}
        </Typography>
        {canUpdateTask() && (
          <Button
            variant="outlined"
            startIcon={<Edit />}
            onClick={() => setEditDialog(true)}
          >
            Edit Task
          </Button>
        )}
      </Box>

      <Grid container spacing={3}>
        {/* Main Task Info */}
        <Grid item xs={12} md={8}>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2} mb={2}>
                <Chip
                  label={task.currentStatus}
                  color={getStatusColor(task.currentStatus) as any}
                  icon={getStatusIcon(task.currentStatus)}
                />
                <Chip
                  label={task.priority}
                  color={getPriorityColor(task.priority) as any}
                  variant="outlined"
                />
                {task.completionStatus !== 'in-progress' && (
                  <Chip
                    label={task.completionStatus.replace('-', ' ')}
                    color={getCompletionColor(task.completionStatus) as any}
                  />
                )}
              </Box>

              {task.description && (
                <Typography variant="body1" paragraph>
                  {task.description}
                </Typography>
              )}

              <Box display="flex" gap={4} mb={3}>
                <Box>
                  <Typography variant="caption" color="textSecondary" display="block">
                    Space
                  </Typography>
                  <Typography variant="body2" fontWeight={500}>
                    {task.space.name}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="textSecondary" display="block">
                    Current Group
                  </Typography>
                  <Typography variant="body2" fontWeight={500}>
                    {task.currentGroup.name}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="textSecondary" display="block">
                    Owner
                  </Typography>
                  <Box display="flex" alignItems="center" gap={1}>
                    {task.owner ? (
                      <>
                        <Avatar sx={{ width: 20, height: 20, fontSize: '0.75rem' }}>
                          {task.owner.username.charAt(0).toUpperCase()}
                        </Avatar>
                        <Typography variant="body2" fontWeight={500}>
                          {task.owner.username}
                        </Typography>
                      </>
                    ) : (
                      <Typography variant="body2" color="textSecondary">
                        Unassigned
                      </Typography>
                    )}
                  </Box>
                </Box>
              </Box>

              {canUpdateTask() && (
                <Box display="flex" gap={1} flexWrap="wrap">
                  <Button
                    variant="contained"
                    startIcon={<PlayArrow />}
                    onClick={() => setStatusDialog(true)}
                    size="small"
                  >
                    Update Status
                  </Button>
                  {task.currentStatus === 'In-progress' && (
                    <Button
                      variant="outlined"
                      startIcon={<Pause />}
                      onClick={() => handleUpdateStatus('Pause')}
                      size="small"
                    >
                      Pause
                    </Button>
                  )}
                  {task.currentStatus === 'Pause' && (
                    <Button
                      variant="outlined"
                      startIcon={<PlayArrow />}
                      onClick={() => handleUpdateStatus('Resume')}
                      size="small"
                    >
                      Resume
                    </Button>
                  )}
                  <Button
                    variant="outlined"
                    color="success"
                    startIcon={<CheckCircle />}
                    onClick={() => handleUpdateStatus('Completed')}
                    size="small"
                  >
                    Mark Completed
                  </Button>
                </Box>
              )}
            </CardContent>
          </Card>

          {/* Timeline Information */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Timeline & Progress
              </Typography>
              
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <List dense>
                    {task.timeline.startTime && (
                      <ListItem>
                        <ListItemIcon>
                          <PlayArrow />
                        </ListItemIcon>
                        <ListItemText
                          primary="Started"
                          secondary={moment(task.timeline.startTime).format('MMM DD, YYYY HH:mm')}
                        />
                      </ListItem>
                    )}
                    {task.timeline.dueTime && (
                      <ListItem>
                        <ListItemIcon>
                          <Schedule />
                        </ListItemIcon>
                        <ListItemText
                          primary="Due"
                          secondary={moment(task.timeline.dueTime).format('MMM DD, YYYY HH:mm')}
                        />
                      </ListItem>
                    )}
                    {task.timeline.completionTime && (
                      <ListItem>
                        <ListItemIcon>
                          <CheckCircle />
                        </ListItemIcon>
                        <ListItemText
                          primary="Completed"
                          secondary={moment(task.timeline.completionTime).format('MMM DD, YYYY HH:mm')}
                        />
                      </ListItem>
                    )}
                  </List>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Box mb={2}>
                    <Typography variant="body2" color="textSecondary" gutterBottom>
                      Time Progress
                    </Typography>
                    <LinearProgress 
                      variant="determinate" 
                      value={calculateProgress()} 
                      sx={{ height: 8, borderRadius: 4 }}
                    />
                    <Typography variant="caption" color="textSecondary">
                      {task.timeline.actualHours?.toFixed(1) || 0}h / {task.timeline.estimatedHours}h
                      {task.timeline.pausedDuration ? ` (${(task.timeline.pausedDuration / 60).toFixed(1)}h paused)` : ''}
                    </Typography>
                  </Box>

                  {task.delayedHours && task.delayedHours > 0 && (
                    <Alert severity="warning" sx={{ mt: 2 }}>
                      Task is delayed by {task.delayedHours.toFixed(1)} hours
                    </Alert>
                  )}
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Status History */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Status History
              </Typography>
              
              <Timeline>
                {task.statusHistory.map((entry, index) => (
                  <TimelineItem key={index}>
                    <TimelineSeparator>
                      <TimelineDot color={getStatusColor(entry.status) as any}>
                        {getStatusIcon(entry.status)}
                      </TimelineDot>
                      {index < task.statusHistory.length - 1 && <TimelineConnector />}
                    </TimelineSeparator>
                    <TimelineContent>
                      <Typography variant="subtitle2">
                        {entry.status}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        {entry.user.username} • {moment(entry.timestamp).format('MMM DD, YYYY HH:mm')}
                      </Typography>
                      {entry.notes && (
                        <Typography variant="body2" sx={{ mt: 1, fontStyle: 'italic' }}>
                          "{entry.notes}"
                        </Typography>
                      )}
                    </TimelineContent>
                  </TimelineItem>
                ))}
              </Timeline>
            </CardContent>
          </Card>
        </Grid>

        {/* Sidebar */}
        <Grid item xs={12} md={4}>
          {/* Approval Status */}
          {task.currentGroup && (
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Approval Status
                </Typography>
                <Chip
                  label={task.approvalStatus}
                  color={task.approvalStatus === 'approved' ? 'success' : 
                         task.approvalStatus === 'rejected' ? 'error' : 'default'}
                />
                {task.approvedBy && (
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    By: {task.approvedBy.username}
                  </Typography>
                )}
                {task.approvalNotes && (
                  <Typography variant="body2" sx={{ mt: 1, fontStyle: 'italic' }}>
                    "{task.approvalNotes}"
                  </Typography>
                )}
              </CardContent>
            </Card>
          )}

          {/* Group History */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Group History
              </Typography>
              <List dense>
                {task.groupHistory.map((entry, index) => (
                  <React.Fragment key={index}>
                    <ListItem>
                      <ListItemText
                        primary={entry.group.name}
                        secondary={
                          <Box>
                            <Typography variant="caption" display="block">
                              Entered: {moment(entry.enteredAt).format('MMM DD, HH:mm')}
                            </Typography>
                            {entry.exitedAt && (
                              <Typography variant="caption" display="block">
                                Exited: {moment(entry.exitedAt).format('MMM DD, HH:mm')}
                              </Typography>
                            )}
                            {entry.owner && (
                              <Typography variant="caption" display="block">
                                Owner: {entry.owner.username}
                              </Typography>
                            )}
                            {entry.hoursSpent && (
                              <Typography variant="caption" display="block">
                                Time spent: {entry.hoursSpent.toFixed(1)}h
                              </Typography>
                            )}
                            {entry.completionStatus && (
                              <Chip
                                label={entry.completionStatus.replace('-', ' ')}
                                size="small"
                                color={getCompletionColor(entry.completionStatus) as any}
                                sx={{ mt: 0.5 }}
                              />
                            )}
                          </Box>
                        }
                      />
                    </ListItem>
                    {index < task.groupHistory.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            </CardContent>
          </Card>

          {/* Task Metadata */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Task Information
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemText
                    primary="Created"
                    secondary={moment(task.createdAt).format('MMM DD, YYYY HH:mm')}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Task ID"
                    secondary={task._id}
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Status Update Dialog */}
      <Dialog open={statusDialog} onClose={() => setStatusDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Update Task Status</DialogTitle>
        <DialogContent>
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
              onClick={() => handleUpdateStatus('In-progress')}
            >
              In Progress
            </Button>
            <Button
              variant="outlined"
              onClick={() => handleUpdateStatus('Pause')}
            >
              Pause
            </Button>
            <Button
              variant="outlined"
              color="success"
              onClick={() => handleUpdateStatus('Completed')}
            >
              Completed
            </Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStatusDialog(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>

      {/* Edit Task Dialog */}
      <Dialog open={editDialog} onClose={() => setEditDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Task</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Task Title"
            fullWidth
            variant="outlined"
            value={editForm.title}
            onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Description"
            fullWidth
            multiline
            rows={4}
            variant="outlined"
            value={editForm.description}
            onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Priority"
            select
            fullWidth
            variant="outlined"
            value={editForm.priority}
            onChange={(e) => setEditForm(prev => ({ ...prev, priority: e.target.value }))}
            SelectProps={{
              native: true,
            }}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialog(false)}>Cancel</Button>
          <Button onClick={handleUpdateTask} variant="contained">Update Task</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TaskDetail;