# Migration Guide: MongoDB to PostgreSQL

This guide helps you migrate from the existing MongoDB-based video production manager to the new PostgreSQL-based project management platform.

## Overview

The migration process involves:
1. **Data Export** from MongoDB
2. **Schema Mapping** between old and new structures
3. **Data Transformation** to match new format
4. **Import** into PostgreSQL

## Prerequisites

- Access to existing MongoDB database
- New PostgreSQL database set up and running
- Node.js environment with both old and new codebases

## Migration Steps

### 1. Data Export from MongoDB

First, export data from your existing MongoDB database:

```bash
# Export collections to JSON files
mongoexport --db video_production_manager --collection users --out users.json
mongoexport --db video_production_manager --collection spaces --out spaces.json
mongoexport --db video_production_manager --collection groups --out groups.json
mongoexport --db video_production_manager --collection tasks --out tasks.json
```

### 2. Create Migration Script

Create a migration script to transform and import data:

```javascript
// migration/migrate.js
const fs = require('fs');
const { query } = require('../backend/src/config/database');

async function migrateUsers() {
  console.log('Migrating users...');
  
  const users = JSON.parse(fs.readFileSync('users.json', 'utf8'));
  
  for (const user of users) {
    // Create organization for first admin user or find existing
    let orgId;
    if (user.role === 'admin') {
      const org = await query(
        `INSERT INTO organizations (name, slug) 
         VALUES ($1, $2) 
         ON CONFLICT (slug) DO NOTHING
         RETURNING id`,
        ['Default Organization', 'default-org']
      );
      orgId = org.rows[0]?.id;
    }

    // Transform user data
    await query(
      `INSERT INTO users (id, email, name, password_hash, role, organization_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (email) DO NOTHING`,
      [
        user._id,
        user.email,
        user.username,
        user.password, // Already hashed
        user.role,
        orgId
      ]
    );
  }
  
  console.log(`Migrated ${users.length} users`);
}

async function migrateSpaces() {
  console.log('Migrating spaces...');
  
  const spaces = JSON.parse(fs.readFileSync('spaces.json', 'utf8'));
  
  for (const space of spaces) {
    const workflowConfig = {
      type: 'kanban',
      stages: space.groups?.map(g => ({
        id: g.name.toLowerCase().replace(/\s+/g, '_'),
        name: g.name,
        color: g.color || '#6b7280'
      })) || []
    };

    await query(
      `INSERT INTO spaces (
        id, organization_id, name, description, 
        workflow_config, working_hours, created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (id) DO NOTHING`,
      [
        space._id,
        'your-org-id', // Replace with actual org ID
        space.name,
        space.description,
        JSON.stringify(workflowConfig),
        JSON.stringify(space.workingHours || {}),
        space.admin
      ]
    );

    // Add space creator as admin member
    await query(
      `INSERT INTO space_members (space_id, user_id, role)
       VALUES ($1, $2, 'admin')
       ON CONFLICT (space_id, user_id) DO NOTHING`,
      [space._id, space.admin]
    );
  }
  
  console.log(`Migrated ${spaces.length} spaces`);
}

async function migrateGroups() {
  console.log('Migrating groups...');
  
  const groups = JSON.parse(fs.readFileSync('groups.json', 'utf8'));
  
  for (let i = 0; i < groups.length; i++) {
    const group = groups[i];
    
    await query(
      `INSERT INTO groups (
        id, space_id, name, description, position, workflow_stage
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (id) DO NOTHING`,
      [
        group._id,
        group.space,
        group.name,
        group.description,
        i,
        group.name.toLowerCase().replace(/\s+/g, '_')
      ]
    );
  }
  
  console.log(`Migrated ${groups.length} groups`);
}

async function migrateTasks() {
  console.log('Migrating tasks...');
  
  const tasks = JSON.parse(fs.readFileSync('tasks.json', 'utf8'));
  
  for (const task of tasks) {
    await query(
      `INSERT INTO tasks (
        id, space_id, group_id, title, description, 
        priority, assignee_id, reporter_id, 
        estimated_hours, logged_hours, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (id) DO NOTHING`,
      [
        task._id,
        task.space,
        task.currentGroup,
        task.title,
        task.description,
        task.priority,
        task.owner,
        task.owner, // Use owner as reporter
        task.timeline?.estimatedHours || 0,
        task.timeline?.actualHours || 0,
        task.createdAt || new Date()
      ]
    );

    // Migrate task comments if any
    // Migrate file attachments if any
  }
  
  console.log(`Migrated ${tasks.length} tasks`);
}

async function runMigration() {
  try {
    await migrateUsers();
    await migrateSpaces();
    await migrateGroups();
    await migrateTasks();
    console.log('✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
```

### 3. Data Mapping Reference

| MongoDB Collection | PostgreSQL Table | Notes |
|-------------------|------------------|-------|
| users | users | Add organization_id |
| spaces | spaces | Convert to new workflow format |
| groups | groups | Add position and workflow_stage |
| tasks | tasks | Map status and priority fields |

### 4. Field Transformations

#### Users
- `username` → `name`
- Add `organization_id` (create default org)
- Keep `password` hash as-is

#### Spaces  
- `workingHours` → `working_hours` (JSONB)
- Convert groups array to `workflow_config`
- `admin` → `created_by`

#### Groups
- Add `position` based on array index
- `name` → `workflow_stage` (slugified)

#### Tasks
- `currentGroup` → `group_id`  
- `owner` → `assignee_id`
- `timeline.estimatedHours` → `estimated_hours`
- `timeline.actualHours` → `logged_hours`

### 5. Running the Migration

```bash
# 1. Export data from MongoDB
./export-mongodb-data.sh

# 2. Run migration script
node migration/migrate.js

# 3. Verify data integrity
node migration/verify.js

# 4. Test the new application
npm run dev
```

### 6. Post-Migration Steps

1. **Verify Data Integrity**
   - Check user counts match
   - Verify space configurations
   - Test task assignments and relationships

2. **Update Configurations**
   - Set up working hours for spaces
   - Configure SLA rules if needed
   - Set up integrations (Slack, etc.)

3. **User Training**
   - Show users the new interface
   - Explain new features
   - Update documentation

### 7. Rollback Plan

Keep backups of:
- Original MongoDB data
- Exported JSON files
- Database snapshots before migration

If issues arise:
```bash
# Restore PostgreSQL from backup
pg_restore -d project_management backup.sql

# Or restart with fresh database
dropdb project_management
createdb project_management
npm run migrate
```

### 8. Troubleshooting

**Common Issues:**
- **UUID conflicts**: Use `uuid_generate_v4()` for new IDs
- **Missing relationships**: Check foreign key constraints
- **Date formats**: Convert MongoDB dates to ISO strings
- **JSON fields**: Ensure proper JSON stringification

**Validation Queries:**
```sql
-- Check user counts
SELECT COUNT(*) FROM users;

-- Verify space-user relationships  
SELECT s.name, COUNT(sm.user_id) as member_count 
FROM spaces s 
LEFT JOIN space_members sm ON s.id = sm.space_id 
GROUP BY s.id, s.name;

-- Check task distribution
SELECT g.name, COUNT(t.id) as task_count
FROM groups g
LEFT JOIN tasks t ON g.id = t.group_id
GROUP BY g.id, g.name;
```

## Need Help?

If you encounter issues during migration:
1. Check the logs for specific error messages
2. Verify database connections and permissions
3. Ensure all required fields have values
4. Contact support with specific error details

The migration preserves all critical data while upgrading to the new architecture with enhanced features and better performance.