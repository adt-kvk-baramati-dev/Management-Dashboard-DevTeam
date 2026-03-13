import { Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Login from "./pages/Login";
import AdminDashboard from "./pages/AdminDashboard";
import EmployeeDashboard from "./pages/EmployeeDashboard";
import ComplaintsManagement from "./pages/ComplaintsManagement";
import GISMap from "./pages/GISMap";
import Analytics from "./pages/Analytics";
import DataView from "./pages/DataView";
import CropGuidance from "./pages/CropGuidance";
import RandomSampling from "./pages/RandomSampling";
import UploadData from "./pages/UploadData";
import Contact from "./pages/Contact";
import About from "./pages/About";
import PortalHome from "./pages/PortalHome";
import PortalLogin from "./pages/PortalLogin";
import AdminManagement from "./pages/AdminManagement";
import EmployeeFarmerCreate from "./pages/EmployeeFarmerCreate";
import ProtectedRoute from "./components/ProtectedRoute";
import NotFound from "./pages/NotFound";

const App = () => (
  <Routes>
    <Route path="/" element={<Index />} />
    <Route path="/login" element={<Login />} />
    <Route path="/portal" element={<PortalHome />} />
    <Route path="/portal/login" element={<PortalLogin />} />

    <Route path="/admin/dashboard" element={<ProtectedRoute allowedRoles={["admin"]}><AdminDashboard /></ProtectedRoute>} />
    <Route path="/employee/dashboard" element={<ProtectedRoute allowedRoles={["employee"]}><EmployeeDashboard /></ProtectedRoute>} />
    <Route path="/admin/complaints" element={<ProtectedRoute allowedRoles={["admin"]}><ComplaintsManagement /></ProtectedRoute>} />
    <Route path="/admin/gis-map" element={<ProtectedRoute allowedRoles={["admin"]}><GISMap /></ProtectedRoute>} />
    <Route path="/admin/analytics" element={<ProtectedRoute allowedRoles={["admin"]}><Analytics /></ProtectedRoute>} />
    <Route path="/admin/users" element={<ProtectedRoute allowedRoles={["admin"]}><AdminManagement /></ProtectedRoute>} />

    <Route path="/employee/farmers/new" element={<ProtectedRoute allowedRoles={["employee"]}><EmployeeFarmerCreate /></ProtectedRoute>} />

    <Route path="/data" element={<DataView />} />
    <Route path="/guidance" element={<CropGuidance />} />
    <Route path="/sampling" element={<RandomSampling />} />
    <Route path="/upload" element={<UploadData />} />
    <Route path="/contact" element={<Contact />} />
    <Route path="/about" element={<About />} />
    {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
    <Route path="*" element={<NotFound />} />
  </Routes>
);

export default App;
