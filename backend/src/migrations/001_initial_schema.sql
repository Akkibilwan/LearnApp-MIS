-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Organizations/Tenants
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Users
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    role VARCHAR(50) DEFAULT 'member', -- admin, manager, member
    permissions JSONB DEFAULT '[]',
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Spaces (Dynamic Teams/Departments)
CREATE TABLE spaces (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    color VARCHAR(7), -- hex color
    icon VARCHAR(50),
    
    -- Dynamic Configuration
    workflow_type VARCHAR(50) DEFAULT 'kanban', -- kanban, linear, custom
    workflow_config JSONB DEFAULT '{}', -- stages, transitions, rules
    
    -- Working Hours & SLA
    working_hours JSONB DEFAULT '{}', -- per day schedule
    timezone VARCHAR(50) DEFAULT 'UTC',
    sla_rules JSONB DEFAULT '[]',
    
    -- Integrations
    integrations JSONB DEFAULT '{}', -- slack, docs, etc.
    
    -- Permissions
    permissions JSONB DEFAULT '{}', -- role-based access
    
    -- Metadata
    settings JSONB DEFAULT '{}',
    is_archived BOOLEAN DEFAULT FALSE,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Groups (Workflow Stages) - Dynamic per Space
CREATE TABLE groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    space_id UUID REFERENCES spaces(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    color VARCHAR(7),
    
    -- Position and Flow
    position INTEGER NOT NULL,
    workflow_stage VARCHAR(100), -- to_do, in_progress, review, done, etc.
    
    -- Dynamic Configuration
    rules JSONB DEFAULT '{}', -- validation, auto-assignment, etc.
    limits JSONB DEFAULT '{}', -- WIP limits, capacity
    
    -- SLA Configuration
    sla_config JSONB DEFAULT '{}',
    
    -- Permissions
    permissions JSONB DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tasks (Work Items)
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    space_id UUID REFERENCES spaces(id) ON DELETE CASCADE,
    group_id UUID REFERENCES groups(id) ON DELETE SET NULL,
    
    -- Basic Info
    title VARCHAR(500) NOT NULL,
    description TEXT,
    priority VARCHAR(20) DEFAULT 'medium', -- low, medium, high, critical
    status VARCHAR(50) DEFAULT 'open',
    
    -- Assignment
    assignee_id UUID REFERENCES users(id) ON DELETE SET NULL,
    reporter_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Time Tracking
    estimated_hours DECIMAL(8,2),
    logged_hours DECIMAL(8,2) DEFAULT 0,
    due_date TIMESTAMP WITH TIME ZONE,
    
    -- Dynamic Fields
    custom_fields JSONB DEFAULT '{}',
    tags TEXT[] DEFAULT '{}',
    
    -- Position in Group
    position DECIMAL(10,2), -- for ordering within group
    
    -- SLA Tracking
    sla_started_at TIMESTAMP WITH TIME ZONE,
    sla_due_at TIMESTAMP WITH TIME ZONE,
    sla_status VARCHAR(50), -- on_track, at_risk, breached
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Task Dependencies
CREATE TABLE task_dependencies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    predecessor_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    successor_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    dependency_type VARCHAR(50) DEFAULT 'finish_to_start', -- finish_to_start, start_to_start, etc.
    lag_hours INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(predecessor_id, successor_id)
);

-- Group Dependencies (Workflow Dependencies)
CREATE TABLE group_dependencies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    space_id UUID REFERENCES spaces(id) ON DELETE CASCADE,
    predecessor_group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
    successor_group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
    dependency_type VARCHAR(50) DEFAULT 'sequential', -- sequential, parallel
    conditions JSONB DEFAULT '{}', -- rules for transition
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(predecessor_group_id, successor_group_id)
);

-- Time Logs
CREATE TABLE time_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    hours DECIMAL(8,2) NOT NULL,
    description TEXT,
    logged_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Activity/Audit Log
CREATE TABLE activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    space_id UUID REFERENCES spaces(id) ON DELETE CASCADE,
    task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    action VARCHAR(100) NOT NULL, -- created, updated, moved, assigned, etc.
    entity_type VARCHAR(50) NOT NULL, -- task, group, space, etc.
    entity_id UUID,
    
    details JSONB DEFAULT '{}', -- action-specific data
    metadata JSONB DEFAULT '{}', -- IP, user agent, etc.
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Comments
CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    mentions UUID[] DEFAULT '{}', -- mentioned user IDs
    attachments JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Space Members (Junction Table)
CREATE TABLE space_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    space_id UUID REFERENCES spaces(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'member', -- admin, manager, member
    permissions JSONB DEFAULT '{}',
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(space_id, user_id)
);

-- Indexes for Performance
CREATE INDEX idx_organizations_slug ON organizations(slug);
CREATE INDEX idx_users_organization ON users(organization_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_spaces_organization ON spaces(organization_id);
CREATE INDEX idx_spaces_created_by ON spaces(created_by);
CREATE INDEX idx_groups_space ON groups(space_id, position);
CREATE INDEX idx_tasks_space ON tasks(space_id);
CREATE INDEX idx_tasks_group ON tasks(group_id, position);
CREATE INDEX idx_tasks_assignee ON tasks(assignee_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_activities_space ON activities(space_id, created_at DESC);
CREATE INDEX idx_time_logs_task ON time_logs(task_id);
CREATE INDEX idx_time_logs_user_date ON time_logs(user_id, logged_date);
CREATE INDEX idx_comments_task ON comments(task_id, created_at);
CREATE INDEX idx_space_members_space ON space_members(space_id);
CREATE INDEX idx_space_members_user ON space_members(user_id);

-- Indexes for JSONB fields
CREATE INDEX idx_spaces_workflow_config ON spaces USING GIN (workflow_config);
CREATE INDEX idx_tasks_custom_fields ON tasks USING GIN (custom_fields);
CREATE INDEX idx_activities_details ON activities USING GIN (details);

-- Trigger function to update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at columns
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_spaces_updated_at BEFORE UPDATE ON spaces FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_groups_updated_at BEFORE UPDATE ON groups FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON comments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();