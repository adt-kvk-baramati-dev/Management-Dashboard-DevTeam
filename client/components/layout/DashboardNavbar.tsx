import { useMemo, useState } from "react";
import { Bell, Menu, Search, User, Settings, LogOut, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthProvider";
import type { MenuRole } from "@/lib/menuConfig";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

type DashboardNavbarProps = {
  title?: string;
  role: MenuRole;
  onToggleSidebar: () => void;
};

type AppNotification = {
  id: string;
  title: string;
  description: string;
  time: string;
  read: boolean;
  href?: string;
};

const NOTIFICATIONS_STORAGE_KEY = "kvk_notifications_v2";

function initials(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return "U";
  const parts = trimmed.split(/\s+/).filter(Boolean);
  return (parts[0][0] ?? "U").toUpperCase();
}

export default function DashboardNavbar({ title = "dashboard", role, onToggleSidebar }: DashboardNavbarProps) {
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();

  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    try {
      const raw = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as AppNotification[];
        if (Array.isArray(parsed)) return parsed;
      }
    } catch { /* no-op */ }
    return [
      { id: "sync",     title: "Daily sync complete",  description: "Dashboard data was refreshed successfully.", time: "10m ago", read: false },
      { id: "workflow", title: "Workflow reminder",     description: "Review pending items before end of day.",    time: "1h ago",  read: false },
    ];
  });

  const displayName  = profile?.name ?? "User";
  const displayRole  = profile?.role === "admin" ? "Admin" : "Employee";
  const avatarText   = useMemo(() => initials(displayName), [displayName]);
  const avatarSrc    = useMemo(() => {
    if (!profile?.profile_photo) return undefined;
    const v = profile.profile_photo_updated_at ? new Date(profile.profile_photo_updated_at).getTime() : 0;
    if (!v || Number.isNaN(v)) return profile.profile_photo;
    return `${profile.profile_photo}${profile.profile_photo.includes("?") ? "&" : "?"}v=${v}`;
  }, [profile?.profile_photo, profile?.profile_photo_updated_at]);

  const unreadCount = notifications.reduce((n, i) => n + (i.read ? 0 : 1), 0);

  const markAllRead = () => {
    const next = notifications.map((i) => ({ ...i, read: true }));
    setNotifications(next);
    try { localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(next)); } catch { /* no-op */ }
  };

  const isAdminUser = (profile?.role ?? role) === "admin";

  const handleLogout = () => {
    void signOut();
    navigate("/login", { replace: true });
  };

  return (
    <header className="sticky top-0 z-20 h-14 border-b border-border/50 bg-white/80 backdrop-blur-xl shadow-[0_1px_0_0_hsl(var(--border)/0.5),0_4px_16px_-8px_rgba(0,0,0,0.08)]">
      <div className="flex h-full items-center justify-between gap-4 px-4 md:px-6">

        {/* Left */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onToggleSidebar}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground transition-all hover:bg-primary/8 hover:text-primary"
            aria-label="Toggle sidebar"
          >
            <Menu className="h-[18px] w-[18px]" />
          </button>

          <div className="relative hidden w-60 lg:block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/50" />
            <input
              type="text"
              placeholder={`Search ${title.toLowerCase()}...`}
              className="h-9 w-full rounded-xl border border-border/60 bg-muted/40 pl-8.5 pr-3 text-sm text-foreground placeholder:text-muted-foreground/60 transition-all focus:border-primary/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/12"
            />
          </div>
        </div>

        {/* Right */}
        <div className="flex items-center gap-1.5">

          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="relative h-9 w-9 rounded-xl text-muted-foreground hover:bg-primary/8 hover:text-primary"
                aria-label="Notifications"
              >
                <Bell className="h-[18px] w-[18px]" />
                {unreadCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white">
                    {unreadCount}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 rounded-2xl border border-border/60 bg-white p-2 shadow-xl shadow-black/8">
              <DropdownMenuLabel className="px-2 py-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-foreground">Notifications</span>
                  <button
                    type="button"
                    onClick={markAllRead}
                    className="text-xs font-medium text-primary hover:underline disabled:opacity-40"
                    disabled={unreadCount === 0}
                  >
                    Mark all read
                  </button>
                </div>
              </DropdownMenuLabel>
              <Separator className="my-1.5" />
              <div className="custom-scrollbar max-h-64 space-y-0.5 overflow-y-auto">
                {notifications.map((item) => (
                  <DropdownMenuItem
                    key={item.id}
                    className="cursor-pointer items-start gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-primary/5"
                    onSelect={(e) => {
                      e.preventDefault();
                      setNotifications((prev) => prev.map((n) => n.id === item.id ? { ...n, read: true } : n));
                      if (item.href) navigate(item.href);
                    }}
                  >
                    <div className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${item.read ? "bg-transparent" : "bg-primary"}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold leading-tight text-foreground">{item.title}</p>
                        <span className="shrink-0 text-[11px] text-muted-foreground">{item.time}</span>
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">{item.description}</p>
                    </div>
                    {item.read && <Check className="mt-1 h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />}
                  </DropdownMenuItem>
                ))}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Profile */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-2 rounded-xl border border-border/60 bg-white px-2 py-1.5 shadow-sm transition-all hover:border-primary/30 hover:bg-primary/4 hover:shadow-md"
                aria-label="Profile menu"
              >
                <Avatar className="h-7 w-7 ring-2 ring-primary/20">
                  <AvatarImage src={avatarSrc} alt={displayName} />
                  <AvatarFallback className="bg-primary/15 text-xs font-bold text-primary">{avatarText}</AvatarFallback>
                </Avatar>
                <span className="hidden text-left md:block">
                  <span className="block text-[13px] font-semibold leading-tight text-foreground">{displayName}</span>
                  <span className="block text-[11px] font-medium text-muted-foreground">{displayRole}</span>
                </span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 rounded-2xl border border-border/60 bg-white p-2 shadow-xl shadow-black/8">
              <DropdownMenuItem className="cursor-pointer rounded-xl px-3 py-2 text-sm" onSelect={(e) => { e.preventDefault(); navigate("/profile"); }}>
                <User className="mr-2.5 h-4 w-4 text-muted-foreground" /> View Profile
              </DropdownMenuItem>
              {isAdminUser && (
                <DropdownMenuItem className="cursor-pointer rounded-xl px-3 py-2 text-sm" onSelect={(e) => { e.preventDefault(); navigate("/admin/settings"); }}>
                  <Settings className="mr-2.5 h-4 w-4 text-muted-foreground" /> Settings
                </DropdownMenuItem>
              )}
              <Separator className="my-1.5" />
              <DropdownMenuItem
                className="cursor-pointer rounded-xl px-3 py-2 text-sm text-destructive focus:text-destructive"
                onSelect={(e) => { e.preventDefault(); handleLogout(); }}
              >
                <LogOut className="mr-2.5 h-4 w-4" /> Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
