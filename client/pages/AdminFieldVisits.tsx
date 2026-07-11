import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import AdminLayout from "@/components/AdminLayout";
import { useAuth } from "@/lib/AuthProvider";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, MapPin, Camera, Download, X, Users, Calendar, Eye } from "lucide-react";

interface FieldVisit {
  id: string;
  employee_id?: string;
  employee_name?: string;
  prn?: string;
  farmer_name?: string;
  visit_date?: string;
  district?: string;
  taluka?: string;
  village?: string;
  health?: string;
  disease_image?: string;
  geo_tag_image?: string;
  observations?: string;
  remark?: string;
  created_at?: string;
}

export default function AdminFieldVisits() {
  const { token } = useAuth();
  const [visits, setVisits] = useState<FieldVisit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [selectedVisit, setSelectedVisit] = useState<FieldVisit | null>(null);

  useEffect(() => {
    if (selectedVisit) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }

    return () => {
      document.body.style.overflow = "auto";
    };
  }, [selectedVisit]);

  useEffect(() => {
    if (!token) return;
    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/field-visits", { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        if (!res.ok) {
          if (mounted) setError(data.message || "Failed to load field visits");
          return;
        }
        if (mounted) {
          setVisits(data.field_visits || []);
          setError(null);
        }
      } catch (err: any) {
        if (mounted) setError(err?.message || "Failed to load field visits");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [token]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return visits.filter((v) => {
      const matchSearch =
        !q ||
        v.employee_name?.toLowerCase().includes(q) ||
        v.prn?.toLowerCase().includes(q) ||
        v.farmer_name?.toLowerCase().includes(q) ||
        v.village?.toLowerCase().includes(q) ||
        v.taluka?.toLowerCase().includes(q) ||
        v.district?.toLowerCase().includes(q) ||
        (v.visit_date ? new Date(v.visit_date).toLocaleDateString().toLowerCase().includes(q) : false);

      const matchDate = !dateFilter || (v.visit_date && v.visit_date.startsWith(dateFilter));
      return matchSearch && matchDate;
    });
  }, [visits, search, dateFilter]);

  const stats = useMemo(() => ({
    total: visits.length,
    withImages: visits.filter((v) => v.disease_image || v.geo_tag_image).length,
    uniqueLocations: new Set(visits.map((v) => (v.village || v.taluka || v.district)).filter(Boolean)).size,
  }), [visits]);

  const isImageField = (key: string) =>
    key.toLowerCase().includes("image") || key.toLowerCase().includes("photo");

  function exportCSV(rows: FieldVisit[]) {
    // reuse small CSV exporter similar to other pages
    if (!rows.length) return;
    const csvRows = rows.map((r) => ({
      id: r.id,
      employee: r.employee_name,
      prn: r.prn,
      farmer_name: r.farmer_name,
      visit_date: r.visit_date,
      district: r.district,
      taluka: r.taluka,
      village: r.village,
      health: r.health,
      observations: r.observations,
      remark: r.remark,
    }));
    const ws = (window as any).XLSX?.utils?.json_to_sheet ? (window as any).XLSX.utils.json_to_sheet(csvRows) : null;
    if (ws && (window as any).XLSX?.utils?.sheet_to_csv) {
      const csv = (window as any).XLSX.utils.sheet_to_csv(ws);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `FieldVisits_${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else {
      // fallback: simple CSV construction
      const keys = Object.keys(csvRows[0]);
      const lines = [keys.join(",")].concat(csvRows.map(r => keys.map(k => `"${String((r as any)[k] ?? "").replace(/"/g, '""')}"`).join(",")));
      const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `FieldVisits_${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  }

  return (
    <AdminLayout title="Field Visits">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-headline font-bold text-on-surface">Field Visits</h1>
          <p className="text-sm text-on-surface-variant">Review and export field visit reports from field staff.</p>
        </div>

        {error && (
          <Alert className="border border-destructive/30 bg-destructive/10">
            <AlertDescription className="text-destructive">{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-sm">Total Visits</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stats.total}</p>
            </CardContent>
          </Card>
         
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-sm">Unique Locations</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stats.uniqueLocations}</p>
            </CardContent>
          </Card>
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-sm">Recent</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{visits.slice(0,3).length}</p>
              <p className="text-xs text-on-surface-variant mt-1">Last 3 records</p>
            </CardContent>
          </Card>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant/60" />
            <input className="w-full pl-10 pr-4 py-2 rounded-xl bg-surface-container-low border border-outline-variant/30 text-sm" placeholder="Search by employee, PRN, farmer, village, taluka, district or date" value={search} onChange={(e)=>setSearch(e.target.value)} />
          </div>
          <Input type="date" value={dateFilter} onChange={(e)=>setDateFilter(e.target.value)} className="max-w-[200px]" />
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => { setSearch(""); setDateFilter(""); }}>
              Clear
            </Button>
            <Button variant="outline" size="sm" onClick={() => exportCSV(filtered)}>
              <Download className="w-4 h-4" /> Export
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto border rounded-xl">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-outline-variant/30 bg-muted/30">
                <th className="py-3 px-4 text-left font-semibold">Employee</th>
                <th className="py-3 px-4 text-left font-semibold">PRN / Farmer</th>
                <th className="py-3 px-4 text-left font-semibold">Visit Date</th>
                <th className="py-3 px-4 text-left font-semibold">Location</th>
                <th className="py-3 px-4 text-left font-semibold">Health</th>
                <th className="py-3 px-4 text-left font-semibold">Observations</th>
                <th className="py-3 px-4 text-left font-semibold">Photos</th>
                <th className="py-3 px-4 text-left font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="py-12 text-center">Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="py-12 text-center">No field visits found</td></tr>
              ) : (
                filtered.map((v) => (
                  <tr key={v.id} className="border-b border-outline-variant/20 hover:bg-primary/5">
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium">{v.employee_name || "-"}</p>
                        <p className="text-xs text-on-surface-variant">{v.employee_id || ""}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium">{v.prn || "-"}</p>
                        <p className="text-xs text-on-surface-variant">{v.farmer_name || "-"}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">{v.visit_date ? new Date(v.visit_date).toLocaleDateString() : "-"}</td>
                    <td className="py-3 px-4">
                      <div className="text-sm">
                        <div>{[v.village, v.taluka, v.district].filter(Boolean).join(", ")}</div>
                      </div>
                    </td>
                    <td className="py-3 px-4">{v.health || "-"}</td>
                    <td className="py-3 px-4 max-w-xl text-xs">{v.observations ? v.observations : v.remark ?? "-"}</td>
                    <td className="py-3 px-4">
                      {(v.disease_image || v.geo_tag_image) ? (
                        <div className="flex items-center gap-2">
                          <Badge>{v.disease_image ? "Disease" : "Geo"}</Badge>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => window.open(v.disease_image || v.geo_tag_image, "_blank")}>
                            <Camera className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-on-surface-variant">No photos</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {/* Professional view button matching site theme */}
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => setSelectedVisit(v)}
                        className="flex items-center gap-1"
                      >
                        <Eye className="w-4 h-4" />
                        View
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Details Modal for Field Visit */}
      <AnimatePresence>
        {selectedVisit && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-surface-container-lowest rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-outline-variant/30 bg-surface-container/40 flex justify-between items-center">
                <h2 className="font-headline font-bold text-lg text-on-surface">Field Visit Details</h2>
                <button onClick={() => setSelectedVisit(null)} className="p-2 -mr-2 text-on-surface-variant hover:bg-surface-container rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex flex-col flex-1 h-full overflow-hidden">
                <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-6">
                  {/* Info Box */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 rounded-xl border border-outline-variant/30 bg-surface-container-low p-4">
                    <div>
                      <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Employee</p>
                      <p className="text-sm font-medium text-on-surface">{selectedVisit.employee_name || '-'}</p>
                      <p className="text-xs text-on-surface-variant">{selectedVisit.employee_id || ''}</p>
                    </div>
                    <div>
                      <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Visit Date</p>
                      <p className="text-sm font-medium text-on-surface">{selectedVisit.visit_date ? new Date(selectedVisit.visit_date).toLocaleDateString() : '-'}</p>
                      <p className="text-xs text-on-surface-variant">{[selectedVisit.village, selectedVisit.taluka, selectedVisit.district].filter(Boolean).join(', ')}</p>
                    </div>
                    <div>
                      <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Health Status</p>
                      <p className="text-sm font-medium text-on-surface">{selectedVisit.health || '-'}</p>
                    </div>
                    <div>
                      <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-on-surface-variant">PRN / Farmer</p>
                      <p className="text-sm font-medium text-on-surface">{selectedVisit.prn} - {selectedVisit.farmer_name || '-'}</p>
                    </div>
                  </div>

                  {/* Detailed Data Section */}
                  <div>
                    <h3 className="mb-4 font-semibold text-on-surface">Visit Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                      {Object.entries(selectedVisit).filter(([key, v]) => 
                        !["id", "employee_id", "employee_name", "prn", "farmer_name", "visit_date", "district", "taluka", "village", "health", "disease_image", "geo_tag_image"].includes(key) && 
                        v !== undefined && v !== null && v !== ""
                      ).map(([key, value]) => {
                        const formattedKey = key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
                        return (
                          <div key={key} className="flex flex-col">
                            <p className="text-xs text-on-surface-variant uppercase">{formattedKey}</p>
                            <p className="text-sm text-on-surface break-all">{String(value)}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Images Section */}
                  {Object.entries(selectedVisit).some(([key, value]) => isImageField(key) && typeof value === "string" && value.trim().length > 0) && (
                    <div>
                      <h3 className="mb-3 font-semibold text-on-surface">Attached Photos</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {Object.entries(selectedVisit)
                          .filter(([key, value]) => isImageField(key) && typeof value === "string" && value.trim().length > 0)
                          .map(([key, value]) => {
                            const formattedKey = key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
                            return (
                              <div key={key} className="space-y-2">
                                <p className="text-xs text-on-surface-variant uppercase">{formattedKey}</p>
                                <img
                                  src={value}
                                  alt={formattedKey}
                                  className="h-48 w-full object-cover rounded-xl border border-outline-variant/30 bg-surface"
                                  loading="lazy"
                                />
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="border-t border-outline-variant/30 flex justify-end p-4 bg-surface-container/30">
                  <button
                    onClick={() => setSelectedVisit(null)}
                    className="rounded-xl bg-primary px-5 py-2 text-sm font-medium text-on-primary transition-colors hover:bg-primary/90"
                  >
                    Close Details
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AdminLayout>
  );
}
