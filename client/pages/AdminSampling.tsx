import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import AdminLayout from "@/components/AdminLayout";
import { useAuth } from "@/lib/AuthProvider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface SamplingRecord {
  _id: string;
  employee_id: string;
  employee_name?: string;
  activity_type: "sampling";
  date?: string;
  location?: string;
  description?: string;
  map_images?: string[];
  map_image_count?: number;
  created_at?: string;
}

export default function AdminSampling() {
  const { token } = useAuth();
  const [samplingRecords, setSamplingRecords] = useState<SamplingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState<SamplingRecord | null>(null);

  useEffect(() => {
    const fetchSamplingData = async () => {
      if (!token) return;

      try {
        setLoading(true);
        const response = await fetch("/api/admin/sampling-data", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
          const data = await response.json();
          setSamplingRecords(data.sampling || []);
        }
      } catch (error) {
        console.error("Error fetching sampling data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSamplingData();
  }, [token]);

  return (
    <AdminLayout title="Random Sampling">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-headline font-bold text-on-surface">
            Random Sampling
          </h1>
          <p className="text-sm text-on-surface-variant">
            Review and track random sampling activities across all employees.
          </p>
        </div>

        <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-6">
          {loading ? (
            <div className="text-center py-8">
              <p className="text-on-surface-variant">Loading sampling data...</p>
            </div>
          ) : samplingRecords.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-on-surface-variant">No sampling records found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-outline-variant/30 text-left text-on-surface-variant">
                    <th className="py-3 pr-4">Employee</th>
                    <th className="py-3 pr-4">Date</th>
                    <th className="py-3 pr-4">Location</th>
                    <th className="py-3 pr-4">Description</th>
                    <th className="py-3 pr-4">Images</th>
                    <th className="py-3 pr-4">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {samplingRecords.map((record) => (
                    <tr key={record._id} className="border-b border-outline-variant/20 text-on-surface hover:bg-surface-container">
                      <td className="py-3 pr-4 font-medium">
                        {record.employee_name || "Unknown"}
                      </td>
                      <td className="py-3 pr-4">
                        {record.date ? new Date(record.date).toLocaleDateString() : "N/A"}
                      </td>
                      <td className="py-3 pr-4">
                        {record.location || "N/A"}
                      </td>
                      <td className="py-3 pr-4">
                        {record.description || "N/A"}
                      </td>
                      <td className="py-3 pr-4">
                        {record.map_image_count && record.map_image_count > 0 ? (
                          <div className="space-y-2">
                            <p className="text-xs text-on-surface-variant">
                              {record.map_image_count} image(s)
                            </p>
                            {record.map_images?.[0] ? (
                              <img
                                src={record.map_images[0]}
                                alt="Sampling preview"
                                className="h-12 w-12 rounded border border-outline-variant/30 object-cover bg-surface"
                                loading="lazy"
                              />
                            ) : null}
                          </div>
                        ) : (
                          <span className="text-on-surface-variant">No image available</span>
                        )}
                      </td>
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="bg-green-100 text-green-800">Completed</Badge>
                          <Button variant="ghost" size="sm" onClick={() => setSelectedRecord(record)}>View</Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      {selectedRecord && (
        <AnimatePresence>
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
                <h2 className="font-headline font-bold text-lg text-on-surface">Sampling Details</h2>
                <button onClick={() => setSelectedRecord(null)} className="p-2 -mr-2 text-on-surface-variant hover:bg-surface-container rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex flex-col flex-1 h-full overflow-hidden">
                <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-6">
                  {/* Info Box */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 rounded-xl border border-outline-variant/30 bg-surface-container-low p-4">
                    <div>
                      <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Employee</p>
                      <p className="text-sm font-medium text-on-surface">{selectedRecord.employee_name || '-'}</p>
                      <p className="text-xs text-on-surface-variant">{selectedRecord.employee_id || ''}</p>
                    </div>
                    <div>
                      <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Date</p>
                      <p className="text-sm font-medium text-on-surface">{selectedRecord.date ? new Date(selectedRecord.date).toLocaleDateString() : '-'}</p>
                      <p className="text-xs text-on-surface-variant">{selectedRecord.location || '-'}</p>
                    </div>
                    <div>
                      <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Description</p>
                      <p className="text-sm font-medium text-on-surface">{selectedRecord.description ?? '-'}</p>
                    </div>
                  </div>

                  {/* Detailed Data Section */}
                  <div>
                    <h3 className="mb-4 font-semibold text-on-surface">Additional Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                      {Object.entries(selectedRecord)
                        .filter(([key, v]) =>
                          !["_id", "employee_id", "employee_name", "date", "location", "description", "map_images", "map_image_count", "created_at", "activity_type"].includes(key) &&
                          v !== undefined && v !== null && v !== ""
                        )
                        .map(([key, value]) => {
                          const formattedKey = key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
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
                  {selectedRecord.map_images && selectedRecord.map_images.length > 0 && (
                    <div>
                      <h3 className="mb-3 font-semibold text-on-surface">Attached Photos</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {selectedRecord.map_images.map((img, idx) => (
                          <img key={idx} src={img} alt={`map-${idx}`} className="h-48 w-full object-cover rounded-xl border border-outline-variant/30 bg-surface" />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                {/* Footer */}
                <div className="border-t border-outline-variant/30 flex justify-end p-4 bg-surface-container/30">
                  <button
                    onClick={() => setSelectedRecord(null)}
                    className="rounded-xl bg-primary px-5 py-2 text-sm font-medium text-on-primary transition-colors hover:bg-primary/90"
                  >
                    Close Details
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </AnimatePresence>
      )}
    </AdminLayout>
  );
}
