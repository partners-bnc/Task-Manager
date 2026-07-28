# Attendance & Loss of Pay (LOP) System Documentation

This document explains the logic, rules, and calculations for the Attendance, Leave, and Loss of Pay (LOP) systems in simple terms.

---

## 1. Daily Attendance Rules & Statuses

Daily attendance status is determined based on the **checkout duration** (total work hours logged in the day):

| Work Hours Logged | Attendance Status | LOP Impact | Notes |
| :--- | :--- | :--- | :--- |
| **8 hours or more** (>= 480 mins) | **Present** | **0.0** LOP | Shift successfully completed. |
| **Checked-in, less than 8 hours** (< 480 mins) | **Half Day** | **0.5** LOP | Any check-in duration under 8 hours (even 1 hour or less) results in a Half Day. |
| **Check-in only** (no check-out) | **Half Day** | **0.5** LOP | Checked in but forgot to check out (system auto-checkouts at 10:00 PM). |
| **No check-in at all** | **Absent** | **1.0** LOP | Did not check in for the day. |

---

## 2. Approved Leaves + Attendance (Combination Rules)

When an employee has an approved leave request on a date, it overrides or combines with their logged work hours:

### Full-Day Approved Leave
- **Paid Leave (CL / SL / SP / COFF / CH)**: Marks the day as **On Leave** (0 LOP).
- **LOP Leave**: Marks the day as **On Leave** (1.0 LOP).

### Half-Day Approved Leave (CL / SL / SP / LOP)
The employee is expected to check in and work the remaining half of their shift (requiring a minimum of **4.5 hours**):

- **If they work >= 4.5 hours**:
  - Combined with a **Paid Leave** (CL/SL/SP) -> Marks the day **Present** (0.0 LOP).
  - Combined with an **LOP Leave** -> Marks the day **Half Day** (0.5 LOP from the unpaid leave).
- **If they work < 4.5 hours** (or do not check in at all):
  - Combined with a **Paid Leave** (CL/SL/SP) -> Marks the day **Half Day** (0.5 LOP, since the worked half is marked absent/unworked).
  - Combined with an **LOP Leave** -> Marks the day **Absent** (1.0 LOP: 0.5 from LOP leave + 0.5 from worked half absence).

---

## 3. Regularization Request Rules

Regularization allows employees to request corrections for missing or incorrect swipe records:

- **Pending or Rejected Leave**: If a leave request is rejected or pending, it is ignored by the attendance calculator. Standard work-hour thresholds apply.
- **Auto-Restricted Option**: If a day already has an approved half-day leave, the regularization form automatically locks the request type option to **"Half Day"** so the employee can only regularize the remaining half-day.

---

## 4. End-of-Month Payroll LOP Summation

When generating monthly payouts, all unresolved attendance statuses for working days (excluding weekends and company holidays) are converted to LOP:
1. **Full-Day Absences** (no check-in) = **1.0 LOP** each.
2. **Half-Days** (status is `halfday`, with no approved leave, or half-day leaves where the employee did not check in) = **0.5 LOP** each.

---

## 5. HR Overwrite Action Options (Admin View)

HR Admins can manually override an employee's status for any date. The options available in the Admin Update Status panel are:

### General Attendance Overwrites
- **Present**: Force mark a full present day.
- **Absent**: Force mark a full absent day.
- **Half Day**: Force mark a half day.
- **Holiday**: Force mark a holiday.
- **Off / Weekend**: Force mark a weekly off-day.

### Leave & LOP Overwrites
- **LOP (Loss of Pay)**:
  - `Full Day` / `First Half` / `Second Half`
  - `LOP:P` (First Half Leave, Second Half Present)
  - `P:LOP` (First Half Present, Second Half Leave)
  - `LOP:A` (First Half Leave, Second Half Absent)
  - `A:LOP` (First Half Absent, Second Half Leave)
- **Casual Leave (CL)**:
  - `CL - Full Day` / `CL - First Half` / `CL - Second Half`
  - `CL:P` (First Half CL, Second Half Present)
  - `P:CL` (First Half Present, Second Half CL)
  - `CL:A` (First Half CL, Second Half Absent)
  - `A:CL` (First Half Absent, Second Half CL)
- **Sick Leave (SL)**:
  - `SL - Full Day` / `SL - First Half` / `SL - Second Half`
  - `SL:P` (First Half SL, Second Half Present)
  - `P:SL` (First Half Present, Second Half SL)
  - `SL:A` (First Half SL, Second Half Absent)
  - `A:SL` (First Half Absent, Second Half SL)
- **Special Leave (SP)**:
  - `SP - Full Day` / `SP - First Half` / `SP - Second Half`
  - `SP:P` (First Half SP, Second Half Present)
  - `P:SP` (First Half Present, Second Half SP)
  - `SP:A` (First Half SP, Second Half Absent)
  - `A:SP` (First Half Absent, Second Half SP)
- **Comp Off (COFF)**:
  - `COFF - Full Day` (Uses Comp-off balance)
- **Client Holiday (CH)**:
  - `CH - Full Day` (Recognized Client holiday)
