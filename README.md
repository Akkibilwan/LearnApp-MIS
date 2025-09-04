# Video Production Manager

A comprehensive project management system specifically designed for video production timelines. This application helps teams manage video production workflows from topic selection to release, with features like milestone tracking, timeline management, dependency handling, and team collaboration.

## Features

### Core Features
- **Space Management**: Create and manage different production spaces (teams/departments)
- **Milestone-based Workflow**: Define groups (milestones) with dependencies and time estimates
- **Kanban Board**: Visual task management with drag-and-drop functionality
- **Timeline Tracking**: Automatic timeline calculations based on working hours and dependencies
- **User Management**: Role-based access control (Admin/User)
- **Real-time Status Updates**: Track task progress with detailed status history

### Advanced Features
- **Dependency Management**: Sequential and parallel milestone dependencies
- **Approval Workflows**: Set approval milestones for quality control
- **Working Hours Management**: Configurable working hours and days per user/space
- **Leave Management**: Handle user leaves with automatic timeline adjustments
- **Analytics Dashboard**: Comprehensive analytics with charts and performance metrics
- **Google Docs Integration**: Custom HTML templates for external collaboration
- **Slack Integration**: Webhook notifications for milestone updates

## Tech Stack

### Backend
- **Node.js** with Express.js
- **MongoDB** with Mongoose ODM
- **JWT** authentication
- **bcryptjs** for password hashing
- **moment.js** for date/time calculations
- **axios** for HTTP requests

### Frontend
- **React 18** with TypeScript
- **Material-UI (MUI)** for UI components
- **React Router** for navigation
- **React Beautiful DnD** for drag-and-drop
- **Recharts** for analytics visualization
- **Moment.js** for date handling

## Installation & Setup

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (local or cloud instance)
- npm or yarn

### 1. Clone and Install Dependencies

```bash
# Clone the repository
git clone <repository-url>
cd video-production-manager

# Install backend dependencies
npm install

# Install frontend dependencies
cd client
npm install --legacy-peer-deps
cd ..
```

### 2. Environment Configuration

Create a `.env` file in the root directory:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/video_production_manager
JWT_SECRET=your_super_secret_jwt_key_here
SLACK_WEBHOOK_URL=your_slack_webhook_url_here
GOOGLE_DOCS_API_KEY=your_google_docs_api_key_here
NODE_ENV=development
```

### 3. Database Setup

Start MongoDB service, then seed the database with sample data:

```bash
# Seed the database with sample data
node scripts/seed.js
```

### 4. Start the Application

```bash
# Start both backend and frontend in development mode
npm run dev

# Or start them separately:
# Backend only
npm run server

# Frontend only (in another terminal)
npm run client
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

## Demo Credentials

After running the seed script, you can use these credentials:

- **Admin**: admin@example.com / admin123
- **User 1**: john@example.com / user123
- **User 2**: jane@example.com / user123

## Usage Guide

### 1. Getting Started
1. Login with demo credentials or create a new account
2. Create your first Space (production team/project)
3. Set up Groups (milestones) with dependencies and time estimates
4. Add team members to your space
5. Start creating and managing tasks

### 2. Space Management
- **Create Space**: Define your production team with working hours and settings
- **Add Members**: Invite team members via email
- **Configure Settings**: Set up parallel tasks, approval requirements, and integrations

### 3. Group (Milestone) Setup
- **Sequential Dependencies**: Tasks must complete previous milestones first
- **Parallel Dependencies**: Tasks can run simultaneously with other milestones
- **Approval Groups**: Require admin approval before proceeding
- **Start/Final Groups**: Mark beginning and end milestones

### 4. Task Management
- **Kanban Board**: Drag and drop tasks between milestones
- **Status Tracking**: Mark tasks as In-progress, Completed, Paused, etc.
- **Timeline Calculation**: Automatic due date calculation based on working hours
- **Owner Assignment**: Assign tasks to specific team members

### 5. Analytics & Reporting
- **Performance Metrics**: Track completion rates, delays, and efficiency
- **Visual Charts**: Pie charts, bar charts, and progress indicators
- **Time Tracking**: Monitor estimated vs actual time spent
- **Team Performance**: Individual and group performance analytics

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/profile` - Update user profile

### Spaces
- `GET /api/spaces` - Get user's spaces
- `POST /api/spaces` - Create new space
- `GET /api/spaces/:id` - Get space details
- `PUT /api/spaces/:id` - Update space
- `DELETE /api/spaces/:id` - Delete space

### Groups
- `GET /api/groups/space/:spaceId` - Get groups in space
- `POST /api/groups/space/:spaceId` - Create new group
- `PUT /api/groups/:id` - Update group
- `DELETE /api/groups/:id` - Delete group

### Tasks
- `GET /api/tasks/space/:spaceId` - Get tasks in space
- `POST /api/tasks/space/:spaceId` - Create new task
- `GET /api/tasks/:id` - Get task details
- `PUT /api/tasks/:id/status` - Update task status
- `PUT /api/tasks/:id/move` - Move task to different group

### Users (Admin only)
- `GET /api/users` - Get all users
- `GET /api/users/search` - Search users
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

## Integrations

### Google Docs Integration
1. Generate custom HTML templates for each space
2. Copy template to Google Docs for external collaboration
3. Use embedded JavaScript to sync status updates back to the system

### Slack Integration
1. Configure Slack webhook URL in space settings
2. Receive notifications for:
   - Task status changes
   - Milestone completions
   - Approval requests
   - Delayed tasks

## Deployment

### Production Build

```bash
# Build frontend for production
cd client
npm run build
cd ..

# Start production server
npm start
```

### Environment Variables for Production

```env
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb://your-production-db-url
JWT_SECRET=your-production-jwt-secret
SLACK_WEBHOOK_URL=your-slack-webhook
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, email support@videoproductionmanager.com or create an issue in the GitHub repository.