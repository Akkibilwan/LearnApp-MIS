const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Import models
const User = require('../server/models/User');
const Space = require('../server/models/Space');
const Group = require('../server/models/Group');
const Task = require('../server/models/Task');

const seedDatabase = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/video_production_manager', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await Space.deleteMany({});
    await Group.deleteMany({});
    await Task.deleteMany({});

    console.log('Cleared existing data');

    // Create users
    const adminUser = new User({
      username: 'admin',
      email: 'admin@example.com',
      password: 'admin123',
      role: 'admin',
      workingHours: { start: '09:00', end: '17:00' },
      workingDays: [1, 2, 3, 4, 5]
    });
    await adminUser.save();

    const user1 = new User({
      username: 'john_doe',
      email: 'john@example.com',
      password: 'user123',
      role: 'user',
      workingHours: { start: '09:00', end: '17:00' },
      workingDays: [1, 2, 3, 4, 5]
    });
    await user1.save();

    const user2 = new User({
      username: 'jane_smith',
      email: 'jane@example.com',
      password: 'user123',
      role: 'user',
      workingHours: { start: '10:00', end: '18:00' },
      workingDays: [1, 2, 3, 4, 5]
    });
    await user2.save();

    console.log('Created users');

    // Create a sample space
    const sampleSpace = new Space({
      name: 'Marketing Video Production',
      description: 'Production pipeline for marketing videos and promotional content',
      admin: adminUser._id,
      members: [
        { user: user1._id, role: 'member' },
        { user: user2._id, role: 'member' }
      ],
      workingHours: { start: '09:00', end: '17:00' },
      workingDays: [1, 2, 3, 4, 5],
      settings: {
        allowParallelTasks: true,
        requireApprovalForTaskMove: false
      }
    });
    await sampleSpace.save();

    // Update users with space reference
    adminUser.spaces.push(sampleSpace._id);
    user1.spaces.push(sampleSpace._id);
    user2.spaces.push(sampleSpace._id);
    await adminUser.save();
    await user1.save();
    await user2.save();

    console.log('Created sample space');

    // Create groups (milestones)
    const groups = [
      {
        name: 'Topic Selection',
        description: 'Research and select video topic based on marketing goals',
        order: 1,
        estimatedHours: 4,
        isStartGroup: true,
        isApprovalGroup: false,
        isFinalGroup: false
      },
      {
        name: 'Script Writing',
        description: 'Write and refine the video script',
        order: 2,
        estimatedHours: 8,
        isStartGroup: false,
        isApprovalGroup: false,
        isFinalGroup: false
      },
      {
        name: 'Script Approval',
        description: 'Review and approve the final script',
        order: 3,
        estimatedHours: 2,
        isStartGroup: false,
        isApprovalGroup: true,
        isFinalGroup: false
      },
      {
        name: 'Pre-production',
        description: 'Plan shots, gather equipment, and prepare for filming',
        order: 4,
        estimatedHours: 6,
        isStartGroup: false,
        isApprovalGroup: false,
        isFinalGroup: false
      },
      {
        name: 'Filming',
        description: 'Record all video content',
        order: 5,
        estimatedHours: 12,
        isStartGroup: false,
        isApprovalGroup: false,
        isFinalGroup: false
      },
      {
        name: 'Post-production',
        description: 'Edit video, add effects, music, and graphics',
        order: 6,
        estimatedHours: 16,
        isStartGroup: false,
        isApprovalGroup: false,
        isFinalGroup: false
      },
      {
        name: 'Final Review',
        description: 'Final review and approval of completed video',
        order: 7,
        estimatedHours: 2,
        isStartGroup: false,
        isApprovalGroup: true,
        isFinalGroup: false
      },
      {
        name: 'Release',
        description: 'Publish and distribute the final video',
        order: 8,
        estimatedHours: 3,
        isStartGroup: false,
        isApprovalGroup: false,
        isFinalGroup: true
      }
    ];

    const createdGroups = [];
    for (const groupData of groups) {
      const group = new Group({
        ...groupData,
        space: sampleSpace._id,
        dependencies: []
      });
      await group.save();
      createdGroups.push(group);
      sampleSpace.groups.push(group._id);
    }

    // Add dependencies (sequential workflow)
    for (let i = 1; i < createdGroups.length; i++) {
      createdGroups[i].dependencies = [{
        group: createdGroups[i - 1]._id,
        type: 'sequential'
      }];
      await createdGroups[i].save();
    }

    await sampleSpace.save();
    console.log('Created groups with dependencies');

    // Create sample tasks
    const tasks = [
      {
        title: 'Product Launch Video - Q1 2024',
        description: 'Create a promotional video for the new product launch featuring key benefits and customer testimonials',
        currentGroup: createdGroups[0]._id, // Topic Selection
        owner: user1._id,
        priority: 'high'
      },
      {
        title: 'Company Culture Video',
        description: 'Behind-the-scenes video showcasing company culture and team members',
        currentGroup: createdGroups[2]._id, // Script Approval
        owner: user2._id,
        priority: 'medium'
      },
      {
        title: 'Tutorial Series - Episode 1',
        description: 'First episode of the tutorial series explaining basic product usage',
        currentGroup: createdGroups[4]._id, // Filming
        owner: user1._id,
        priority: 'medium'
      }
    ];

    for (const taskData of tasks) {
      const task = new Task({
        ...taskData,
        space: sampleSpace._id,
        timeline: {
          startTime: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000), // Random start time in last 7 days
          estimatedHours: createdGroups.find(g => g._id.toString() === taskData.currentGroup.toString()).estimatedHours
        }
      });

      // Add initial status
      task.statusHistory.push({
        status: 'In-progress',
        user: taskData.owner,
        timestamp: task.timeline.startTime
      });

      // Calculate due time
      const group = createdGroups.find(g => g._id.toString() === taskData.currentGroup.toString());
      task.timeline.dueTime = task.calculateDueTime(group, sampleSpace.workingHours, sampleSpace.workingDays);

      await task.save();

      // Add task to group
      const targetGroup = createdGroups.find(g => g._id.toString() === taskData.currentGroup.toString());
      targetGroup.tasks.push(task._id);
      await targetGroup.save();
    }

    console.log('Created sample tasks');

    // Create another space for demonstration
    const demoSpace = new Space({
      name: 'Educational Content',
      description: 'Production pipeline for educational and training videos',
      admin: adminUser._id,
      members: [
        { user: user1._id, role: 'member' }
      ],
      workingHours: { start: '09:00', end: '17:00' },
      workingDays: [1, 2, 3, 4, 5],
      settings: {
        allowParallelTasks: false,
        requireApprovalForTaskMove: true
      }
    });
    await demoSpace.save();

    adminUser.spaces.push(demoSpace._id);
    user1.spaces.push(demoSpace._id);
    await adminUser.save();
    await user1.save();

    // Create simplified groups for demo space
    const demoGroups = [
      {
        name: 'Planning',
        description: 'Plan the educational content and learning objectives',
        order: 1,
        estimatedHours: 6,
        isStartGroup: true
      },
      {
        name: 'Content Creation',
        description: 'Create the educational content and materials',
        order: 2,
        estimatedHours: 20
      },
      {
        name: 'Review & Publish',
        description: 'Final review and publishing of educational content',
        order: 3,
        estimatedHours: 4,
        isApprovalGroup: true,
        isFinalGroup: true
      }
    ];

    const createdDemoGroups = [];
    for (const groupData of demoGroups) {
      const group = new Group({
        ...groupData,
        space: demoSpace._id,
        dependencies: []
      });
      await group.save();
      createdDemoGroups.push(group);
      demoSpace.groups.push(group._id);
    }

    // Add dependencies for demo groups
    for (let i = 1; i < createdDemoGroups.length; i++) {
      createdDemoGroups[i].dependencies = [{
        group: createdDemoGroups[i - 1]._id,
        type: 'sequential'
      }];
      await createdDemoGroups[i].save();
    }

    await demoSpace.save();

    console.log('Created demo space');
    console.log('Database seeded successfully!');
    console.log('\nDemo credentials:');
    console.log('Admin: admin@example.com / admin123');
    console.log('User 1: john@example.com / user123');
    console.log('User 2: jane@example.com / user123');

  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    mongoose.connection.close();
  }
};

seedDatabase();