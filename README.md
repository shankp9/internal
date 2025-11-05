# Resource Management System

A comprehensive web-based platform for managing developer allocations efficiently across clients and projects.

## Features

- ✅ Role-based access control (Admin, Manager, Employee)
- ✅ Client management
- ✅ Project management
- ✅ Assignment management with approval workflow
- ✅ Developer utilization tracking
- ✅ Capacity calculation and forecasting
- ✅ Multiple dashboard views (Admin, Manager, Employee)
- ✅ Real-time notifications
- ✅ Tag-based filtering
- ✅ Modern, responsive UI/UX

## Tech Stack

### Frontend
- Next.js 14
- React 18
- TypeScript
- Tailwind CSS
- Recharts for data visualization

### Backend
- Node.js
- Express.js
- MongoDB with Mongoose
- JWT authentication

## Getting Started

### Prerequisites
- Node.js 18+ 
- MongoDB 6+
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd resource_managements
```

2. Install root dependencies:
```bash
npm install
```

3. Set up the backend:
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your MongoDB URI and JWT secret
```

4. Set up the frontend:
```bash
cd ../frontend
npm install
cp .env.local.example .env.local
# Edit .env.local with your API URL
```

5. Start MongoDB (if running locally):
```bash
mongod
```

6. Run both backend and frontend:
```bash
# From root directory
npm run dev
```

Or run them separately:
```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

7. Access the application:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

## Default Credentials

You'll need to create an admin user first. You can do this by:
1. Using the registration endpoint (if you have admin access)
2. Or directly creating a user in MongoDB

Example admin user:
- Email: admin@example.com
- Password: admin123
- Role: admin

## Project Structure

```
resource_managements/
├── backend/
│   ├── models/          # MongoDB models
│   ├── routes/          # API routes
│   ├── middleware/      # Auth middleware
│   └── server.js        # Express server
├── frontend/
│   ├── app/             # Next.js app directory
│   ├── components/      # React components
│   ├── lib/             # Utilities and API client
│   └── public/          # Static assets
└── prd.md              # Product Requirements Document
```

## Key Features Implementation

### Capacity Calculation
- Automatic calculation based on active assignments
- Available capacity = 100% - Total utilization
- Over-utilization warnings (>100%)

### Approval Workflow
- Managers create assignments → Pending status
- Admins approve/reject assignments
- System prevents over-utilization on approval

### Dashboards
- **Admin Dashboard**: Company-wide overview, utilization heatmap, overbooked developers
- **Manager Dashboard**: Team utilization, pending approvals, projects breakdown
- **Employee Dashboard**: Personal utilization, active assignments, utilization history

### Notifications
- Pending approvals
- Over-utilization alerts
- Approaching end dates
- Role-specific notifications

## API Documentation

See `backend/README.md` for detailed API endpoint documentation.

## Development

### Backend Development
```bash
cd backend
npm run dev  # Uses nodemon for auto-reload
```

### Frontend Development
```bash
cd frontend
npm run dev  # Next.js dev server with hot reload
```

## Production Build

### Backend
```bash
cd backend
npm start
```

### Frontend
```bash
cd frontend
npm run build
npm start
```

## License

MIT

## Author

Shashank
