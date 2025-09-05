// Simple in-memory database for local development testing
// This allows the backend to run without PostgreSQL

const mockDatabase = {
  users: [
    {
      id: '1',
      email: 'admin@demo.com',
      name: 'Admin User',
      role: 'admin',
      organization: { id: '1', name: 'Demo Organization', slug: 'demo-org' }
    }
  ],
  organizations: [
    { id: '1', name: 'Demo Organization', slug: 'demo-org' }
  ],
  spaces: [
    {
      id: '1',
      name: 'Sample Project',
      description: 'A sample project to demonstrate the platform',
      organization_id: '1',
      workflow_config: {
        stages: [
          { id: 'todo', name: 'To Do', color: '#6b7280' },
          { id: 'progress', name: 'In Progress', color: '#3b82f6' },
          { id: 'review', name: 'Review', color: '#8b5cf6' },
          { id: 'done', name: 'Done', color: '#10b981' }
        ]
      }
    }
  ],
  tasks: [
    {
      id: '1',
      space_id: '1',
      title: 'Setup Project Management Platform',
      description: 'Initial setup and configuration',
      priority: 'high',
      status: 'in_progress',
      created_at: new Date().toISOString()
    },
    {
      id: '2', 
      space_id: '1',
      title: 'Design Database Schema',
      description: 'Create the database structure',
      priority: 'medium',
      status: 'completed',
      created_at: new Date().toISOString()
    }
  ]
};

// Mock query function
async function query(sql, params = []) {
  console.log('Mock Query:', sql, params);
  
  // Return sample data based on query type
  if (sql.includes('SELECT') && sql.includes('users')) {
    return { rows: mockDatabase.users };
  }
  if (sql.includes('SELECT') && sql.includes('spaces')) {
    return { rows: mockDatabase.spaces };
  }
  if (sql.includes('SELECT') && sql.includes('tasks')) {
    return { rows: mockDatabase.tasks };
  }
  if (sql.includes('SELECT 1')) {
    return { rows: [{ '?column?': 1 }] };
  }
  
  return { rows: [] };
}

// Mock transaction function
async function withTransaction(callback) {
  return await callback({ query });
}

// Mock client function
async function getClient() {
  return { query, release: () => {} };
}

module.exports = {
  query,
  withTransaction,
  getClient,
  pool: { query }
};