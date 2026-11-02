import { useEffect, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { api } from '../lib/api.js';
import { DashboardLayout } from '../layouts/DashboardLayout.jsx';
import { LandingPage } from '../pages/LandingPage.jsx';
import { LoginPage } from '../pages/LoginPage.jsx';
import { NotFoundPage } from '../pages/NotFoundPage.jsx';
import { UnauthorizedPage } from '../pages/UnauthorizedPage.jsx';
import { DashboardPage } from '../features/dashboard/DashboardPage.jsx';
import { RfqsPage } from '../features/rfqs/RfqsPage.jsx';

export default function App() {
  const [user, setUser] = useState(null);
  useEffect(() => { api('/auth/me').then(result => setUser(result.user)).catch(() => {}); }, []);
  return <Routes><Route path="/" element={<LandingPage />} /><Route path="/login" element={user ? <Navigate to="/app" /> : <LoginPage onLogin={setUser} />} /><Route path="/unauthorized" element={<UnauthorizedPage />} /><Route path="/app" element={user ? <DashboardLayout user={user} onLogout={() => setUser(null)} /> : <Navigate to="/login" />}><Route index element={<DashboardPage />} /><Route path="rfqs" element={<RfqsPage />} /></Route><Route path="*" element={<NotFoundPage />} /></Routes>;
}
