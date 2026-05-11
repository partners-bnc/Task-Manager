export function sortByDisplayName(items = []) {
  return [...items].sort((left, right) => {
    const leftName = String(left?.name || left?.full_name || left?.email || '').trim().toLowerCase();
    const rightName = String(right?.name || right?.full_name || right?.email || '').trim().toLowerCase();
    return leftName.localeCompare(rightName);
  });
}

export function getTaskReviewAssigneeIds(task) {
  const employeeIds = new Set();

  const taskAssignments = Array.isArray(task?.task_assignments) ? task.task_assignments : [];
  for (const assignment of taskAssignments) {
    if (assignment?.employee_id) {
      employeeIds.add(assignment.employee_id);
    } else if (assignment?.employee?.id) {
      employeeIds.add(assignment.employee.id);
    }
  }

  const subtasks = Array.isArray(task?.task_subtasks) ? task.task_subtasks : [];
  for (const subtask of subtasks) {
    if (subtask?.assigned_employee_id) {
      employeeIds.add(subtask.assigned_employee_id);
    }
  }

  return Array.from(employeeIds);
}

export function getTaskReviewAssignees(task, employeeDirectoryById = new Map()) {
  const reviewAssignees = new Map();
  const taskAssignments = Array.isArray(task?.task_assignments) ? task.task_assignments : [];

  for (const assignment of taskAssignments) {
    const employee = assignment?.employee;
    if (employee?.id) {
      reviewAssignees.set(employee.id, employee);
    }
  }

  const subtasks = Array.isArray(task?.task_subtasks) ? task.task_subtasks : [];
  for (const subtask of subtasks) {
    if (!subtask?.assigned_employee_id || reviewAssignees.has(subtask.assigned_employee_id)) continue;
    const employee = employeeDirectoryById.get(subtask.assigned_employee_id);
    if (employee?.id) {
      reviewAssignees.set(employee.id, employee);
    }
  }

  return sortByDisplayName(Array.from(reviewAssignees.values()));
}

export function normalizeEmployeeRatingRows(rows = []) {
  return rows
    .map((row) => {
      const numericRating = Number(row?.rating);
      if (!row?.task_id || !row?.employee_id || !Number.isFinite(numericRating)) {
        return null;
      }

      return {
        ...row,
        rating: Math.min(5, Math.max(1, Math.round(numericRating))),
      };
    })
    .filter(Boolean);
}

export function buildEmployeeTaskRatingMap(rows = [], employeeId = null) {
  const normalizedRows = normalizeEmployeeRatingRows(rows);
  const ratingMap = new Map();

  for (const row of normalizedRows) {
    if (employeeId && row.employee_id !== employeeId) continue;
    ratingMap.set(row.task_id, row);
  }

  return ratingMap;
}

export function buildEmployeeRatingStats(rows = []) {
  const normalizedRows = normalizeEmployeeRatingRows(rows);
  const totalRatedTasks = normalizedRows.length;
  const averageRating = totalRatedTasks > 0
    ? normalizedRows.reduce((sum, row) => sum + row.rating, 0) / totalRatedTasks
    : null;

  const latestRatedTasks = [...normalizedRows]
    .sort((left, right) => {
      const leftTime = new Date(left?.updated_at || left?.created_at || 0).getTime();
      const rightTime = new Date(right?.updated_at || right?.created_at || 0).getTime();
      return rightTime - leftTime;
    })
    .map((row) => ({
      id: row.id,
      taskId: row.task_id,
      taskName: row?.task?.task_name || 'Untitled task',
      taskStatus: row?.task?.status || 'completed',
      dueDate: row?.task?.due_date || null,
      rating: row.rating,
      ratedAt: row?.updated_at || row?.created_at || null,
    }));

  return {
    averageRating,
    totalRatedTasks,
    latestRatedTasks,
  };
}
