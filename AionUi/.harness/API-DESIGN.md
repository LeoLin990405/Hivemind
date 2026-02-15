# Hivemind REST API Design v1.0

**Date**: 2026-02-15
**Version**: 1.0.0
**Base URL**: `/api/v1`

## Design Principles

1. **RESTful** - Resources, HTTP methods, status codes
2. **Consistent** - Uniform response format, error handling
3. **Versioned** - `/api/v1/` for backward compatibility
4. **Validated** - Zod schemas for all requests/responses
5. **Documented** - OpenAPI 3.0 with Swagger UI
6. **Secure** - JWT auth, rate limiting, RBAC

## Response Format

### Success Response

```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "timestamp": "2026-02-15T01:00:00Z",
    "requestId": "uuid-here"
  }
}
```

### Error Response

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request data",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format"
      }
    ]
  },
  "meta": {
    "timestamp": "2026-02-15T01:00:00Z",
    "requestId": "uuid-here"
  }
}
```

### Pagination Response

```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "totalPages": 5,
    "totalItems": 97,
    "hasNext": true,
    "hasPrev": false
  }
}
```

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Invalid request data |
| `UNAUTHORIZED` | 401 | Authentication required |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Resource conflict |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |

## Authentication

All API endpoints (except auth routes) require JWT token in header:

```
Authorization: Bearer <jwt-token>
```

## API Endpoints

### 1. Authentication (`/auth`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/auth/register` | Register new user | No |
| POST | `/auth/login` | Login with credentials | No |
| POST | `/auth/logout` | Logout (invalidate token) | Yes |
| POST | `/auth/refresh` | Refresh access token | Yes |
| POST | `/auth/reset-password` | Request password reset | No |
| POST | `/auth/reset-password/confirm` | Confirm password reset | No |
| GET | `/auth/me` | Get current user | Yes |
| PATCH | `/auth/me` | Update current user | Yes |

### 2. Conversations (`/conversations`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/conversations` | List conversations | Yes |
| POST | `/conversations` | Create conversation | Yes |
| GET | `/conversations/:id` | Get conversation | Yes |
| PATCH | `/conversations/:id` | Update conversation | Yes |
| DELETE | `/conversations/:id` | Delete conversation | Yes |
| POST | `/conversations/:id/reset` | Reset conversation | Yes |
| POST | `/conversations/:id/messages` | Send message | Yes |
| GET | `/conversations/:id/messages` | Get messages | Yes |
| POST | `/conversations/:id/stop` | Stop streaming | Yes |
| GET | `/conversations/:id/workspace` | Get workspace files | Yes |
| POST | `/conversations/:id/reload-context` | Reload context | Yes |

### 3. Messages (`/messages`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/messages/:id` | Get message | Yes |
| PATCH | `/messages/:id` | Update message | Yes |
| DELETE | `/messages/:id` | Delete message | Yes |
| POST | `/messages/:id/confirm` | Confirm action | Yes |

### 4. Files (`/files`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/files` | List files/directories | Yes |
| GET | `/files/content` | Read file content | Yes |
| POST | `/files` | Create/upload file | Yes |
| PATCH | `/files` | Update file content | Yes |
| DELETE | `/files` | Delete file/directory | Yes |
| GET | `/files/metadata` | Get file metadata | Yes |
| POST | `/files/copy` | Copy files | Yes |
| GET | `/files/image` | Get image as base64 | Yes |

### 5. Models (`/models`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/models` | List all models | Yes |
| POST | `/models` | Add new model | Yes |
| GET | `/models/:id` | Get model details | Yes |
| PATCH | `/models/:id` | Update model | Yes |
| DELETE | `/models/:id` | Delete model | Yes |
| POST | `/models/:id/test` | Test model connection | Yes |

### 6. Providers (`/providers`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/providers` | List all providers | Yes |
| POST | `/providers` | Add provider | Yes |
| GET | `/providers/:id` | Get provider | Yes |
| PATCH | `/providers/:id` | Update provider | Yes |
| DELETE | `/providers/:id` | Delete provider | Yes |
| GET | `/providers/:id/models` | Get provider's models | Yes |

### 7. Gemini Integration (`/gemini`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/gemini/oauth/url` | Get OAuth URL | Yes |
| POST | `/gemini/oauth/callback` | OAuth callback | Yes |
| GET | `/gemini/subscription` | Get subscription status | Yes |
| DELETE | `/gemini/oauth` | Disconnect OAuth | Yes |

### 8. Codex Integration (`/codex`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/codex/conversations` | List Codex conversations | Yes |
| POST | `/codex/conversations` | Create Codex conversation | Yes |
| DELETE | `/codex/conversations/:id` | Delete Codex conversation | Yes |

### 9. ACP (Agent Communication Protocol) (`/acp`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/acp/backends` | List ACP backends | Yes |
| POST | `/acp/backends` | Add ACP backend | Yes |
| PATCH | `/acp/backends/:id` | Update backend | Yes |
| DELETE | `/acp/backends/:id` | Delete backend | Yes |
| GET | `/acp/presets` | Get preset agents | Yes |

### 10. MCP Servers (`/mcp`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/mcp/servers` | List MCP servers | Yes |
| POST | `/mcp/servers` | Add MCP server | Yes |
| GET | `/mcp/servers/:id` | Get MCP server | Yes |
| PATCH | `/mcp/servers/:id` | Update MCP server | Yes |
| DELETE | `/mcp/servers/:id` | Delete MCP server | Yes |
| POST | `/mcp/servers/:id/restart` | Restart MCP server | Yes |
| GET | `/mcp/servers/:id/status` | Get server status | Yes |

### 11. Skills (`/skills`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/skills` | List all skills | Yes |
| POST | `/skills` | Install skill | Yes |
| GET | `/skills/:id` | Get skill details | Yes |
| PATCH | `/skills/:id` | Update skill | Yes |
| DELETE | `/skills/:id` | Uninstall skill | Yes |
| POST | `/skills/:id/sync` | Sync skill to agents | Yes |
| GET | `/skills/:id/tools` | Get skill's AI tools | Yes |

### 12. Cron Jobs (`/cron`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/cron/jobs` | List cron jobs | Yes |
| POST | `/cron/jobs` | Create cron job | Yes |
| GET | `/cron/jobs/:id` | Get cron job | Yes |
| PATCH | `/cron/jobs/:id` | Update cron job | Yes |
| DELETE | `/cron/jobs/:id` | Delete cron job | Yes |
| POST | `/cron/jobs/:id/run` | Run job immediately | Yes |
| POST | `/cron/jobs/:id/enable` | Enable job | Yes |
| POST | `/cron/jobs/:id/disable` | Disable job | Yes |

### 13. NotebookLM (`/notebooklm`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/notebooklm/status` | Get auth status | Yes |
| POST | `/notebooklm/auth` | Authenticate | Yes |
| GET | `/notebooklm/notebooks` | List notebooks | Yes |
| POST | `/notebooklm/notebooks` | Create notebook | Yes |

### 14. Obsidian (`/obsidian`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/obsidian/sync/status` | Get sync status | Yes |
| POST | `/obsidian/sync/start` | Start daily sync | Yes |
| POST | `/obsidian/sync/stop` | Stop daily sync | Yes |

### 15. Channels (`/channels`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/channels` | List all channels | Yes |
| POST | `/channels` | Create channel | Yes |
| GET | `/channels/:id` | Get channel | Yes |
| PATCH | `/channels/:id` | Update channel | Yes |
| DELETE | `/channels/:id` | Delete channel | Yes |
| POST | `/channels/:id/pair` | Pair device | Yes |

### 16. Agent Teams (`/teams`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/teams` | List all teams | Yes |
| POST | `/teams` | Create team | Yes |
| GET | `/teams/:id` | Get team | Yes |
| PATCH | `/teams/:id` | Update team | Yes |
| DELETE | `/teams/:id` | Delete team | Yes |
| GET | `/teams/:id/tasks` | Get team tasks | Yes |
| POST | `/teams/:id/tasks` | Create task | Yes |
| GET | `/teams/:id/analytics` | Get team analytics | Yes |

### 17. System (`/system`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/system/info` | Get system info | Yes |
| PATCH | `/system/info` | Update system info | Yes |
| GET | `/system/health` | Health check | No |
| GET | `/system/metrics` | Get metrics | Yes |

### 18. Updates (`/updates`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/updates/check` | Check for updates | Yes |
| POST | `/updates/download` | Download update | Yes |
| GET | `/updates/download/progress` | Get download progress | Yes |

## Total Endpoints

| Category | Count |
|----------|-------|
| Auth | 8 |
| Conversations | 11 |
| Messages | 4 |
| Files | 8 |
| Models | 6 |
| Providers | 6 |
| Gemini | 4 |
| Codex | 3 |
| ACP | 5 |
| MCP | 7 |
| Skills | 7 |
| Cron | 8 |
| NotebookLM | 4 |
| Obsidian | 3 |
| Channels | 6 |
| Agent Teams | 8 |
| System | 4 |
| Updates | 3 |
| **Total** | **105** |

## Implementation Plan

### Phase 1: Core APIs (Session 3)
- Auth endpoints
- Conversations endpoints
- Messages endpoints
- Files endpoints (basic)

### Phase 2: Model Management (Session 3)
- Models endpoints
- Providers endpoints

### Phase 3: Agent Integrations (Session 4)
- Gemini endpoints
- Codex endpoints
- ACP endpoints

### Phase 4: Extensions (Session 5)
- MCP servers endpoints
- Skills endpoints
- Cron jobs endpoints

### Phase 5: Advanced Features (Session 6)
- NotebookLM, Obsidian endpoints
- Channels endpoints
- Agent Teams endpoints
- System endpoints

## Next Steps

1. Create Zod schemas for all request/response types
2. Generate OpenAPI 3.0 specification
3. Set up Swagger UI
4. Implement router structure
5. Create mock implementations for testing
