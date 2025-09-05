import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Chip,
  LinearProgress,
  Paper,
  Avatar,
  Divider,
  Grid
} from '@mui/material';
import {
  Add,
  Business,
  Assignment,
  TrendingUp,
  Schedule,
  CheckCircle,
  Warning
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import moment from 'moment';

interface DashboardStats {
  totalSpaces: number;
  totalTasks: number;
  completedTasks: number;
  delayedTasks: number;
  inProgressTasks: number;
}

interface RecentTask {
  _id: string;
  title: string;
  currentStatus: string;
  currentGroup: {
    name: string;
  };
  owner?: {
    username: string;
  };
  timeline: {
    dueTime?: string;
  };
  completionStatus: string;
}

interface Space {
  _id: string;
  name: string;
  description: string;
  groups: any[];
}

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { showNotification } = useNotification();
  const navigate = useNavigate();
  
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentTasks, setRecentTasks] = useState<RecentTask[]>([]);
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [spacesRes, tasksRes] = await Promise.all([
        axios.get('/spaces'),
        axios.get('/tasks/space/all') // We'll need to create this endpoint or modify existing one
      ]);

      setSpaces(spacesRes.data);

      // Calculate stats from spaces and tasks
      const allTasks: RecentTask[] = [];
      let totalTasks = 0;
      let completedTasks = 0;
      let delayedTasks = 0;
      let inProgressTasks = 0;

      // For now, we'll simulate stats since we need to aggregate from multiple spaces
      for (const space of spacesRes.data) {
        try {
          const spaceTasksRes = await axios.get(`/tasks/space/${space._id}`);
          const spaceTasks = spaceTasksRes.data;
          
          allTasks.push(...spaceTasks.slice(0, 5)); // Add recent tasks
          totalTasks += spaceTasks.length;
          completedTasks += spaceTasks.filter((t: RecentTask) => t.currentStatus === 'Completed').length;
          delayedTasks += spaceTasks.filter((t: RecentTask) => t.completionStatus === 'delayed').length;
          inProgressTasks += spaceTasks.filter((t: RecentTask) => t.currentStatus === 'In-progress').length;
        } catch (error) {
          console.error(`Error fetching tasks for space ${space._id}:`, error);
        }
      }

      setStats({
        totalSpaces: spacesRes.data.length,
        totalTasks,
        completedTasks,
        delayedTasks,
        inProgressTasks
      });

      // Sort tasks by creation date and take most recent
      setRecentTasks(allTasks.slice(0, 10));

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      showNotification('Failed to load dashboard data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'success';
      case 'in-progress':
        return 'primary';
      case 'delayed':
        return 'error';
      case 'approved':
        return 'success';
      case 'rejected':
        return 'error';
      default:
        return 'default';
    }
  };

  const getCompletionColor = (status: string) => {
    switch (status) {
      case 'before-time':
        return 'success';
      case 'on-time':
        return 'info';
      case 'delayed':
        return 'error';
      default:
        return 'default';
    }
  };

  if (loading) {
    return <LinearProgress />;
  }

  return (
    <Box>
      <Box display="flex" justifyContent="between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Welcome back, {user?.username}!
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => navigate('/spaces')}
        >
          New Space
        </Button>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} mb={4}>
        <Grid xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                  <Business />
                </Avatar>
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Total Spaces
                  </Typography>
                  <Typography variant="h4">
                    {stats?.totalSpaces || 0}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <Avatar sx={{ bgcolor: 'info.main', mr: 2 }}>
                  <Assignment />
                </Avatar>
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Total Tasks
                  </Typography>
                  <Typography variant="h4">
                    {stats?.totalTasks || 0}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <Avatar sx={{ bgcolor: 'success.main', mr: 2 }}>
                  <CheckCircle />
                </Avatar>
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Completed
                  </Typography>
                  <Typography variant="h4">
                    {stats?.completedTasks || 0}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <Avatar sx={{ bgcolor: 'warning.main', mr: 2 }}>
                  <Warning />
                </Avatar>
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Delayed
                  </Typography>
                  <Typography variant="h4">
                    {stats?.delayedTasks || 0}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Recent Tasks */}
        <Grid xs={12} md={8}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">
                  Recent Tasks
                </Typography>
                <Button
                  size="small"
                  onClick={() => navigate('/tasks')}
                >
                  View All
                </Button>
              </Box>
              <List>
                {recentTasks.map((task, index) => (
                  <React.Fragment key={task._id}>
                    <ListItem
                      onClick={() => navigate(`/tasks/${task._id}`)}
                      sx={{ cursor: 'pointer' }}
                    >
                      <ListItemText
                        primary={task.title}
                        secondary={
                          <Box>
                            <Typography variant="body2" color="textSecondary">
                              {task.currentGroup.name} • {task.owner?.username || 'Unassigned'}
                            </Typography>
                            {task.timeline.dueTime && (
                              <Typography variant="caption" color="textSecondary">
                                Due: {moment(task.timeline.dueTime).format('MMM DD, YYYY')}
                              </Typography>
                            )}
                          </Box>
                        }
                      />
                      <ListItemSecondaryAction>
                        <Box display="flex" gap={1} alignItems="center">
                          <Chip
                            label={task.currentStatus}
                            size="small"
                            color={getStatusColor(task.currentStatus) as any}
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
                      </ListItemSecondaryAction>
                    </ListItem>
                    {index < recentTasks.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
                {recentTasks.length === 0 && (
                  <ListItem>
                    <ListItemText
                      primary="No recent tasks"
                      secondary="Create a space and add tasks to get started"
                    />
                  </ListItem>
                )}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Quick Actions & Spaces */}
        <Grid xs={12} md={4}>
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Quick Actions
              </Typography>
              <Box display="flex" flexDirection="column" gap={1}>
                <Button
                  variant="outlined"
                  startIcon={<Assignment />}
                  onClick={() => navigate('/tasks')}
                  fullWidth
                >
                  View All Tasks
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<TrendingUp />}
                  onClick={() => navigate('/analytics')}
                  fullWidth
                >
                  View Analytics
                </Button>
              </Box>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Your Spaces
              </Typography>
              <List dense>
                {spaces.slice(0, 5).map((space) => (
                  <ListItem
                    key={space._id}
                    onClick={() => navigate(`/spaces/${space._id}`)}
                    sx={{ cursor: 'pointer' }}
                  >
                    <ListItemText
                      primary={space.name}
                      secondary={`${space.groups?.length || 0} groups`}
                    />
                  </ListItem>
                ))}
                {spaces.length === 0 && (
                  <ListItem>
                    <ListItemText
                      primary="No spaces yet"
                      secondary="Create your first space to get started"
                    />
                  </ListItem>
                )}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;