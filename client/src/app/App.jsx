import { useEffect, useState } from 'react';
import { Navigate, Route, Routes, useParams } from 'react-router-dom';
import { api, setToken } from '../lib/api.js';
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
import { CommercialReviewPage } from '../features/commercial/CommercialReviewPage.jsx';
import { QuotationHistoryPage } from '../features/quotations/QuotationHistoryPage.jsx';
import { AuditPage } from '../features/audit/AuditPage.jsx';
import { UsersPage } from '../features/users/UsersPage.jsx';
import { AiRfqIntakePage } from '../features/aiIntake/AiRfqIntakePage.jsx';

export default function App() {
  const [user, setUser] = useState(null);
  useEffect(() => { api('/auth/me').then(result => setUser(result.user)).catch(() => { setToken(null); }); }, []);
  return <Routes><Route path="/" element={<LandingPage />} /><Route path="/login" element={user ? <Navigate to="/app" /> : <LoginPage onLogin={setUser} />} /><Route path="/unauthorized" element={<UnauthorizedPage />} /><Route path="/app" element={user ? <DashboardLayout user={user} onLogout={() => setUser(null)} /> : <Navigate to="/login" />}><Route index element={<DashboardPage />} /><Route path="rfqs" element={user ? <RfqsPage canCreate={user.role === 'estimator'} /> : <UnauthorizedPage />} /><Route path="rfqs/ai-intake" element={user?.role === 'estimator' ? <AiRfqIntakePage /> : <UnauthorizedPage />} /><Route path="rfqs/:rfqId/costing" element={['estimator','sales_head','plant_head','admin'].includes(user?.role) ? <CostingRoute canEdit={user?.role === 'estimator'} /> : <UnauthorizedPage />} /><Route path="routing-reviews" element={user?.role === 'plant_head' ? <RoutingReviewPage /> : <UnauthorizedPage />} /><Route path="commercial-reviews" element={user?.role === 'sales_head' ? <CommercialReviewPage /> : <UnauthorizedPage />} /><Route path="quotations" element={['estimator','sales_head','admin'].includes(user?.role) ? <QuotationHistoryPage /> : <UnauthorizedPage />} /><Route path="audit" element={user?.role === 'admin' ? <AuditPage /> : <UnauthorizedPage />} /><Route path="users" element={user?.role === 'admin' ? <UsersPage /> : <UnauthorizedPage />} /><Route path="rate-masters" element={user?.role ? <RateMastersPage canManage={user.role === 'admin'} /> : <UnauthorizedPage />} /></Route><Route path="*" element={<NotFoundPage />} /></Routes>;
}

function CostingRoute({ canEdit }) { const { rfqId } = useParams(); return <CostingPage rfqId={rfqId} canEdit={canEdit} />; }
