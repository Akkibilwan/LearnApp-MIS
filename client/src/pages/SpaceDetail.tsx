import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Card,
  CardContent,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Switch,
  FormControlLabel,
  LinearProgress,
  Alert
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Settings,
  Group,
  Assignment
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import KanbanBoard from '../components/KanbanBoard';

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
  workingHours: {
    start: string;
    end: string;
  };
  workingDays: number[];
  settings: {
    allowParallelTasks: boolean;
    requireApprovalForTaskMove: boolean;
    slackWebhookUrl?: string;
  };
}

interface Group {
  _id: string;
  name: string;
  description: string;
  order: number;
  estimatedHours: number;
  dependencies: Array<{
    group: {
      _id: string;
      name: string;
    };
    type: 'sequential' | 'parallel';
  }>;
  isApprovalGroup: boolean;
  isFinalGroup: boolean;
  isStartGroup: boolean;
}

const SpaceDetail: React.FC = () => {
  const { spaceId } = useParams<{ spaceId: string }>();
  const { user } = useAuth();
  const { showNotification } = useNotification();
  const navigate = useNavigate();

  const [space, setSpace] = useState<Space | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);

  // Dialog states
  const [groupDialog, setGroupDialog] = useState<{
    open: boolean;
    group?: Group;
  }>({ open: false });
  const [settingsDialog, setSettingsDialog] = useState(false);
  const [memberDialog, setMemberDialog] = useState(false);

  // Form states
  const [groupForm, setGroupForm] = useState({
    name: '',
    description: '',
    estimatedHours: 8,
    dependencies: [] as string[],
    dependencyType: 'sequential' as 'sequential' | 'parallel',
    isApprovalGroup: false,
    isFinalGroup: false,
    isStartGroup: false
  });

  const [settingsForm, setSettingsForm] = useState({
    allowParallelTasks: true,
    requireApprovalForTaskMove: false,
    slackWebhookUrl: ''
  });

  const [newMemberEmail, setNewMemberEmail] = useState('');

  useEffect(() => {
    if (spaceId) {
      fetchSpaceData();
    }
  }, [spaceId]);

  const fetchSpaceData = async () => {
    try {
      const [spaceRes, groupsRes] = await Promise.all([
        axios.get(`/spaces/${spaceId}`),
        axios.get(`/groups/space/${spaceId}`)
      ]);

      setSpace(spaceRes.data);
      setGroups(groupsRes.data);
      
      setSettingsForm({
        allowParallelTasks: spaceRes.data.settings.allowParallelTasks,
        requireApprovalForTaskMove: spaceRes.data.settings.requireApprovalForTaskMove,
        slackWebhookUrl: spaceRes.data.settings.slackWebhookUrl || ''
      });
    } catch (error) {
      console.error('Error fetching space data:', error);
      showNotification('Failed to load space data', 'error');
      navigate('/spaces');
    } finally {
      setLoading(false);
    }
  };

  const isSpaceAdmin = () => {
    return space?.admin._id === user?.id;
  };

  const handleCreateGroup = async () => {
    if (!groupForm.name.trim()) {
      showNotification('Group name is required', 'error');
      return;
    }

    try {
      await axios.post(`/groups/space/${spaceId}`, {
        ...groupForm,
        dependencies: groupForm.dependencies.map(depId => ({
          group: depId,
          type: groupForm.dependencyType
        }))
      });

      showNotification('Group created successfully', 'success');
      setGroupDialog({ open: false });
      resetGroupForm();
      fetchSpaceData();
    } catch (error: any) {
      console.error('Error creating group:', error);
      showNotification(
        error.response?.data?.message || 'Failed to create group',
        'error'
      );
    }
  };

  const handleEditGroup = async () => {
    const { group } = groupDialog;
    if (!group || !groupForm.name.trim()) return;

    try {
      await axios.put(`/groups/${group._id}`, {
        ...groupForm,
        dependencies: groupForm.dependencies.map(depId => ({
          group: depId,
          type: groupForm.dependencyType
        }))
      });

      showNotification('Group updated successfully', 'success');
      setGroupDialog({ open: false });
      resetGroupForm();
      fetchSpaceData();
    } catch (error: any) {
      console.error('Error updating group:', error);
      showNotification(
        error.response?.data?.message || 'Failed to update group',
        'error'
      );
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (!window.confirm('Are you sure you want to delete this group?')) return;

    try {
      await axios.delete(`/groups/${groupId}`);
      showNotification('Group deleted successfully', 'success');
      fetchSpaceData();
    } catch (error: any) {
      console.error('Error deleting group:', error);
      showNotification(
        error.response?.data?.message || 'Failed to delete group',
        'error'
      );
    }
  };

  const handleUpdateSettings = async () => {
    try {
      await axios.put(`/spaces/${spaceId}`, {
        settings: settingsForm
      });

      showNotification('Settings updated successfully', 'success');
      setSettingsDialog(false);
      fetchSpaceData();
    } catch (error: any) {
      console.error('Error updating settings:', error);
      showNotification(
        error.response?.data?.message || 'Failed to update settings',
        'error'
      );
    }
  };

  const handleAddMember = async () => {
    if (!newMemberEmail.trim()) return;

    try {
      // First search for user by email
      const searchRes = await axios.get(`/users/search?query=${newMemberEmail}`);
      const foundUser = searchRes.data.find((u: any) => u.email === newMemberEmail);

      if (!foundUser) {
        showNotification('User not found', 'error');
        return;
      }

      await axios.post(`/spaces/${spaceId}/members`, {
        userId: foundUser._id,
        role: 'member'
      });

      showNotification('Member added successfully', 'success');
      setMemberDialog(false);
      setNewMemberEmail('');
      fetchSpaceData();
    } catch (error: any) {
      console.error('Error adding member:', error);
      showNotification(
        error.response?.data?.message || 'Failed to add member',
        'error'
      );
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!window.confirm('Are you sure you want to remove this member?')) return;

    try {
      await axios.delete(`/spaces/${spaceId}/members/${userId}`);
      showNotification('Member removed successfully', 'success');
      fetchSpaceData();
    } catch (error: any) {
      console.error('Error removing member:', error);
      showNotification(
        error.response?.data?.message || 'Failed to remove member',
        'error'
      );
    }
  };

  const resetGroupForm = () => {
    setGroupForm({
      name: '',
      description: '',
      estimatedHours: 8,
      dependencies: [],
      dependencyType: 'sequential',
      isApprovalGroup: false,
      isFinalGroup: false,
      isStartGroup: false
    });
  };

  const openEditGroupDialog = (group: Group) => {
    setGroupForm({
      name: group.name,
      description: group.description,
      estimatedHours: group.estimatedHours,
      dependencies: group.dependencies.map(dep => dep.group._id),
      dependencyType: group.dependencies[0]?.type || 'sequential',
      isApprovalGroup: group.isApprovalGroup,
      isFinalGroup: group.isFinalGroup,
      isStartGroup: group.isStartGroup
    });
    setGroupDialog({ open: true, group });
  };

  if (loading) {
    return <LinearProgress />;
  }

  if (!space) {
    return (
      <Alert severity="error">
        Space not found or you don't have access to this space.
      </Alert>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            {space.name}
          </Typography>
          <Typography color="textSecondary">
            {space.description}
          </Typography>
        </Box>
        {isSpaceAdmin() && (
          <Box display="flex" gap={1}>
            <Button
              variant="outlined"
              startIcon={<Settings />}
              onClick={() => setSettingsDialog(true)}
            >
              Settings
            </Button>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => setGroupDialog({ open: true })}
            >
              Add Group
            </Button>
          </Box>
        )}
      </Box>

      <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)} sx={{ mb: 3 }}>
        <Tab label="Kanban Board" icon={<Assignment />} />
        <Tab label="Groups" icon={<Group />} />
        <Tab label="Members" />
      </Tabs>

      {activeTab === 0 && (
        <KanbanBoard spaceId={spaceId!} isAdmin={isSpaceAdmin()} />
      )}

      {activeTab === 1 && (
        <Box>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">Groups</Typography>
            {isSpaceAdmin() && (
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => setGroupDialog({ open: true })}
              >
                Add Group
              </Button>
            )}
          </Box>

          <List>
            {groups.map((group) => (
              <Card key={group._id} sx={{ mb: 2 }}>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                    <Box flex={1}>
                      <Box display="flex" alignItems="center" gap={1} mb={1}>
                        <Typography variant="h6">{group.name}</Typography>
                        {group.isStartGroup && <Chip label="Start" size="small" color="success" />}
                        {group.isApprovalGroup && <Chip label="Approval" size="small" color="warning" />}
                        {group.isFinalGroup && <Chip label="Final" size="small" color="info" />}
                      </Box>
                      
                      {group.description && (
                        <Typography color="textSecondary" paragraph>
                          {group.description}
                        </Typography>
                      )}

                      <Typography variant="body2" color="textSecondary">
                        Estimated Hours: {group.estimatedHours}h
                      </Typography>

                      {group.dependencies.length > 0 && (
                        <Typography variant="body2" color="textSecondary">
                          Dependencies: {group.dependencies.map(dep => dep.group.name).join(', ')}
                        </Typography>
                      )}
                    </Box>

                    {isSpaceAdmin() && (
                      <Box>
                        <IconButton onClick={() => openEditGroupDialog(group)}>
                          <Edit />
                        </IconButton>
                        <IconButton onClick={() => handleDeleteGroup(group._id)}>
                          <Delete />
                        </IconButton>
                      </Box>
                    )}
                  </Box>
                </CardContent>
              </Card>
            ))}
          </List>
        </Box>
      )}

      {activeTab === 2 && (
        <Box>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">Members</Typography>
            {isSpaceAdmin() && (
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => setMemberDialog(true)}
              >
                Add Member
              </Button>
            )}
          </Box>

          <List>
            <ListItem>
              <ListItemText
                primary={space.admin.username}
                secondary="Administrator"
              />
              <ListItemSecondaryAction>
                <Chip label="Admin" color="primary" size="small" />
              </ListItemSecondaryAction>
            </ListItem>
            
            {space.members.map((member) => (
              <ListItem key={member.user.id}>
                <ListItemText
                  primary={member.user.username}
                  secondary="Member"
                />
                <ListItemSecondaryAction>
                  {isSpaceAdmin() && (
                    <IconButton
                      edge="end"
                      onClick={() => handleRemoveMember(member.user.id)}
                    >
                      <Delete />
                    </IconButton>
                  )}
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        </Box>
      )}

      {/* Group Dialog */}
      <Dialog open={groupDialog.open} onClose={() => setGroupDialog({ open: false })} maxWidth="md" fullWidth>
        <DialogTitle>
          {groupDialog.group ? 'Edit Group' : 'Create New Group'}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Group Name"
            fullWidth
            variant="outlined"
            value={groupForm.name}
            onChange={(e) => setGroupForm(prev => ({ ...prev, name: e.target.value }))}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Description"
            fullWidth
            multiline
            rows={3}
            variant="outlined"
            value={groupForm.description}
            onChange={(e) => setGroupForm(prev => ({ ...prev, description: e.target.value }))}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Estimated Hours"
            type="number"
            value={groupForm.estimatedHours}
            onChange={(e) => setGroupForm(prev => ({ ...prev, estimatedHours: parseInt(e.target.value) || 0 }))}
            sx={{ mb: 2, width: 200 }}
          />

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Dependencies</InputLabel>
            <Select
              multiple
              value={groupForm.dependencies}
              onChange={(e) => setGroupForm(prev => ({ ...prev, dependencies: e.target.value as string[] }))}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selected.map((value) => {
                    const group = groups.find(g => g._id === value);
                    return <Chip key={value} label={group?.name} size="small" />;
                  })}
                </Box>
              )}
            >
              {groups.filter(g => g._id !== groupDialog.group?._id).map((group) => (
                <MenuItem key={group._id} value={group._id}>
                  {group.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Box display="flex" gap={2} flexWrap="wrap" mb={2}>
            <FormControlLabel
              control={
                <Switch
                  checked={groupForm.isStartGroup}
                  onChange={(e) => setGroupForm(prev => ({ ...prev, isStartGroup: e.target.checked }))}
                />
              }
              label="Start Group"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={groupForm.isApprovalGroup}
                  onChange={(e) => setGroupForm(prev => ({ ...prev, isApprovalGroup: e.target.checked }))}
                />
              }
              label="Approval Group"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={groupForm.isFinalGroup}
                  onChange={(e) => setGroupForm(prev => ({ ...prev, isFinalGroup: e.target.checked }))}
                />
              }
              label="Final Group"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setGroupDialog({ open: false })}>Cancel</Button>
          <Button 
            onClick={groupDialog.group ? handleEditGroup : handleCreateGroup} 
            variant="contained"
          >
            {groupDialog.group ? 'Update' : 'Create'} Group
          </Button>
        </DialogActions>
      </Dialog>

      {/* Settings Dialog */}
      <Dialog open={settingsDialog} onClose={() => setSettingsDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Space Settings</DialogTitle>
        <DialogContent>
          <FormControlLabel
            control={
              <Switch
                checked={settingsForm.allowParallelTasks}
                onChange={(e) => setSettingsForm(prev => ({ ...prev, allowParallelTasks: e.target.checked }))}
              />
            }
            label="Allow Parallel Tasks"
            sx={{ mb: 2, display: 'block' }}
          />
          <FormControlLabel
            control={
              <Switch
                checked={settingsForm.requireApprovalForTaskMove}
                onChange={(e) => setSettingsForm(prev => ({ ...prev, requireApprovalForTaskMove: e.target.checked }))}
              />
            }
            label="Require Approval for Task Move"
            sx={{ mb: 2, display: 'block' }}
          />
          <TextField
            margin="dense"
            label="Slack Webhook URL"
            fullWidth
            variant="outlined"
            value={settingsForm.slackWebhookUrl}
            onChange={(e) => setSettingsForm(prev => ({ ...prev, slackWebhookUrl: e.target.value }))}
            placeholder="https://hooks.slack.com/services/..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSettingsDialog(false)}>Cancel</Button>
          <Button onClick={handleUpdateSettings} variant="contained">Update Settings</Button>
        </DialogActions>
      </Dialog>

      {/* Add Member Dialog */}
      <Dialog open={memberDialog} onClose={() => setMemberDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Member</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Member Email"
            fullWidth
            variant="outlined"
            value={newMemberEmail}
            onChange={(e) => setNewMemberEmail(e.target.value)}
            placeholder="Enter user's email address"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMemberDialog(false)}>Cancel</Button>
          <Button onClick={handleAddMember} variant="contained">Add Member</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SpaceDetail;