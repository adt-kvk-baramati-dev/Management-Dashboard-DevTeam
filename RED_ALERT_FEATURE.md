# Red Alert Feature - Implementation Guide

## Overview
A comprehensive red alert system has been added to the Complaints Management dashboard to highlight complaints that have exceeded the 4-day resolution window without being solved.

## What Was Added

### 1. **Utility Functions** (`client/lib/complaintUtils.ts`)
- `getDaysSinceCreation()` - Calculates days elapsed since complaint registration
- `isComplaintOverdue()` - Checks if a complaint is overdue (>4 days AND unsolved)
- `getOverdueComplaints()` - Filters and sorts all overdue complaints
- `getSeverityStatus()` - Determines alert severity:
  - **Critical** (red): >10 days overdue
  - **Warning** (orange): >7 days overdue
  - **Alert** (yellow): >4 days overdue

### 2. **Red Alert Component** (`client/components/RedAlertSection.tsx`)
Displays overdue complaints in a prominent alert section with:
- Alert header with count of overdue complaints
- Individual cards for each overdue complaint showing:
  - Complaint ID and days overdue badge
  - Farmer name and PRN
  - Domain/category
  - Current status
  - Assigned staff member
- Summary statistics:
  - Total overdue count
  - Most overdue (days)
  - Average wait time

### 3. **Integration** (`client/pages/ComplaintsManagement.tsx`)
- Displays the RedAlertSection at the top of the page when overdue complaints exist
- Clickable alerts that open the complaint details modal
- Automatically updates when new complaints are fetched

## Features

✅ **Automatic Detection** - System automatically identifies complaints exceeding 4-day threshold
✅ **Color Coding** - Visual severity indicators (red/orange/yellow)
✅ **Interactive** - Click any alert card to view full complaint details
✅ **Statistics** - Quick overview of alert metrics
✅ **No Configuration Needed** - Works out of the box with existing complaint data
✅ **Responsive Design** - Works on mobile and desktop screens

## How It Works

1. When the Complaints Management page loads, all complaints are fetched
2. System calculates days since creation for each complaint
3. Complaints that are:
   - Created >4 days ago, AND
   - NOT marked as "Solved" or "Resolved"
   
   ...are flagged as overdue
4. Overdue complaints are displayed in the RED ALERT section at the top
5. Complaints are sorted by days overdue (most overdue first)
6. Click any alert to view full complaint details and timeline

## Threshold Configuration

The 4-day threshold can be customized by modifying:
```typescript
const overdueComplaints = getOverdueComplaints(complaints, 4); // Change 4 to desired days
```
in `client/pages/ComplaintsManagement.tsx`

## Severity Levels

Edit `getSeverityStatus()` in `client/lib/complaintUtils.ts` to adjust:
- Critical threshold (currently 10 days)
- Warning threshold (currently 7 days)

## Future Enhancements

Potential additions:
- Email/SMS notifications for critical alerts
- Auto-assignment suggestions
- Escalation workflows
- Historical analytics on overdue complaint patterns
- Export overdue complaints to CSV/PDF
- Scheduled reports

## Testing

To test the feature:
1. Create complaints with `created_at` dates older than 4 days
2. Ensure their `solve_status` is NOT "Solved"
3. Navigate to Complaints Management page
4. Red alerts section should appear with these complaints

## Files Modified/Created

- ✅ Created: `client/lib/complaintUtils.ts`
- ✅ Created: `client/components/RedAlertSection.tsx`
- ✅ Modified: `client/pages/ComplaintsManagement.tsx`
