import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Avatar,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  Paper,
  Tooltip
} from '@mui/material';
import {
  MoreVert,
  Add,
  Schedule,
  CheckCircle,
  Warning,
  Person
} from '@mui/icons-material';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import axios from 'axios';
import moment from 'moment';
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
  owner?: {
    _id: string;
    username: string;
  };
  priority: string;
  timeline: {
    startTime?: string;
    dueTime?: string;
    completionTime?: string;
  };
  completionStatus: string;
  createdAt: string;
}

interface Group {
  _id: string;
  name: string;
  description?: string;
  estimatedHours: number;
  order: number;
  isApprovalGroup: boolean;
  isFinalGroup: boolean;
  tasks: Task[];
}

interface User {
  id: string;
  username: string;
  email: string;
}

interface KanbanBoardProps {
  spaceId: string;
  isAdmin: boolean;
}

const KanbanBoard: React.FC<KanbanBoardProps> = ({ spaceId, isAdmin }) => {
  const { showNotification } = useNotification();
  
  const [groups, setGroups] = useState<Group[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Dialog states
  const [taskDialog, setTaskDialog] = useState<{
    open: boolean;
    task?: Task;
    groupId?: string;
  }>({ open: false });
  const [moveDialog, setMoveDialog] = useState<{
    open: boolean;
    task?: Task;
    targetGroupId?: string;
  }>({ open: false });
  
  // Menu state
  const [taskMenu, setTaskMenu] = useState<{
    anchorEl: HTMLElement | null;
    task?: Task;
  }>({ anchorEl: null });

  // Form states
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 'medium',
    owner: ''
  });
  const [moveTaskOwner, setMoveTaskOwner] = useState('');

  useEffect(() => {
    fetchData();
  }, [spaceId]);

  const fetchData = async () => {
    try {
      const [groupsRes, usersRes] = await Promise.all([
        axios.get(`/groups/space/${spaceId}`),
        axios.get('/users/search?query=')
      ]);

      // Fetch tasks for each group
      const groupsWithTasks = await Promise.all(
        groupsRes.data.map(async (group: Group) => {
          try {
            const tasksRes = await axios.get(`/tasks/space/${spaceId}?group=${group._id}`);
            return { ...group, tasks: tasksRes.data };
          } catch (error) {
            console.error(`Error fetching tasks for group ${group._id}:`, error);
            return { ...group, tasks: [] };
          }
        })
      );

      setGroups(groupsWithTasks.sort((a, b) => a.order - b.order));
      setUsers(usersRes.data);
    } catch (error) {
      console.error('Error fetching kanban data:', error);
      showNotification('Failed to load kanban board', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;

    // If dropped in the same position, do nothing
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    const sourceGroup = groups.find(g => g._id === source.droppableId);
    const destGroup = groups.find(g => g._id === destination.droppableId);
    const task = sourceGroup?.tasks.find(t => t._id === draggableId);

    if (!sourceGroup || !destGroup || !task) return;

    // If moving to different group, show move dialog
    if (source.droppableId !== destination.droppableId) {
      setMoveDialog({
        open: true,
        task,
        targetGroupId: destination.droppableId
      });
      setMoveTaskOwner(task.owner?.id || '');
      return;
    }

    // Same group reordering - just update UI for now
    const newTasks = Array.from(sourceGroup.tasks);
    const [reorderedTask] = newTasks.splice(source.index, 1);
    newTasks.splice(destination.index, 0, reorderedTask);

    setGroups(prev => prev.map(group => 
      group._id === sourceGroup._id 
        ? { ...group, tasks: newTasks }
        : group
    ));
  };

  const handleMoveTask = async () => {
    const { task, targetGroupId } = moveDialog;
    if (!task || !targetGroupId) return;

    try {
      await axios.put(`/tasks/${task._id}/move`, {
        groupId: targetGroupId,
        newOwner: moveTaskOwner || undefined
      });

      showNotification('Task moved successfully', 'success');
      setMoveDialog({ open: false });
      fetchData(); // Refresh data
    } catch (error: any) {
      console.error('Error moving task:', error);
      showNotification(
        error.response?.data?.message || 'Failed to move task',
        'error'
      );
    }
  };

  const handleCreateTask = async () => {
    const { groupId } = taskDialog;
    if (!groupId || !newTask.title.trim()) return;

    try {
      await axios.post(`/tasks/space/${spaceId}`, {
        ...newTask,
        owner: newTask.owner || undefined
      });

      showNotification('Task created successfully', 'success');
      setTaskDialog({ open: false });
      setNewTask({ title: '', description: '', priority: 'medium', owner: '' });
      fetchData(); // Refresh data
    } catch (error: any) {
      console.error('Error creating task:', error);
      showNotification(
        error.response?.data?.message || 'Failed to create task',
        'error'
      );
    }
  };

  const handleUpdateTaskStatus = async (taskId: string, status: string) => {
    try {
      await axios.put(`/tasks/${taskId}/status`, { status });
      showNotification('Task status updated', 'success');
      fetchData(); // Refresh data
    } catch (error: any) {
      console.error('Error updating task status:', error);
      showNotification(
        error.response?.data?.message || 'Failed to update task status',
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

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed': return <CheckCircle color="success" />;
      case 'in-progress': return <Schedule color="primary" />;
      case 'delayed': return <Warning color="error" />;
      default: return <Schedule />;
    }
  };

  const TaskCard: React.FC<{ task: Task; index: number }> = ({ task, index }) => (
    <Draggable draggableId={task._id} index={index}>
      {(provided, snapshot) => (
        <Card
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          sx={{
            mb: 1,
            opacity: snapshot.isDragging ? 0.8 : 1,
            transform: snapshot.isDragging ? 'rotate(5deg)' : 'none',
            cursor: 'grab',
            '&:hover': {
              boxShadow: 2
            }
          }}
        >
          <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
            <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, flex: 1 }}>
                {task.title}
              </Typography>
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  setTaskMenu({ anchorEl: e.currentTarget, task });
                }}
              >
                <MoreVert fontSize="small" />
              </IconButton>
            </Box>
            
            {task.description && (
              <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                {task.description.length > 100 
                  ? `${task.description.substring(0, 100)}...`
                  : task.description
                }
              </Typography>
            )}

            <Box display="flex" flexWrap="wrap" gap={0.5} mb={1}>
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
                  color={task.completionStatus === 'delayed' ? 'error' : 'success'}
                />
              )}
            </Box>

            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Box display="flex" alignItems="center" gap={1}>
                {getStatusIcon(task.currentStatus)}
                <Typography variant="caption" color="textSecondary">
                  {task.currentStatus}
                </Typography>
              </Box>
              
              {task.owner ? (
                <Tooltip title={task.owner.username}>
                  <Avatar sx={{ width: 24, height: 24, fontSize: '0.75rem' }}>
                    {task.owner.username.charAt(0).toUpperCase()}
                  </Avatar>
                </Tooltip>
              ) : (
                <Tooltip title="Unassigned">
                  <Avatar sx={{ width: 24, height: 24, bgcolor: 'grey.300' }}>
                    <Person fontSize="small" />
                  </Avatar>
                </Tooltip>
              )}
            </Box>

            {task.timeline.dueTime && (
              <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
                Due: {moment(task.timeline.dueTime).format('MMM DD, HH:mm')}
              </Typography>
            )}
          </CardContent>
        </Card>
      )}
    </Draggable>
  );

  if (loading) {
    return <Typography>Loading kanban board...</Typography>;
  }

  return (
    <Box>
      <DragDropContext onDragEnd={handleDragEnd}>
        <Box display="flex" gap={2} sx={{ overflowX: 'auto', pb: 2 }}>
          {groups.map((group) => (
            <Paper
              key={group._id}
              sx={{
                minWidth: 300,
                maxWidth: 300,
                bgcolor: 'grey.50',
                p: 2
              }}
            >
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    {group.name}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    {group.tasks.length} tasks • {group.estimatedHours}h estimated
                  </Typography>
                  {group.isApprovalGroup && (
                    <Chip label="Approval" size="small" color="warning" sx={{ ml: 1 }} />
                  )}
                  {group.isFinalGroup && (
                    <Chip label="Final" size="small" color="success" sx={{ ml: 1 }} />
                  )}
                </Box>
                <IconButton
                  size="small"
                  onClick={() => setTaskDialog({ open: true, groupId: group._id })}
                >
                  <Add />
                </IconButton>
              </Box>

              <Droppable droppableId={group._id}>
                {(provided, snapshot) => (
                  <Box
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    sx={{
                      minHeight: 200,
                      bgcolor: snapshot.isDraggingOver ? 'primary.light' : 'transparent',
                      borderRadius: 1,
                      transition: 'background-color 0.2s ease',
                      p: 1
                    }}
                  >
                    {group.tasks.map((task, index) => (
                      <TaskCard key={task._id} task={task} index={index} />
                    ))}
                    {provided.placeholder}
                    
                    {group.tasks.length === 0 && (
                      <Box
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                        sx={{
                          height: 100,
                          border: '2px dashed',
                          borderColor: 'grey.300',
                          borderRadius: 1,
                          color: 'grey.500'
                        }}
                      >
                        <Typography variant="body2">
                          Drop tasks here or click + to add
                        </Typography>
                      </Box>
                    )}
                  </Box>
                )}
              </Droppable>
            </Paper>
          ))}
        </Box>
      </DragDropContext>

      {/* Task Menu */}
      <Menu
        anchorEl={taskMenu.anchorEl}
        open={Boolean(taskMenu.anchorEl)}
        onClose={() => setTaskMenu({ anchorEl: null })}
      >
        <MenuItem onClick={() => {
          if (taskMenu.task) {
            handleUpdateTaskStatus(taskMenu.task._id, 'In-progress');
          }
          setTaskMenu({ anchorEl: null });
        }}>
          Mark In Progress
        </MenuItem>
        <MenuItem onClick={() => {
          if (taskMenu.task) {
            handleUpdateTaskStatus(taskMenu.task._id, 'Completed');
          }
          setTaskMenu({ anchorEl: null });
        }}>
          Mark Completed
        </MenuItem>
        <MenuItem onClick={() => {
          if (taskMenu.task) {
            handleUpdateTaskStatus(taskMenu.task._id, 'Pause');
          }
          setTaskMenu({ anchorEl: null });
        }}>
          Pause Task
        </MenuItem>
      </Menu>

      {/* Create Task Dialog */}
      <Dialog open={taskDialog.open} onClose={() => setTaskDialog({ open: false })} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Task</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Task Title"
            fullWidth
            variant="outlined"
            value={newTask.title}
            onChange={(e) => setNewTask(prev => ({ ...prev, title: e.target.value }))}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Description"
            fullWidth
            multiline
            rows={3}
            variant="outlined"
            value={newTask.description}
            onChange={(e) => setNewTask(prev => ({ ...prev, description: e.target.value }))}
            sx={{ mb: 2 }}
          />
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Priority</InputLabel>
            <Select
              value={newTask.priority}
              label="Priority"
              onChange={(e) => setNewTask(prev => ({ ...prev, priority: e.target.value }))}
            >
              <MenuItem value="low">Low</MenuItem>
              <MenuItem value="medium">Medium</MenuItem>
              <MenuItem value="high">High</MenuItem>
              <MenuItem value="urgent">Urgent</MenuItem>
            </Select>
          </FormControl>
          <FormControl fullWidth>
            <InputLabel>Assign to</InputLabel>
            <Select
              value={newTask.owner}
              label="Assign to"
              onChange={(e) => setNewTask(prev => ({ ...prev, owner: e.target.value }))}
            >
              <MenuItem value="">Unassigned</MenuItem>
              {users.map((user) => (
                <MenuItem key={user.id} value={user.id}>
                  {user.username}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTaskDialog({ open: false })}>Cancel</Button>
          <Button onClick={handleCreateTask} variant="contained">Create Task</Button>
        </DialogActions>
      </Dialog>

      {/* Move Task Dialog */}
      <Dialog open={moveDialog.open} onClose={() => setMoveDialog({ open: false })} maxWidth="sm" fullWidth>
        <DialogTitle>Move Task</DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            Moving "{moveDialog.task?.title}" to {groups.find(g => g._id === moveDialog.targetGroupId)?.name}
          </Typography>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Assign to</InputLabel>
            <Select
              value={moveTaskOwner}
              label="Assign to"
              onChange={(e) => setMoveTaskOwner(e.target.value)}
            >
              <MenuItem value="">Keep current owner</MenuItem>
              {users.map((user) => (
                <MenuItem key={user.id} value={user.id}>
                  {user.username}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMoveDialog({ open: false })}>Cancel</Button>
          <Button onClick={handleMoveTask} variant="contained">Move Task</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default KanbanBoard;