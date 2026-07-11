# Optional Integration Guide

This guide shows how to integrate the new red alert system into existing components that weren't updated in the main refactor.

---

## 1. Sidebar Integration - Show Red Alert Badge

### Current Behavior
The sidebar currently shows static menu items without dynamic counts.

### Enhancement: Add Red Alert Badge

#### Option A: Static Implementation (Quick)
Update `client/components/layout/DashboardSidebar.tsx`:

```tsx
import { RedAlertBadge } from "@/components/RedAlertBadge";

// In the menu item rendering:
{
  path: "/admin/complaints",
  label: "Complaints",
  icon: FileText,
  group: "primary",
  // Add badge count (can be fetched or passed via context)
  badge: redAlertCount > 0 ? redAlertCount : null,
}

// Then render the badge:
{menuItem.badge && (
  <RedAlertBadge count={menuItem.badge} size="sm" showIcon={true} />
)}
```

#### Option B: Dynamic Implementation (Better)
Create a custom hook that fetches red alert count:

```typescript
// client/hooks/useRedAlertCount.ts
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthProvider";
import { getRedAlertComplaints } from "@/lib/complaintUtils";

export function useRedAlertCount() {
  const { token } = useAuth();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!token) return;

    const fetchCount = async () => {
      try {
        const res = await fetch("/api/complaints", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        const redAlertComplaints = getRedAlertComplaints(data.complaints || []);
        setCount(redAlertComplaints.length);
      } catch (error) {
        console.error("Failed to fetch red alert count:", error);
      }
    };

    fetchCount();
  }, [token]);

  return count;
}
```

Then use in sidebar:

```tsx
import { useRedAlertCount } from "@/hooks/useRedAlertCount";

export function DashboardSidebar() {
  const redAlertCount = useRedAlertCount();

  return (
    // ... sidebar JSX
    <NavItem
      path="/admin/complaints"
      label={
        <span className="flex items-center gap-2">
          Complaints
          {redAlertCount > 0 && (
            <RedAlertBadge count={redAlertCount} size="sm" />
          )}
        </span>
      }
      icon={FileText}
    />
  );
}
```

---

## 2. Admin Dashboard - Enhanced Metrics

### Current Chart
Status graph showing complaint distribution.

### Enhancement: Replace with SLA Metrics

#### Update AdminDashboard.tsx:

```typescript
import { ComplaintStatsCards } from "@/components/ComplaintStatsCards";
import { RedAlertSection } from "@/components/RedAlertSection";
import {
  calculateComplaintStats,
  getRedAlertComplaints,
} from "@/lib/complaintUtils";

export default function AdminDashboard() {
  const [recentComplaints, setRecentComplaints] = useState<any[]>([]);
  
  // ... existing code ...

  const stats = useMemo(
    () => calculateComplaintStats(recentComplaints),
    [recentComplaints]
  );

  const redAlertComplaints = useMemo(
    () => getRedAlertComplaints(recentComplaints),
    [recentComplaints]
  );

  return (
    <AdminLayout title="Dashboard">
      {/* Add statistics cards */}
      <ComplaintStatsCards stats={stats} isLoading={loading} />

      {/* Add red alert section if any */}
      {redAlertComplaints.length > 0 && (
        <RedAlertSection complaints={redAlertComplaints} />
      )}

      {/* Keep existing dashboard content */}
    </AdminLayout>
  );
}
```

---

## 3. Status Distribution Chart Update

### Current Implementation
Pie/Line chart showing In Progress, Pending, Solved.

### Updated Implementation
Show only Pending, Solved, Red Alert:

```tsx
import { PieChart, Pie, Cell, Legend, Tooltip } from "recharts";

const chartData = [
  { name: "Pending", value: stats.pending, fill: "#fbbf24" },
  { name: "Solved", value: stats.solved, fill: "#10b981" },
  { name: "Red Alert", value: stats.redAlert, fill: "#ef4444" },
];

<PieChart width={300} height={300}>
  <Pie
    data={chartData}
    cx={150}
    cy={150}
    labelLine={false}
    label={({ name, percent }) =>
      `${name} ${(percent * 100).toFixed(0)}%`
    }
    outerRadius={80}
    fill="#8884d8"
    dataKey="value"
  >
    {chartData.map((entry, index) => (
      <Cell key={`cell-${index}`} fill={entry.fill} />
    ))}
  </Pie>
  <Tooltip />
  <Legend />
</PieChart>
```

---

## 4. Performance Dashboard Card - Add SLA Info

### Current Card
Shows resolution rate and active tasks.

### Enhanced Card

```tsx
<Card className="rounded-2xl">
  <CardHeader>
    <CardTitle>SLA Compliance</CardTitle>
  </CardHeader>
  <CardContent className="space-y-4">
    <div className="flex justify-between items-center pb-2 border-b">
      <span className="text-muted-foreground">On-Time Resolution Rate:</span>
      <span className="font-bold text-lg">
        {stats.total > 0
          ? Math.round(((stats.solved) / stats.total) * 100)
          : 0}%
      </span>
    </div>

    <div className="flex justify-between items-center pb-2 border-b">
      <span className="text-muted-foreground">SLA Breaches:</span>
      <span className="font-bold text-lg text-red-600">{stats.redAlert}</span>
    </div>

    <div className="flex justify-between items-center pb-2 border-b">
      <span className="text-muted-foreground">Avg Resolution Days:</span>
      <span className="font-bold text-lg">
        {recentComplaints.length > 0
          ? Math.round(
              recentComplaints.reduce((acc, c) => acc + getDaysPending(c), 0) /
                recentComplaints.length
            )
          : 0}
      </span>
    </div>

    <div className="flex justify-between items-center">
      <span className="text-muted-foreground">Critical (>10 days):</span>
      <span className="font-bold text-lg">
        {recentComplaints.filter(
          (c) => getDaysPending(c) > 10 && !normalizeComplaintStatus(c.solve_status) === "Solved"
        ).length}
      </span>
    </div>
  </CardContent>
</Card>
```

---

## 5. Export/Report Enhancement

### Add Red Alert Report

```typescript
// client/lib/reportUtils.ts

export function generateRedAlertReport(complaints: Complaint[]) {
  const redAlerts = getRedAlertComplaints(complaints);

  return {
    generatedAt: new Date(),
    summary: {
      total: redAlerts.length,
      critical: redAlerts.filter((c) => getDaysPending(c) > 10).length,
      warning: redAlerts.filter(
        (c) => getDaysPending(c) > 7 && getDaysPending(c) <= 10
      ).length,
      average_days_pending: Math.round(
        redAlerts.reduce((acc, c) => acc + getDaysPending(c), 0) /
          redAlerts.length
      ),
    },
    complaints: redAlerts.map((c) => ({
      id: c.complaint_id,
      farmer: c.farmer_name,
      domain: c.domain,
      days_pending: getDaysPending(c),
      assigned_to: c.assigned_to_name,
    })),
  };
}
```

---

## 6. Email Notifications (Advanced)

### Server-Side Implementation

```typescript
// server/routes/alerts.ts
import { CronJob } from "cron";

// Run daily at 8 AM
const redAlertJob = new CronJob("0 8 * * *", async () => {
  try {
    const db = await getDb();
    const complaints = await getCollection(db, "complaints")
      .find({})
      .toArray();

    const redAlerts = getRedAlertComplaints(complaints);

    if (redAlerts.length > 0) {
      // Send email to admins
      await sendRedAlertEmail(redAlerts);
    }
  } catch (error) {
    console.error("Red alert job failed:", error);
  }
});

redAlertJob.start();
```

---

## 7. Mobile App Integration

### React Native Example

```typescript
// Use same utilities in React Native
import { isRedAlert, getDaysPending } from '@/lib/complaintUtils';

function ComplaintCard({ complaint }: { complaint: Complaint }) {
  return (
    <View style={isRedAlert(complaint) ? styles.alertCard : styles.normalCard}>
      <Text style={styles.title}>{complaint.complaint_id}</Text>
      {isRedAlert(complaint) && (
        <Text style={styles.alertBadge}>
          ⚠️ {getDaysPending(complaint)} days overdue
        </Text>
      )}
    </View>
  );
}
```

---

## Installation & Setup

### Step 1: Verify Core Files Exist
```bash
✓ client/lib/complaintUtils.ts
✓ client/components/RedAlertBadge.tsx
✓ client/components/ComplaintStatsCards.tsx
✓ client/components/RedAlertSection.tsx
✓ client/pages/ComplaintsManagement.tsx (updated)
✓ client/pages/EmployeeTasks.tsx (updated)
```

### Step 2: Create Hook (if doing Option B)
```bash
touch client/hooks/useRedAlertCount.ts
```

### Step 3: Import Components
```typescript
import { RedAlertBadge } from "@/components/RedAlertBadge";
import { ComplaintStatsCards } from "@/components/ComplaintStatsCards";
import { RedAlertSection } from "@/components/RedAlertSection";
```

### Step 4: Use Utilities
```typescript
import {
  isRedAlert,
  getDaysPending,
  getRedAlertComplaints,
  calculateComplaintStats,
} from "@/lib/complaintUtils";
```

---

## Testing

### Unit Tests

```typescript
// complaintUtils.test.ts
import { isRedAlert, getDaysPending, normalizeComplaintStatus } from '@/lib/complaintUtils';

describe('Complaint Utils', () => {
  it('should detect red alerts correctly', () => {
    const complaint = {
      created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
      solve_status: 'Pending',
    } as Complaint;
    expect(isRedAlert(complaint)).toBe(true);
  });

  it('should normalize statuses', () => {
    expect(normalizeComplaintStatus('In Progress')).toBe('Pending');
    expect(normalizeComplaintStatus('Resolved')).toBe('Solved');
  });
});
```

### Integration Tests

```typescript
// ComplaintsManagement.test.tsx
import { render, screen } from '@testing-library/react';
import ComplaintsManagement from '@/pages/ComplaintsManagement';

describe('Complaints Management', () => {
  it('should display red alert section', () => {
    render(<ComplaintsManagement />);
    expect(screen.getByText(/critical alert/i)).toBeInTheDocument();
  });
});
```

---

## Configuration

### Adjust Red Alert Threshold
Edit `client/lib/complaintUtils.ts`:
```typescript
export const RED_ALERT_THRESHOLD = 4; // Change to desired days
```

### Adjust Severity Levels
Edit `getRedAlertSeverity()` in `client/lib/complaintUtils.ts`:
```typescript
if (daysPending > 10) return "critical"; // Change thresholds
if (daysPending > 7) return "warning";
```

---

## Performance Considerations

- **Lazy Load**: Only fetch complaints when needed
- **Memoize**: Use useMemo for expensive calculations
- **Throttle**: Limit real-time updates to 1s intervals
- **Paginate**: Load complaints in batches for large datasets
- **Cache**: Store stats in Redux or Context for global state

---

## Support

For issues or questions about integrating these features:
1. Check the main COMPLAINT_REFACTOR_COMPLETE.md file
2. Review the TypeScript types in complaintUtils.ts
3. Test utility functions in isolation
4. Check browser console for warnings

---

## Summary

This guide provides optional enhancements that can be implemented incrementally without breaking the main system. All features are backward compatible and don't require database changes.

Start with the sidebar enhancement for quick wins, then move to admin dashboard and notifications as needed.
