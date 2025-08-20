import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './auth/AuthContext';

// --- Import all page components ---
import LoginPage from './components/LoginPage';
import ProtectedRoute from './routes/ProtectedRoute';
import MainLayout from './MainLayout';


// Advisor Pages
import AdvisorDashboard from './components/AdvisorDashboard';
import ClientListPage from './components/ClientListPage';
import ClientDetailPage from './components/ClientDetailPage';

// Admin Pages
import AdminUserManagement from './components/AdminUserManagement';
import AdminFormBuilder from './components/AdminFormBuilder';

// Client Fact Finder Pages
import FactFinderPersonalInfo from './pages/FactFinderPersonalInfo';
import FactFinderSpouseInfo from './pages/FactFinderSpouseInfo';
import FactFinderFamilyInfo from './pages/FactFinderFamilyInfo';
import FactFinderInvestorProfile from './pages/FactFinderInvestorProfile';
import FactFinderDocuments from './pages/FactFinderDocuments';
import FactFinderSummary from './pages/FactFinderSummary';
import ClientLayout from './components/ClientLayout';
import AdminContentGovernance from './components/admin/AdminContentGovernance';
import FactFinderIncome from './pages/FactFinderIncome';
import FactFinderAssets from './pages/FactFinderAssets';
import FactFinderLiabilities from './pages/FactFinderLiabilities';
import AdvisorToolsHub from './components/advisor/AdvisorToolsHub';
import AdvisorIncomeTaxTool from './components/advisor/AdvisorIncomeTaxTool';
import ClientSettingsPage from './pages/ClientSettingsPage';
import AdvisorSettingsPage from './components/advisor/AdvisorSettingsPage';



const App: React.FC = () => {
    return (
        <Router>
            <Routes>
                {/* --- Public Route --- */}
                <Route path="/login" element={<LoginPage />} />

                {/* --- Protected Routes --- */}
                <Route element={<ProtectedRoute />}>

                    {/* Advisor & Admin Routes (uses the MainLayout with sidebar) */}
                    <Route element={<MainLayout />}>
                        <Route path="/dashboard" element={<AdvisorDashboard />} />
                        <Route path="/clients" element={<ClientListPage />} />
                        <Route path="/clients/:clientId" element={<ClientDetailPage />} />
                        <Route path="/tools" element={<AdvisorToolsHub />} />
                        <Route path="/tools/income-tax" element={<AdvisorIncomeTaxTool />} />
                        <Route path="/advisor/settings" element={<AdvisorSettingsPage />} />
        

                    </Route>

                    <Route element={<MainLayout />}>
                        <Route path="/admin/users" element={<AdminUserManagement />} />
                        <Route
                            path="/admin/form-builder"
                            element={<AdminFormBuilder formName="investor_profile" title="Investor Profile Questions" />}
                        />
                        <Route path="/admin/content-governance" element={<AdminContentGovernance />} />

                    </Route>

                    {/* Client Routes (now uses the ClientLayout) */}
                    <Route element={<ClientLayout />}>
                        
                        <Route path="/fact-finder">
                            <Route path="personal-info" element={<FactFinderPersonalInfo />} />
                            <Route path="spouse-info" element={<FactFinderSpouseInfo />} />
                            <Route path="family-info" element={<FactFinderFamilyInfo />} />
                            <Route path="investor-profile" element={<FactFinderInvestorProfile />} />
                            <Route path="income" element={<FactFinderIncome />} />
                            <Route path="assets" element={<FactFinderAssets />} />
                            <Route path="liabilities" element={<FactFinderLiabilities />} />
                            <Route path="documents" element={<FactFinderDocuments />} />
                            <Route path="summary" element={<FactFinderSummary />} />    
                            {/* Default step for the wizard */}
                            <Route index element={<Navigate to="personal-info" replace />} />
                        </Route>
                        {/* ✅ Standalone client settings route */}
                    <Route path="/settings" element={<ClientSettingsPage />} />
                    </Route>
                    
                    {/* Default route after login (will be handled by LoginPage redirect) */}
                    <Route path="/" element={<HomeRedirect />} />
                </Route>
            </Routes>
        </Router>
    );
};

// Helper component to handle the initial redirect after login
const HomeRedirect: React.FC = () => {
    const { user } = useAuth();
    if (user?.role === 'admin') return <Navigate to="/admin/users" />;
    if (user?.role === 'advisor') return <Navigate to="/dashboard" />;
    if (user?.role === 'client') return <Navigate to="/fact-finder" />;
    return <Navigate to="/login" />; // Fallback
};

export default App;
