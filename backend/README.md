# Resource Management System - Backend

This is the Express.js backend for the Resource Management System.

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file (copy from `.env.example`):
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/resource_management
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
JWT_EXPIRE=7d
NODE_ENV=development
```

3. Make sure MongoDB is running on your system.

4. Run the development server:
```bash
npm run dev
```

The server will start on `http://localhost:5000`.

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login user
- `POST /api/auth/register` - Register new user (Admin only)
- `GET /api/auth/me` - Get current user

### Clients
- `GET /api/clients` - Get all clients
- `GET /api/clients/:id` - Get single client
- `POST /api/clients` - Create client (Admin only)
- `PUT /api/clients/:id` - Update client (Admin only)
- `DELETE /api/clients/:id` - Delete client (Admin only)

### Projects
- `GET /api/projects` - Get all projects
- `GET /api/projects/:id` - Get single project
- `POST /api/projects` - Create project (Admin/Manager)
- `PUT /api/projects/:id` - Update project (Admin/Manager)
- `DELETE /api/projects/:id` - Delete project (Admin only)

### Assignments
- `GET /api/assignments` - Get all assignments
- `GET /api/assignments/:id` - Get single assignment
- `POST /api/assignments` - Create assignment (Admin/Manager)
- `PUT /api/assignments/:id` - Update assignment (Admin/Manager)
- `POST /api/assignments/:id/approve` - Approve assignment (Admin only)
- `POST /api/assignments/:id/reject` - Reject assignment (Admin only)
- `DELETE /api/assignments/:id` - Delete assignment (Admin/Manager)

### Developers
- `GET /api/developers` - Get all developers with utilization
- `GET /api/developers/:id` - Get single developer
- `GET /api/developers/:id/capacity` - Get developer capacity for date range

### Dashboard
- `GET /api/dashboard/manager` - Manager dashboard data
- `GET /api/dashboard/client` - Client dashboard data
- `GET /api/dashboard/project` - Project dashboard data
- `GET /api/dashboard/admin` - Admin dashboard data

### Notifications
- `GET /api/notifications` - Get notifications for current user

## Tech Stack

- Node.js
- Express.js
- MongoDB with Mongoose
- JWT for authentication
- bcryptjs for password hashing
