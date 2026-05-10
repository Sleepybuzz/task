# TaskFlow — Team Task Management App

A full-stack collaborative task management application built with React + Node.js/Express + SQLite.

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- npm or yarn

---

## Backend Setup

```bash
cd backend
npm install
npm start
```

The API will run on **http://localhost:5000**

> For development with auto-reload: `npm run dev` (requires nodemon)

---

## Frontend Setup

```bash
cd frontend
npm install
npm start
```

The app will open at **http://localhost:3000**

---

## Project Structure

```
taskflow/
├── backend/
│   ├── db/
│   │   └── database.js        # SQLite setup & schema
│   ├── middleware/
│   │   └── auth.js            # JWT auth + role middleware
│   ├── routes/
│   │   ├── auth.js            # POST /api/auth/signup, /login, GET /me
│   │   ├── projects.js        # CRUD projects + members
│   │   ├── tasks.js           # CRUD tasks (nested under projects)
│   │   └── dashboard.js       # GET /api/dashboard stats
│   ├── server.js              # Express app entry
│   └── package.json
│
├── frontend/
│   ├── public/
│   │   └── index.html
│   └── src/
│       ├── components/
│       │   ├── Layout.jsx     # Sidebar navigation
│       │   └── TaskModal.jsx  # Task create/edit modal
│       ├── context/
│       │   ├── AuthContext.jsx
│       │   └── ToastContext.jsx
│       ├── pages/
│       │   ├── AuthPage.jsx       # Login + Signup
│       │   ├── DashboardPage.jsx  # Stats overview
│       │   ├── ProjectsPage.jsx   # Project list
│       │   └── ProjectDetailPage.jsx # Board + List + Members
│       ├── utils/
│       │   └── api.js         # Axios instance with auth
│       ├── App.jsx            # Routes
│       └── index.js
└── README.md
```

---

## API Reference

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/signup | Register new user |
| POST | /api/auth/login | Login |
| GET | /api/auth/me | Get current user |

### Projects
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/projects | User | List my projects |
| POST | /api/projects | User | Create project |
| GET | /api/projects/:id | Member | Get project + members |
| PUT | /api/projects/:id | Admin | Update project |
| DELETE | /api/projects/:id | Admin | Delete project |
| POST | /api/projects/:id/members | Admin | Add member |
| PUT | /api/projects/:id/members/:uid | Admin | Update member role |
| DELETE | /api/projects/:id/members/:uid | Admin | Remove member |

### Tasks
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/projects/:id/tasks | Member | List tasks |
| POST | /api/projects/:id/tasks | Admin | Create task |
| GET | /api/projects/:id/tasks/:tid | Member | Get task |
| PUT | /api/projects/:id/tasks/:tid | Member* | Update task |
| DELETE | /api/projects/:id/tasks/:tid | Admin | Delete task |

*Members can only update status of their own assigned tasks.

### Dashboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/dashboard | Get stats, workload, activity |

---

## Features

- ✅ JWT-based authentication (7-day tokens)
- ✅ Role-based access control (Admin / Member)
- ✅ Project creation with color coding
- ✅ Kanban board (To Do → In Progress → Done)
- ✅ Table/List view with sorting
- ✅ Task priority (Low / Medium / High)
- ✅ Due dates with overdue detection
- ✅ Member management (add/remove/role change)
- ✅ Dashboard with team workload stats
- ✅ Responsive design with collapsible sidebar
- ✅ SQLite database (no external DB required)

---

## Environment Variables

### Backend (optional)
```
PORT=5000
JWT_SECRET=your_custom_secret
```

Create a `.env` file in the `backend/` directory.

1. Sign up as User 1 (will be Admin)

Go to your app → Sign Up
Name: USER, Email: user@example.com, Password: 123456
She creates a project → automatically becomes Admin of that project

2. Sign up as User 2 (will be Member)

Open an incognito window (so you're logged in as two users simultaneously)
Sign Up → Name: user2, Email: user2@example.com, Password: 123456
Bob has no projects yet

3. USER adds user2 to her project

Log in as USER → open the project → click Members button
Enter user2@example.com → Role: Member → click Add
user2 is now a Member of that project