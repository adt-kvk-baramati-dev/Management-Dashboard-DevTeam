import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";

export default function ProfileEdit() {
  return (
    <AdminLayout title="profile">
      <div className="max-w-3xl">
        <h1 className="text-2xl font-headline font-bold text-on-surface">
          Edit Profile
        </h1>
        <p className="text-on-surface-variant mt-2">
          This page is a placeholder. Wire it to your real profile form when
          ready.
        </p>

        <div className="mt-6 flex gap-3">
          <Button type="button" disabled>
            Save Changes
          </Button>
          <Button type="button" variant="outline" disabled>
            Cancel
          </Button>
        </div>
      </div>
    </AdminLayout>
  );
}
