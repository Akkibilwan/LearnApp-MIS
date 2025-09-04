import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  LinearProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Avatar,
  Grid
} from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  ResponsiveContainer
} from 'recharts';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';

interface SpaceAnalytics {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  delayedTasks: number;
  approvalPendingTasks: number;
  averageCompletionTime: number;
  totalEstimatedHours: number;
  totalActualHours: number;
  tasksByGroup: { [key: string]: number };
  tasksByOwner: { [key: string]: number };
  tasksByStatus: { [key: string]: number };
}

interface Space {
  _id: string;
  name: string;
}

const Analytics: React.FC = () => {
  const { user } = useAuth();
  const { showNotification } = useNotification();

  const [spaces, setSpaces] = useState<Space[]>([]);
  const [selectedSpace, setSelectedSpace] = useState<string>('');
  const [analytics, setAnalytics] = useState<SpaceAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSpaces();
  }, []);

  useEffect(() => {
    if (selectedSpace) {
      fetchAnalytics();
    }
  }, [selectedSpace]);

  const fetchSpaces = async () => {
    try {
      const response = await axios.get('/spaces');
      setSpaces(response.data);
      
      // Auto-select first space if available
      if (response.data.length > 0) {
        setSelectedSpace(response.data[0]._id);
      }
    } catch (error) {
      console.error('Error fetching spaces:', error);
      showNotification('Failed to load spaces', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    if (!selectedSpace) return;

    try {
      setLoading(true);
      const response = await axios.get(`/tasks/space/${selectedSpace}/analytics`);
      setAnalytics(response.data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      showNotification('Failed to load analytics', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed': return '#4caf50';
      case 'in-progress': return '#2196f3';
      case 'delayed': return '#f44336';
      case 'approved': return '#4caf50';
      case 'rejected': return '#f44336';
      case 'pause': return '#ff9800';
      default: return '#9e9e9e';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return '#f44336';
      case 'high': return '#ff9800';
      case 'medium': return '#2196f3';
      case 'low': return '#9e9e9e';
      default: return '#9e9e9e';
    }
  };

  // Prepare chart data
  const statusChartData = analytics ? Object.entries(analytics.tasksByStatus).map(([status, count]) => ({
    name: status,
    value: count,
    fill: getStatusColor(status)
  })) : [];

  const groupChartData = analytics ? Object.entries(analytics.tasksByGroup).map(([group, count]) => ({
    name: group,
    tasks: count
  })) : [];

  const ownerChartData = analytics ? Object.entries(analytics.tasksByOwner).map(([owner, count]) => ({
    name: owner,
    tasks: count
  })) : [];

  const completionRateData = analytics ? [
    { name: 'Completed', value: analytics.completedTasks, fill: '#4caf50' },
    { name: 'In Progress', value: analytics.inProgressTasks, fill: '#2196f3' },
    { name: 'Delayed', value: analytics.delayedTasks, fill: '#f44336' },
  ] : [];

  if (loading && !analytics) {
    return <LinearProgress />;
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Analytics
        </Typography>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Select Space</InputLabel>
          <Select
            value={selectedSpace}
            label="Select Space"
            onChange={(e) => setSelectedSpace(e.target.value)}
          >
            {spaces.map((space) => (
              <MenuItem key={space._id} value={space._id}>
                {space.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {!selectedSpace ? (
        <Card sx={{ textAlign: 'center', py: 8 }}>
          <CardContent>
            <Typography variant="h5" gutterBottom>
              No spaces available
            </Typography>
            <Typography color="textSecondary">
              Create a space to view analytics
            </Typography>
          </CardContent>
        </Card>
      ) : analytics ? (
        <>
          {/* Summary Cards */}
          <Box display="flex" flexWrap="wrap" gap={3} mb={4}>
            <Box flex="1" minWidth="250px">
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Total Tasks
                  </Typography>
                  <Typography variant="h4">
                    {analytics.totalTasks}
                  </Typography>
                </CardContent>
              </Card>
            </Box>
            <Box flex="1" minWidth="250px">
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Completed Tasks
                  </Typography>
                  <Typography variant="h4" color="success.main">
                    {analytics.completedTasks}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    {analytics.totalTasks > 0 
                      ? `${((analytics.completedTasks / analytics.totalTasks) * 100).toFixed(1)}%`
                      : '0%'
                    } completion rate
                  </Typography>
                </CardContent>
              </Card>
            </Box>
            <Box flex="1" minWidth="250px">
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Delayed Tasks
                  </Typography>
                  <Typography variant="h4" color="error.main">
                    {analytics.delayedTasks}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    {analytics.totalTasks > 0 
                      ? `${((analytics.delayedTasks / analytics.totalTasks) * 100).toFixed(1)}%`
                      : '0%'
                    } of total tasks
                  </Typography>
                </CardContent>
              </Card>
            </Box>
            <Box flex="1" minWidth="250px">
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Avg. Completion Time
                  </Typography>
                  <Typography variant="h4">
                    {analytics.averageCompletionTime.toFixed(1)}h
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    {analytics.totalEstimatedHours.toFixed(1)}h estimated total
                  </Typography>
                </CardContent>
              </Card>
            </Box>
          </Box>

          {/* Charts */}
          <Box display="flex" flexWrap="wrap" gap={3} mb={4}>
            {/* Task Status Distribution */}
            <Box flex="1" minWidth="400px">
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Task Status Distribution
                  </Typography>
                  <Box height={300}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={statusChartData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} (${percent ? (percent * 100).toFixed(0) : 0}%)`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {statusChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* Completion Rate */}
            <Box flex="1" minWidth="400px">
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Completion Rate
                  </Typography>
                  <Box height={300}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={completionRateData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} (${percent ? (percent * 100).toFixed(0) : 0}%)`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {completionRateData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* Tasks by Group */}
            <Box flex="1" minWidth="400px">
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Tasks by Group
                  </Typography>
                  <Box height={300}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={groupChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="name" 
                          angle={-45}
                          textAnchor="end"
                          height={80}
                        />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="tasks" fill="#2196f3" />
                      </BarChart>
                    </ResponsiveContainer>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* Tasks by Owner */}
            <Box flex="1" minWidth="400px">
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Tasks by Owner
                  </Typography>
                  <Box height={300}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={ownerChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="name" 
                          angle={-45}
                          textAnchor="end"
                          height={80}
                        />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="tasks" fill="#4caf50" />
                      </BarChart>
                    </ResponsiveContainer>
                  </Box>
                </CardContent>
              </Card>
            </Box>
          </Box>

          {/* Detailed Tables */}
          <Box display="flex" flexWrap="wrap" gap={3}>
            {/* Group Performance */}
            <Box flex="1" minWidth="400px">
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Group Performance
                  </Typography>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Group</TableCell>
                          <TableCell align="right">Tasks</TableCell>
                          <TableCell align="right">Percentage</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {Object.entries(analytics.tasksByGroup).map(([group, count]) => (
                          <TableRow key={group}>
                            <TableCell>{group}</TableCell>
                            <TableCell align="right">{count}</TableCell>
                            <TableCell align="right">
                              {analytics.totalTasks > 0 
                                ? `${((count / analytics.totalTasks) * 100).toFixed(1)}%`
                                : '0%'
                              }
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            </Grid>

            {/* Owner Performance */}
            <Box flex="1" minWidth="400px">
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Owner Performance
                  </Typography>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Owner</TableCell>
                          <TableCell align="right">Tasks</TableCell>
                          <TableCell align="right">Percentage</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {Object.entries(analytics.tasksByOwner).map(([owner, count]) => (
                          <TableRow key={owner}>
                            <TableCell>
                              <Box display="flex" alignItems="center" gap={1}>
                                <Avatar sx={{ width: 24, height: 24, fontSize: '0.75rem' }}>
                                  {owner.charAt(0).toUpperCase()}
                                </Avatar>
                                {owner}
                              </Box>
                            </TableCell>
                            <TableCell align="right">{count}</TableCell>
                            <TableCell align="right">
                              {analytics.totalTasks > 0 
                                ? `${((count / analytics.totalTasks) * 100).toFixed(1)}%`
                                : '0%'
                              }
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Time Tracking Summary */}
          <Card sx={{ mt: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Time Tracking Summary
              </Typography>
              <Box display="flex" flexWrap="wrap" gap={3}>
                <Box flex="1" minWidth="200px">
                  <Box textAlign="center">
                    <Typography variant="h4" color="primary">
                      {analytics.totalEstimatedHours.toFixed(1)}h
                    </Typography>
                    <Typography color="textSecondary">
                      Total Estimated Hours
                    </Typography>
                  </Box>
                </Grid>
                <Box flex="1" minWidth="200px">
                  <Box textAlign="center">
                    <Typography variant="h4" color="success.main">
                      {analytics.totalActualHours.toFixed(1)}h
                    </Typography>
                    <Typography color="textSecondary">
                      Total Actual Hours
                    </Typography>
                  </Box>
                </Grid>
                <Box flex="1" minWidth="200px">
                  <Box textAlign="center">
                    <Typography 
                      variant="h4" 
                      color={analytics.totalActualHours > analytics.totalEstimatedHours ? 'error.main' : 'success.main'}
                    >
                      {analytics.totalEstimatedHours > 0 
                        ? `${((analytics.totalActualHours / analytics.totalEstimatedHours) * 100).toFixed(1)}%`
                        : '0%'
                      }
                    </Typography>
                    <Typography color="textSecondary">
                      Time Efficiency
                    </Typography>
                  </Box>
                </Box>
              </Box>
              
              <Box mt={2}>
                <LinearProgress 
                  variant="determinate" 
                  value={Math.min((analytics.totalActualHours / analytics.totalEstimatedHours) * 100, 100)}
                  sx={{ height: 8, borderRadius: 4 }}
                  color={analytics.totalActualHours > analytics.totalEstimatedHours ? 'error' : 'success'}
                />
              </Box>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card sx={{ textAlign: 'center', py: 8 }}>
          <CardContent>
            <Typography variant="h5" gutterBottom>
              No data available
            </Typography>
            <Typography color="textSecondary">
              Create some tasks to view analytics
            </Typography>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default Analytics;