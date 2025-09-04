// MongoDB initialization script for Docker

db = db.getSiblingDB('video_production_manager');

// Create application user
db.createUser({
  user: 'app_user',
  pwd: 'app_password',
  roles: [
    {
      role: 'readWrite',
      db: 'video_production_manager'
    }
  ]
});

// Create indexes for better performance
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ username: 1 }, { unique: true });
db.spaces.createIndex({ admin: 1 });
db.spaces.createIndex({ 'members.user': 1 });
db.groups.createIndex({ space: 1, order: 1 });
db.tasks.createIndex({ space: 1 });
db.tasks.createIndex({ currentGroup: 1 });
db.tasks.createIndex({ owner: 1 });
db.tasks.createIndex({ createdAt: -1 });

print('Database initialized successfully!');