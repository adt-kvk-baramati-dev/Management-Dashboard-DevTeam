import { useEffect, useMemo, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { useAuth } from "@/lib/AuthProvider";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Calendar, Users, MapPin, Camera, Search, Filter, Download, Eye, X } from "lucide-react";

interface OutreachRecord {
  id: string;
  employee_id: string;
  employee_name: string;
  section_type: "conducted" | "attended";
  location: string;
  date: string;
  duration?: number;
  photos?: string[];
  collaborator?: string;
  agronomist_specialist?: string;
  no_of_people?: number;
  instructor?: string;
  invited_employee_ids?: string[];
  invited_employee_names?: string[];
  district?: string;
  village?: string;
  created_at?: string;
}

interface EmployeeAggregatedRow {
  id: string;
  name: string;
  conducted: number;
  attended: number;
  participants: number;
}

export default function AdminOutreach() {
  const { token } = useAuth();
  const [records, setRecords] = useState<OutreachRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"all" | "conducted" | "attended">("all");

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [employeeFilter, setEmployeeFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [photoViewer, setPhotoViewer] = useState<{ title: string; photos: string[] } | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<OutreachRecord | null>(null);

  useEffect(() => {
    if (!token) return;
    let isMounted = true;

    const loadRecords = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/outreach", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          if (isMounted) setError("Failed to load outreach records");
          return;
        }

        const data = await res.json();
        if (isMounted) {
          setRecords(data.outreach || []);
          setError(null);
        }
      } catch (err: any) {
        if (isMounted) setError(err?.message || "Failed to load records");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadRecords();
    return () => { isMounted = false; };
  }, [token]);

  // Derived tabs distributions
  const conductedRecords = useMemo(() => records.filter((r) => r.section_type === "conducted"), [records]);
  const attendedRecords = useMemo(() => records.filter((r) => r.section_type === "attended"), [records]);

  const displayRecords = useMemo(() => {
    if (activeTab === "conducted") return conductedRecords;
    if (activeTab === "attended") return attendedRecords;
    return records;
  }, [activeTab, conductedRecords, attendedRecords, records]);

  // Filter records dynamically based on conditions
  const filteredRecords = useMemo(() => {
    const cleanSearch = searchTerm.trim().toLowerCase();
    const cleanLocation = locationFilter.trim().toLowerCase();
    const cleanEmployee = employeeFilter.trim().toLowerCase();

    return displayRecords.filter((record) => {
      const matchesSearch =
        !cleanSearch ||
        record.employee_name?.toLowerCase().includes(cleanSearch) ||
        record.location?.toLowerCase().includes(cleanSearch) ||
        record.district?.toLowerCase().includes(cleanSearch) ||
        record.village?.toLowerCase().includes(cleanSearch);

      const matchesDate = !dateFilter || record.date === dateFilter;
      const matchesLocation = !cleanLocation || record.location?.toLowerCase().includes(cleanLocation);
      const matchesEmployee = !cleanEmployee || record.employee_name?.toLowerCase().includes(cleanEmployee);

      return matchesSearch && matchesDate && matchesLocation && matchesEmployee;
    });
  }, [displayRecords, searchTerm, dateFilter, locationFilter, employeeFilter]);

  // Global Key stats calculations
  const stats = useMemo(() => {
    return {
      total: records.length,
      conducted: conductedRecords.length,
      attended: attendedRecords.length,
      totalPeople: conductedRecords.reduce((sum, r) => sum + (r.no_of_people || 0), 0),
      totalPhotos: records.reduce((sum, r) => sum + (r.photos?.length || 0), 0),
      uniqueLocations: new Set(records.map((r) => r.location).filter(Boolean)).size,
      uniqueEmployees: new Set(records.map((r) => r.employee_id).filter(Boolean)).size,
    };
  }, [records, conductedRecords, attendedRecords]);

  // Group employee data for bottom view summary card safely
  const employeeSummaryList = useMemo(() => {
    const map = new Map<string, EmployeeAggregatedRow>();
    
    records.forEach((r) => {
      if (!r.employee_id) return;
      
      const current = map.get(r.employee_id) || {
        id: r.employee_id,
        name: r.employee_name || "Unknown Staff",
        conducted: 0,
        attended: 0,
        participants: 0,
      };

      if (r.section_type === "conducted") {
        current.conducted += 1;
        current.participants += r.no_of_people || 0;
      } else if (r.section_type === "attended") {
        current.attended += 1;
      }

      map.set(r.employee_id, current);
    });

    return Array.from(map.values());
  }, [records]);

  return (
    <AdminLayout title="Outreach Sessions">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-headline font-bold text-on-surface">
            Outreach Sessions
          </h1>
          <p className="text-sm text-on-surface-variant">
            Monitor outreach activities across field teams.
          </p>
        </div>

        {error && (
          <Alert className="border border-destructive/30 bg-destructive/10">
            <AlertDescription className="text-destructive">{error}</AlertDescription>
          </Alert>
        )}

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="rounded-2xl bg-surface-container-lowest border border-outline-variant/30 hover:bg-primary/5 transition-colors">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-on-surface-variant uppercase">
                  Total Sessions
                </CardTitle>
                <Calendar className="w-5 h-5 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-on-surface">{stats.total}</p>
              <p className="text-xs text-on-surface-variant mt-1">All outreach activities</p>
            </CardContent>
          </Card>

          <Card className="rounded-2xl bg-surface-container-lowest border border-outline-variant/30 hover:bg-primary/5 transition-colors">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-on-surface-variant uppercase">
                  Programs Conducted
                </CardTitle>
                <Users className="w-5 h-5 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-on-surface">{stats.conducted}</p>
              <p className="text-xs text-on-surface-variant mt-1">Active sessions led</p>
            </CardContent>
          </Card>

          <Card className="rounded-2xl bg-surface-container-lowest border border-outline-variant/30 hover:bg-primary/5 transition-colors">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-on-surface-variant uppercase">
                  Total Participants
                </CardTitle>
                <Users className="w-5 h-5 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-on-surface">{stats.totalPeople.toLocaleString()}</p>
              <p className="text-xs text-on-surface-variant mt-1">People reached</p>
            </CardContent>
          </Card>

          <Card className="rounded-2xl bg-surface-container-lowest border border-outline-variant/30 hover:bg-primary/5 transition-colors">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-on-surface-variant uppercase">
                  Photos Uploaded
                </CardTitle>
                <Camera className="w-5 h-5 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-on-surface">{stats.totalPhotos}</p>
              <p className="text-xs text-on-surface-variant mt-1">Documentation</p>
            </CardContent>
          </Card>
        </div>

        {/* Additional Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="rounded-2xl bg-surface-container-lowest border border-outline-variant/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-on-surface-variant uppercase">
                Unique Locations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-on-surface">{stats.uniqueLocations}</p>
              <p className="text-xs text-on-surface-variant mt-1">Areas covered</p>
            </CardContent>
          </Card>

          <Card className="rounded-2xl bg-surface-container-lowest border border-outline-variant/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-on-surface-variant uppercase">
                Active Employees
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-on-surface">{stats.uniqueEmployees}</p>
              <p className="text-xs text-on-surface-variant mt-1">Field staff engaged</p>
            </CardContent>
          </Card>

          <Card className="rounded-2xl bg-surface-container-lowest border border-outline-variant/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-on-surface-variant uppercase">
                Programs Attended
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-on-surface">{stats.attended}</p>
              <p className="text-xs text-on-surface-variant mt-1">Learning sessions</p>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card className="bg-surface-container-lowest border border-outline-variant/30">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold text-on-surface">
                Outreach Records
              </CardTitle>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-2"
                >
                  <Filter className="w-4 h-4" />
                  Filters
                </Button>
                <Button variant="outline" size="sm" className="flex items-center gap-2">
                  <Download className="w-4 h-4" />
                  Export
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-on-surface-variant/60 w-4 h-4" />
              <Input
                placeholder="Search by employee, location, district, or village..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Advanced Filters */}
            {showFilters && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-surface-container-low border border-outline-variant/30 rounded-2xl">
                <div>
                  <label className="text-sm font-medium text-on-surface-variant mb-1 block">Date</label>
                  <Input
                    type="date"
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-on-surface-variant mb-1 block">Location</label>
                  <Input
                    placeholder="Filter by location"
                    value={locationFilter}
                    onChange={(e) => setLocationFilter(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-on-surface-variant mb-1 block">Employee</label>
                  <Input
                    placeholder="Filter by employee"
                    value={employeeFilter}
                    onChange={(e) => setEmployeeFilter(e.target.value)}
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchTerm("");
                      setDateFilter("");
                      setLocationFilter("");
                      setEmployeeFilter("");
                    }}
                    className="w-full"
                  >
                    Clear Filters
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Records Table */}
        <Card className="bg-surface-container-lowest border border-outline-variant/30">
          <CardContent className="p-6">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
              <TabsList className="mb-6">
                <TabsTrigger value="all" className="flex items-center gap-2">
                  All Records ({filteredRecords.length})
                </TabsTrigger>
                <TabsTrigger value="conducted" className="flex items-center gap-2">
                  Conducted ({conductedRecords.filter(r => filteredRecords.some(fr => fr.id === r.id)).length})
                </TabsTrigger>
                <TabsTrigger value="attended" className="flex items-center gap-2">
                  Attended ({attendedRecords.filter(r => filteredRecords.some(fr => fr.id === r.id)).length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value={activeTab} className="space-y-4 m-0">
                {loading ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-on-surface-variant">Loading outreach records...</p>
                  </div>
                ) : filteredRecords.length === 0 ? (
                  <div className="text-center py-12">
                    <MapPin className="w-12 h-12 text-on-surface-variant/60 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-on-surface mb-2">No records found</h3>
                    <p className="text-on-surface-variant">
                      {searchTerm || dateFilter || locationFilter || employeeFilter
                        ? "Try adjusting your search or filter criteria."
                        : "No outreach records found in this category."}
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto border rounded-xl">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="border-b-2 border-outline-variant/30 bg-muted/30">
                          <th className="py-4 px-4 text-left font-semibold text-on-surface">Employee</th>
                          <th className="py-4 px-4 text-left font-semibold text-on-surface">Type</th>
                          <th className="py-4 px-4 text-left font-semibold text-on-surface">Location</th>
                          <th className="py-4 px-4 text-left font-semibold text-on-surface">Date</th>
                          <th className="py-4 px-4 text-left font-semibold text-on-surface">Details</th>
                          <th className="py-4 px-4 text-left font-semibold text-on-surface">Photos</th>
                          <th className="py-4 px-4 text-left font-semibold text-on-surface">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredRecords.map((record) => (
                          <tr
                            key={record.id}
                            className="border-b border-outline-variant/20 hover:bg-primary/5 transition-colors"
                          >
                            <td className="py-4 px-4">
                              <div>
                                <p className="font-medium text-on-surface">{record.employee_name || "Unknown"}</p>
                                <p className="text-xs text-on-surface-variant">{record.employee_id}</p>
                              </div>
                            </td>
                            <td className="py-4 px-4">
                              <Badge
                                variant={record.section_type === "conducted" ? "default" : "secondary"}
                                className="capitalize"
                              >
                                {record.section_type}
                              </Badge>
                            </td>
                            <td className="py-4 px-4">
                              <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-on-surface-variant/60 shrink-0" />
                                <div>
                                  <p className="text-on-surface">{record.location}</p>
                                  {record.village && (
                                    <p className="text-xs text-on-surface-variant">{record.village}</p>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="py-4 px-4 text-on-surface whitespace-nowrap">
                              {record.date ? new Date(record.date).toLocaleDateString() : "-"}
                            </td>
                            <td className="py-4 px-4">
                              <div className="text-xs space-y-1 max-w-xs">
                                {record.section_type === "conducted" ? (
                                  <>
                                    <div className="flex items-center gap-1">
                                      <Users className="w-3 h-3 text-on-surface-variant/60" />
                                      <span className="text-on-surface-variant">Collaborator: </span>
                                      <span className="font-medium text-on-surface">
                                        {record.collaborator || record.agronomist_specialist || "-"}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <Users className="w-3 h-3 text-on-surface-variant/60" />
                                      <span className="text-on-surface-variant">People: </span>
                                      <span className="font-medium text-on-surface">
                                        {record.no_of_people || "-"}
                                      </span>
                                    </div>
                                  </>
                                ) : (
                                  <div className="flex items-center gap-1">
                                    <Users className="w-3 h-3 text-on-surface-variant/60" />
                                    <span className="text-on-surface-variant">Instructor: </span>
                                    <span className="font-medium text-on-surface">
                                      {record.instructor || "-"}
                                    </span>
                                  </div>
                                )}
                                {record.duration && (
                                  <div className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3 text-on-surface-variant/60" />
                                    <span className="text-on-surface-variant">Duration: </span>
                                    <span className="font-medium text-on-surface">{record.duration}h</span>
                                  </div>
                                )}
                                {record.invited_employee_names && record.invited_employee_names.length > 0 && (
                                  <div className="text-[11px] leading-tight text-on-surface-variant">
                                    <span>Invited: </span>
                                    <span className="font-medium text-on-surface">
                                      {record.invited_employee_names.join(", ")}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="py-4 px-4 whitespace-nowrap">
                              {record.photos && record.photos.length > 0 ? (
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="flex items-center gap-1">
                                    <Camera className="w-3 h-3" />
                                    {record.photos.length}
                                  </Badge>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                    onClick={() =>
                                      setPhotoViewer({
                                        title: `${record.employee_name || "Unknown"} - ${record.location}`,
                                        photos: record.photos || [],
                                      })
                                    }
                                  >
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                </div>
                              ) : (
                                <span className="text-xs text-on-surface-variant/70">No image available</span>
                              )}
                            </td>
                            <td className="py-4 px-4 whitespace-nowrap">
                              <Button variant="ghost" size="sm" onClick={() => setSelectedRecord(record)}>
                                View Details
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Employee Summary Card */}
        {records.length > 0 && (
          <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-on-surface mb-4">Employee Summary</h2>
            <div className="overflow-x-auto border rounded-xl">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-outline-variant/30 text-left bg-muted/20 text-on-surface-variant">
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4">Conducted</th>
                    <th className="py-3 px-4">Attended</th>
                    <th className="py-3 px-4">Total</th>
                    <th className="py-3 px-4">Participants</th>
                  </tr>
                </thead>
                <tbody>
                  {employeeSummaryList.map((emp) => (
                    <tr
                      key={emp.id}
                      className="border-b border-outline-variant/20 hover:bg-primary/5 text-on-surface"
                    >
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium">{emp.name}</p>
                          <p className="text-xs text-on-surface-variant">{emp.id}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-medium">{emp.conducted}</td>
                      <td className="py-3 px-4 font-medium">{emp.attended}</td>
                      <td className="py-3 px-4 font-medium text-primary">
                        {emp.conducted + emp.attended}
                      </td>
                      <td className="py-3 px-4 font-medium">{emp.participants.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Photo Viewer Modal overlay */}
        {photoViewer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in-30">
            <div className="w-full max-w-4xl rounded-2xl border border-outline-variant/30 bg-surface-container-lowest shadow-xl flex flex-col max-h-[85vh]">
              <div className="flex items-center justify-between border-b border-outline-variant/30 px-4 py-3">
                <p className="text-sm font-semibold text-on-surface">{photoViewer.title}</p>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setPhotoViewer(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="overflow-y-auto p-4 flex-1">
                {photoViewer.photos.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {photoViewer.photos.map((photo, index) => (
                      <img
                        key={`${photo}-${index}`}
                        src={photo}
                        alt={`Outreach image ${index + 1}`}
                        className="h-52 w-full rounded-lg border border-outline-variant/30 object-cover bg-surface"
                        loading="lazy"
                        onError={(e) => {
                          // Standard fallback broken image path icon visual handler
                          (e.target as HTMLImageElement).src = "https://placehold.co/400x300?text=Image+Not+Found";
                        }}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="rounded-lg border border-outline-variant/30 bg-surface p-3 text-sm text-on-surface-variant">
                    No image available.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Details Modal */}
        {selectedRecord && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-surface-container-lowest rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-outline-variant/30 bg-surface-container/40 flex justify-between items-center">
                <h2 className="font-headline font-bold text-lg text-on-surface">Outreach Details</h2>
                <button onClick={() => setSelectedRecord(null)} className="p-2 -mr-2 text-on-surface-variant hover:bg-surface-container rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-on-surface-variant uppercase">Employee</p>
                    <p className="font-medium">{selectedRecord.employee_name}</p>
                    <p className="text-xs text-on-surface-variant">{selectedRecord.employee_id}</p>
                  </div>
                  <div>
                    <p className="text-xs text-on-surface-variant uppercase">Date</p>
                    <p className="font-medium">{selectedRecord.date ? new Date(selectedRecord.date).toLocaleDateString() : '-'}</p>
                    <p className="text-xs text-on-surface-variant">{selectedRecord.location}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-xs text-on-surface-variant uppercase">Details</p>
                  <div className="text-sm text-on-surface">
                    {selectedRecord.section_type === 'conducted' ? (
                      <>
                        <div>Collaborator: {selectedRecord.collaborator || selectedRecord.agronomist_specialist || '-'}</div>
                        <div>People: {selectedRecord.no_of_people ?? '-'}</div>
                      </>
                    ) : (
                      <div>Instructor: {selectedRecord.instructor || '-'}</div>
                    )}
                  </div>
                </div>

                {selectedRecord.photos && selectedRecord.photos.length > 0 && (
                  <div>
                    <p className="text-xs text-on-surface-variant uppercase mb-2">Photos</p>
                    <div className="grid grid-cols-2 gap-3">
                      {selectedRecord.photos.map((p, i) => (
                        <img key={i} src={p} alt={`photo-${i}`} className="h-36 w-full object-cover rounded-lg border" />
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <p className="text-xs text-on-surface-variant uppercase">Remarks</p>
                  <p className="text-sm text-on-surface">{selectedRecord?.remark ?? selectedRecord?.observations ?? '-'}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}