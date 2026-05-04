# HRM Attendance, Leave, Payroll, and HR Override Guide

This document explains how the current HRM system works in simple business language. It is written for HR team members, reporting managers, and higher authority so everyone can understand what the system is doing and what impact each action has.

## 1. System Overview

The system is now connected in 4 major parts:

- `Attendance`
- `Leave Management`
- `Payroll & Payout`
- `HR Monthly Attendance Override`

These 4 parts are linked.

That means:

- attendance affects leave and payroll visibility
- approved leave affects attendance and payroll
- LOP affects salary deduction
- HR overwrite can affect attendance, leave balance, and payroll together

## 2. Attendance System

### 2.1 Normal employee attendance

Employees normally mark their own attendance from the employee attendance panel.

The standard office shift in the current system is:

- `Shift start`: `10:00 AM`
- `Shift end`: `7:00 PM`
- `Expected shift duration`: `9 hours`
- `Auto checkout time`: `10:00 PM`

### 2.2 How attendance status is decided

The system checks check-in, check-out, and total work duration.

Current logic:

- if there is no check-in, the day is treated as `Absent`
- if check-in is available but check-out is missing, the day is treated as `Half Day`
- if total worked time is less than `9 hours`, the day is treated as `Half Day`
- if total worked time is `9 hours or more`, the day is treated as `Present`

So in simple words:

- full shift completed = `Present`
- attendance marked but shift not completed = `Half Day`
- no attendance marked = `Absent`

### 2.3 Holiday and weekly off

The system also checks:

- company holidays
- employee working-day schedule
- weekly off
- second Saturday off, where applicable

If a date is already a holiday or off day, it is shown accordingly and is not treated as normal working attendance.

Codes used:

- `H` = Holiday
- `OFF` = Weekly Off / Scheduled Off

### 2.4 Late in and early out

The system also calculates:

- late arrival minutes
- early exit minutes
- total work hours

These help HR review daily attendance quality, even if the final status becomes present or half day.

## 3. What Happens If Employee Does Not Mark Attendance

If the employee does not mark attendance on a working day, then:

- during the month, that day is first treated as `Absent`
- it is not immediately treated as salary deduction
- employee still gets a chance to:
  - mark attendance
  - request regularization
  - apply leave
  - HR can also correct the day from monthly attendance

Important rule:

- `Absent` during the month does not automatically become LOP immediately
- unresolved absent is converted into payroll-impacting LOP only when payroll is prepared for a completed month

This is done so employees are not penalized before the day is reviewed or corrected.

## 4. Leave Management System

### 4.1 Leave types available

The current system supports these leave types:

- `CL` = Casual Leave
- `SL` = Sick Leave
- `SP` = Special Leave
- `COFF` = Comp Off
- `CH` = Client Holiday
- `LOP` = Loss of Pay

### 4.2 Leave meaning

#### Casual Leave

- paid leave
- deducts from casual leave balance

#### Sick Leave

- paid leave
- deducts from sick leave balance

#### Special Leave

- paid leave
- deducts from special leave balance

#### Comp Off

- non-LOP leave type
- does not reduce normal paid leave balance
- used where comp-off policy applies

#### Client Holiday

- non-LOP leave type
- no paid leave deduction
- no payroll deduction
- used when the employee is aligned to a client calendar and the client is on holiday

#### LOP

- unpaid leave
- no paid balance is used
- affects payroll deduction

### 4.3 Balance check logic

For paid leave types like `CL`, `SL`, and `SP`:

- if enough balance is available, employee can apply normally
- if balance is not enough, the system blocks submission for that paid leave type
- employee is guided to apply under `LOP` if unpaid leave is needed

Important:

- employee is still allowed to choose `LOP` even if paid leave balance exists
- `LOP` is an explicit choice, not a forced hidden conversion

## 5. Half-Day Leave Logic

### 5.1 Supported half-day behavior

The system supports:

- full-day leave
- first-half leave
- second-half leave

This applies to paid leave and LOP where relevant.

### 5.2 Attendance and half-day leave together

If an approved half-day leave exists:

- employee can work only in the opposite half
- employee cannot mark attendance in the leave-covered half

Examples:

- if `first half leave` is approved, employee can work only in the `second half`
- if `second half leave` is approved, employee can work only in the `first half`

### 5.3 If employee does not work the remaining half

If employee has half-day leave but does not work the remaining working half:

- the day is not treated as full present
- the monthly attendance cell shows a mixed result
- example outcomes can appear like:
  - `SL:A`
  - `A:SL`
  - `LOP:A`
  - `A:LOP`

Meaning:

- one half is covered by leave
- the other half remained absent or unworked

If half-day `LOP` is approved:

- payroll LOP is created for `0.5` day immediately

If half-day paid leave is approved:

- `0.5` leave balance is deducted from the selected leave type

Important current note:

- half-day approved paid leave with no work in the remaining half is shown correctly in attendance view
- automatic month-close payroll LOP generation currently focuses on unresolved full-day absent rows
- half-day LOP payroll effect is handled when the half-day LOP itself is approved

## 6. Monthly Attendance Codes

The monthly attendance matrix in HR Admin uses clear codes.

Main codes:

- `P` = Present
- `A` = Absent
- `HD` = Half Day
- `CL` = Casual Leave
- `SL` = Sick Leave
- `SP` = Special Leave
- `LOP` = Loss of Pay
- `CH` = Client Holiday
- `COFF` = Comp Off
- `H` = Holiday
- `OFF` = Weekly Off

Mixed half-day examples:

- `LOP:P` = one half is LOP and the other half is worked
- `P:LOP` = first half worked, second half LOP
- `SL:P` = one half sick leave and one half worked
- `P:SL` = one half worked and one half sick leave
- `LOP:A` = one half LOP and other half absent
- `A:SP` = one half absent and one half special leave

This helps HR understand the day result clearly without opening the full record every time.

## 7. Payroll Logic

### 7.1 When payroll can be calculated

Payroll can be calculated only for a fully completed past month.

Example:

- if current month is May 2026, payroll can be run for April 2026
- payroll cannot be run for May 2026 until May is fully completed

This prevents incomplete salary calculation during an open month.

### 7.2 What affects payroll deduction

Payroll deduction is mainly driven by `LOP`.

LOP can come from:

- approved employee `LOP` leave
- approved HR-generated `LOP` overwrite
- unresolved full-day absence at month close

### 7.3 Full-day and half-day LOP effect

- full-day LOP = `1.0` day salary impact
- half-day LOP = `0.5` day salary impact

These entries are stored for payroll deduction and used in salary preview and payroll generation.

### 7.4 Paid leave and payroll

Paid leave like:

- `CL`
- `SL`
- `SP`

does not cause salary deduction if approved properly.

It only reduces leave balance.

### 7.5 Client Holiday and Comp Off

These do not create normal paid leave deduction and do not create LOP salary deduction under the current policy.

## 8. HR Monthly Attendance Override

This is one of the most important features in the current system.

HR can open monthly attendance and directly change a day from the monthly cell.

### 8.1 Why HR override is important

Sometimes:

- employee forgot to mark attendance
- leave was not applied on time
- status needs correction
- payroll impact must be corrected before salary processing

In such cases, HR can correct the day from the monthly matrix itself.

### 8.2 HR overwrite is not only visual

This is very important:

The HR monthly overwrite does not only change the color or label on screen.

Depending on the option selected, it can update:

- `Attendance`
- `Leave request`
- `Leave balance`
- `Leave ledger`
- `Payroll LOP`

So the system stays connected and consistent.

## 9. Types of HR Overwrite

### 9.1 Attendance-only overwrite

These change attendance directly:

- `Present`
- `Absent`
- `Half Day`
- `Holiday`
- `Off / Weekend`

Effect:

- attendance row changes
- if an earlier HR-generated leave/LOP overwrite existed for the same date, that previous HR-generated effect is reversed first

### 9.2 Leave-linked overwrite

These create approved HR-generated leave effect:

- `LOP`
- `CL`
- `SL`
- `SP`
- `COFF`
- `CH`

Effect:

- attendance changes
- approved HR-generated leave request is created
- leave balance changes if applicable
- LOP count changes if applicable
- payroll deduction entries are created or removed if applicable

## 10. Examples of HR Overwrite Impact

### 10.1 Present to Sick Leave

If HR changes:

- `P -> SL`

then:

- attendance becomes leave-based
- approved HR-generated sick leave record is created
- sick leave balance reduces
- payroll deduction does not happen

### 10.2 Present to LOP

If HR changes:

- `P -> LOP`

then:

- attendance becomes leave-based
- approved HR-generated LOP leave is created
- LOP count increases
- payroll deduction entry is created

### 10.3 Present to Absent

If HR changes:

- `P -> A`

then:

- attendance becomes absent
- no immediate payroll deduction is created at that moment
- if the month later closes and the day remains unresolved, it can become payroll-impacting LOP

### 10.4 Absent to Present

If HR changes:

- `A -> P`

then:

- attendance becomes present
- if earlier HR-generated LOP/leave impact existed for that day, it is reversed
- payroll LOP effect for that overwrite is removed

### 10.5 LOP to Present

If HR changes:

- `LOP -> P`

then:

- linked HR-generated LOP is reversed
- LOP count is reduced back
- payroll LOP entry is removed
- attendance becomes present

### 10.6 Absent to Casual Leave / Sick Leave / Special Leave

If HR changes:

- `A -> CL`
- `A -> SL`
- `A -> SP`

then:

- attendance becomes leave-based
- selected leave balance reduces
- no LOP is created unless the selected type itself is LOP

## 11. Reversal Logic

The system supports safe reversal for HR-generated overwrite transactions.

That means if HR changes the same day again, the system first removes the old HR-generated effect before applying the new one.

This keeps:

- leave balances correct
- LOP count correct
- payroll deduction correct
- attendance status correct

Examples:

- if HR first marks a day `LOP` and later changes it to `Present`, the old LOP effect is removed
- if HR first marks a day `SL` and later changes it to `CL`, sick leave impact is reversed first, then casual leave is applied

Important:

- this auto-reversal is designed for `HR-generated overwrite records`
- it does not silently rewrite ordinary employee leave history without audit record

## 12. Audit and Control

HR overwrite actions are recorded with system notes and overwrite source details.

This gives traceability such as:

- who changed the day
- what the earlier state was
- what the new state is
- whether it was an HR overwrite

This is important for:

- payroll review
- internal HR control
- dispute handling
- management visibility

## 13. Month-Close Rule for Unresolved Absence

This is the current policy:

- during the open month, missing attendance stays as `Absent`
- employee or HR can still correct it
- when payroll is prepared for a completed month, unresolved full-day absent dates can be converted into payroll-impacting LOP

This means:

- no early salary penalty during the month
- final payroll still remains strict for unresolved absence

## 14. End-to-End Simple Business Flow

### Case 1: Employee marks full shift

- employee checks in and checks out
- total work time is `9 hours or more`
- result = `Present`
- no leave impact
- no payroll deduction

### Case 2: Employee marks attendance but does not complete shift

- employee checks in
- works less than `9 hours`
- result = `Half Day`
- may still be reviewed depending on attendance and leave context

### Case 3: Employee does not mark attendance

- result during the month = `Absent`
- employee can still regularize or apply leave
- HR can also correct from monthly attendance
- if unresolved by payroll closure, it can impact payroll as LOP

### Case 4: Employee applies paid leave

- if balance is available, leave can be approved
- balance reduces
- no payroll deduction

### Case 5: Employee applies LOP

- no paid balance is used
- once approved, payroll deduction effect is created

### Case 6: Employee takes half-day leave and works other half

- monthly cell can show combined result like `SL:P` or `P:LOP`
- balance or payroll impact is applied only for the leave half

### Case 7: Employee takes half-day leave and does not work the remaining half

- day shows mixed leave-plus-absence result
- example: `SL:A` or `LOP:A`
- this makes the unworked half visible to HR

### Case 8: HR corrects the day manually

- HR opens monthly attendance
- selects overwrite action
- system updates the connected attendance, leave, and payroll impact as per selected action

## 15. Management Summary

In one line:

The system now works in a connected way where attendance, leave, and payroll are not separate. Employee actions and HR corrections are both reflected properly, and LOP salary impact is controlled in a structured and auditable way.

Short summary:

- normal attendance decides present, half day, or absent
- paid leave reduces leave balance
- LOP affects payroll deduction
- unresolved absence affects payroll only after month close
- HR monthly attendance overwrite can officially correct attendance and, when needed, also update leave balance and payroll impact

## 16. Important Current Notes

- payroll preview and generation are allowed only for completed past months
- employee can choose `LOP` even if paid leave balance exists
- paid leave with insufficient balance is blocked, and employee is guided to use `LOP`
- half-day paid leave and half-day LOP are both supported
- monthly attendance view is the main HR control panel for final day corrections

If needed, this document can also be converted into:

- HR SOP
- training note
- approval presentation
- employee policy explainer
