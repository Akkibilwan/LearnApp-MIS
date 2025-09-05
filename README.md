# Project Management Platform

A comprehensive modern project management platform that combines the flexibility of Asana, workflow power of JIRA, and visual boards like Trello. Built with a dark theme design system and real-time collaboration features.

## 🎨 Design System

- **Background**: `#181818` (Dark theme)
- **Primary**: `#00C6FF` (Bright blue for main actions)
- **Accent**: `#FF5C8D` (Pink for highlights)
- **Typography**: Inter font family
- **Style**: Neumorphic design elements with glass-morphism effects

## 🏗️ Architecture

### Backend (Node.js + PostgreSQL)
- **Express.js** REST API with JWT authentication
- **PostgreSQL** database with dynamic JSONB fields for flexible configurations
- **Socket.IO** for real-time collaboration
- **Comprehensive API** with proper error handling and validation

### Frontend (React + TypeScript)
- **React 18** with TypeScript for type safety
- **Tailwind CSS** for styling with custom dark theme
- **Shadcn/ui** components for consistent UI
- **Framer Motion** for smooth animations
- **React DnD** for drag-and-drop functionality
- **Socket.IO Client** for real-time updates

## 📊 Database Schema

Dynamic PostgreSQL schema with JSONB fields supporting:
- **Organizations** with multi-tenancy
- **Spaces** (Teams/Departments) with configurable workflows
- **Groups** (Workflow stages) with custom rules and SLA
- **Tasks** with rich metadata and custom fields
- **Users** with role-based permissions
- **Real-time activity logs** and audit trails

## 🚀 Features

### Core Functionality
- ✅ **Authentication & Authorization** - JWT-based with role management
- ✅ **Multi-tenant Architecture** - Organization-level isolation
- ✅ **Dynamic Workspaces** - Configurable spaces with custom workflows
- ✅ **Kanban Boards** - Drag-and-drop task management
- ✅ **Real-time Collaboration** - Live updates and user presence
- ✅ **Dark Theme Design** - Modern neumorphic interface

### Advanced Features
- 🔄 **Dynamic Workflows** - Configurable stages and transitions
- 📊 **Analytics Dashboard** - Performance metrics and insights
- 👥 **Team Management** - Role-based access control
- 🔗 **Task Dependencies** - Complex relationship management
- ⏱️ **SLA Tracking** - Working hours and deadline monitoring
- 💬 **Comments & Mentions** - Collaborative discussions

## 🛠️ Installation & Setup

### Prerequisites
```bash
Node.js 18+
PostgreSQL 14+
Redis 6+ (optional, for caching)
```

### Backend Setup
```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your database credentials

# Run database migrations
npm run migrate

# Start development server
npm run dev
```

### Frontend Setup
```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

### Environment Variables

**Backend (.env):**
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=project_management
DB_USER=postgres
DB_PASSWORD=your_password
JWT_SECRET=your-secret-key
PORT=3001
CLIENT_URL=http://localhost:3000
```

## 📁 Project Structure

```
project-management-platform/
├── backend/                  # Node.js API server
│   ├── src/
│   │   ├── config/          # Database and app configuration
│   │   ├── middleware/      # Authentication and validation
│   │   ├── models/          # Data models and business logic
│   │   ├── routes/          # API endpoints
│   │   ├── sockets/         # WebSocket handlers
│   │   └── migrations/      # Database schema migrations
│   └── package.json
├── frontend/                # React frontend
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── contexts/        # React context providers
│   │   ├── hooks/           # Custom React hooks
│   │   ├── lib/             # Utilities and API client
│   │   ├── pages/           # Application pages
│   │   └── types/           # TypeScript type definitions
│   └── package.json
└── README.md
```

## 🔄 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user/organization
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user profile
- `PUT /api/auth/profile` - Update user profile

### Spaces
- `GET /api/spaces` - Get user's spaces
- `POST /api/spaces` - Create new space
- `GET /api/spaces/:id` - Get space details
- `PUT /api/spaces/:id` - Update space configuration

### Tasks
- `GET /api/tasks/space/:spaceId` - Get tasks in space
- `POST /api/tasks/space/:spaceId` - Create new task
- `PUT /api/tasks/:id/move` - Move task between groups
- `GET /api/tasks/:id` - Get task details with comments

### Real-time Events (WebSocket)
- `task.created` - New task created
- `task.updated` - Task modified
- `task.moved` - Task moved between groups
- `user.joined` - User joined space
- `comment.added` - New comment added

## 🎯 Development Roadmap

### Phase 1: Core Features ✅
- [x] Authentication system
- [x] Basic CRUD operations
- [x] Real-time updates
- [x] Dark theme UI

### Phase 2: Advanced Features 🔄
- [ ] Kanban board implementation
- [ ] Advanced workflow engine
- [ ] SLA monitoring
- [ ] Dependency management
- [ ] Data migration scripts

### Phase 3: Integrations 📅
- [ ] Slack notifications
- [ ] Email system
- [ ] File uploads
- [ ] External API integrations

### Phase 4: Analytics & Reporting 📊
- [ ] Performance dashboards
- [ ] Custom reports
- [ ] Export functionality
- [ ] Advanced metrics

## 🔧 Development

### Running in Development
```bash
# Start backend (from /backend)
npm run dev

# Start frontend (from /frontend) 
npm run dev

# The application will be available at:
# Frontend: http://localhost:3000
# Backend: http://localhost:3001
```

### Building for Production
```bash
# Build frontend
cd frontend
npm run build

# Start production server
cd ../backend
npm start
```

## 📝 Migration from Existing System

The platform includes migration capabilities to transfer data from the existing MongoDB-based system to the new PostgreSQL structure. Migration scripts will be provided to:

1. **User Migration** - Transfer user accounts and permissions
2. **Space Migration** - Convert existing spaces to new structure
3. **Task Migration** - Preserve task history and relationships
4. **File Migration** - Move attachments and documents

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue in the GitHub repository
- Check the documentation in `/docs` folder
- Review the API documentation at `/api/docs` when server is running

---

Built with ❤️ using modern web technologies for efficient project management.