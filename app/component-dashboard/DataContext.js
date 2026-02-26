'use client';

import { createContext, useContext, useEffect, useState } from 'react';

const DataContext = createContext(undefined);

const EMPTY_STATE = {
  user: null,
  users: [],
  tasks: [],
};

const STATUS_LABELS = {
  pending: 'Pending',
  in_progress: 'In Progress',
  completed: 'Completed',
};

const PRIORITY_LABELS = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
};

const STATUS_TO_API = {
  Pending: 'pending',
  'In Progress': 'in_progress',
  Completed: 'completed',
};

const formatDate = (value) => {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const deriveDueDate = (task) => {
  if (task?.due_date) return task.due_date;
  if (!task?.created_at) return null;
  const created = new Date(task.created_at);
  if (Number.isNaN(created.getTime())) return null;
  created.setDate(created.getDate() + 5);
  return created.toISOString();
};

const normalizeUsers = (rows = []) =>
  rows.map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    avatar: row.profile_picture_url || '',
  }));

const deriveSharedUsersFromTasks = (tasks = [], currentEmployee = null) => {
  const map = new Map();

  if (currentEmployee?.id) {
    map.set(currentEmployee.id, {
      id: currentEmployee.id,
      name: currentEmployee.name,
      email: currentEmployee.email,
      role: currentEmployee.role,
      profile_picture_url: currentEmployee.profile_picture_url || '',
    });
  }

  for (const task of tasks) {
    const assignments = Array.isArray(task?.task_assignments) ? task.task_assignments : [];
    for (const assignment of assignments) {
      const teammate = assignment?.employee;
      if (!teammate?.id) continue;
      map.set(teammate.id, teammate);
    }
  }

  return normalizeUsers(Array.from(map.values()));
};

const normalizeTask = (task, fallbackAssignees = [], currentUserId = null) => {
  const subtasks = Array.isArray(task.task_subtasks) ? task.task_subtasks : [];
  const completedSubtasks = subtasks.filter((subtask) => subtask.is_completed).length;
  const assignees = Array.isArray(task.task_assignments)
    ? task.task_assignments.map((assignment) => assignment?.employee?.id).filter(Boolean)
    : fallbackAssignees;
  const createdByLabel = task?.created_by
    ? (currentUserId && task.created_by === currentUserId ? 'You' : 'Admin')
    : 'Employee';

  return {
    id: task.id,
    title: task.task_name,
    description: task.description || '',
    priority: PRIORITY_LABELS[task.priority] || 'Medium',
    status: STATUS_LABELS[task.status] || 'Pending',
    startDate: formatDate(task.created_at),
    dueDate: formatDate(deriveDueDate(task)),
    completedSubtasks,
    totalSubtasks: subtasks.length,
    assignees,
    subtasks: subtasks.map((subtask) => ({
      id: subtask.id,
      title: subtask.title,
      completed: !!subtask.is_completed,
    })),
    attachments: Array.isArray(task.task_attachments) ? task.task_attachments.length : 0,
    createdBy: createdByLabel,
    rawStatus: task.status,
    rawPriority: task.priority,
    createdAt: task.created_at,
  };
};

export function DataProvider({ children, initialUser = null, mode = 'employee' }) {
  const [user, setUser] = useState(initialUser);
  const [users, setUsers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const isAdminMode = mode === 'admin';

  const fetchAdminData = async () => {
    const [tasksRes, usersRes, adminMeRes] = await Promise.all([
      fetch('/api/tasks', { method: 'GET' }),
      fetch('/api/employees', { method: 'GET' }),
      fetch('/api/admin/me', { method: 'GET' }),
    ]);

    const tasksJson = await tasksRes.json();
    const usersJson = await usersRes.json();
    const adminMeJson = await adminMeRes.json();

    if (!tasksRes.ok) {
      throw new Error(tasksJson.error || 'Failed to fetch tasks');
    }

    if (!usersRes.ok) {
      throw new Error(usersJson.error || 'Failed to fetch team members');
    }

    if (!adminMeRes.ok) {
      if (adminMeRes.status === 401 || adminMeRes.status === 403) {
        setUser(null);
        setTasks([]);
        setUsers([]);
        return;
      }
      throw new Error(adminMeJson.error || 'Failed to fetch admin profile');
    }

    const nextUsers = normalizeUsers(usersJson.employees || []);
    const adminId = adminMeJson?.admin?.id || null;
    const nextTasks = (tasksJson.tasks || []).map((task) => normalizeTask(task, [], adminId));

    if (adminMeJson?.admin) {
      setUser(adminMeJson.admin);
    } else if (!user && initialUser) {
      setUser(initialUser);
    }

    setUsers(nextUsers);
    setTasks(nextTasks);
  };

  const fetchEmployeeData = async () => {
    const response = await fetch('/api/employee/tasks', { method: 'GET' });
    const result = await response.json();

    if (!response.ok) {
      if (response.status === 401) {
        setUser(null);
        setTasks([]);
        setUsers([]);
        return;
      }
      throw new Error(result.error || 'Failed to fetch employee tasks');
    }

    const employee = result.employee || null;
    const rawTasks = result.tasks || [];
    const nextTasks = rawTasks.map((task) => normalizeTask(task, employee?.id ? [employee.id] : [], employee?.id || null));
    const nextUsers = Array.isArray(result.members)
      ? normalizeUsers(result.members)
      : deriveSharedUsersFromTasks(rawTasks, employee);

    setUser(
      employee
        ? {
            id: employee.id,
            name: employee.name,
            email: employee.email,
            role: employee.role || 'Employee',
            avatar: employee.profile_picture_url || '',
          }
        : null
    );
    setTasks(nextTasks);
    setUsers(nextUsers);
  };

  const refreshData = async () => {
    setLoading(true);
    setError('');
    try {
      if (isAdminMode) {
        await fetchAdminData();
      } else {
        await fetchEmployeeData();
      }
    } catch (err) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdminMode]);

  const login = async ({ identifier, password }) => {
    setError('');
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: identifier, password }),
    });

    const result = await response.json();

    if (!response.ok) {
      const message = result.error || 'Invalid credentials';
      setError(message);
      return { success: false, error: message };
    }

    if (result.role === 'admin') {
      if (typeof window !== 'undefined') {
        window.location.href = '/admin';
      }
      return { success: true, role: 'admin' };
    }

    await refreshData();
    return { success: true, role: result.role || 'employee' };
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/signout', {
        method: 'POST',
      });
    } finally {
      setUser(null);
      setTasks([]);
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
  };

  const updateAvatar = async (file) => {
    if (!file) {
      return { success: false, error: 'Please choose an image file' };
    }

    const formData = new FormData();
    formData.set('avatar', file);

    const endpoint = isAdminMode ? '/api/admin/avatar' : '/api/employee/avatar';
    const response = await fetch(endpoint, {
      method: 'POST',
      body: formData,
    });

    const result = await response.json();

    if (!response.ok) {
      const message = result.error || 'Failed to update avatar';
      setError(message);
      return { success: false, error: message };
    }

    const nextAvatar = result.avatarUrl || '';

    setUser((prev) => (prev ? { ...prev, avatar: nextAvatar } : prev));

    if (!isAdminMode) {
      setUsers((prev) =>
        prev.map((member) =>
          member.id === result.employeeId ? { ...member, avatar: nextAvatar } : member
        )
      );
    }

    return { success: true, avatarUrl: nextAvatar };
  };

  const addTask = async (newTask) => {
    const dueDateISO = newTask?.dueDate ? new Date(newTask.dueDate).toISOString() : null;

    const response = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        taskName: newTask.title,
        description: newTask.description,
        priority: String(newTask.priority || 'Medium').toLowerCase(),
        dueDate: dueDateISO,
        assignedMembers: newTask.assignees || [],
        attachments: Array.isArray(newTask.attachments) ? newTask.attachments : [],
        subtasks: (newTask.subtasks || []).map((subtask) => ({
          title: subtask.title,
          is_completed: !!subtask.completed,
          assigned_employee_id: subtask.assigned_employee_id || null,
        })),
      }),
    });

    const result = await response.json();
    if (!response.ok) {
      const message = result.error || 'Failed to create task';
      setError(message);
      return { success: false, error: message };
    }

    await refreshData();
    return { success: true };
  };

  const updateTaskStatus = async (taskId, nextStatusLabel) => {
    const nextStatusApi = STATUS_TO_API[nextStatusLabel] || 'pending';
    const previousTasks = tasks;

    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId
          ? { ...task, status: nextStatusLabel, rawStatus: nextStatusApi }
          : task
      )
    );

    const endpoint = isAdminMode ? `/api/tasks/${taskId}` : '/api/employee/tasks';
    const payload = isAdminMode
      ? { status: nextStatusApi }
      : { taskId, status: nextStatusApi };

    const response = await fetch(endpoint, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (!response.ok) {
      setTasks(previousTasks);
      const message = result.error || 'Failed to update task status';
      setError(message);
      return { success: false, error: message };
    }

    return { success: true };
  };

  const deleteTask = async (taskId) => {
    if (!isAdminMode) {
      return { success: false, error: 'Only admins can delete tasks' };
    }

    const response = await fetch(`/api/tasks?id=${taskId}`, {
      method: 'DELETE',
    });
    const result = await response.json();

    if (!response.ok) {
      const message = result.error || 'Failed to delete task';
      setError(message);
      return { success: false, error: message };
    }

    setTasks((prev) => prev.filter((task) => task.id !== taskId));
    return { success: true };
  };

  const getTasksByStatus = (status) => {
    if (status === 'All') return tasks;
    return tasks.filter((t) => t.status === status);
  };

  const value = {
    ...EMPTY_STATE,
    user,
    users,
    tasks,
    loading,
    error,
    login,
    logout,
    refreshData,
    updateAvatar,
    addTask,
    updateTaskStatus,
    deleteTask,
    getTasksByStatus,
    isAdminMode,
    setError,
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}
