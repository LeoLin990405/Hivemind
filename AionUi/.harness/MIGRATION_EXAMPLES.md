# Migration Examples - React Query + Zustand

This document shows real-world examples of migrating from old patterns to React Query + Zustand.

## Example 1: Conversation List

### Before (Context + useState)

```typescript
// ConversationContext.tsx (OLD)
import React, { createContext, useState, useEffect, useContext } from 'react';

interface ConversationContextValue {
  conversations: Conversation[];
  loading: boolean;
  error: Error | null;
  fetchConversations: () => Promise<void>;
  createConversation: (data: any) => Promise<void>;
}

const ConversationContext = createContext<ConversationContextValue | undefined>(undefined);

export function ConversationProvider({ children }: { children: React.ReactNode }) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchConversations = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/conversations');
      const data = await response.json();
      setConversations(data.conversations);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  const createConversation = async (data: any) => {
    try {
      const response = await fetch('/api/conversations', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      const newConv = await response.json();
      setConversations((prev) => [...prev, newConv]);
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  return (
    <ConversationContext.Provider
      value={{ conversations, loading, error, fetchConversations, createConversation }}
    >
      {children}
    </ConversationContext.Provider>
  );
}

export function useConversations() {
  const context = useContext(ConversationContext);
  if (!context) throw new Error('useConversations must be within ConversationProvider');
  return context;
}

// ConversationList.tsx (OLD)
function ConversationList() {
  const { conversations, loading, error, fetchConversations } = useConversations();

  if (loading) return <Spinner />;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <button onClick={fetchConversations}>Refresh</button>
      {conversations.map((conv) => (
        <ConversationItem key={conv.id} conversation={conv} />
      ))}
    </div>
  );
}
```

### After (React Query)

```typescript
// No Context needed! Just hooks

// hooks/queries/useConversations.ts (NEW)
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/renderer/config/queryClient';
import { api } from '@/renderer/services/api';

async function fetchConversations(filters = {}) {
  const response = await api.call('conversations.list', filters);
  if (!response.success) throw new Error('Failed to fetch');
  return response.data;
}

async function createConversation(data: any) {
  const response = await api.call('conversations.create', data);
  if (!response.success) throw new Error('Failed to create');
  return response.data;
}

export function useConversations(filters = {}) {
  return useQuery({
    queryKey: queryKeys.conversations.list(filters),
    queryFn: () => fetchConversations(filters),
  });
}

export function useCreateConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createConversation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations.lists() });
    },
  });
}

// ConversationList.tsx (NEW)
import { useConversations } from '@/renderer/hooks/queries';

function ConversationList() {
  const { data, isLoading, error, refetch } = useConversations({ status: 'active' });

  if (isLoading) return <Spinner />;
  if (error) return <QueryError error={error} onRetry={refetch} />;

  return (
    <div>
      <button onClick={() => refetch()}>Refresh</button>
      {data?.conversations.map((conv) => (
        <ConversationItem key={conv.id} conversation={conv} />
      ))}
    </div>
  );
}
```

**Benefits:**
- ✅ No Context provider needed
- ✅ Automatic caching
- ✅ Automatic background refetch
- ✅ Less boilerplate (50% less code)
- ✅ Better TypeScript support
- ✅ Built-in loading/error states

## Example 2: Sidebar State

### Before (useState)

```typescript
// Sidebar.tsx (OLD)
function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);

  // Problem: State is lost when component unmounts
  // Problem: Can't share state with other components
  // Problem: Need manual localStorage sync

  useEffect(() => {
    const saved = localStorage.getItem('sidebarCollapsed');
    if (saved) setCollapsed(JSON.parse(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', JSON.stringify(collapsed));
  }, [collapsed]);

  return (
    <div className={collapsed ? 'w-16' : 'w-64'}>
      <button onClick={() => setCollapsed(!collapsed)}>
        Toggle
      </button>
    </div>
  );
}

// Header.tsx (OLD)
function Header() {
  // Problem: Can't access sidebar state from here!
  // Need to lift state up or use Context

  return <div>Header</div>;
}
```

### After (Zustand)

```typescript
// stores/uiStore.ts (NEW)
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIState {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
    }),
    { name: 'ui-store' } // Automatic localStorage sync
  )
);

// Sidebar.tsx (NEW)
import { useUIStore } from '@/renderer/stores';

function Sidebar() {
  const collapsed = useUIStore((state) => state.sidebarCollapsed);
  const toggle = useUIStore((state) => state.toggleSidebar);

  return (
    <div className={collapsed ? 'w-16' : 'w-64'}>
      <button onClick={toggle}>Toggle</button>
    </div>
  );
}

// Header.tsx (NEW)
function Header() {
  const collapsed = useUIStore((state) => state.sidebarCollapsed);
  const toggle = useUIStore((state) => state.toggleSidebar);

  return (
    <div>
      <button onClick={toggle}>
        {collapsed ? 'Expand' : 'Collapse'} Sidebar
      </button>
    </div>
  );
}
```

**Benefits:**
- ✅ Automatic persistence
- ✅ Share state across components
- ✅ No Context provider needed
- ✅ No manual localStorage sync
- ✅ Better performance (only re-renders when used value changes)

## Example 3: Message Input with Draft

### Before (useState + useEffect)

```typescript
// MessageInput.tsx (OLD)
function MessageInput({ conversationId }: { conversationId: string }) {
  const [draft, setDraft] = useState('');

  // Problem: Draft is lost when switching conversations
  // Problem: Need manual localStorage for each conversation

  useEffect(() => {
    const saved = localStorage.getItem(`draft-${conversationId}`);
    if (saved) setDraft(saved);
  }, [conversationId]);

  useEffect(() => {
    localStorage.setItem(`draft-${conversationId}`, draft);
  }, [draft, conversationId]);

  const handleSend = async () => {
    try {
      await fetch('/api/messages', {
        method: 'POST',
        body: JSON.stringify({ conversationId, content: draft }),
      });
      setDraft('');
      localStorage.removeItem(`draft-${conversationId}`);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div>
      <textarea value={draft} onChange={(e) => setDraft(e.target.value)} />
      <button onClick={handleSend}>Send</button>
    </div>
  );
}
```

### After (Zustand + React Query)

```typescript
// stores/conversationStore.ts (NEW)
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ConversationState {
  drafts: Record<string, string>;
  saveDraft: (conversationId: string, content: string) => void;
  getDraft: (conversationId: string) => string;
  clearDraft: (conversationId: string) => void;
}

export const useConversationStore = create<ConversationState>()(
  persist(
    (set, get) => ({
      drafts: {},
      saveDraft: (conversationId, content) =>
        set((state) => ({
          drafts: { ...state.drafts, [conversationId]: content },
        })),
      getDraft: (conversationId) => get().drafts[conversationId] || '',
      clearDraft: (conversationId) =>
        set((state) => {
          const { [conversationId]: _, ...rest } = state.drafts;
          return { drafts: rest };
        }),
    }),
    { name: 'conversation-store' }
  )
);

// MessageInput.tsx (NEW)
import { useConversationStore } from '@/renderer/stores';
import { useCreateMessage } from '@/renderer/hooks/queries';

function MessageInput({ conversationId }: { conversationId: string }) {
  const draft = useConversationStore((state) => state.getDraft(conversationId));
  const saveDraft = useConversationStore((state) => state.saveDraft);
  const clearDraft = useConversationStore((state) => state.clearDraft);
  const createMessage = useCreateMessage();

  const handleSend = async () => {
    if (!draft.trim()) return;

    try {
      await createMessage.mutateAsync({
        conversationId,
        content: draft,
        role: 'user',
      });
      clearDraft(conversationId);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div>
      <textarea
        value={draft}
        onChange={(e) => saveDraft(conversationId, e.target.value)}
      />
      <button onClick={handleSend} disabled={createMessage.isPending}>
        {createMessage.isPending ? 'Sending...' : 'Send'}
      </button>
    </div>
  );
}
```

**Benefits:**
- ✅ Drafts automatically saved for all conversations
- ✅ Drafts persist across page reloads
- ✅ No manual localStorage management
- ✅ Loading state from mutation
- ✅ Automatic cache update after send

## Example 4: User Authentication

### Before (AuthContext)

```typescript
// AuthContext.tsx (OLD)
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const fetchCurrentUser = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/auth/me');
      const data = await response.json();
      setUser(data.user);
    } catch (err) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (credentials: any) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    const data = await response.json();
    setUser(data.user);
  };

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
```

### After (React Query)

```typescript
// hooks/queries/useAuth.ts (NEW)
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

async function fetchCurrentUser() {
  const response = await api.call('auth.me');
  return response.data || null;
}

async function loginMutation(credentials: any) {
  const response = await api.call('auth.login', credentials);
  if (!response.success) throw new Error('Login failed');
  return response.data;
}

async function logoutMutation() {
  await api.call('auth.logout');
}

export function useCurrentUser() {
  return useQuery({
    queryKey: ['auth', 'me'],
    queryFn: fetchCurrentUser,
    retry: false,
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: loginMutation,
    onSuccess: (data) => {
      queryClient.setQueryData(['auth', 'me'], data.user);
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: logoutMutation,
    onSuccess: () => {
      queryClient.clear(); // Clear all caches
    },
  });
}

// Usage (NEW)
function Header() {
  const { data: user, isLoading } = useCurrentUser();
  const logout = useLogout();

  if (isLoading) return <Spinner />;

  return (
    <div>
      {user ? (
        <>
          <span>Welcome, {user.username}</span>
          <button onClick={() => logout.mutate()}>Logout</button>
        </>
      ) : (
        <Link to="/login">Login</Link>
      )}
    </div>
  );
}
```

**Benefits:**
- ✅ No Context provider needed
- ✅ Automatic caching of user data
- ✅ Automatic refetch on reconnect
- ✅ Clear all data on logout
- ✅ Better error handling

## Example 5: Optimistic Updates

### Before (Manual state update)

```typescript
// SkillToggle.tsx (OLD)
function SkillToggle({ skill }: { skill: Skill }) {
  const [enabled, setEnabled] = useState(skill.enabled);
  const [loading, setLoading] = useState(false);

  const handleToggle = async () => {
    const newEnabled = !enabled;
    const previousEnabled = enabled;

    // Optimistically update UI
    setEnabled(newEnabled);
    setLoading(true);

    try {
      await fetch(`/api/skills/${skill.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ enabled: newEnabled }),
      });
    } catch (err) {
      // Rollback on error
      setEnabled(previousEnabled);
      alert('Failed to toggle skill');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Switch
      checked={enabled}
      onChange={handleToggle}
      disabled={loading}
    />
  );
}
```

### After (React Query with optimistic update)

```typescript
// hooks/queries/useSkills.ts (NEW)
export function useToggleSkill() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      updateSkill(id, { enabled }),
    onMutate: async ({ id, enabled }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.skills.detail(id) });
      const previousSkill = queryClient.getQueryData(queryKeys.skills.detail(id));

      // Optimistic update
      queryClient.setQueryData(queryKeys.skills.detail(id), (old: Skill) => ({
        ...old,
        enabled,
      }));

      return { previousSkill };
    },
    onError: (err, { id }, context) => {
      // Automatic rollback
      if (context?.previousSkill) {
        queryClient.setQueryData(queryKeys.skills.detail(id), context.previousSkill);
      }
    },
    onSettled: (_, __, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.skills.detail(id) });
    },
  });
}

// SkillToggle.tsx (NEW)
function SkillToggle({ skill }: { skill: Skill }) {
  const toggleSkill = useToggleSkill();

  return (
    <Switch
      checked={skill.enabled}
      onChange={(checked) => toggleSkill.mutate({ id: skill.id, enabled: checked })}
      disabled={toggleSkill.isPending}
    />
  );
}
```

**Benefits:**
- ✅ Automatic optimistic update
- ✅ Automatic rollback on error
- ✅ Less code (50% reduction)
- ✅ Better error handling
- ✅ Consistent loading state

## Migration Checklist

When migrating a component:

### 1. Identify State Type
- [ ] Is it server data? → React Query
- [ ] Is it UI state? → Zustand
- [ ] Is it both? → Use both!

### 2. Replace Context
- [ ] Remove Context provider
- [ ] Replace `useContext` with query/store hooks
- [ ] Remove provider from App.tsx

### 3. Replace useState
- [ ] Server data: Replace with `useQuery`
- [ ] Client data: Move to Zustand store
- [ ] Remove manual `useEffect` for fetching

### 4. Replace useEffect
- [ ] Remove fetch effects (React Query handles this)
- [ ] Remove localStorage effects (Zustand handles this)
- [ ] Keep only true side effects

### 5. Add Error Handling
- [ ] Wrap in ErrorBoundary if needed
- [ ] Use ErrorDisplay components
- [ ] Handle loading states

### 6. Add Optimistic Updates
- [ ] Identify user actions that should feel instant
- [ ] Add onMutate, onError, onSettled

### 7. Test
- [ ] Test loading states
- [ ] Test error states
- [ ] Test optimistic updates
- [ ] Test persistence (Zustand)
- [ ] Test cache invalidation (React Query)

## Common Pitfalls

### ❌ Don't: Use useState for server data

```typescript
// ❌ Bad
const [users, setUsers] = useState([]);
useEffect(() => {
  fetch('/api/users').then(r => r.json()).then(setUsers);
}, []);

// ✅ Good
const { data: users } = useUsers();
```

### ❌ Don't: Use React Query for UI state

```typescript
// ❌ Bad
const { data: sidebarCollapsed } = useQuery({
  queryKey: ['sidebar'],
  queryFn: () => localStorage.getItem('sidebar'),
});

// ✅ Good
const sidebarCollapsed = useUIStore((s) => s.sidebarCollapsed);
```

### ❌ Don't: Fetch in useEffect with React Query

```typescript
// ❌ Bad
const queryClient = useQueryClient();
useEffect(() => {
  queryClient.fetchQuery({ queryKey: ['users'] });
}, []);

// ✅ Good
const { data } = useUsers(); // Fetches automatically
```

### ❌ Don't: Subscribe to entire store

```typescript
// ❌ Bad - re-renders on ANY state change
const { sidebarCollapsed, theme, modals, notifications } = useUIStore();

// ✅ Good - re-renders only when sidebarCollapsed changes
const sidebarCollapsed = useUIStore((s) => s.sidebarCollapsed);
```
