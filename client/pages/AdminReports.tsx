import AdminLayout from "@/components/AdminLayout";

export default function AdminReports() {
  return (
    <AdminLayout title="Reports">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-headline font-bold text-on-surface">
            Reports
          </h1>
          <p className="text-sm text-on-surface-variant">
            View system reports generated from live data.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-5">
            <h2 className="font-semibold text-on-surface">Complaints Report</h2>
            <p className="text-sm text-on-surface-variant mt-1">
              Track complaint status and response timelines.
            </p>
          </div>
          <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-5">
            <h2 className="font-semibold text-on-surface">Field Activity Report</h2>
            <p className="text-sm text-on-surface-variant mt-1">
              Review field visits, outreach, and sampling outcomes.
            </p>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
