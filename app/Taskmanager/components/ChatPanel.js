'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, Send } from 'lucide-react';
import Image from 'next/image';
import { createClient } from '@/utils/supabase/client';
import {
  compactMessages,
  loadWarmSnapshot,
  mergeMessages,
  readMessages,
  readThreads,
  readUsers,
  removeMessage,
  replaceMessage,
  setLastActiveActor,
  setLastSelectedThread,
  upsertMessage,
  writeMessages,
  writeThreads,
  writeUsers,
} from '@/utils/chat-cache';

function formatTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatThreadTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function Avatar({ user }) {
  const initial = user?.name?.trim()?.charAt(0)?.toUpperCase() || 'U';

  if (user?.avatarUrl) {
    return (
      <Image
        src={user.avatarUrl}
        alt={user.name || 'User'}
        width={36}
        height={36}
        className="h-9 w-9 rounded-full object-cover"
        unoptimized
      />
    );
  }

  return (
    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-700">
      {initial}
    </div>
  );
}

function mergeUsers(base = [], incoming = []) {
  const map = new Map();
  for (const user of base) {
    if (user?.key) map.set(user.key, user);
  }
  for (const user of incoming) {
    if (user?.key) map.set(user.key, { ...map.get(user.key), ...user });
  }
  return Array.from(map.values());
}

function mergeThreads(base = [], incoming = []) {
  const map = new Map();
  for (const thread of base) {
    if (thread?.id) map.set(thread.id, thread);
  }
  for (const thread of incoming) {
    if (thread?.id) map.set(thread.id, { ...map.get(thread.id), ...thread });
  }

  return Array.from(map.values()).sort((a, b) => {
    const aTs = String(a?.lastMessageAt || '');
    const bTs = String(b?.lastMessageAt || '');
    return bTs.localeCompare(aTs);
  });
}

export default function ChatPanel() {
  const supabaseRef = useRef(null);
  const selectedThreadIdRef = useRef('');
  const actorKeyRef = useRef('');
  const loadRequestRef = useRef(0);
  const fallbackTimerRef = useRef(null);
  const fallbackDelayRef = useRef(2000);
  const isMountedRef = useRef(true);
  const bottomRef = useRef(null);

  const [actor, setActor] = useState(null);
  const [threads, setThreads] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [selectedThreadId, setSelectedThreadId] = useState('');
  const [messages, setMessages] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [remoteSearchResults, setRemoteSearchResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [error, setError] = useState('');

  if (!supabaseRef.current) {
    supabaseRef.current = createClient();
  }

  const selectedThread = useMemo(
    () => threads.find((thread) => thread.id === selectedThreadId) || null,
    [threads, selectedThreadId]
  );

  const threadByPeerKey = useMemo(() => {
    const map = new Map();
    for (const thread of threads) {
      if (thread?.peer?.key) {
        map.set(thread.peer.key, thread);
      }
    }
    return map;
  }, [threads]);

  const peopleList = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const localFiltered = !query
      ? allUsers
      : allUsers.filter((user) => {
          const name = String(user?.name || '').toLowerCase();
          const email = String(user?.email || '').toLowerCase();
          return name.includes(query) || email.includes(query);
        });

    const mergedSource = query ? mergeUsers(localFiltered, remoteSearchResults) : allUsers;

    return mergedSource
      .map((user) => ({
        ...user,
        thread: threadByPeerKey.get(user.key) || null,
      }))
      .sort((a, b) => {
        const aTime = a.thread?.lastMessageAt || '';
        const bTime = b.thread?.lastMessageAt || '';
        if (aTime && bTime) return bTime.localeCompare(aTime);
        if (aTime) return -1;
        if (bTime) return 1;
        return (a.name || '').localeCompare(b.name || '');
      });
  }, [allUsers, remoteSearchResults, searchQuery, threadByPeerKey]);

  const fetchBootstrap = async () => {
    const response = await fetch('/Taskmanager/api/chat/bootstrap', { method: 'GET' });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || 'Failed to load chat');
    }
    return result;
  };

  const fetchUsers = async (query = '') => {
    const response = await fetch(`/Taskmanager/api/chat/users?query=${encodeURIComponent(query)}`, { method: 'GET' });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || 'Failed to load users');
    }
    return result.users || [];
  };

  const fetchMessages = async (threadId) => {
    const response = await fetch(`/Taskmanager/api/chat/threads/${threadId}/messages`, { method: 'GET' });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || 'Failed to load messages');
    }
    return result.messages || [];
  };

  const markRead = async (threadId) => {
    if (!threadId) return;
    try {
      await fetch(`/Taskmanager/api/chat/threads/${threadId}/read`, { method: 'PATCH' });
    } catch {
      // no-op
    }
  };

  const applyThreads = async (nextThreads, source = 'unknown') => {
    setThreads(nextThreads);
    if (actorKeyRef.current) {
      await writeThreads(actorKeyRef.current, nextThreads, source);
      await compactMessages(
        actorKeyRef.current,
        nextThreads.slice(0, 40).map((thread) => thread.id)
      );
    }
  };

  const applyUsers = async (nextUsers, source = 'unknown') => {
    setAllUsers(nextUsers);
    if (actorKeyRef.current) {
      await writeUsers(actorKeyRef.current, nextUsers, source);
    }
  };

  const applyMessagesForActiveThread = async (threadId, nextMessages, source = 'unknown') => {
    if (selectedThreadIdRef.current === threadId) {
      setMessages(nextMessages);
    }

    if (actorKeyRef.current && threadId) {
      await writeMessages(actorKeyRef.current, threadId, nextMessages, source);
      await setLastSelectedThread(actorKeyRef.current, threadId);
    }
  };

  const syncActiveThreadFromNetwork = async (threadId) => {
    if (!threadId) return;

    const requestId = ++loadRequestRef.current;
    const networkMessages = await fetchMessages(threadId);

    if (requestId !== loadRequestRef.current) return;
    if (selectedThreadIdRef.current !== threadId) return;

    const cached = actorKeyRef.current ? await readMessages(actorKeyRef.current, threadId) : [];
    const merged = mergeMessages(cached, networkMessages);
    await applyMessagesForActiveThread(threadId, merged, 'network-sync');
    await markRead(threadId);

    setThreads((prev) => {
      const next = prev.map((thread) => (thread.id === threadId ? { ...thread, unreadCount: 0 } : thread));
      void applyThreads(next, 'mark-read-sync');
      return next;
    });
  };

  const openThread = async (threadId) => {
    if (!threadId) return;

    setError('');
    setSelectedThreadId(threadId);
    selectedThreadIdRef.current = threadId;
    setMessages([]);

    if (actorKeyRef.current) {
      await setLastSelectedThread(actorKeyRef.current, threadId);
      const cached = await readMessages(actorKeyRef.current, threadId);
      if (selectedThreadIdRef.current === threadId && cached.length > 0) {
        setMessages(cached);
      }
    }

    try {
      await syncActiveThreadFromNetwork(threadId);
    } catch (loadError) {
      setError(loadError.message || 'Failed to open thread');
    }
  };

  const createOrOpenThreadForUser = async (targetKey) => {
    const existing = threadByPeerKey.get(targetKey);
    if (existing) {
      await openThread(existing.id);
      return;
    }

    const response = await fetch('/Taskmanager/api/chat/threads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetKey }),
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || 'Failed to start chat');
    }

    const thread = result.thread;
    const nextThreads = mergeThreads(threads, [thread]);
    await applyThreads(nextThreads, 'thread-create');
    await openThread(thread.id);
  };

  const syncFromNetwork = async ({ preserveSelection = true } = {}) => {
    const syncStart = performance.now();

    const bootstrap = await fetchBootstrap();

    const actorFromApi = bootstrap.actor || null;
    const actorKey = actorFromApi?.key || '';

    setActor(actorFromApi);
    actorKeyRef.current = actorKey;

    if (actorKey) {
      await setLastActiveActor(actorKey);
    }

    const mergedThreads = mergeThreads([], bootstrap.threads || []);
    await applyThreads(mergedThreads, 'bootstrap');

    const networkUsers = await fetchUsers('');
    const mergedUsers = mergeUsers([], networkUsers);
    await applyUsers(mergedUsers, 'users-bootstrap');

    const preferredThreadId = preserveSelection ? selectedThreadIdRef.current : '';
    const nextSelected = preferredThreadId && mergedThreads.some((thread) => thread.id === preferredThreadId)
      ? preferredThreadId
      : (mergedThreads[0]?.id || '');

    setSelectedThreadId(nextSelected);
    selectedThreadIdRef.current = nextSelected;

    if (nextSelected) {
      const cached = actorKey ? await readMessages(actorKey, nextSelected) : [];
      if (cached.length > 0) {
        setMessages(cached);
      }
      await syncActiveThreadFromNetwork(nextSelected);
    } else {
      setMessages([]);
    }

    const syncMs = Math.round(performance.now() - syncStart);
    console.debug('[chat-cache]', 'networkSyncMs', { syncMs });
  };

  const stopFallbackPolling = () => {
    if (fallbackTimerRef.current) {
      clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }
  };

  const scheduleFallbackPolling = () => {
    if (fallbackTimerRef.current) return;

    const run = async () => {
      if (!isMountedRef.current) return;

      try {
        await syncFromNetwork({ preserveSelection: true });
        fallbackDelayRef.current = 2000;
      } catch {
        fallbackDelayRef.current = Math.min(fallbackDelayRef.current * 2, 20000);
      }

      if (!isMountedRef.current) return;

      fallbackTimerRef.current = setTimeout(run, fallbackDelayRef.current);
    };

    fallbackTimerRef.current = setTimeout(run, fallbackDelayRef.current);
  };

  const sendMessage = async () => {
    const content = messageText.trim();
    const currentThreadId = selectedThreadIdRef.current;

    if (!content || !currentThreadId || sending) return;

    setSending(true);
    setError('');

    const optimisticId = `temp-${Date.now()}`;
    const optimisticMessage = {
      id: optimisticId,
      thread_id: currentThreadId,
      sender_key: actor?.key,
      sender_name: actor?.name,
      sender_avatar_url: actor?.avatarUrl || '',
      content,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => {
      const next = [...prev, optimisticMessage];
      void applyMessagesForActiveThread(currentThreadId, next, 'optimistic');
      return next;
    });
    setMessageText('');

    try {
      const response = await fetch(`/Taskmanager/api/chat/threads/${currentThreadId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to send message');
      }

      const nextMessages = mergeMessages(messages, [result.message]);
      setMessages((prev) => prev.map((msg) => (msg.id === optimisticId ? result.message : msg)));
      await replaceMessage(actorKeyRef.current, currentThreadId, optimisticId, result.message);

      setThreads((prev) => {
        const next = prev.map((thread) =>
          thread.id === currentThreadId
            ? {
                ...thread,
                lastMessage: result.message,
                lastMessageAt: result.message.created_at,
                unreadCount: 0,
              }
            : thread
        );
        void applyThreads(next, 'send-message');
        return next;
      });

      await applyMessagesForActiveThread(currentThreadId, nextMessages, 'send-message');
    } catch (sendError) {
      setMessages((prev) => prev.filter((message) => message.id !== optimisticId));
      await removeMessage(actorKeyRef.current, currentThreadId, optimisticId);
      setMessageText(content);
      setError(sendError.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    isMountedRef.current = true;

    const boot = async () => {
      const hydrateStart = performance.now();
      setLoading(true);
      setError('');

      try {
        const warm = await loadWarmSnapshot();

        if (warm) {
          actorKeyRef.current = warm.actorKey || '';
          const warmActor = warm.actorKey
            ? {
                key: warm.actorKey,
                type: warm.actorKey.startsWith('admin:') ? 'admin' : 'employee',
                name: 'Loading...',
                email: '',
                avatarUrl: '',
              }
            : null;

          setActor(warmActor);
          setThreads(warm.threads || []);
          setAllUsers(warm.users || []);
          setSelectedThreadId(warm.selectedThreadId || '');
          selectedThreadIdRef.current = warm.selectedThreadId || '';
          setMessages(warm.messages || []);

          const hydrateMs = Math.round(performance.now() - hydrateStart);
          console.debug('[chat-cache]', 'hydrateMs', { hydrateMs, warmThreads: warm.threads.length, warmUsers: warm.users.length });

          setLoading(false);
        }

        await syncFromNetwork({ preserveSelection: true });
        setLoading(false);
      } catch (loadError) {
        setError(loadError.message || 'Failed to load chat');
        setLoading(false);
      }
    };

    void boot();

    return () => {
      isMountedRef.current = false;
      stopFallbackPolling();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    selectedThreadIdRef.current = selectedThreadId;
  }, [selectedThreadId]);

  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setRemoteSearchResults([]);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/Taskmanager/api/chat/users?query=${encodeURIComponent(searchQuery)}`, {
          method: 'GET',
          signal: controller.signal,
        });
        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || 'Failed to search users');
        }

        if (!isMountedRef.current) return;

        const users = result.users || [];
        setRemoteSearchResults(users);
        const merged = mergeUsers(allUsers, users);
        await applyUsers(merged, 'search-revalidate');
      } catch (searchError) {
        if (searchError.name !== 'AbortError') {
          setError(searchError.message || 'Failed to search users');
        }
      }
    }, 250);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  useEffect(() => {
    const supabase = supabaseRef.current;
    let channel = null;

    const setupRealtime = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const accessToken = session?.access_token;
      if (!accessToken) {
        scheduleFallbackPolling();
        return;
      }

      await supabase.realtime.setAuth(accessToken);

      channel = supabase
        .channel('chat-messages-feed')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, async (payload) => {
          const incoming = payload.new;
          if (!incoming?.thread_id) return;

          await upsertMessage(actorKeyRef.current, incoming.thread_id, incoming, 'realtime');

          setThreads((prev) => {
            const exists = prev.some((thread) => thread.id === incoming.thread_id);
            if (!exists) return prev;

            const next = prev.map((thread) => {
              if (thread.id !== incoming.thread_id) return thread;

              const isMine = incoming.sender_key === actorKeyRef.current;
              const isActive = incoming.thread_id === selectedThreadIdRef.current;
              const nextUnread = isActive || isMine ? 0 : (thread.unreadCount || 0) + 1;

              return {
                ...thread,
                lastMessage: incoming,
                lastMessageAt: incoming.created_at,
                unreadCount: nextUnread,
              };
            });

            void applyThreads(next, 'realtime');
            return next;
          });

          if (incoming.thread_id === selectedThreadIdRef.current) {
            setMessages((prev) => {
              const next = mergeMessages(prev, [incoming]);
              void applyMessagesForActiveThread(incoming.thread_id, next, 'realtime-active');
              return next;
            });
            await markRead(incoming.thread_id);
          }
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            stopFallbackPolling();
            fallbackDelayRef.current = 2000;
            return;
          }

          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            scheduleFallbackPolling();
          }
        });
    };

    const {
      data: { subscription: authSubscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.access_token) {
        await supabase.realtime.setAuth(session.access_token);
      }
    });

    void setupRealtime();

    return () => {
      authSubscription.unsubscribe();
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (loading) {
    return <div className="p-4 text-slate-500 sm:p-6 lg:p-8">Loading chat...</div>;
  }

  return (
    <div className="h-[calc(100vh-0px)] bg-slate-50 p-3 sm:p-4 lg:p-6">
      <div className="mx-auto grid h-full max-w-7xl gap-4 rounded-xl border border-slate-200 bg-white p-3 sm:p-4 lg:grid-cols-[320px_1fr]">
        <aside className="flex h-full min-h-0 flex-col border-b border-slate-100 pb-3 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-3">
          <h2 className="mb-3 text-lg font-semibold text-slate-900">Chat</h2>

          <div className="relative mb-3">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Find people..."
              className="w-full rounded-lg border border-slate-200 px-9 py-2 text-sm outline-none focus:border-[#3170c5]"
            />
          </div>

          <div className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
            {peopleList.map((user) => {
              const thread = user.thread;
              const isActive = !!thread && thread.id === selectedThreadId;

              return (
                <button
                  type="button"
                  key={user.key}
                  onClick={() => createOrOpenThreadForUser(user.key)}
                  className={`w-full rounded-lg border px-2 py-2 text-left transition-colors ${
                    isActive ? 'border-[#3170c5]/40 bg-[#3170c5]/5' : 'border-transparent hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Avatar user={user} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-semibold text-slate-900">{user.name || 'Unknown'}</p>
                        <span className="text-[10px] text-slate-400">{formatThreadTime(thread?.lastMessageAt)}</span>
                      </div>
                      <p className="truncate text-xs text-slate-500">{thread?.lastMessage?.content || user.email || 'No messages yet'}</p>
                    </div>
                    {(thread?.unreadCount || 0) > 0 && (
                      <span className="rounded-full bg-[#3170c5] px-2 py-0.5 text-[10px] font-semibold text-white">
                        {thread.unreadCount}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}

            {peopleList.length === 0 && <p className="px-2 py-4 text-sm text-slate-500">No users found.</p>}
          </div>
        </aside>

        <section className="flex h-full min-h-0 flex-col">
          {selectedThread ? (
            <>
              <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                <Avatar user={selectedThread.peer} />
                <div>
                  <p className="text-sm font-semibold text-slate-900">{selectedThread.peer?.name}</p>
                  <p className="text-xs text-slate-500">{selectedThread.peer?.email || selectedThread.peer?.type}</p>
                </div>
              </div>

              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto py-4 pr-2">
                {messages.map((message) => {
                  const mine = message.sender_key === actor?.key;
                  return (
                    <div key={message.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[75%] rounded-xl px-3 py-2 text-sm ${
                          mine ? 'bg-[#3170c5] text-white' : 'bg-slate-100 text-slate-800'
                        }`}
                      >
                        {!mine && <p className="mb-1 text-[11px] font-semibold text-slate-500">{message.sender_name}</p>}
                        <p className="whitespace-pre-wrap break-words">{message.content}</p>
                        <p className={`mt-1 text-[10px] ${mine ? 'text-white/80' : 'text-slate-400'}`}>
                          {formatTime(message.created_at)}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>

              <div className="mt-3 flex items-end gap-2 border-t border-slate-100 pt-3">
                <textarea
                  value={messageText}
                  onChange={(event) => setMessageText(event.target.value)}
                  placeholder="Type your message..."
                  className="max-h-32 min-h-10 flex-1 resize-y rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#3170c5]"
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault();
                      void sendMessage();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => void sendMessage()}
                  disabled={sending || !messageText.trim()}
                  className="inline-flex h-10 items-center justify-center rounded-lg bg-[#3170c5] px-4 text-white hover:bg-[#2158a4] disabled:opacity-60"
                >
                  <Send size={16} />
                </button>
              </div>
            </>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-slate-500">
              Select a person to start chatting.
            </div>
          )}
        </section>
      </div>

      {error && (
        <div className="fixed bottom-4 right-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}
    </div>
  );
}
