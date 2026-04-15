import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import Layout from './components/layout/Layout';
import Dashboard from './pages/Dashboard';
import ProjectsPage from './pages/ProjectsPage';
import ProjectDetail from './pages/ProjectDetail';
import TasksPage from './pages/TasksPage';
import KanbanPage from './pages/KanbanPage';
import WorkloadPage from './pages/WorkloadPage';
import ApprovalsPage from './pages/ApprovalsPage';
import MilestonesPage from './pages/MilestonesPage';
import TeamReportsPage from './pages/TeamReportsPage';
import AdminPage from './pages/AdminPage';

function Guard({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',color:'var(--text3)',fontSize:'14px'}}>Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<Guard><Layout /></Guard>}>
            <Route index element={<Dashboard />} />
            <Route path="projects" element={<ProjectsPage />} />
            <Route path="projects/:id" element={<ProjectDetail />} />
            <Route path="tasks" element={<TasksPage />} />
            <Route path="kanban" element={<KanbanPage />} />
            <Route path="workload" element={<WorkloadPage />} />
            <Route path="approvals" element={<ApprovalsPage />} />
            <Route path="milestones" element={<MilestonesPage />} />
            <Route path="team-reports" element={<TeamReportsPage />} />
            <Route path="admin" element={<Guard roles={['admin']}><AdminPage /></Guard>} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
