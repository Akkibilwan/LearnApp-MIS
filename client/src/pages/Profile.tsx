import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  Grid,
  Avatar,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControlLabel,
  Checkbox,
  FormGroup
} from '@mui/material';
import {
  Edit,
  Save,
  Cancel,
  Add,
  Delete,
  Schedule
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import moment, { Moment } from 'moment';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';

interface Leave {
  _id: string;
  date: string;
  reason: string;
  approved: boolean;
}

const Profile: React.FC = () => {
  const { user, updateProfile } = useAuth();
  const { showNotification } = useNotification();

  const [editing, setEditing] = useState(false);
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [leaveDialog, setLeaveDialog] = useState(false);

  // Form states
  const [profileForm, setProfileForm] = useState({
    username: user?.username || '',
    workingHours: {
      start: user?.workingHours.start || '09:00',
      end: user?.workingHours.end || '17:00'
    },
    workingDays: user?.workingDays || [1, 2, 3, 4, 5]
  });

  const [leaveForm, setLeaveForm] = useState({
    date: null as Moment | null,
    reason: ''
  });

  React.useEffect(() => {
    if (user) {
      fetchLeaves();
    }
  }, [user]);

  const fetchLeaves = async () => {
    try {
      const response = await axios.get(`/users/${user?._id}/leaves`);
      setLeaves(response.data);
    } catch (error) {
      console.error('Error fetching leaves:', error);
    }
  };

  const handleSaveProfile = async () => {
    try {
      await updateProfile(profileForm);
      showNotification('Profile updated successfully', 'success');
      setEditing(false);
    } catch (error: any) {
      showNotification(
        error.message || 'Failed to update profile',
        'error'
      );
    }
  };

  const handleCancelEdit = () => {
    setProfileForm({
      username: user?.username || '',
      workingHours: {
        start: user?.workingHours.start || '09:00',
        end: user?.workingHours.end || '17:00'
      },
      workingDays: user?.workingDays || [1, 2, 3, 4, 5]
    });
    setEditing(false);
  };

  const handleAddLeave = async () => {
    if (!leaveForm.date || !leaveForm.reason.trim()) {
      showNotification('Please fill in all fields', 'error');
      return;
    }

    try {
      await axios.post(`/users/${user?._id}/leaves`, {
        date: leaveForm.date.toISOString(),
        reason: leaveForm.reason
      });

      showNotification('Leave request submitted successfully', 'success');
      setLeaveDialog(false);
      setLeaveForm({ date: null, reason: '' });
      fetchLeaves();
    } catch (error: any) {
      showNotification(
        error.response?.data?.message || 'Failed to submit leave request',
        'error'
      );
    }
  };

  const handleWorkingDayChange = (day: number) => {
    const newWorkingDays = profileForm.workingDays.includes(day)
      ? profileForm.workingDays.filter(d => d !== day)
      : [...profileForm.workingDays, day].sort((a, b) => a - b);
    
    setProfileForm(prev => ({ ...prev, workingDays: newWorkingDays }));
  };

  const getDayName = (day: number) => {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return dayNames[day];
  };

  const getDayNames = (days: number[]) => {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days.map(day => dayNames[day]).join(', ');
  };

  if (!user) {
    return <Typography>Loading...</Typography>;
  }

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Profile
      </Typography>

      <Grid container spacing={3}>
        {/* Profile Information */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h6">
                  Personal Information
                </Typography>
                {!editing ? (
                  <Button
                    startIcon={<Edit />}
                    onClick={() => setEditing(true)}
                  >
                    Edit
                  </Button>
                ) : (
                  <Box display="flex" gap={1}>
                    <Button
                      startIcon={<Save />}
                      variant="contained"
                      onClick={handleSaveProfile}
                    >
                      Save
                    </Button>
                    <Button
                      startIcon={<Cancel />}
                      onClick={handleCancelEdit}
                    >
                      Cancel
                    </Button>
                  </Box>
                )}
              </Box>

              <Box display="flex" alignItems="center" gap={3} mb={3}>
                <Avatar
                  sx={{
                    width: 80,
                    height: 80,
                    fontSize: '2rem',
                    bgcolor: user.role === 'admin' ? 'primary.main' : 'grey.400'
                  }}
                >
                  {user.username.charAt(0).toUpperCase()}
                </Avatar>
                <Box>
                  <Typography variant="h5" gutterBottom>
                    {user.username}
                  </Typography>
                  <Chip
                    label={user.role}
                    color={user.role === 'admin' ? 'primary' : 'default'}
                  />
                </Box>
              </Box>

              <Box mb={3}>
                <Typography variant="body2" color="textSecondary" gutterBottom>
                  Email
                </Typography>
                <Typography variant="body1">
                  {user.email}
                </Typography>
              </Box>

              <Box mb={3}>
                <Typography variant="body2" color="textSecondary" gutterBottom>
                  Username
                </Typography>
                {editing ? (
                  <TextField
                    fullWidth
                    size="small"
                    value={profileForm.username}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, username: e.target.value }))}
                  />
                ) : (
                  <Typography variant="body1">
                    {user.username}
                  </Typography>
                )}
              </Box>

              <Divider sx={{ my: 3 }} />

              <Typography variant="h6" gutterBottom>
                Working Schedule
              </Typography>

              <Box mb={3}>
                <Typography variant="body2" color="textSecondary" gutterBottom>
                  Working Hours
                </Typography>
                {editing ? (
                  <Box display="flex" gap={2}>
                    <TextField
                      label="Start Time"
                      type="time"
                      size="small"
                      value={profileForm.workingHours.start}
                      onChange={(e) => setProfileForm(prev => ({
                        ...prev,
                        workingHours: { ...prev.workingHours, start: e.target.value }
                      }))}
                      InputLabelProps={{ shrink: true }}
                      sx={{ flex: 1 }}
                    />
                    <TextField
                      label="End Time"
                      type="time"
                      size="small"
                      value={profileForm.workingHours.end}
                      onChange={(e) => setProfileForm(prev => ({
                        ...prev,
                        workingHours: { ...prev.workingHours, end: e.target.value }
                      }))}
                      InputLabelProps={{ shrink: true }}
                      sx={{ flex: 1 }}
                    />
                  </Box>
                ) : (
                  <Typography variant="body1">
                    {user.workingHours.start} - {user.workingHours.end}
                  </Typography>
                )}
              </Box>

              <Box>
                <Typography variant="body2" color="textSecondary" gutterBottom>
                  Working Days
                </Typography>
                {editing ? (
                  <FormGroup row>
                    {[1, 2, 3, 4, 5, 6, 0].map((day) => (
                      <FormControlLabel
                        key={day}
                        control={
                          <Checkbox
                            checked={profileForm.workingDays.includes(day)}
                            onChange={() => handleWorkingDayChange(day)}
                          />
                        }
                        label={getDayName(day).slice(0, 3)}
                      />
                    ))}
                  </FormGroup>
                ) : (
                  <Typography variant="body1">
                    {getDayNames(user.workingDays)}
                  </Typography>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Leave Requests */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h6">
                  Leave Requests
                </Typography>
                <Button
                  startIcon={<Add />}
                  variant="contained"
                  onClick={() => setLeaveDialog(true)}
                >
                  Request Leave
                </Button>
              </Box>

              {leaves.length === 0 ? (
                <Box textAlign="center" py={4}>
                  <Schedule sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />
                  <Typography color="textSecondary">
                    No leave requests yet
                  </Typography>
                </Box>
              ) : (
                <List>
                  {leaves.map((leave, index) => (
                    <React.Fragment key={leave._id}>
                      <ListItem>
                        <ListItemText
                          primary={moment(leave.date).format('MMMM DD, YYYY')}
                          secondary={leave.reason}
                        />
                        <ListItemSecondaryAction>
                          <Chip
                            label={leave.approved ? 'Approved' : 'Pending'}
                            color={leave.approved ? 'success' : 'default'}
                            size="small"
                          />
                        </ListItemSecondaryAction>
                      </ListItem>
                      {index < leaves.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Leave Request Dialog */}
      <Dialog open={leaveDialog} onClose={() => setLeaveDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Request Leave</DialogTitle>
        <DialogContent>
          <Box mb={2} mt={1}>
            <DatePicker
              label="Leave Date"
              value={leaveForm.date}
              onChange={(newValue) => setLeaveForm(prev => ({ ...prev, date: newValue }))}
              slotProps={{
                textField: {
                  fullWidth: true,
                  variant: 'outlined'
                }
              }}
              minDate={moment()}
            />
          </Box>
          <TextField
            label="Reason"
            fullWidth
            multiline
            rows={3}
            variant="outlined"
            value={leaveForm.reason}
            onChange={(e) => setLeaveForm(prev => ({ ...prev, reason: e.target.value }))}
            placeholder="Please provide a reason for your leave request..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLeaveDialog(false)}>Cancel</Button>
          <Button onClick={handleAddLeave} variant="contained">
            Submit Request
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Profile;