import React, { ReactNode, useState, useEffect } from 'react';
import {
  AppBar,
  Box,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  Avatar,
  Menu,
  MenuItem,
  Divider,
  useTheme,
  useMediaQuery,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  Chip
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard,
  Assignment,
  People,
  Analytics,
  AccountCircle,
  Logout,
  Settings,
  Add,
  MoreVert,
  Edit,
  FileCopy,
  Delete,
  Link as LinkIcon,
  Business
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import axios from 'axios';

const drawerWidth = 240;

interface Space {
  _id: string;
  name: string;
  description?: string;
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
  groups: string[];
  settings: {
    allowParallelTasks: boolean;
    requireApprovalForTaskMove: boolean;
    slackWebhookUrl?: string;
  };
  workingHours: {
    start: string;
    end: string;
  };
  workingDays: number[];
  createdAt: string;
}

interface LayoutProps {
  children: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const { showNotification } = useNotification();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  
  // Space-related state
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [loadingSpaces, setLoadingSpaces] = useState(true);
  
  // Dialog states
  const [createSpaceDialog, setCreateSpaceDialog] = useState(false);
  const [editSpaceDialog, setEditSpaceDialog] = useState<{ open: boolean; space?: Space }>({ open: false });
  const [deleteSpaceDialog, setDeleteSpaceDialog] = useState<{ open: boolean; space?: Space }>({ open: false });
  
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
      setLoadingSpaces(false);
    }
  };

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    handleMenuClose();
    navigate('/login');
  };

  const isSpaceAdmin = (space: Space): boolean => {
    return space.admin._id === user?._id;
  };

  const handleCreateSpace = async () => {
    if (!spaceForm.name.trim()) {
      showNotification('Space name is required', 'error');
      return;
    }

    try {
      await axios.post('/spaces', spaceForm);
      showNotification('Space created successfully', 'success');
      setCreateSpaceDialog(false);
      resetSpaceForm();
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
    const { space } = editSpaceDialog;
    if (!space || !spaceForm.name.trim()) {
      showNotification('Space name is required', 'error');
      return;
    }

    try {
      await axios.put(`/spaces/${space._id}`, spaceForm);
      showNotification('Space updated successfully', 'success');
      setEditSpaceDialog({ open: false });
      resetSpaceForm();
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
    const { space } = deleteSpaceDialog;
    if (!space) return;

    try {
      await axios.delete(`/spaces/${space._id}`);
      showNotification('Space deleted successfully', 'success');
      setDeleteSpaceDialog({ open: false });
      fetchSpaces();
      // If we're currently viewing this space, navigate to dashboard
      if (location.pathname.includes(space._id)) {
        navigate('/dashboard');
      }
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
      await axios.post(`/spaces/${space._id}/duplicate`);
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

  const handleCopyLink = (space: Space) => {
    const link = `${window.location.origin}/spaces/${space._id}`;
    navigator.clipboard.writeText(link);
    showNotification('Space link copied to clipboard', 'success');
  };

  const resetSpaceForm = () => {
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
      description: space.description || '',
      workingHours: space.workingHours,
      workingDays: space.workingDays
    });
    setEditSpaceDialog({ open: true, space });
    setSpaceMenu({ anchorEl: null });
  };

  const menuItems = [
    { text: 'Dashboard', icon: <Dashboard />, path: '/dashboard' },
    { text: 'Tasks', icon: <Assignment />, path: '/tasks' },
    { text: 'Analytics', icon: <Analytics />, path: '/analytics' },
    ...(user?.role === 'admin' ? [
      { text: 'Users', icon: <People />, path: '/users' }
    ] : [])
  ];

  const drawer = (
    <Box>
      <Toolbar>
        <Typography variant="h6" noWrap component="div">
          Video Production
        </Typography>
      </Toolbar>
      <Divider />
      
      {/* Main Navigation */}
      <List>
        {menuItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton
              selected={location.pathname === item.path}
              onClick={() => {
                navigate(item.path);
                if (isMobile) {
                  setMobileOpen(false);
                }
              }}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
      
      <Divider sx={{ my: 1 }} />
      
      {/* Spaces Section */}
      <Box sx={{ px: 2, py: 1 }}>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
          <Typography variant="body2" color="textSecondary" fontWeight="medium">
            Spaces
          </Typography>
          <IconButton 
            size="small" 
            onClick={() => setCreateSpaceDialog(true)}
            sx={{ p: 0.5 }}
          >
            <Add fontSize="small" />
          </IconButton>
        </Box>
        
        <List dense sx={{ py: 0 }}>
          {loadingSpaces ? (
            <ListItem>
              <ListItemText 
                primary="Loading spaces..." 
                primaryTypographyProps={{ variant: 'body2', color: 'textSecondary' }}
              />
            </ListItem>
          ) : spaces.length === 0 ? (
            <ListItem>
              <ListItemText 
                primary="No spaces yet" 
                secondary="Click + to create one"
                primaryTypographyProps={{ variant: 'body2' }}
                secondaryTypographyProps={{ variant: 'caption' }}
              />
            </ListItem>
          ) : (
            spaces.map((space) => (
              <ListItem key={space._id} disablePadding>
                <ListItemButton
                  selected={location.pathname.includes(`/spaces/${space._id}`)}
                  onClick={() => {
                    navigate(`/spaces/${space._id}`);
                    if (isMobile) {
                      setMobileOpen(false);
                    }
                  }}
                  sx={{ 
                    borderRadius: 1, 
                    mb: 0.5,
                    '&:hover': {
                      bgcolor: 'action.hover'
                    }
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <Business fontSize="small" />
                  </ListItemIcon>
                  <ListItemText 
                    primary={space.name}
                    primaryTypographyProps={{ 
                      variant: 'body2',
                      sx: { 
                        overflow: 'hidden', 
                        textOverflow: 'ellipsis', 
                        whiteSpace: 'nowrap' 
                      }
                    }}
                  />
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSpaceMenu({ anchorEl: e.currentTarget, space });
                    }}
                    sx={{ ml: 0.5, p: 0.5 }}
                  >
                    <MoreVert fontSize="small" />
                  </IconButton>
                </ListItemButton>
              </ListItem>
            ))
          )}
        </List>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            {menuItems.find(item => item.path === location.pathname)?.text || 'Video Production Manager'}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" sx={{ display: { xs: 'none', sm: 'block' } }}>
              {user?.username}
            </Typography>
            <IconButton
              size="large"
              aria-label="account of current user"
              aria-controls="menu-appbar"
              aria-haspopup="true"
              onClick={handleMenuOpen}
              color="inherit"
            >
              <Avatar sx={{ width: 32, height: 32 }}>
                {user?.username?.charAt(0).toUpperCase()}
              </Avatar>
            </IconButton>
            <Menu
              id="menu-appbar"
              anchorEl={anchorEl}
              anchorOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              keepMounted
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}
            >
              <MenuItem onClick={() => { navigate('/profile'); handleMenuClose(); }}>
                <ListItemIcon>
                  <AccountCircle fontSize="small" />
                </ListItemIcon>
                <ListItemText>Profile</ListItemText>
              </MenuItem>
              <MenuItem onClick={() => { navigate('/settings'); handleMenuClose(); }}>
                <ListItemIcon>
                  <Settings fontSize="small" />
                </ListItemIcon>
                <ListItemText>Settings</ListItemText>
              </MenuItem>
              <Divider />
              <MenuItem onClick={handleLogout}>
                <ListItemIcon>
                  <Logout fontSize="small" />
                </ListItemIcon>
                <ListItemText>Logout</ListItemText>
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>
      <Box
        component="nav"
        sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile.
          }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { md: `calc(100% - ${drawerWidth}px)` },
          mt: 8
        }}
      >
        {children}
      </Box>

      {/* Space Menu */}
      <Menu
        anchorEl={spaceMenu.anchorEl}
        open={Boolean(spaceMenu.anchorEl)}
        onClose={() => setSpaceMenu({ anchorEl: null })}
      >
        {spaceMenu.space && isSpaceAdmin(spaceMenu.space) && (
          <>
            <MenuItem onClick={() => {
              if (spaceMenu.space) {
                openEditDialog(spaceMenu.space);
              }
            }}>
              <Edit sx={{ mr: 1 }} />
              Rename
            </MenuItem>
            <MenuItem onClick={() => {
              if (spaceMenu.space) {
                handleCopyLink(spaceMenu.space);
              }
              setSpaceMenu({ anchorEl: null });
            }}>
              <LinkIcon sx={{ mr: 1 }} />
              Copy Link
            </MenuItem>
            <MenuItem onClick={() => {
              if (spaceMenu.space) {
                handleDuplicateSpace(spaceMenu.space);
              }
              setSpaceMenu({ anchorEl: null });
            }}>
              <FileCopy sx={{ mr: 1 }} />
              Duplicate
            </MenuItem>
            <MenuItem onClick={() => {
              setDeleteSpaceDialog({ open: true, space: spaceMenu.space });
              setSpaceMenu({ anchorEl: null });
            }}>
              <Delete sx={{ mr: 1 }} />
              Delete
            </MenuItem>
          </>
        )}
        {spaceMenu.space && !isSpaceAdmin(spaceMenu.space) && (
          <MenuItem onClick={() => {
            if (spaceMenu.space) {
              handleCopyLink(spaceMenu.space);
            }
            setSpaceMenu({ anchorEl: null });
          }}>
            <LinkIcon sx={{ mr: 1 }} />
            Copy Link
          </MenuItem>
        )}
      </Menu>

      {/* Create Space Dialog */}
      <Dialog open={createSpaceDialog} onClose={() => setCreateSpaceDialog(false)} maxWidth="sm" fullWidth>
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
          <Box display="flex" gap={2} sx={{ mb: 2 }}>
            <TextField
              label="Working Hours Start"
              type="time"
              value={spaceForm.workingHours.start}
              onChange={(e) => setSpaceForm(prev => ({ 
                ...prev, 
                workingHours: { ...prev.workingHours, start: e.target.value } 
              }))}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Working Hours End"
              type="time"
              value={spaceForm.workingHours.end}
              onChange={(e) => setSpaceForm(prev => ({ 
                ...prev, 
                workingHours: { ...prev.workingHours, end: e.target.value } 
              }))}
              InputLabelProps={{ shrink: true }}
            />
          </Box>
          <Box>
            <Typography variant="body2" gutterBottom>Working Days</Typography>
            <Box display="flex" gap={1} flexWrap="wrap">
              {[
                { value: 1, label: 'Mon' },
                { value: 2, label: 'Tue' },
                { value: 3, label: 'Wed' },
                { value: 4, label: 'Thu' },
                { value: 5, label: 'Fri' },
                { value: 6, label: 'Sat' },
                { value: 0, label: 'Sun' }
              ].map(({ value, label }) => (
                <Chip
                  key={value}
                  label={label}
                  clickable
                  color={spaceForm.workingDays.includes(value) ? 'primary' : 'default'}
                  onClick={() => {
                    const newDays = spaceForm.workingDays.includes(value)
                      ? spaceForm.workingDays.filter(d => d !== value)
                      : [...spaceForm.workingDays, value];
                    setSpaceForm(prev => ({ ...prev, workingDays: newDays }));
                  }}
                />
              ))}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateSpaceDialog(false)}>Cancel</Button>
          <Button onClick={handleCreateSpace} variant="contained">Create Space</Button>
        </DialogActions>
      </Dialog>

      {/* Edit Space Dialog */}
      <Dialog open={editSpaceDialog.open} onClose={() => setEditSpaceDialog({ open: false })} maxWidth="sm" fullWidth>
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
          <Box display="flex" gap={2} sx={{ mb: 2 }}>
            <TextField
              label="Working Hours Start"
              type="time"
              value={spaceForm.workingHours.start}
              onChange={(e) => setSpaceForm(prev => ({ 
                ...prev, 
                workingHours: { ...prev.workingHours, start: e.target.value } 
              }))}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Working Hours End"
              type="time"
              value={spaceForm.workingHours.end}
              onChange={(e) => setSpaceForm(prev => ({ 
                ...prev, 
                workingHours: { ...prev.workingHours, end: e.target.value } 
              }))}
              InputLabelProps={{ shrink: true }}
            />
          </Box>
          <Box>
            <Typography variant="body2" gutterBottom>Working Days</Typography>
            <Box display="flex" gap={1} flexWrap="wrap">
              {[
                { value: 1, label: 'Mon' },
                { value: 2, label: 'Tue' },
                { value: 3, label: 'Wed' },
                { value: 4, label: 'Thu' },
                { value: 5, label: 'Fri' },
                { value: 6, label: 'Sat' },
                { value: 0, label: 'Sun' }
              ].map(({ value, label }) => (
                <Chip
                  key={value}
                  label={label}
                  clickable
                  color={spaceForm.workingDays.includes(value) ? 'primary' : 'default'}
                  onClick={() => {
                    const newDays = spaceForm.workingDays.includes(value)
                      ? spaceForm.workingDays.filter(d => d !== value)
                      : [...spaceForm.workingDays, value];
                    setSpaceForm(prev => ({ ...prev, workingDays: newDays }));
                  }}
                />
              ))}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditSpaceDialog({ open: false })}>Cancel</Button>
          <Button onClick={handleEditSpace} variant="contained">Update Space</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Space Dialog */}
      <Dialog open={deleteSpaceDialog.open} onClose={() => setDeleteSpaceDialog({ open: false })}>
        <DialogTitle>Delete Space</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{deleteSpaceDialog.space?.name}"? 
            This action cannot be undone and will permanently delete all groups and tasks in this space.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteSpaceDialog({ open: false })}>Cancel</Button>
          <Button onClick={handleDeleteSpace} variant="contained" color="error">Delete Space</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Layout;