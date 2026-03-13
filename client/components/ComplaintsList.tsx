import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { FileText, Search, CheckCircle, Loader2, Phone, User, Landmark, MapPin, Sprout, Activity, X, RefreshCw } from "lucide-react";
import { useAuth } from "../lib/AuthProvider";

interface ComplaintsListProps {
  filterStatus?: 'Pending' | 'Solved';
  title: string;
  description: string;
}

export default function ComplaintsList({ filterStatus, title, description }: ComplaintsListProps) {
  const { profile, token, loading: authLoading } = useAuth();
  const [complaints, setComplaints] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [selectedFarmer, setSelectedFarmer] = useState<any | null>(null);
  const [farmerLoading, setFarmerLoading] = useState(false);

  const fetchEmployees = useCallback(async () => {
    if (!token) return;
    try {
      const response = await fetch('/api/employees?role=employee', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body?.message ?? 'Failed to fetch employees');
      }
      setEmployees(body?.employees ?? []);
    } catch (err) {
      console.error("Error fetching employees:", err);
    }
  }, [token]);

  const fetchComplaints = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterStatus) {
        params.set('status', filterStatus);
      }

      const response = await fetch(`/api/complaints?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body?.message ?? 'Failed to fetch complaints');
      }

      setComplaints(body?.complaints ?? []);
      setError(false);
    } catch (err) {
      console.error("Error fetching complaints:", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [filterStatus, token]);

  useEffect(() => {
    if (profile && token) {
      fetchEmployees();
      fetchComplaints();
    }
  }, [profile, token, fetchEmployees, fetchComplaints]);

  const handleAssign = async (complaintId: string, employeeId: string) => {
    if (!employeeId) return;
    if (!token) return;
    setAssigningId(complaintId);
    
    try {
      const response = await fetch(`/api/complaints/${complaintId}/assign`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ employeeId }),
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body?.message ?? 'Failed to assign complaint');
      }
      
      setComplaints(prev => prev.map(c => c.id === complaintId ? { ...c, assigned_to: employeeId } : c));
    } catch (err) {
      console.error("Error assigning complaint:", err);
      alert("Failed to assign complaint.");
    } finally {
      setAssigningId(null);
    }
  };

  const filteredComplaints = complaints.filter(c => 
    (c.farmer_name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (c.subject?.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (c.domain?.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (c.prn_no?.toString().includes(searchTerm)) ||
    (c.id.toString().includes(searchTerm))
  );

  const fetchFarmerDetails = async (prnNo: any) => {
    if (!prnNo) return;
    if (!token) return;
    setFarmerLoading(true);
    try {
      const response = await fetch(`/api/farmers/${encodeURIComponent(String(prnNo))}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const body = await response.json();

      if (response.ok && body?.farmer) {
        setSelectedFarmer(body.farmer);
      } else {
        const complaint = complaints.find(c => c.prn_no === prnNo);
        setSelectedFarmer({
          prn_no: prnNo,
          name: complaint?.farmer_name || 'Unknown Farmer',
          phone: complaint?.phone || 'N/A'
        });
      }
    } catch (err) {
      console.error("Error fetching farmer profile:", err);
    } finally {
      setFarmerLoading(false);
    }
  };

  if (authLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center bg-slate-50 gap-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2 text-slate-800">
            <FileText className="w-6 h-6 text-blue-500" /> {title}
          </h2>
          <p className="text-sm text-slate-500 mt-1">{description}</p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button 
            onClick={() => fetchComplaints()}
            disabled={loading}
            className="p-2 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg transition-all"
            title="Refresh Complaints"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin text-emerald-500' : ''}`} />
          </button>
          <div className="relative w-full md:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-slate-300 focus:ring-blue-500 focus:border-blue-500 transition-shadow outline-none" 
            />
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs uppercase bg-slate-100 text-slate-600">
            <tr>
              <th className="px-6 py-4">PRN</th>
              <th className="px-6 py-4">Farmer Name</th>
              <th className="px-6 py-4">Contact</th>
              <th className="px-6 py-4">Domain</th>
              <th className="px-6 py-4 text-right">Assignment/Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-500"><Loader2 className="animate-spin mx-auto mb-2" /> Loading...</td></tr>
            ) : filteredComplaints.length === 0 ? (
              <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-500">No complaints found.</td></tr>
            ) : (
              filteredComplaints.map((comp) => {
                const isSolved = comp.solve_status === 'Solved';
                const assignedEmployee = employees.find(e => e.id === comp.assigned_to);
                
                return (
                  <tr key={comp.id} className="hover:bg-slate-50 transition-colors border-l-4 border-l-transparent hover:border-l-emerald-500">
                    <td className="px-6 py-4 cursor-pointer group" onClick={() => fetchFarmerDetails(comp.prn_no)}>
                      <span className="font-bold text-emerald-600 group-hover:underline">#{comp.prn_no || 'N/A'}</span>
                    </td>
                    <td className="px-6 py-4 cursor-pointer group" onClick={() => fetchFarmerDetails(comp.prn_no)}>
                      <p className="font-semibold text-slate-800 group-hover:text-emerald-700">{comp.farmer_name || comp.name || 'Unknown'}</p>
                      <p className="text-[10px] text-slate-400 capitalize">{comp.date || new Date(comp.created_at).toLocaleDateString()}</p>
                    </td>
                    <td className="px-6 py-4 text-slate-500 font-medium">
                      {comp.phone || 'No Contact'}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-[10px] font-bold uppercase tracking-wider border border-slate-200">
                        {comp.domain || 'General'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {isSolved ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle className="w-3 h-3" /> Solved
                        </span>
                      ) : (
                        <div className="flex flex-col items-end gap-1">
                           <select 
                            value={comp.assigned_to || ""}
                            onChange={(e) => handleAssign(comp.id, e.target.value)}
                            disabled={assigningId === comp.id}
                            className="text-xs border border-slate-300 rounded-md p-1.5 bg-white shadow-sm outline-none"
                          >
                            <option value="">{comp.assigned_to ? "Re-assign" : "Assign Expert"}</option>
                            {employees.map(exp => (
                              <option key={exp.id} value={exp.id}>
                                {exp.name} ({exp.domain_expertise || 'General'})
                              </option>
                            ))}
                          </select>
                          {assignedEmployee && (
                            <span className="text-[9px] text-slate-400">Handled by {assignedEmployee.name}</span>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      {(selectedFarmer || farmerLoading) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-slide-up">
            {farmerLoading ? (
               <div className="p-20 flex flex-col items-center justify-center">
                 <Loader2 className="w-12 h-12 text-emerald-500 animate-spin mb-4" />
                 <p className="text-slate-500 font-medium">Loading Full Farmer Profile...</p>
               </div>
            ) : (
              <>
                <div className="relative h-32 bg-emerald-600 p-8">
                  <button 
                    onClick={() => setSelectedFarmer(null)}
                    className="absolute top-6 right-6 p-2 bg-white/20 text-white hover:bg-white/40 rounded-full transition-all"
                  >
                    <X className="w-5 h-5" />
                  </button>
                  <div className="absolute -bottom-10 left-8 w-24 h-24 rounded-full bg-white p-1 shadow-lg border-4 border-white overflow-hidden">
                    <div className="w-full h-full bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
                      <User className="w-12 h-12" />
                    </div>
                  </div>
                </div>

                <div className="p-8 pt-12">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h3 className="text-3xl font-bold text-slate-800">{selectedFarmer.name}</h3>
                      <p className="text-emerald-600 font-bold text-lg flex items-center gap-2">
                        <Landmark className="w-5 h-5" /> PRN: #{selectedFarmer.prn_no}
                      </p>
                    </div>
                    <div className="bg-emerald-50 text-emerald-700 px-4 py-2 rounded-xl border border-emerald-100 flex items-center gap-2">
                      <Sprout className="w-5 h-5" />
                      <span className="font-bold">{selectedFarmer.crop_type || 'Multiple Crops'}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6 mb-8">
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 text-slate-600">
                        <Phone className="w-5 h-5 text-slate-400" />
                        <div>
                          <p className="text-[10px] uppercase font-bold text-slate-400">Contact Number</p>
                          <p className="font-medium">{selectedFarmer.phone || 'Not Provided'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-slate-600">
                        <MapPin className="w-5 h-5 text-slate-400" />
                        <div>
                          <p className="text-[10px] uppercase font-bold text-slate-400">Location</p>
                          <p className="font-medium">{selectedFarmer.village || 'N/A'}, {selectedFarmer.district || 'N/A'}</p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 text-slate-600">
                        <Activity className="w-5 h-5 text-slate-400" />
                        <div>
                          <p className="text-[10px] uppercase font-bold text-slate-400">Total Farm Area</p>
                          <p className="font-medium">{selectedFarmer.total_area_acres || '0'} Acres</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-4 border-t border-slate-100 pt-6">
                    <button 
                      onClick={() => setSelectedFarmer(null)}
                      className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl transition-all"
                    >
                      Close Profile
                    </button>
                    <Link 
                      to={`/data?prn=${selectedFarmer.prn_no}`}
                      className="flex-1 py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl text-center shadow-lg shadow-emerald-200 transition-all"
                    >
                      View Sensor Data
                    </Link>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
