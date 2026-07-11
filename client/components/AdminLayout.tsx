import DashboardLayout from "@/components/layout/DashboardLayout";

type AdminLayoutProps = {
  children: React.ReactNode;
  title?: string;
};

export default function AdminLayout({ children, title = "dashboard" }: AdminLayoutProps) {
  return <DashboardLayout title={title}>{children}</DashboardLayout>;
}
