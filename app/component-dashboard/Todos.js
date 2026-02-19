'use client';

import { useEffect, useMemo, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Trash2 } from 'lucide-react';
import { useData } from './DataContext';

const TODO_STORAGE_KEY = 'employee_todos_v1';

const readTodosByUser = () => {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(TODO_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

const writeTodosByUser = (value) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(TODO_STORAGE_KEY, JSON.stringify(value));
};

const normalizeTodo = (todo) => ({
  id: todo?.id || `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
  title: String(todo?.title || '').trim(),
  completed: !!todo?.completed,
});

export default function Todos() {
  const { user } = useData();
  const [newTodo, setNewTodo] = useState('');
  const [todos, setTodos] = useState([]);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (!user?.id) return;
    const store = readTodosByUser();
    const userTodos = Array.isArray(store[user.id]) ? store[user.id].map(normalizeTodo) : [];
    setTodos(userTodos);
    store[user.id] = userTodos;
    writeTodosByUser(store);
  }, [user?.id]);

  const persistTodos = (nextTodos) => {
    if (!user?.id) return;
    const store = readTodosByUser();
    store[user.id] = nextTodos;
    writeTodosByUser(store);
    setTodos(nextTodos);
  };

  const addTodo = () => {
    const title = newTodo.trim();
    if (!title) return;

    const nextTodos = [
      ...todos,
      {
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        title,
        completed: false,
      },
    ];
    persistTodos(nextTodos);
    setNewTodo('');
  };

  const deleteTodo = (todoId) => {
    persistTodos(todos.filter((todo) => todo.id !== todoId));
  };

  const toggleTodo = (todoId) => {
    persistTodos(
      todos.map((todo) => (todo.id === todoId ? { ...todo, completed: !todo.completed } : todo))
    );
  };

  const completedTodos = todos.filter((todo) => todo.completed).length;
  const remainingTodos = Math.max(todos.length - completedTodos, 0);

  const pieData = useMemo(
    () => [
      { name: 'Remaining', value: remainingTodos, color: '#7F40EE' },
      { name: 'Completed', value: completedTodos, color: '#84cc16' },
    ],
    [completedTodos, remainingTodos]
  );

  const filteredTodos = useMemo(() => {
    if (filter === 'remaining') return todos.filter((todo) => !todo.completed);
    if (filter === 'completed') return todos.filter((todo) => todo.completed);
    return todos;
  }, [filter, todos]);

  return (
    <div className='p-8'>
      <div className='grid grid-cols-1 lg:grid-cols-2 gap-8'>
        <div className='bg-white rounded-xl shadow-sm p-6'>
          <h3 className='font-bold text-slate-800 mb-4'>Todo Progress</h3>
          <div className='h-64'>
            <ResponsiveContainer width='100%' height='100%'>
              <PieChart>
                <Pie data={pieData} innerRadius={60} outerRadius={85} dataKey='value' paddingAngle={3}>
                  {pieData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className='mt-4 flex items-center justify-center gap-6 text-sm'>
            {pieData.map((entry) => (
              <div key={entry.name} className='flex items-center gap-2 text-slate-600'>
                <span className='h-3 w-3 rounded-full' style={{ backgroundColor: entry.color }} />
                <span>
                  {entry.name}: {entry.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className='bg-white rounded-xl shadow-sm p-6'>
          <h3 className='font-bold text-slate-800 mb-4'>+ Add Todos</h3>
          <div className='flex gap-3 mb-4'>
            <input
              value={newTodo}
              onChange={(event) => setNewTodo(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  addTodo();
                }
              }}
              placeholder='Write a todo...'
              className='flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#7F40EE]/30'
            />
            <button
              type='button'
              onClick={addTodo}
              className='rounded-lg bg-[#7F40EE] px-4 py-2 text-sm font-medium text-white hover:bg-[#6f34d5]'
            >
              Add
            </button>
          </div>

          <div className='mb-4 flex items-center gap-2'>
            {[
              { key: 'all', label: `All (${todos.length})` },
              { key: 'remaining', label: `Remaining (${remainingTodos})` },
              { key: 'completed', label: `Completed (${completedTodos})` },
            ].map((item) => (
              <button
                key={item.key}
                type='button'
                onClick={() => setFilter(item.key)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  filter === item.key
                    ? 'bg-[#7F40EE]/10 text-[#7F40EE]'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className='space-y-2 max-h-72 overflow-auto pr-1'>
            {filteredTodos.length === 0 ? (
              <p className='text-sm text-slate-500'>
                {todos.length === 0 ? 'No todos added yet.' : 'No todos in this filter.'}
              </p>
            ) : (
              filteredTodos.map((todo) => (
                <div key={todo.id} className='flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2'>
                  <label className='flex items-center gap-3'>
                    <input
                      type='checkbox'
                      checked={todo.completed}
                      onChange={() => toggleTodo(todo.id)}
                      className='h-4 w-4 accent-[#7F40EE]'
                    />
                    <p className={`text-sm ${todo.completed ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                      {todo.title}
                    </p>
                  </label>
                  <button
                    type='button'
                    onClick={() => deleteTodo(todo.id)}
                    aria-label='Delete todo'
                    className='rounded-md p-1 text-slate-500 hover:bg-red-50 hover:text-red-600'
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
