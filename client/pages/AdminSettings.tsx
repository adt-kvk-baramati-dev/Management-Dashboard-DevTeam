import AdminLayout from "@/components/AdminLayout";

export default function AdminSettings() {
  return (
    <AdminLayout title="Settings">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-headline font-bold text-on-surface">
            Settings
          </h1>
          <p className="text-sm text-on-surface-variant">
            Manage administrative preferences and controls.
          </p>
        </div>

        <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-on-surface font-medium">Email Notifications</span>
            <span className="text-sm text-on-surface-variant">Configured</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-on-surface font-medium">Role Permissions</span>
            <span className="text-sm text-on-surface-variant">Managed</span>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
