# Phase 3 Attendance Simple Plan

## Goal

Build a simple attendance system with only 2 tables:

1. `hrm_employee_attendance`
2. `hrm_attendance_regularization`

This system will support:

- employee check-in
- employee check-out
- fixed shift time for everyone: `10:00 AM to 7:00 PM`
- late-in detection
- half-day detection
- auto check-out at `10:00 PM` if employee forgets
- regularization request
- approval by HR or reporting manager
- approved regularization automatically updates attendance as `present`

---

## Fixed Attendance Rules

- Shift start: `10:00 AM`
- Shift end: `7:00 PM`
- Late in:
  - if check-in is after `10:30 AM`
- Half day:
  - if check-in is after `12:00 PM`
- Auto check-out:
  - if employee did not check out, system marks check-out at `10:00 PM`
  - mark note as `Auto checkout by system`

---

## Table 1: `hrm_employee_attendance`

One row per employee per day.

### Columns

- `id` UUID PK
- `employee_id` UUID FK -> `hrm_employees.id`
- `attendance_date` DATE not null
- `check_in_at` TIMESTAMPTZ
- `check_out_at` TIMESTAMPTZ
- `late_in_minutes` INT default 0
- `early_out_minutes` INT default 0
- `work_hours_minutes` INT default 0
- `attendance_status` TEXT
  - allowed:
  - `present`
  - `late`
  - `half_day`
  - `absent`
- `checkout_source` TEXT
  - `employee`
  - `system_auto`
  - `regularization`
- `is_auto_checkout` BOOLEAN default false
- `is_regularized` BOOLEAN default false
- `regularization_id` UUID nullable
- `notes` TEXT
- `created_at` TIMESTAMPTZ
- `updated_at` TIMESTAMPTZ

### Constraint

- unique `(employee_id, attendance_date)`

---

## Table 2: `hrm_attendance_regularization`

This table stores regularization requests.

### Columns

- `id` UUID PK
- `employee_id` UUID FK -> `hrm_employees.id`
- `attendance_id` UUID FK -> `hrm_employee_attendance.id`
- `attendance_date` DATE not null
- `requested_check_in_at` TIMESTAMPTZ nullable
- `requested_check_out_at` TIMESTAMPTZ nullable
- `reason` TEXT not null
- `request_status` TEXT
  - `pending`
  - `approved`
  - `rejected`
- `requested_to_hr` BOOLEAN default true
- `requested_to_reporting_manager` BOOLEAN default true
- `approved_by` UUID nullable
- `approved_by_role` TEXT nullable
  - `hr_admin`
  - `reporting_manager`
- `approved_at` TIMESTAMPTZ nullable
- `rejection_note` TEXT nullable
- `created_at` TIMESTAMPTZ
- `updated_at` TIMESTAMPTZ

---

## Attendance Logic

### Check-in

When employee clicks check-in:

- find today attendance row
- if not exists, create row
- save `check_in_at`
- calculate:
  - if after `10:30 AM` -> mark late
  - if after `12:00 PM` -> mark half day

### Check-out

When employee clicks check-out:

- save `check_out_at`
- calculate:
  - total work minutes
  - late minutes
  - early out minutes
- final status:
  - after `12:00 PM` check-in -> `half_day`
  - else after `10:30 AM` check-in -> `late`
  - else -> `present`

### Early Out

- if employee checks out before `7:00 PM`
- store early-out minutes in `early_out_minutes`

### Auto Check-out

At `10:00 PM` daily:

- find today rows where `check_in_at` exists and `check_out_at` is null
- set `check_out_at = today 10:00 PM`
- set:
  - `checkout_source = system_auto`
  - `is_auto_checkout = true`
  - `notes = 'Auto checkout by system'`

---

## Regularization Logic

Employee can raise regularization when:

- late marked
- half day marked
- absent marked
- forgot check-out

### On request create

- create row in `hrm_attendance_regularization`
- status = `pending`
- visible to:
  - HR
  - reporting manager

### On approval

- update regularization row:
  - `request_status = approved`
  - `approved_by`
  - `approved_by_role`
  - `approved_at`
- update attendance row:
  - `attendance_status = present`
  - `is_regularized = true`
  - `regularization_id = request.id`
  - if provided, update requested check-in/out
  - recalculate late, early out, work hours

### On rejection

- regularization row becomes `rejected`
- attendance row remains unchanged

---

## Frontend Suggestion

Current frontend idea is good only if it stays simple.

### Employee side should have:

- Today attendance card
  - check-in button
  - check-out button
  - status
  - shift time `10:00 AM - 7:00 PM`
- Monthly attendance list/calendar
- Regularization request form
- Regularization history

### HR / Reporting Manager side should have:

- pending regularization requests
- approve / reject buttons
- employee attendance list

### Current recommendation

Do not make attendance frontend too heavy right now.
First build:

- button-based check-in/check-out
- one monthly list
- one pending request list

That is enough for Phase 3.

---

## One-Day Implementation Plan

### Step 1

Create 2 tables:

- `hrm_employee_attendance`
- `hrm_attendance_regularization`

### Step 2

Create employee APIs:

- check-in API
- check-out API
- get attendance API
- create regularization API

### Step 3

Create approval APIs:

- pending regularization list
- approve regularization
- reject regularization

### Step 4

Create daily auto check-out job for `10:00 PM`

### Step 5

Connect frontend:

- employee check-in/check-out
- employee regularization form
- HR/reporting manager approval page

---

## Final Recommendation

For your current need, this 2-table design is good.

Why it is good:

- simple
- easy to understand
- easy to implement
- enough for current HR flow
- easy to extend later

Do not overbuild right now.
First make this clean and working.
