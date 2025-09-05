# Database Access Guide

This project uses **PostgreSQL** (not MySQL), so you'll need PostgreSQL-compatible tools to access the database. Here are several options:

## 🐘 PostgreSQL Connection Details

When running with Docker, use these connection details:

```
Host: localhost
Port: 5432
Database: project_management
Username: postgres
Password: postgres123
```

## 🔧 Database Access Options

### 1. pgAdmin (Web Interface) - **RECOMMENDED**
pgAdmin is included in the Docker setup and provides a full-featured web interface.

**Access pgAdmin:**
- URL: http://localhost:5050
- Email: `admin@projectmanagement.com`
- Password: `admin123`

**After logging in:**
1. Click "Add New Server"
2. General tab: Name = "Project Management DB"
3. Connection tab:
   - Host: `postgres` (container name)
   - Port: `5432`
   - Username: `postgres`
   - Password: `postgres123`
4. Click "Save"

### 2. DBeaver (Desktop Application)
DBeaver is a free universal database tool that works great with PostgreSQL.

**Download:** https://dbeaver.io/download/

**Connection Setup:**
1. New Database Connection → PostgreSQL
2. Server Host: `localhost`
3. Port: `5432`
4. Database: `project_management`
5. Username: `postgres`
6. Password: `postgres123`

### 3. pgAdmin Desktop
Download from: https://www.pgadmin.org/download/

Use the same connection details as above.

### 4. DataGrip (JetBrains)
Professional database IDE (paid).

### 5. VS Code Extensions
- **PostgreSQL** by Chris Kolkman
- **SQLTools** with PostgreSQL driver

### 6. Command Line Access
```bash
# Connect directly to the Docker container
docker-compose exec postgres psql -U postgres -d project_management

# Or from your local machine (if psql is installed)
psql -h localhost -p 5432 -U postgres -d project_management
```

## 🚀 Quick Start with Docker

1. **Start the services:**
   ```bash
   ./start-docker.sh
   ```

2. **Access pgAdmin (easiest option):**
   - Open http://localhost:5050
   - Login with: admin@projectmanagement.com / admin123
   - Add server with connection details above

3. **View your data:**
   - Browse tables: organizations, users, spaces, groups, tasks
   - Run queries and view relationships
   - Monitor real-time data changes

## 📊 Database Schema Overview

The database contains these main tables:
- `organizations` - Multi-tenant organization data
- `users` - User accounts and profiles
- `spaces` - Workspaces/teams with dynamic configurations
- `groups` - Workflow stages with custom rules
- `tasks` - Work items with rich metadata
- `space_members` - User-space relationships
- `comments` - Task discussions
- `activities` - Audit log of all actions

## 🔍 Useful Queries

```sql
-- View all spaces with task counts
SELECT s.name, COUNT(t.id) as task_count
FROM spaces s
LEFT JOIN tasks t ON s.id = t.space_id
GROUP BY s.id, s.name;

-- View workflow groups in a space
SELECT name, workflow_stage, position
FROM groups
WHERE space_id = 'your-space-id'
ORDER BY position;

-- View tasks with assignee names
SELECT t.title, t.priority, t.status, u.name as assignee
FROM tasks t
LEFT JOIN users u ON t.assignee_id = u.id
WHERE t.space_id = 'your-space-id';
```

## 🛠️ Troubleshooting

**Connection Issues:**
- Ensure Docker containers are running: `docker-compose ps`
- Check if PostgreSQL port is accessible: `telnet localhost 5432`
- View container logs: `docker-compose logs postgres`

**Permission Issues:**
- The default postgres user has full admin privileges
- All tables are owned by postgres user
- No additional permissions needed for development

**Data Not Showing:**
- Run migrations: `docker-compose exec backend npm run migrate`
- Check if data was imported correctly
- View container logs for any errors

## 🔄 MySQL Workbench Alternative

Since you mentioned MySQL Workbench, here are the closest PostgreSQL equivalents:

1. **pgAdmin** (closest to MySQL Workbench experience)
2. **DBeaver** (universal tool, similar interface)
3. **DataGrip** (professional, paid option)

All of these provide visual query builders, schema browsers, and data manipulation tools similar to MySQL Workbench.

## 📝 Notes

- Database data persists in Docker volumes even when containers are stopped
- To reset the database: `docker-compose down -v` (⚠️ this deletes all data)
- Backup your data before making schema changes
- The database automatically runs migrations on startup