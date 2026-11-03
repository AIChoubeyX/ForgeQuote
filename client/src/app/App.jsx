import { useEffect, useState } from 'react';
import { Navigate, Route, Routes, useParams } from 'react-router-dom';
import { api } from '../lib/api.js';
import { DashboardLayout } from '../layouts/DashboardLayout.jsx';
import { LandingPage } from '../pages/LandingPage.jsx';
import { LoginPage } from '../pages/LoginPage.jsx';
import { NotFoundPage } from '../pages/NotFoundPage.jsx';
import { UnauthorizedPage } from '../pages/UnauthorizedPage.jsx';
import { DashboardPage } from '../features/dashboard/DashboardPage.jsx';
import { RfqsPage } from '../features/rfqs/RfqsPage.jsx';
import { RateMastersPage } from '../features/rates/RateMastersPage.jsx';
import { CostingPage } from '../features/costing/CostingPage.jsx';
import { RoutingReviewPage } from '../features/routing/RoutingReviewPage.jsx';

export default function App() {
  const [user, setUser] = useState(null);
  useEffect(() => { api('/auth/me').then(result => setUser(result.user)).catch(() => {}); }, []);
  return <Routes><Route path="/" element={<LandingPage />} /><Route path="/login" element={user ? <Navigate to="/app" /> : <LoginPage onLogin={setUser} />} /><Route path="/unauthorized" element={<UnauthorizedPage />} /><Route path="/app" element={user ? <DashboardLayout user={user} onLogout={() => setUser(null)} /> : <Navigate to="/login" />}><Route index element={<DashboardPage />} /><Route path="rfqs" element={<RfqsPage />} /><Route path="rfqs/:rfqId/costing" element={['estimator','sales_head','plant_head','admin'].includes(user?.role) ? <CostingRoute /> : <UnauthorizedPage />} /><Route path="routing-reviews" element={user?.role === 'plant_head' ? <RoutingReviewPage /> : <UnauthorizedPage />} /><Route path="rate-masters" element={user?.role ? <RateMastersPage canManage={user.role === 'admin'} /> : <UnauthorizedPage />} /></Route><Route path="*" element={<NotFoundPage />} /></Routes>;
}

function CostingRoute() { const { rfqId } = useParams(); return <CostingPage rfqId={rfqId} />; }
