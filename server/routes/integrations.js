const express = require('express');
const axios = require('axios');
const Space = require('../models/Space');
const Task = require('../models/Task');
const Group = require('../models/Group');
const { spaceAuth } = require('../middleware/auth');

const router = express.Router();

// Send Slack notification
const sendSlackNotification = async (webhookUrl, message) => {
  try {
    await axios.post(webhookUrl, {
      text: message.text,
      attachments: message.attachments || [],
      username: 'Video Production Manager',
      icon_emoji: ':movie_camera:'
    });
  } catch (error) {
    console.error('Slack notification error:', error);
  }
};

// Configure Slack webhook for space
router.post('/slack/configure/:spaceId', spaceAuth, async (req, res) => {
  try {
    if (!req.isSpaceAdmin) {
      return res.status(403).json({ message: 'Only space admin can configure integrations' });
    }

    const { webhookUrl } = req.body;

    if (!webhookUrl) {
      return res.status(400).json({ message: 'Webhook URL is required' });
    }

    // Test the webhook
    try {
      await sendSlackNotification(webhookUrl, {
        text: `🎬 Video Production Manager has been connected to this channel!\nSpace: ${req.space.name}`
      });
    } catch (error) {
      return res.status(400).json({ message: 'Invalid webhook URL or Slack configuration error' });
    }

    // Save webhook URL
    const space = req.space;
    space.settings.slackWebhookUrl = webhookUrl;
    await space.save();

    res.json({ message: 'Slack integration configured successfully' });
  } catch (error) {
    console.error('Configure Slack error:', error);
    res.status(500).json({ message: 'Server error configuring Slack integration' });
  }
});

// Send task notification to Slack
router.post('/slack/notify/:spaceId', spaceAuth, async (req, res) => {
  try {
    const { taskId, event, message } = req.body;

    const space = req.space;
    
    if (!space.settings.slackWebhookUrl) {
      return res.status(400).json({ message: 'Slack webhook not configured for this space' });
    }

    const task = await Task.findById(taskId)
      .populate('owner', 'username')
      .populate('currentGroup', 'name');

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    let slackMessage = {
      text: message || `Task Update: ${task.title}`,
      attachments: [{
        color: getEventColor(event),
        fields: [
          {
            title: 'Task',
            value: task.title,
            short: true
          },
          {
            title: 'Group',
            value: task.currentGroup.name,
            short: true
          },
          {
            title: 'Owner',
            value: task.owner?.username || 'Unassigned',
            short: true
          },
          {
            title: 'Status',
            value: task.currentStatus,
            short: true
          }
        ],
        footer: 'Video Production Manager',
        ts: Math.floor(Date.now() / 1000)
      }]
    };

    // Add event-specific information
    switch (event) {
      case 'task_completed':
        slackMessage.attachments[0].fields.push({
          title: 'Completion Status',
          value: task.completionStatus.replace('-', ' ').toUpperCase(),
          short: true
        });
        break;
      case 'task_moved':
        slackMessage.attachments[0].fields.push({
          title: 'Moved To',
          value: task.currentGroup.name,
          short: true
        });
        break;
      case 'task_delayed':
        slackMessage.attachments[0].fields.push({
          title: 'Delayed By',
          value: `${task.delayedHours} hours`,
          short: true
        });
        break;
    }

    await sendSlackNotification(space.settings.slackWebhookUrl, slackMessage);

    res.json({ message: 'Slack notification sent successfully' });
  } catch (error) {
    console.error('Send Slack notification error:', error);
    res.status(500).json({ message: 'Server error sending Slack notification' });
  }
});

// Get event color for Slack attachments
const getEventColor = (event) => {
  const colors = {
    task_created: '#36a64f',
    task_completed: '#36a64f',
    task_moved: '#2196F3',
    task_delayed: '#ff9800',
    task_approved: '#4caf50',
    task_rejected: '#f44336',
    milestone_reached: '#9c27b0'
  };
  return colors[event] || '#2196F3';
};

// Generate Google Docs template HTML
router.get('/googledocs/template/:spaceId', spaceAuth, async (req, res) => {
  try {
    const groups = await Group.find({ space: req.params.spaceId })
      .sort({ order: 1 });

    const templateHtml = generateGoogleDocsTemplate(groups, req.space);

    res.json({ templateHtml });
  } catch (error) {
    console.error('Generate Google Docs template error:', error);
    res.status(500).json({ message: 'Server error generating template' });
  }
});

// Generate HTML template for Google Docs
const generateGoogleDocsTemplate = (groups, space) => {
  const groupsHtml = groups.map(group => `
    <div class="milestone-group" data-group-id="${group._id}">
      <h3>${group.name}</h3>
      <p><strong>Estimated Hours:</strong> ${group.estimatedHours}</p>
      ${group.description ? `<p><strong>Description:</strong> ${group.description}</p>` : ''}
      
      <div class="status-controls">
        <label>
          <input type="checkbox" class="status-checkbox" data-status="In-progress" data-group-id="${group._id}">
          In Progress
        </label>
        <label>
          <input type="checkbox" class="status-checkbox" data-status="Completed" data-group-id="${group._id}">
          Completed
        </label>
        ${group.isApprovalGroup ? `
        <label>
          <input type="checkbox" class="status-checkbox" data-status="Approved" data-group-id="${group._id}">
          Approved
        </label>
        ` : ''}
      </div>
      
      <div class="owner-section">
        <label>Owner: <input type="text" class="owner-input" data-group-id="${group._id}" placeholder="Enter owner name"></label>
      </div>
      
      <div class="notes-section">
        <label>Notes: <textarea class="notes-input" data-group-id="${group._id}" placeholder="Add notes..."></textarea></label>
      </div>
      
      <hr>
    </div>
  `).join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <title>Video Production Timeline - ${space.name}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    .milestone-group { margin-bottom: 30px; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
    .status-controls { margin: 10px 0; }
    .status-controls label { display: inline-block; margin-right: 15px; }
    .owner-section, .notes-section { margin: 10px 0; }
    .owner-input { width: 200px; padding: 5px; }
    .notes-input { width: 100%; height: 60px; padding: 5px; }
    .sync-button { background: #4285f4; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; }
    .sync-status { margin-left: 10px; font-weight: bold; }
    h1 { color: #333; }
    h3 { color: #666; margin-top: 0; }
    hr { margin: 20px 0; border: none; border-top: 1px solid #eee; }
  </style>
</head>
<body>
  <h1>Video Production Timeline</h1>
  <h2>Project: ${space.name}</h2>
  
  <div class="sync-section">
    <button class="sync-button" onclick="syncWithManager()">Sync with Manager</button>
    <span class="sync-status" id="syncStatus"></span>
  </div>
  
  <div id="milestones">
    ${groupsHtml}
  </div>

  <script>
    const API_BASE = '${process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5000'}/api';
    const SPACE_ID = '${space._id}';
    let currentTaskId = null;

    // Get task ID from URL or create new task
    function initializeTask() {
      const urlParams = new URLSearchParams(window.location.search);
      currentTaskId = urlParams.get('taskId');
      
      if (!currentTaskId) {
        // Create new task
        const taskTitle = prompt('Enter task title:');
        if (taskTitle) {
          createTask(taskTitle);
        }
      } else {
        loadTaskData();
      }
    }

    async function createTask(title) {
      try {
        const response = await fetch(\`\${API_BASE}/tasks/space/\${SPACE_ID}\`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': \`Bearer \${getAuthToken()}\`
          },
          body: JSON.stringify({ title })
        });
        
        const task = await response.json();
        currentTaskId = task._id;
        
        // Update URL
        const newUrl = new URL(window.location);
        newUrl.searchParams.set('taskId', currentTaskId);
        window.history.pushState({}, '', newUrl);
        
        updateSyncStatus('Task created successfully', 'green');
      } catch (error) {
        updateSyncStatus('Error creating task', 'red');
        console.error('Create task error:', error);
      }
    }

    async function loadTaskData() {
      if (!currentTaskId) return;
      
      try {
        const response = await fetch(\`\${API_BASE}/tasks/\${currentTaskId}\`, {
          headers: {
            'Authorization': \`Bearer \${getAuthToken()}\`
          }
        });
        
        const task = await response.json();
        
        // Populate form with task data
        populateFormFromTask(task);
        
      } catch (error) {
        console.error('Load task error:', error);
      }
    }

    function populateFormFromTask(task) {
      // Set current group status
      const currentGroupCheckbox = document.querySelector(\`[data-group-id="\${task.currentGroup._id}"][data-status="\${task.currentStatus}"]\`);
      if (currentGroupCheckbox) {
        currentGroupCheckbox.checked = true;
      }
      
      // Set owner
      const ownerInput = document.querySelector(\`[data-group-id="\${task.currentGroup._id}"].owner-input\`);
      if (ownerInput && task.owner) {
        ownerInput.value = task.owner.username;
      }
    }

    async function syncWithManager() {
      if (!currentTaskId) {
        updateSyncStatus('No task to sync', 'orange');
        return;
      }

      try {
        updateSyncStatus('Syncing...', 'blue');
        
        // Collect all status updates
        const statusUpdates = [];
        const checkboxes = document.querySelectorAll('.status-checkbox:checked');
        
        checkboxes.forEach(checkbox => {
          const groupId = checkbox.dataset.groupId;
          const status = checkbox.dataset.status;
          const notes = document.querySelector(\`[data-group-id="\${groupId}"].notes-input\`).value;
          
          statusUpdates.push({ groupId, status, notes });
        });

        // Update task status
        for (const update of statusUpdates) {
          await updateTaskStatus(update.status, update.notes);
          
          // If moving to a new group, handle the move
          if (update.status === 'Completed') {
            const nextGroup = getNextGroup(update.groupId);
            if (nextGroup) {
              const newOwner = document.querySelector(\`[data-group-id="\${nextGroup}"]\`).querySelector('.owner-input').value;
              await moveTask(nextGroup, newOwner);
            }
          }
        }

        updateSyncStatus('Synced successfully', 'green');
        
      } catch (error) {
        updateSyncStatus('Sync failed', 'red');
        console.error('Sync error:', error);
      }
    }

    async function updateTaskStatus(status, notes) {
      const response = await fetch(\`\${API_BASE}/tasks/\${currentTaskId}/status\`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': \`Bearer \${getAuthToken()}\`
        },
        body: JSON.stringify({ status, notes })
      });
      
      if (!response.ok) {
        throw new Error('Failed to update status');
      }
    }

    async function moveTask(groupId, newOwner) {
      const response = await fetch(\`\${API_BASE}/tasks/\${currentTaskId}/move\`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': \`Bearer \${getAuthToken()}\`
        },
        body: JSON.stringify({ groupId, newOwner })
      });
      
      if (!response.ok) {
        throw new Error('Failed to move task');
      }
    }

    function getNextGroup(currentGroupId) {
      const groups = document.querySelectorAll('.milestone-group');
      let found = false;
      
      for (const group of groups) {
        if (found) {
          return group.dataset.groupId;
        }
        if (group.dataset.groupId === currentGroupId) {
          found = true;
        }
      }
      
      return null;
    }

    function updateSyncStatus(message, color) {
      const statusElement = document.getElementById('syncStatus');
      statusElement.textContent = message;
      statusElement.style.color = color;
    }

    function getAuthToken() {
      // In a real implementation, this would get the token from localStorage or cookies
      return localStorage.getItem('authToken') || '';
    }

    // Initialize when page loads
    document.addEventListener('DOMContentLoaded', initializeTask);
  </script>
</body>
</html>
  `;
};

// Update task from Google Docs
router.post('/googledocs/update/:spaceId/:taskId', spaceAuth, async (req, res) => {
  try {
    const { status, notes, groupId, owner } = req.body;

    const task = await Task.findById(req.params.taskId);

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Update status
    if (status) {
      task.currentStatus = status;
      task.statusHistory.push({
        status,
        user: req.user._id,
        timestamp: new Date(),
        notes: notes || 'Updated from Google Docs'
      });
    }

    // Move to different group if specified
    if (groupId && groupId !== task.currentGroup.toString()) {
      // Similar logic to task move endpoint
      const targetGroup = await Group.findById(groupId);
      if (targetGroup) {
        await Group.findByIdAndUpdate(
          task.currentGroup,
          { $pull: { tasks: task._id } }
        );
        
        await Group.findByIdAndUpdate(
          targetGroup._id,
          { $push: { tasks: task._id } }
        );
        
        task.currentGroup = targetGroup._id;
        
        if (owner) {
          const User = require('../models/User');
          const ownerUser = await User.findOne({ username: owner });
          if (ownerUser) {
            task.owner = ownerUser._id;
          }
        }
      }
    }

    await task.save();

    res.json({ message: 'Task updated from Google Docs successfully' });
  } catch (error) {
    console.error('Update from Google Docs error:', error);
    res.status(500).json({ message: 'Server error updating from Google Docs' });
  }
});

// Test integration endpoints
router.post('/test/slack/:spaceId', spaceAuth, async (req, res) => {
  try {
    const space = req.space;
    
    if (!space.settings.slackWebhookUrl) {
      return res.status(400).json({ message: 'Slack webhook not configured' });
    }

    await sendSlackNotification(space.settings.slackWebhookUrl, {
      text: '🧪 Test notification from Video Production Manager',
      attachments: [{
        color: '#36a64f',
        fields: [
          {
            title: 'Status',
            value: 'Integration working correctly!',
            short: false
          }
        ]
      }]
    });

    res.json({ message: 'Test notification sent successfully' });
  } catch (error) {
    console.error('Test Slack error:', error);
    res.status(500).json({ message: 'Server error sending test notification' });
  }
});

module.exports = router;