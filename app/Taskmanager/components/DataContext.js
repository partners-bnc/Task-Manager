'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { clearCachedWorkspaceState, writeCachedWorkspaceState } from '@/app/components-homepage/workspaceAuthClient';

const DataContext = createContext(undefined);

const EMPTY_STATE = {
  user: null,
  users: [],
  tasks: [],
  taskLabels: [],
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

const formatDate = (value, options = {}) => {
  const { includeTime = false } = options;
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...(includeTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  });
};

const buildDueDateIso = (dateValue, timeValue = '') => {
  if (!dateValue) return null;
  const cleanTime = typeof timeValue === 'string' && timeValue.trim() ? timeValue.trim() : '23:59';
  const parsedDate = new Date(`${dateValue}T${cleanTime}`);
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate.toISOString();
};

const deriveDueDate = (task) => {
  if (task?.due_date) return task.due_date;
  if (!task?.created_at) return null;
  const created = new Date(task.created_at);
  if (Number.isNaN(created.getTime())) return null;
  created.setDate(created.getDate() + 5);
  return created.toISOString();
};

const getDeadlineState = (task) => {
  const dueDate = deriveDueDate(task);
  if (!dueDate) return null;

  const dueAt = new Date(dueDate);
  if (Number.isNaN(dueAt.getTime())) return null;

  const completedAt = task?.completed_at ? new Date(task.completed_at) : null;
  const hasValidCompletedAt = completedAt && !Number.isNaN(completedAt.getTime());

  if (task?.status === 'completed' && hasValidCompletedAt) {
    const withinDeadline = completedAt.getTime() <= dueAt.getTime();
    return {
      key: withinDeadline ? 'within_deadline' : 'completed_late',
      label: withinDeadline ? 'Within Deadline' : 'Completed Late',
      tone: withinDeadline ? 'success' : 'warning',
    };
  }

  if (task?.status !== 'completed' && Date.now() > dueAt.getTime()) {
    return {
      key: 'overdue',
      label: 'Late',
      tone: 'danger',
    };
  }

  return {
    key: 'within_timeline',
    label: 'Within Timeline',
    tone: 'neutral',
  };
};

const normalizeUsers = (rows = []) =>
  rows.map((row) => ({
    id: row.id,
    employee_id: row.employee_id,
    username: row.username,
    name: row.name,
    email: row.email,
    role: row.role,
    avatar: row.profile_picture_url || '',
    module_access: row.module_access || null,
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
  const checklistProgress = subtasks.length > 0 ? Math.round((completedSubtasks / subtasks.length) * 100) : 0;
  const dbProgress = Number(task?.progress_percentage);
  const progressPercentage = Number.isFinite(dbProgress)
    ? Math.min(100, Math.max(0, Math.round(dbProgress)))
    : checklistProgress;
  const assignees = Array.isArray(task.task_assignments)
    ? task.task_assignments.map((assignment) => assignment?.employee?.id).filter(Boolean)
    : fallbackAssignees;
  const isCurrentCreator =
    currentUserId && (task?.created_by === currentUserId || task?.created_by_employee_id === currentUserId);
  const createdByLabel = isCurrentCreator
    ? 'You'
    : task?.creator_name ||
      (task?.created_by ? 'Admin' : 'Employee');
  const deadlineState = getDeadlineState(task);

  return {
    id: task.id,
    title: task.task_name,
    description: task.description || '',
    label: task.label || null,
    priority: PRIORITY_LABELS[task.priority] || 'Medium',
    status: STATUS_LABELS[task.status] || 'Pending',
    startDate: formatDate(task.created_at),
    dueDate: formatDate(deriveDueDate(task), { includeTime: true }),
    frequency: task.frequency || null,
    lastCycleReset: task.last_cycle_reset || null,
    completedSubtasks,
    totalSubtasks: subtasks.length,
    progressPercentage,
    assignees,
    subtasks: subtasks.map((subtask) => ({
      id: subtask.id,
      title: subtask.title,
      completed: !!subtask.is_completed,
    })),
    attachments: Array.isArray(task.task_attachments) ? task.task_attachments.length : 0,
    createdBy: createdByLabel,
    deadlineState,
    rawStatus: task.status,
    rawPriority: task.priority,
    createdAt: task.created_at,
  };
};

export function DataProvider({ children, initialUser = null, mode = 'employee', bootstrap = true }) {
  const [user, setUser] = useState(initialUser);
  const [users, setUsers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [taskLabels, setTaskLabels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [fetchError, setFetchError] = useState('');

  const isAdminMode = mode === 'admin';

  const fetchAdminData = async () => {
    const [tasksRes, usersRes, adminMeRes, taskLabelsRes] = await Promise.all([
      fetch('/Taskmanager/api/tasks', { method: 'GET' }),
      fetch('/HRM/api/employees?taskManagerOnly=1', { method: 'GET' }),
      fetch('/Taskmanager/api/admin/me', { method: 'GET' }),
      fetch('/Taskmanager/api/task-labels', { method: 'GET' }),
    ]);

    const tasksJson = await tasksRes.json();
    const usersJson = await usersRes.json();
    const adminMeJson = await adminMeRes.json();
    const taskLabelsJson = await taskLabelsRes.json();

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
        setTaskLabels([]);
        return;
      }
      throw new Error(adminMeJson.error || 'Failed to fetch admin profile');
    }

    if (!taskLabelsRes.ok) {
      throw new Error(taskLabelsJson.error || 'Failed to fetch task labels');
    }

    const nextUsers = normalizeUsers(usersJson.employees || []);
    const adminId = adminMeJson?.admin?.id || null;
    const nextTasks = (tasksJson.tasks || []).map((task) => normalizeTask(task, [], adminId));
    const nextTaskLabels = Array.isArray(taskLabelsJson.labels)
      ? taskLabelsJson.labels.map((item) => item.name).filter(Boolean)
      : [];

    if (adminMeJson?.admin) {
      setUser(adminMeJson.admin);
    } else if (!user && initialUser) {
      setUser(initialUser);
    }

    setUsers(nextUsers);
    setTasks(nextTasks);
    setTaskLabels(nextTaskLabels);
  };

  const fetchEmployeeData = async () => {
    const [response, taskLabelsRes] = await Promise.all([
      fetch('/HRM/api/employee/tasks', { method: 'GET' }),
      fetch('/Taskmanager/api/task-labels', { method: 'GET' }),
    ]);
    const result = await response.json();
    const taskLabelsJson = await taskLabelsRes.json();

    if (!response.ok) {
      if (response.status === 401) {
        setUser(null);
        setTasks([]);
        setUsers([]);
        setTaskLabels([]);
        return;
      }
      throw new Error(result.error || 'Failed to fetch employee tasks');
    }

    if (!taskLabelsRes.ok) {
      throw new Error(taskLabelsJson.error || 'Failed to fetch task labels');
    }

    const employee = result.employee || null;
    const rawTasks = result.tasks || [];
    const nextTasks = rawTasks.map((task) => normalizeTask(task, employee?.id ? [employee.id] : [], employee?.id || null));
    const nextUsers = Array.isArray(result.members)
      ? normalizeUsers(result.members)
      : deriveSharedUsersFromTasks(rawTasks, employee);
    const nextTaskLabels = Array.isArray(taskLabelsJson.labels)
      ? taskLabelsJson.labels.map((item) => item.name).filter(Boolean)
      : [];

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
    setTaskLabels(nextTaskLabels);
  };

  const refreshData = async () => {
    setLoading(true);
    setError('');
    setFetchError('');
    try {
      if (isAdminMode) {
        await fetchAdminData();
      } else {
        await fetchEmployeeData();
      }
    } catch (err) {
      setError(err.message || 'Failed to load data');
      setFetchError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!bootstrap) {
      setLoading(false);
      setFetchError('');
      return;
    }

    refreshData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bootstrap, isAdminMode]);

  const login = async ({ identifier, password, loginAs }) => {
    setError('');
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: identifier, password, loginAs }),
    });

    const result = await response.json();

    if (!response.ok) {
      const message = result.error || 'Invalid credentials';
      setError(message);
      return { success: false, error: message };
    }

    const destination = result.destination || '/HRM/hrm';

    writeCachedWorkspaceState({
      loading: false,
      isAuthenticated: true,
      accountType: result.role || null,
      workspaceHref: result.workspaceHref || destination,
      taskManagerHref: result.taskManagerHref || '/login',
      user: result.user || result.employee || null,
      modules: result.modules || null,
    });

    if (typeof window !== 'undefined') {
      window.location.href = destination;
    }

    return { success: true, role: result.role || 'employee', destination };
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/signout', {
        method: 'POST',
      });
    } finally {
      clearCachedWorkspaceState();
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

    const endpoint = isAdminMode ? '/Taskmanager/api/admin/avatar' : '/HRM/api/employee/avatar';
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
    const dueDateISO = buildDueDateIso(newTask?.dueDate, newTask?.dueTime);

    const response = await fetch('/Taskmanager/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        taskName: newTask.title,
        description: newTask.description,
        label: newTask.label || null,
        priority: String(newTask.priority || 'Medium').toLowerCase(),
        frequency: newTask.frequency || null,
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

  const createTaskLabel = async (name) => {
    const response = await fetch('/Taskmanager/api/task-labels', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });

    const result = await response.json();

    if (!response.ok) {
      const message = result.error || 'Failed to create task label';
      setError(message);
      return { success: false, error: message };
    }

    const nextLabel = result?.label?.name || '';
    if (nextLabel) {
      setTaskLabels((prev) => Array.from(new Set([...prev, nextLabel])).sort((a, b) => a.localeCompare(b)));
    }

    return { success: true, label: nextLabel };
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

    const endpoint = isAdminMode ? `/Taskmanager/api/tasks/${taskId}` : '/HRM/api/employee/tasks';
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

    const response = await fetch(`/Taskmanager/api/tasks?id=${taskId}`, {
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
    taskLabels,
    loading,
    error,
    login,
    logout,
    refreshData,
    updateAvatar,
    addTask,
    createTaskLabel,
    updateTaskStatus,
    deleteTask,
    getTasksByStatus,
    isAdminMode,
    setError,
  };

  if (fetchError) {
    return (
      <DataContext.Provider value={value}>
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
          <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-red-100">
            <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Connection Error</h2>
            <p className="text-slate-600 mb-6">{fetchError}</p>
            <button 
              onClick={refreshData}
              className="px-6 py-2.5 bg-[#7F40EE] text-white rounded-lg font-bold hover:bg-[#6A31D1] transition-colors shadow-lg shadow-[#7F40EE]/30"
            >
              Try Again
            </button>
          </div>
        </div>
      </DataContext.Provider>
    );
  }

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
