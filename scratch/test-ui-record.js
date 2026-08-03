const { buildAttendanceUiRecord } = require('../utils/attendance.js');

const mockDbRow = {
  "id": "74ce0ed9-06b5-4b0d-a411-671f92fc0f4d",
  "employee_id": "dc390fc6-90e8-469d-b6d1-eae34904b133",
  "date": "2026-07-18",
  "status": "present",
  "check_in": "2026-07-18T03:54:41.488+00:00",
  "check_out": null,
  "late_in_minutes": 24,
  "early_out_minutes": 0,
  "work_hours_minutes": 0,
  "notes": "Attendance summary created from employee swipes. Overwritten by Hr Admin from HD to Present on 2026-07-18.",
  "source": "manual"
};

const result = buildAttendanceUiRecord("2026-07-18", mockDbRow);
console.log("Resulting UI Record:", result);
