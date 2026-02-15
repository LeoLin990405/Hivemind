# State Management Guide - React Query + Zustand

## Overview

HiveMind uses a dual state management approach:
- **React Query (TanStack Query)**: Server state (API data, caching, synchronization)
- **Zustand**: Client state (UI preferences, temporary data)

This separation provides optimal performance, better developer experience, and easier testing.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Application                         │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌────────────────────┐      ┌────────────────────┐   │
│  │   React Query      │      │     Zustand        │   │
│  │  (Server State)    │      │  (Client State)    │   │
│  ├────────────────────┤      ├────────────────────┤   │
│  │ • API data         │      │ • UI preferences   │   │
│  │ • Caching          │      │ • Modal state      │   │
│  │ • Synchronization  │      │ • Drafts           │   │
│  │ • Background       │      │ • Theme            │   │
│  │   updates          │      │ • Notifications    │   │
│  │ • Optimistic       │      │ • Selections       │   │
│  │   updates          │      │                    │   │
│  └────────────────────┘      └────────────────────┘   │
│           ▲                            ▲               │
│           │                            │               │
│           ▼                            ▼               │
│  ┌────────────────────────────────────────────┐       │
│  │          React Components                  │       │
│  └────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────┘
```

## When to Use Each

### React Query (Server State)

Use React Query for **any data that comes from the server**:

✅ User data, conversations, messages
✅ Skills, AI tools, MCP servers
✅ Settings from database
✅ Any API responses
✅ Data that needs caching
✅ Data that can be stale

❌ UI state (modals, sidebar)
❌ Form inputs
❌ Temporary selections
❌ Client-only preferences

### Zustand (Client State)

Use Zustand for **client-only state**:

✅ UI preferences (sidebar collapsed, theme)
✅ Modal open/close state
✅ Temporary selections
✅ Draft messages
✅ Notifications
✅ Loading indicators
✅ Search queries (before submission)

❌ API data
❌ Database data
❌ Data from server

## React Query

### Configuration

QueryClient is configured in `src/renderer/config/queryClient.ts`:

```typescript
{
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,        // 5 minutes
      gcTime: 1000 * 60 * 30,          // 30 minutes
      retry: 3,                         // Retry failed requests
      refetchOnWindowFocus: false,      // Don't refetch on focus
      refetchOnReconnect: true,         // Refetch on reconnect
    },
  },
}
```

### Query Keys

Query keys are hierarchical and follow this pattern:

```typescript
queryKeys.{resource}.{type}(params)
```

Examples:
```typescript
queryKeys.conversations.all()                    // ['conversations']
queryKeys.conversations.list({ status: 'active' }) // ['conversations', 'list', { status: 'active' }]
queryKeys.conversations.detail('123')            // ['conversations', 'detail', '123']
queryKeys.conversations.messages('123')          // ['conversations', 'messages', '123']
```

### Basic Query

```typescript
import { useConversations } from '@/renderer/hooks/queries';

function ConversationsList() {
  const { data, isLoading, error, refetch } = useConversations({
    status: 'active',
    limit: 20,
  });

  if (isLoading) return <Spinner />;
  if (error) return <ErrorDisplay error={error} onRetry={refetch} />;

  return (
    <div>
      {data?.conversations.map((conv) => (
        <ConversationItem key={conv.id} conversation={conv} />
      ))}
    </div>
  );
}
```

### Mutations

```typescript
import { useCreateConversation } from '@/renderer/hooks/queries';

function NewConversationButton() {
  const createConversation = useCreateConversation();

  const handleCreate = async () => {
    try {
      const newConv = await createConversation.mutateAsync({
        title: 'New Conversation',
      });
      console.log('Created:', newConv.id);
    } catch (error) {
      console.error('Failed:', error);
    }
  };

  return (
    <Button
      onClick={handleCreate}
      loading={createConversation.isPending}
    >
      New Conversation
    </Button>
  );
}
```

### Optimistic Updates

Optimistic updates provide instant feedback:

```typescript
export function useCreateMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createMessage,
    onMutate: async (newMessage) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: queryKeys.conversations.messages(newMessage.conversationId),
      });

      // Snapshot previous value
      const previousMessages = queryClient.getQueryData(
        queryKeys.conversations.messages(newMessage.conversationId)
      );

      // Optimistically update
      const optimisticMessage = {
        id: `temp-${Date.now()}`,
        ...newMessage,
        createdAt: new Date().toISOString(),
      };

      queryClient.setQueryData(
        queryKeys.conversations.messages(newMessage.conversationId),
        (old) => [...(old || []), optimisticMessage]
      );

      return { previousMessages };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousMessages) {
        queryClient.setQueryData(
          queryKeys.conversations.messages(variables.conversationId),
          context.previousMessages
        );
      }
    },
    onSuccess: (newMessage, variables) => {
      // Replace temp message with real one
      queryClient.setQueryData(
        queryKeys.conversations.messages(variables.conversationId),
        (old) => old?.map((msg) =>
          msg.id.startsWith('temp-') ? newMessage : msg
        )
      );
    },
  });
}
```

### Cache Invalidation

```typescript
// Invalidate all conversations
queryClient.invalidateQueries({ queryKey: queryKeys.conversations.all() });

// Invalidate specific conversation
queryClient.invalidateQueries({ queryKey: queryKeys.conversations.detail('123') });

// Invalidate all conversation lists (but not details)
queryClient.invalidateQueries({ queryKey: queryKeys.conversations.lists() });
```

### Manual Cache Updates

```typescript
// Set data directly
queryClient.setQueryData(queryKeys.users.detail('123'), updatedUser);

// Remove from cache
queryClient.removeQueries({ queryKey: queryKeys.users.detail('123') });

// Update existing data
queryClient.setQueryData(
  queryKeys.conversations.list({ status: 'active' }),
  (old) => ({
    ...old,
    conversations: old.conversations.filter((c) => c.id !== deletedId),
  })
);
```

## Zustand

### Store Structure

Stores are defined in `src/renderer/stores/`:

```typescript
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

interface MyState {
  count: number;
  increment: () => void;
  decrement: () => void;
}

export const useMyStore = create<MyState>()(
  devtools(
    persist(
      (set) => ({
        count: 0,
        increment: () => set((state) => ({ count: state.count + 1 })),
        decrement: () => set((state) => ({ count: state.count - 1 })),
      }),
      {
        name: 'my-store',
        partialize: (state) => ({ count: state.count }), // Only persist count
      }
    ),
    { name: 'MyStore' }
  )
);
```

### Using Stores

```typescript
import { useUIStore, uiSelectors } from '@/renderer/stores';

function Sidebar() {
  // ✅ Good: Using selector (only re-renders when collapsed changes)
  const collapsed = useUIStore(uiSelectors.sidebarCollapsed);
  const toggle = useUIStore((state) => state.toggleSidebar);

  // ❌ Bad: Re-renders on any state change
  const { sidebarCollapsed, toggleSidebar } = useUIStore();

  return (
    <div className={collapsed ? 'w-16' : 'w-64'}>
      <button onClick={toggle}>Toggle</button>
    </div>
  );
}
```

### Selectors

Define selectors for optimized re-renders:

```typescript
export const uiSelectors = {
  sidebarCollapsed: (state: UIState) => state.sidebarCollapsed,
  sidebarWidth: (state: UIState) => state.sidebarWidth,
  activeModal: (state: UIState) => state.activeModal,
  // ... more selectors
};

// Usage
const collapsed = useUIStore(uiSelectors.sidebarCollapsed);
```

### Combining Multiple Values

```typescript
// ✅ Good: Single selector for multiple values
const { collapsed, width } = useUIStore((state) => ({
  collapsed: state.sidebarCollapsed,
  width: state.sidebarWidth,
}));

// ❌ Bad: Multiple subscriptions
const collapsed = useUIStore((state) => state.sidebarCollapsed);
const width = useUIStore((state) => state.sidebarWidth);
```

### Actions

```typescript
// Direct action call
const toggleSidebar = useUIStore((state) => state.toggleSidebar);
toggleSidebar();

// Or inline
useUIStore.getState().toggleSidebar();

// With parameters
const saveDraft = useConversationStore((state) => state.saveDraft);
saveDraft(conversationId, content);
```

## Error Handling

### Error Boundary

Wrap components with ErrorBoundary:

```typescript
import { ErrorBoundary } from '@/renderer/components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <MyComponent />
    </ErrorBoundary>
  );
}

// With custom fallback
<ErrorBoundary fallback={<CustomError />}>
  <MyComponent />
</ErrorBoundary>

// With reset keys
<ErrorBoundary resetKeys={[conversationId]}>
  <ConversationView id={conversationId} />
</ErrorBoundary>
```

### Query Error Handling

```typescript
import { QueryError } from '@/renderer/components/ErrorStates';

function MyComponent() {
  const { data, isLoading, error, refetch } = useMyQuery();

  if (isLoading) return <Spinner />;
  if (error) return <QueryError error={error} onRetry={refetch} />;

  return <div>{data}</div>;
}
```

### Global Error Handler

React Query has a global error handler configured:

```typescript
// In queryClient.ts
queryCache: new QueryCache({
  onError: (error) => {
    console.error('[Query Error]', error);
    Message.error({ content: error.message });
  },
}),
```

## Testing

### Testing Queries

```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';

test('useConversations returns data', async () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  const wrapper = ({ children }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );

  const { result } = renderHook(() => useConversations(), { wrapper });

  await waitFor(() => expect(result.current.isSuccess).toBe(true));

  expect(result.current.data).toBeDefined();
});
```

### Testing Zustand Stores

```typescript
import { renderHook, act } from '@testing-library/react';

test('toggleSidebar works', () => {
  const { result } = renderHook(() => useUIStore());

  expect(result.current.sidebarCollapsed).toBe(false);

  act(() => {
    result.current.toggleSidebar();
  });

  expect(result.current.sidebarCollapsed).toBe(true);
});
```

## Best Practices

### 1. Separate Server and Client State

```typescript
// ✅ Good
const { data: conversations } = useConversations();        // Server state
const sidebarCollapsed = useUIStore(s => s.sidebarCollapsed); // Client state

// ❌ Bad
const [conversations, setConversations] = useState([]);    // Should use React Query
```

### 2. Use Selectors

```typescript
// ✅ Good
const collapsed = useUIStore(uiSelectors.sidebarCollapsed);

// ❌ Bad
const { sidebarCollapsed } = useUIStore();
```

### 3. Handle Loading and Error States

```typescript
// ✅ Good
if (isLoading) return <Spinner />;
if (error) return <ErrorDisplay error={error} />;

// ❌ Bad
return <div>{data?.conversations.map(...)}</div>; // Might crash
```

### 4. Use Optimistic Updates

```typescript
// ✅ Good: Immediate feedback
const toggle = useToggleSkill();
toggle.mutate({ id, enabled }); // UI updates instantly

// ❌ Bad: Wait for server
const toggle = useToggleSkill();
await toggle.mutateAsync({ id, enabled }); // User waits
```

### 5. Invalidate Correctly

```typescript
// ✅ Good: Invalidate related queries
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: queryKeys.conversations.lists() });
  queryClient.invalidateQueries({ queryKey: queryKeys.conversations.detail(id) });
}

// ❌ Bad: Invalidate everything
onSuccess: () => {
  queryClient.invalidateQueries();
}
```

### 6. Persist Only What's Needed

```typescript
// ✅ Good
persist(
  (set) => ({ /* state */ }),
  {
    name: 'my-store',
    partialize: (state) => ({
      // Only persist preferences
      sidebarCollapsed: state.sidebarCollapsed,
      theme: state.theme,
    }),
  }
)

// ❌ Bad: Persist everything (including temporary state)
persist(
  (set) => ({ /* state */ }),
  { name: 'my-store' } // No partialize
)
```

## Migration Checklist

From Context/useState to React Query/Zustand:

- [ ] Identify server state (API data) → React Query
- [ ] Identify client state (UI preferences) → Zustand
- [ ] Replace `useEffect` + `fetch` with query hooks
- [ ] Replace `useState` for API data with query hooks
- [ ] Replace Context providers with Zustand stores
- [ ] Add error boundaries
- [ ] Add loading states
- [ ] Add optimistic updates where appropriate
- [ ] Test all scenarios

## DevTools

### React Query DevTools

Available in development mode (bottom-left corner):
- View all queries and their status
- Inspect cache data
- Manually refetch queries
- Clear cache

### Zustand DevTools

Open Redux DevTools in browser:
- View store state
- Track actions
- Time-travel debugging

## Resources

- [React Query Docs](https://tanstack.com/query/latest)
- [Zustand Docs](https://github.com/pmndrs/zustand)
- [USAGE_EXAMPLES.md](../src/renderer/hooks/queries/USAGE_EXAMPLES.md)
- [Error Handling Guide](../src/renderer/components/ErrorBoundary.tsx)
