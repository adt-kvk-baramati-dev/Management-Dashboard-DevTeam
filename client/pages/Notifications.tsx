import AdminLayout from "@/components/AdminLayout";

export default function Notifications() {
  return (
    <AdminLayout title="notifications">
      <div className="max-w-3xl">
        <h1 className="text-2xl font-headline font-bold text-on-surface">
          Notifications
        </h1>
        <p className="text-on-surface-variant mt-2">
          This page is a placeholder for a full notifications inbox.
        </p>
      </div>
    </AdminLayout>
  );
}
