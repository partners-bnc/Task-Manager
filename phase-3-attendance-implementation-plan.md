# Phase 3 Attendance System Plan

> Scope: production-grade attendance, late/half-day/absent classification, holidays/weekends, regularization, HR review, payroll-friendly monthly summaries, and scalable auditability.

---

## 1. Current-State Review

### 1.1 What Exists Today

- `public.hrm_attendance`
  - already exists
  - currently stores one daily attendance row per employee
  - current core fields in database:
    - `employee_id`
    - `date`
    - `check_in_time`
    - `check_out_time`
    - `status`
    - `late_minutes`
    - `work_hours_minutes`
    - `shift_id`
    - `notes`
    - `source`
- `public.hrm_regularization_requests`
  - already exists
  - current fields:
    - `employee_id`
    - `date`
    - `permission_type`
    - `time_range_start`
    - `time_range_end`
    - `reason`
    - `status`
    - `reviewed_by`
    - `reviewed_at`
- `public.hrm_holidays`
  - exists and should drive holiday treatment
- `public.hrm_leave_requests`
  - exists and should drive leave-aware attendance status
- `public.hrm_employees`
  - now has fixed schedule defaults:
    - `working_hours_start = 10:00`
    - `working_hours_end = 19:00`

### 1.2 Current Gaps

- Attendance screen is still demo/mock-driven, not DB-driven.
- No formal rule engine for:
  - on-time
  - late
  - half-day
  - absent
  - weekend
  - holiday
  - leave
- No monthly summary table for payroll and reporting.
- No clear policy for missing punches.
- No explicit approval flow that rewrites attendance safely after regularization.
- Current table is good as a base, but not yet strong enough for enterprise reporting.

---

## 2. Target Policy Model

### 2.1 Standard Office Schedule

Default work schedule for now:

- Shift start: `10:00 AM`
- Shift end: `07:00 PM`
- Scheduled duration: `9 hours`

This should remain configurable later per employee/shift, but the policy engine should use the employee’s assigned schedule row, not hardcoded UI logic.

### 2.2 Attendance Classification Rules

For a standard day:

- `Present`
  - check-in at or before `10:00 AM`
  - check-out at or after `07:00 PM`
  - or total payable work time meets full-day threshold
- `Late`
  - check-in after `10:00 AM`
  - still qualifies as full working day if worked enough time
- `Half Day`
  - worked time is below full-day threshold but meets half-day threshold
  - or approved leave session is half day
- `Absent`
  - no valid attendance and no approved leave/holiday/weekend rule applies
- `Weekend`
  - date falls outside employee working days
- `Holiday`
  - date is in company holiday calendar and not optional-unavailed holiday logic says otherwise
- `On Leave`
  - approved leave exists for that day

### 2.3 Recommended Thresholds

Use policy-based thresholds instead of baking them into UI:

- Full day:
  - `>= 8h 30m` worked
- Half day:
  - `>= 4h 00m` and `< 8h 30m`
- Absent:
  - `< 4h 00m` worked on a working day without approved override

Why this is better:

- scalable for future shift variation
- payroll-safe
- easier to explain to HR and employees
- can be tuned without rewriting the whole system

### 2.4 Late and Early-Out Logic

Store both:

- `late_minutes`
  - `max(0, check_in - scheduled_start)`
- `early_out_minutes`
  - `max(0, scheduled_end - check_out)`

Recommended policy:

- Late does not automatically mean half-day
- Half-day should be driven mainly by worked minutes or approved half-day leave
- This avoids unfair classification for someone who checks in late but works late too

---

## 3. Enterprise Attendance Decision Order

The system should determine daily attendance in this order:

1. Is the date a company holiday?
   - yes -> `holiday`
2. Is the date a non-working day for this employee?
   - yes -> `weekend`
3. Is there an approved leave for this date?
   - yes -> `on_leave` or `half_day`
4. Is there an approved regularization overriding punch gaps?
   - yes -> use approved regularized times/status
5. Are there valid check-in/check-out punches?
   - yes -> compute worked minutes, late minutes, early out, final status
6. Is there only partial attendance?
   - yes -> mark `missing_checkout`, `missing_checkin`, or derived half-day/absent as per policy
7. Else
   - mark `absent`

This order is important because holidays, weekends, and approved leave should beat raw punch logic.

---

## 4. Recommended Data Model

### 4.1 Keep `hrm_attendance`, but strengthen it

Recommended target columns:

- `id`
- `employee_id`
- `date`
- `shift_id`
- `scheduled_start_at`
- `scheduled_end_at`
- `check_in_at`
- `check_out_at`
- `worked_minutes`
- `late_minutes`
- `early_out_minutes`
- `attendance_status`
- `day_fraction`
  - `1.0`, `0.5`, `0.0`
- `derived_from`
  - `system`
  - `manual`
  - `regularization`
  - `leave_engine`
  - `holiday_engine`
- `is_regularized`
- `regularization_request_id`
- `is_locked`
  - lock after payroll cutoff if needed
- `notes`
- `created_at`
- `updated_at`

### 4.2 Strengthen `hrm_regularization_requests`

Recommended additions:

- `requested_check_in_at`
- `requested_check_out_at`
- `requested_status`
- `request_type`
  - `missing_checkin`
  - `missing_checkout`
  - `wrong_punch`
  - `on_duty`
  - `work_from_home`
  - `attendance_override`
- `review_status`
  - `pending`
  - `approved`
  - `rejected`
  - `cancelled`
- `review_note`
- `reviewed_by`
- `reviewed_at`
- `attendance_before`
  - JSONB snapshot
- `attendance_after`
  - JSONB snapshot

This makes review auditable and safe.

### 4.3 Add an attendance monthly summary table

Recommended new table:

- `hrm_attendance_monthly_summary`

Columns:

- `employee_id`
- `year`
- `month`
- `working_days`
- `present_days`
- `late_days`
- `half_days`
- `absent_days`
- `paid_leave_days`
- `unpaid_leave_days`
- `holiday_days`
- `weekend_days`
- `payable_days`
- `lop_days`
- `regularized_days`
- `updated_at`

This is what payroll and dashboards should read instead of recalculating a full month every time.

### 4.4 Add an attendance policy table

Recommended new table:

- `hrm_attendance_policies`

Columns:

- `name`
- `is_default`
- `scheduled_start_time`
- `scheduled_end_time`
- `full_day_minutes`
- `half_day_minutes`
- `late_grace_minutes`
- `early_out_grace_minutes`
- `allow_checkout_after_midnight`
- `missing_checkout_strategy`
- `auto_absent_after_days`
- `created_at`
- `updated_at`

This is how top systems stay flexible without schema churn.

---

## 5. Final Logic for Marking Attendance

### 5.1 Check-In

When employee taps check-in:

- find today’s attendance row by `(employee_id, date)`
- if none exists, create one
- set:
  - `check_in_at = now()`
  - `scheduled_start_at`
  - `scheduled_end_at`
  - `shift_id`
- compute temporary late minutes
- do not finalize day status yet

Rules:

- if today is holiday/weekend:
  - either block check-in
  - or allow overtime/exception flow later
- if already checked in:
  - block duplicate check-in

### 5.2 Check-Out

When employee taps check-out:

- load today’s attendance row
- if no check-in exists:
  - either reject
  - or route to regularization-required flow
- set `check_out_at = now()`
- compute:
  - `worked_minutes`
  - `late_minutes`
  - `early_out_minutes`
- classify final status using policy

### 5.3 Daily Classification Formula

On a normal working day:

- if approved full-day leave exists -> `on_leave`, `day_fraction = 1.0`
- if approved half-day leave exists -> `half_day`, but combine with punches if company policy requires
- else if `worked_minutes >= full_day_minutes`
  - `attendance_status = present`
  - if `late_minutes > grace`, also flag `late_entry = true`
- else if `worked_minutes >= half_day_minutes`
  - `attendance_status = half_day`
- else
  - `attendance_status = absent`

Recommended separation:

- `attendance_status` = primary payroll status
- `late_entry` = behavior flag

That is cleaner than mixing “late” as both a payroll status and behavioral event.

### 5.4 Missing Punch Logic

If check-in exists but no check-out:

- during same day:
  - mark as `open`
- after cutoff job runs:
  - mark as `incomplete`
  - allow regularization

If check-out exists without check-in:

- very rare for web flow
- treat as invalid/incomplete
- require regularization

Top-company approach:

- never silently invent both punches
- only backfill through approved rules or approved regularization

---

## 6. Regularization Design

### 6.1 When employee can regularize

Allow regularization only for:

- missing check-in
- missing check-out
- wrong time captured
- approved field work / on duty
- approved remote work exception

Do not allow regularization for:

- holiday/weekend unless company explicitly allows compensatory attendance
- dates already payroll-locked
- dates older than policy cutoff

Recommended cutoff:

- employees can request within `3` to `7` calendar days

### 6.2 Approval flow

Employee submits request:

- date
- request type
- requested times
- reason
- optional attachment
- manager/HR CC if needed

HR/Admin reviews:

- approve
- reject
- ask for correction later if you add comments workflow

On approval:

- update corresponding `hrm_attendance`
- set `derived_from = regularization`
- set `is_regularized = true`
- link `regularization_request_id`
- store before/after audit snapshot

### 6.3 Regularization and payroll

Important rule:

- approved regularization before payroll cutoff should recalculate monthly summary
- approved regularization after payroll cutoff should either:
  - affect next month adjustment
  - or require payroll reopen permission

This avoids silent payroll drift.

---

## 7. Holiday, Weekend, and Leave Interaction

### 7.1 Weekends

Use employee-specific working pattern from:

- `working_days`
- and later policy/shift if needed

Do not hardcode Saturday/Sunday for all users forever.

For now:

- if employee schedule says Mon-Fri, then Sat/Sun are weekend
- if Mon-Sat, only Sunday is weekend

### 7.2 Holidays

Use `hrm_holidays`

Recommended additions if needed later:

- holiday scope by location
- holiday scope by department/business unit
- optional holiday flag

For a scalable company, holidays should not always be global-only.

### 7.3 Leave precedence

Approved leave should override punch absence classification.

Examples:

- approved full-day leave + no punches -> `on_leave`
- approved first-half leave + employee works second half -> `half_day`
- approved second-half leave + employee works first half -> `half_day`

---

## 8. Recommended APIs

### Employee APIs

- `POST /HRM/api/attendance/check-in`
- `POST /HRM/api/attendance/check-out`
- `GET /HRM/api/attendance/me?month=YYYY-MM`
- `POST /HRM/api/attendance/regularization`
- `GET /HRM/api/attendance/regularization/me`

### HR/Admin APIs

- `GET /HRM/api/admin/attendance?month=YYYY-MM`
- `GET /HRM/api/admin/attendance/employee/:id`
- `GET /HRM/api/admin/regularization?status=pending`
- `PATCH /HRM/api/admin/regularization/:id`
- `POST /HRM/api/admin/attendance/recompute-day`
- `POST /HRM/api/admin/attendance/recompute-month`

---

## 9. Recommended Jobs and Triggers

### 9.1 End-of-day finalizer job

Run once daily after shift close, for example `11:30 PM local time`:

- close incomplete attendance rows
- classify absences for working days with no valid attendance
- ignore holidays/weekends/approved leave

### 9.2 Monthly summary recompute job

Run nightly and also on-demand after:

- attendance edits
- leave approval changes
- regularization approval/rejection

### 9.3 Audit logging

Every manual or regularized attendance change should create an audit entry:

- actor
- previous state
- new state
- reason
- request id if from regularization

---

## 10. Scalable Database Recommendations

Following Supabase/Postgres best practice:

- unique index on `(employee_id, date)` for attendance
- index on `(date, attendance_status)`
- index on `(employee_id, date desc)`
- index on pending regularization requests by status/date
- partial index for `status = 'pending'` regularization queue

If attendance grows large:

- monthly or yearly partitioning on `hrm_attendance`

Recommended partition trigger point:

- once rows become large enough that monthly reporting slows materially
- usually not needed immediately, but schema should stay partition-friendly

---

## 11. Suggested Schema Changes for This Phase

### Must-have in Phase 3

1. Expand `hrm_attendance`
   - add `scheduled_start_at`
   - add `scheduled_end_at`
   - add `early_out_minutes`
   - add `day_fraction`
   - add `derived_from`
   - add `is_regularized`
   - add `regularization_request_id`
2. Expand `hrm_regularization_requests`
   - add request/review metadata
   - add before/after snapshot
3. Add `hrm_attendance_monthly_summary`
4. Add `hrm_attendance_policies`

### Nice-to-have right after

5. Holiday scoping by location/business unit
6. Payroll lock flag
7. Comp-off / overtime support

---

## 12. Recommended Phase 3 Delivery Order

### Step 1

Schema hardening

- attendance policy table
- attendance table additions
- regularization table additions
- indexes

### Step 2

Attendance engine

- check-in
- check-out
- status derivation
- missing punch handling

### Step 3

Employee UI

- live today status
- monthly calendar from DB
- day details
- regularization submission

### Step 4

HR/Admin UI

- daily attendance grid
- pending regularization queue
- approval and rejection flow
- manual recompute controls

### Step 5

Background jobs

- end-of-day classification
- monthly summary recompute

### Step 6

Payroll integration

- monthly summary consumption
- lock/reopen workflow

---

## 13. Recommended Company-Grade Policy Defaults

For your current company policy:

- office schedule: `10:00 AM to 07:00 PM`
- late grace: `0 to 10 minutes` depending on HR choice
- full day threshold: `8h 30m`
- half day threshold: `4h 00m`
- missing checkout: `incomplete` until resolved
- regularization request window: `7 days`
- weekend: based on employee working-day schedule
- holiday: from `hrm_holidays`

Suggested interpretation:

- before or at `10:00 AM` = on time
- after `10:00 AM` = late
- before `07:00 PM` may cause early-out flag
- final day status should come from total worked time + approved leave + regularization

This gives HR enough control while staying fair and scalable.

---

## 14. Final Recommendation

Best enterprise approach:

- keep attendance as one derived daily fact table
- keep regularization as an approval workflow table
- drive payroll from monthly summaries, not raw attendance every time
- keep policies configurable, not hardcoded
- separate behavior flags like late/early-out from payroll states like present/half-day/absent

That is the most scalable model and closest to how mature HR systems are designed.

