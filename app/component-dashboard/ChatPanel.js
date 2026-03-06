'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, Send } from 'lucide-react';
import Image from 'next/image';
import { createClient } from '@/utils/supabase/client';

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

export default function ChatPanel() {
  const supabaseRef = useRef(null);
  const [actor, setActor] = useState(null);
  const [threads, setThreads] = useState([]);
  const [selectedThreadId, setSelectedThreadId] = useState('');
  const [messages, setMessages] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [error, setError] = useState('');

  const bottomRef = useRef(null);

  if (!supabaseRef.current) {
    supabaseRef.current = createClient();
  }

  const selectedThread = useMemo(
    () => threads.find((thread) => thread.id === selectedThreadId) || null,
    [threads, selectedThreadId]
  );

  const refreshBootstrap = async () => {
    const response = await fetch('/api/chat/bootstrap', { method: 'GET' });
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to load chat');
    }

    setActor(result.actor || null);
    setThreads(result.threads || []);

    const nextSelectedId = selectedThreadId && (result.threads || []).some((thread) => thread.id === selectedThreadId)
      ? selectedThreadId
      : (result.threads?.[0]?.id || '');

    setSelectedThreadId(nextSelectedId);

    return nextSelectedId;
  };

  const loadMessages = async (threadId) => {
    if (!threadId) {
      setMessages([]);
      return;
    }

    const response = await fetch(`/api/chat/threads/${threadId}/messages`, { method: 'GET' });
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to load messages');
    }

    setMessages(result.messages || []);
  };

  const markRead = async (threadId) => {
    if (!threadId) return;

    try {
      await fetch(`/api/chat/threads/${threadId}/read`, {
        method: 'PATCH',
      });
    } catch {
      // no-op; unread gets repaired on next bootstrap
    }
  };

  const openThread = async (threadId) => {
    setSelectedThreadId(threadId);
    setError('');
    try {
      await loadMessages(threadId);
      await markRead(threadId);
      setThreads((prev) =>
        prev.map((thread) =>
          thread.id === threadId ? { ...thread, unreadCount: 0 } : thread
        )
      );
    } catch (loadError) {
      setError(loadError.message || 'Failed to open thread');
    }
  };

  useEffect(() => {
    let mounted = true;

    const run = async () => {
      setLoading(true);
      setError('');
      try {
        const threadId = await refreshBootstrap();
        if (mounted && threadId) {
          await loadMessages(threadId);
          await markRead(threadId);
          setThreads((prev) =>
            prev.map((thread) =>
              thread.id === threadId ? { ...thread, unreadCount: 0 } : thread
            )
          );
        }
      } catch (loadError) {
        if (mounted) {
          setError(loadError.message || 'Failed to load chat');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    run();

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/chat/users?query=${encodeURIComponent(searchQuery)}`, {
          method: 'GET',
          signal: controller.signal,
        });
        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || 'Failed to search users');
        }
        setSearchResults(result.users || []);
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
  }, [searchQuery]);

  useEffect(() => {
    const supabase = supabaseRef.current;
    let channel = null;
    let fallbackTimer = null;
    let mounted = true;

    const startFallbackPolling = () => {
      if (fallbackTimer) return;
      fallbackTimer = setInterval(async () => {
        if (!mounted) return;
        try {
          const currentSelected = selectedThreadId;
          await refreshBootstrap();
          if (currentSelected) {
            await loadMessages(currentSelected);
          }
        } catch {
          // Silent fallback retry loop.
        }
      }, 5000);
    };

    const stopFallbackPolling = () => {
      if (fallbackTimer) {
        clearInterval(fallbackTimer);
        fallbackTimer = null;
      }
    };

    const setupRealtime = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const accessToken = session?.access_token;
      if (!accessToken) {
        startFallbackPolling();
        return;
      }

      await supabase.realtime.setAuth(accessToken);

      channel = supabase
        .channel('chat-messages-feed')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'chat_messages' },
          async (payload) => {
            const incoming = payload.new;
            if (!incoming?.thread_id) return;

            setThreads((prev) => {
              const exists = prev.some((thread) => thread.id === incoming.thread_id);
              if (!exists) return prev;

              return prev.map((thread) => {
                if (thread.id !== incoming.thread_id) return thread;

                const isMine = incoming.sender_key === actor?.key;
                const nextUnread =
                  incoming.thread_id === selectedThreadId || isMine
                    ? 0
                    : (thread.unreadCount || 0) + 1;

                return {
                  ...thread,
                  lastMessage: incoming,
                  lastMessageAt: incoming.created_at,
                  unreadCount: nextUnread,
                };
              });
            });

            if (incoming.thread_id === selectedThreadId) {
              setMessages((prev) => {
                const exists = prev.some((message) => message.id === incoming.id);
                if (exists) return prev;
                return [...prev, incoming];
              });
              await markRead(incoming.thread_id);
            }
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            stopFallbackPolling();
            return;
          }

          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            startFallbackPolling();
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

    setupRealtime();

    return () => {
      mounted = false;
      stopFallbackPolling();
      authSubscription.unsubscribe();
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [actor?.key, selectedThreadId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const startChatWithUser = async (targetKey) => {
    try {
      const response = await fetch('/api/chat/threads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetKey }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to start chat');
      }

      const thread = result.thread;
      setThreads((prev) => {
        const exists = prev.some((item) => item.id === thread.id);
        if (exists) return prev;
        return [thread, ...prev];
      });
      setSearchQuery('');
      setSearchResults([]);
      await openThread(thread.id);
    } catch (threadError) {
      setError(threadError.message || 'Failed to start chat');
    }
  };

  const sendMessage = async () => {
    const content = messageText.trim();
    if (!content || !selectedThreadId || sending) return;

    setSending(true);
    setError('');

    const optimisticId = `temp-${Date.now()}`;
    const optimisticMessage = {
      id: optimisticId,
      thread_id: selectedThreadId,
      sender_key: actor?.key,
      sender_name: actor?.name,
      sender_avatar_url: actor?.avatarUrl || '',
      content,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    setMessageText('');

    try {
      const response = await fetch(`/api/chat/threads/${selectedThreadId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to send message');
      }

      setMessages((prev) =>
        prev.map((message) => (message.id === optimisticId ? result.message : message))
      );

      setThreads((prev) =>
        prev.map((thread) =>
          thread.id === selectedThreadId
            ? {
                ...thread,
                lastMessage: result.message,
                lastMessageAt: result.message.created_at,
                unreadCount: 0,
              }
            : thread
        )
      );
    } catch (sendError) {
      setMessages((prev) => prev.filter((message) => message.id !== optimisticId));
      setMessageText(content);
      setError(sendError.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-slate-500">Loading chat...</div>;
  }

  return (
    <div className="h-[calc(100vh-0px)] bg-slate-50 p-6">
      <div className="mx-auto grid h-full max-w-7xl gap-4 rounded-xl border border-slate-200 bg-white p-4 lg:grid-cols-[320px_1fr]">
        <aside className="flex h-full flex-col border-r border-slate-100 pr-3">
          <h2 className="mb-3 text-lg font-semibold text-slate-900">Chat</h2>

          <div className="relative mb-3">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Find people..."
              className="w-full rounded-lg border border-slate-200 px-9 py-2 text-sm outline-none focus:border-[#7F40EE]"
            />
          </div>

          {searchResults.length > 0 && (
            <div className="mb-3 max-h-44 space-y-2 overflow-y-auto rounded-lg border border-slate-100 p-2">
              {searchResults.map((user) => (
                <button
                  type="button"
                  key={user.key}
                  onClick={() => startChatWithUser(user.key)}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left hover:bg-slate-50"
                >
                  <Avatar user={user} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-800">{user.name}</p>
                    <p className="truncate text-xs text-slate-500">{user.email || user.type}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          <div className="min-h-0 flex-1 space-y-1 overflow-y-auto">
            {threads.map((thread) => (
              <button
                type="button"
                key={thread.id}
                onClick={() => openThread(thread.id)}
                className={`w-full rounded-lg border px-2 py-2 text-left transition-colors ${
                  selectedThreadId === thread.id
                    ? 'border-[#7F40EE]/40 bg-[#7F40EE]/5'
                    : 'border-transparent hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Avatar user={thread.peer} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold text-slate-900">{thread.peer?.name || 'Unknown'}</p>
                      <span className="text-[10px] text-slate-400">{formatThreadTime(thread.lastMessageAt)}</span>
                    </div>
                    <p className="truncate text-xs text-slate-500">{thread.lastMessage?.content || 'No messages yet'}</p>
                  </div>
                  {thread.unreadCount > 0 && (
                    <span className="rounded-full bg-[#7F40EE] px-2 py-0.5 text-[10px] font-semibold text-white">
                      {thread.unreadCount}
                    </span>
                  )}
                </div>
              </button>
            ))}
            {threads.length === 0 && <p className="px-2 py-4 text-sm text-slate-500">No threads yet.</p>}
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
                          mine ? 'bg-[#7F40EE] text-white' : 'bg-slate-100 text-slate-800'
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
                  className="max-h-32 min-h-10 flex-1 resize-y rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#7F40EE]"
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault();
                      sendMessage();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={sendMessage}
                  disabled={sending || !messageText.trim()}
                  className="inline-flex h-10 items-center justify-center rounded-lg bg-[#7F40EE] px-4 text-white hover:bg-[#6A31D1] disabled:opacity-60"
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
