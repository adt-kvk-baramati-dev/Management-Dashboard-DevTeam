import { Routes, Route } from "react-router-dom";

import Index from "./pages/Index";

import Login from "./pages/Login";

import AdminDashboard from "./pages/AdminDashboard";

import EmployeeDashboard from "./pages/EmployeeDashboard";

import ComplaintsManagement from "./pages/ComplaintsManagement";

import GISMap from "./pages/GISMap";

import Analytics from "./pages/Analytics";

import DataView from "./pages/DataView";

import UploadData from "./pages/UploadData";

import PortalLogin from "./pages/PortalLogin";

import AdminFarmers from "./pages/AdminFarmers";

import EmployeeActivities from "./pages/EmployeeActivities";

import AdminOutreach from "./pages/AdminOutreach";
import AdminFieldVisits from "./pages/AdminFieldVisits";

import AdminSampling from "./pages/AdminSampling";

import AdminReports from "./pages/AdminReports";

import AdminSettings from "./pages/AdminSettings";

import EmployeeTasks from "./pages/EmployeeTasks";

import EmployeeComplaintRegistration from "./pages/EmployeeComplaintRegistration";

import EmployeeFieldVisit from "./pages/EmployeeFieldVisit";

import EmployeeOutreach from "./pages/EmployeeOutreach";

import EmployeeSampling from "./pages/EmployeeSampling";

import Profile from "./pages/Profile";

import ProfileEdit from "./pages/ProfileEdit";

import Notifications from "./pages/Notifications";

import Unauthorized from "./pages/Unauthorized";

import ProtectedRoute from "./components/ProtectedRoute";

import NotFound from "./pages/NotFound";



const App = () => (

<Routes>

<Route path="/" element={<Index />} />

<Route path="/login" element={<Login />} />

<Route path="/portal/login" element={<PortalLogin />} />



<Route

path="/admin/dashboard"

element={

<ProtectedRoute allowedRoles={["admin"]}>

<AdminDashboard />

</ProtectedRoute>

}

/>

<Route

path="/employee/dashboard"

element={

<ProtectedRoute allowedRoles={["employee"]}>

<EmployeeDashboard />

</ProtectedRoute>

}

/>

<Route

path="/admin/complaints"

element={

<ProtectedRoute allowedRoles={["admin"]}>

<ComplaintsManagement />

</ProtectedRoute>

}

/>

<Route

path="/admin/gis-map"

element={

<ProtectedRoute allowedRoles={["admin"]}>

<GISMap />

</ProtectedRoute>

}

/>

<Route

path="/admin/analytics"

element={

<ProtectedRoute allowedRoles={["admin"]}>

<Analytics />

</ProtectedRoute>

}

/>

<Route

path="/admin/farmers"

element={

<ProtectedRoute allowedRoles={["admin"]}>

<AdminFarmers />

</ProtectedRoute>

}

/>

<Route

path="/admin/employees"

element={

<ProtectedRoute allowedRoles={["admin"]}>

<EmployeeActivities />

</ProtectedRoute>

}

/>

<Route

path="/admin/sampling"

element={

<ProtectedRoute allowedRoles={["admin"]}>

<AdminSampling />

</ProtectedRoute>

}

/>

<Route

path="/admin/outreach"

element={

<ProtectedRoute allowedRoles={["admin"]}>

<AdminOutreach />

</ProtectedRoute>

}

/>

<Route

path="/admin/field-visits"

element={

<ProtectedRoute allowedRoles={["admin"]}>

<AdminFieldVisits />

</ProtectedRoute>

}

/>

<Route

path="/admin/reports"

element={

<ProtectedRoute allowedRoles={["admin"]}>

<AdminReports />

</ProtectedRoute>

}

/>

<Route

path="/admin/settings"

element={

<ProtectedRoute allowedRoles={["admin"]}>

<AdminSettings />

</ProtectedRoute>

}

/>



<Route

path="/employee/complaint-registration"

element={

<ProtectedRoute allowedRoles={["employee"]}>

<EmployeeComplaintRegistration />

</ProtectedRoute>

}

/>

<Route

path="/employee/tasks"

element={

<ProtectedRoute allowedRoles={["employee"]}>

<EmployeeTasks />

</ProtectedRoute>

}

/>

<Route

path="/employee/farmers"

element={

<ProtectedRoute allowedRoles={["employee"]}>

<AdminFarmers />

</ProtectedRoute>

}

/>

<Route

path="/employee/field-visit"

element={

<ProtectedRoute allowedRoles={["employee"]}>

<EmployeeFieldVisit />

</ProtectedRoute>

}

/>

<Route

path="/employee/outreach"

element={

<ProtectedRoute allowedRoles={["employee"]}>

<EmployeeOutreach />

</ProtectedRoute>

}

/>

<Route

path="/employee/sampling"

element={

<ProtectedRoute allowedRoles={["employee"]}>

<EmployeeSampling />

</ProtectedRoute>

}

/>

<Route

path="/profile"

element={

<ProtectedRoute allowedRoles={["employee", "admin"]}>

<Profile />

</ProtectedRoute>

}

/>

<Route

path="/profile/edit"

element={

<ProtectedRoute allowedRoles={["employee", "admin"]}>

<ProfileEdit />

</ProtectedRoute>

}

/>

<Route

path="/notifications"

element={

<ProtectedRoute allowedRoles={["employee", "admin"]}>

<Notifications />

</ProtectedRoute>

}

/>

<Route path="/404" element={<NotFound />} />

<Route path="/unauthorized" element={<Unauthorized />} />



<Route path="/data" element={<DataView />} />

<Route path="/upload" element={<UploadData />} />

{/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}

<Route path="*" element={<NotFound />} />

</Routes>

);



export default App;