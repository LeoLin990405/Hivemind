# Webserver Architecture Audit

**Date**: 2026-02-15
**Session**: R002-1/6
**Goal**: Audit existing webserver for API refactor planning

## Current Architecture

### File Structure (20 files)

```
src/webserver/
├── index.ts               # Main server entry, Express setup
├── adapter.ts             # WebSocket ↔ Bridge adapter
├── setup.ts               # Middleware setup
├── directoryApi.ts        # Directory browsing API
├── config/
│   └── constants.ts       # Server configuration
├── middleware/
│   ├── rateLimiter.ts    # Rate limiting
│   ├── errorHandler.ts   # Error handling
│   ├── security.ts       # Security headers
│   └── csrfClient.ts     # CSRF protection
├── websocket/
│   └── WebSocketManager.ts  # WebSocket management
├── auth/
│   ├── service/
│   │   └── AuthService.ts    # Authentication logic
│   ├── repository/
│   │   ├── UserRepository.ts  # User data access
│   │   └── RateLimitStore.ts  # Rate limit tracking
│   └── middleware/
│       ├── AuthMiddleware.ts  # Auth verification
│       └── TokenMiddleware.ts # JWT validation
└── routes/
    ├── authRoutes.ts     # Login, logout, registration
    ├── apiRoutes.ts      # API endpoints
    └── staticRoutes.ts   # Static file serving
```

### Key Findings

#### ✅ Good Foundations

1. **Auth System** - Already has JWT-based authentication
   - TokenMiddleware for JWT validation
   - UserRepository for user management
   - AuthService for authentication logic
   - Password reset functionality

2. **Security Middleware** - Well-structured
   - Rate limiting (express-rate-limit)
   - CSRF protection
   - Security headers (helmet-like)
   - Error handling

3. **WebSocket Integration** - Working
   - WebSocketManager for connection management
   - Bridge adapter connects WS ↔ @office-ai/platform bridge
   - Supports broadcasting and client messaging

4. **Configuration** - Centralized
   - AUTH_CONFIG: JWT secrets, token expiry
   - SERVER_CONFIG: Ports, paths
   - Environment-based settings

#### ⚠️ Gaps & Issues

1. **Minimal REST API Coverage**
   - Only 2 API routes:
     - `/api` - Generic endpoint
     - `/api/directory` - Directory browsing
   - **All other functionality relies on WebSocket + Bridge**
   - No REST endpoints for:
     - Conversation management
     - Agent operations
     - File operations
     - Database queries
     - MCP servers
     - Skills management
     - Cron jobs
     - etc.

2. **No API Versioning**
   - Routes are not versioned (should be `/api/v1/...`)
   - No backward compatibility strategy

3. **No API Documentation**
   - No OpenAPI/Swagger spec
   - No auto-generated docs

4. **No Request Validation**
   - No schema validation (should use Zod)
   - Manual validation in handlers

5. **Tightly Coupled to Electron**
   - Bridge system designed for IPC
   - WebSocket adapter is a workaround
   - Not designed for pure web deployment

6. **Database Access Pattern**
   - Direct access from main process
   - No database connection pooling for web context
   - SQLite (better-sqlite3) not ideal for concurrent web requests

### Current Communication Flow

```
┌─────────────────────┐
│   Frontend          │
│   (Electron/Web)    │
└──────────┬──────────┘
           │
    ┌──────▼──────┐
    │  WebSocket  │  (Real-time)
    └──────┬──────┘
           │
    ┌──────▼────────────┐
    │  WebSocketManager │
    └──────┬────────────┘
           │
    ┌──────▼─────────────────┐
    │  Bridge Adapter        │
    │  (@office-ai/platform) │
    └──────┬─────────────────┘
           │
    ┌──────▼──────────────────┐
    │  IPC Bridge Handlers    │
    │  (src/common/ipcBridge) │
    └──────┬──────────────────┘
           │
    ┌──────▼────────────┐
    │  Main Process     │
    │  Services/DB      │
    └───────────────────┘
```

**Problem**: This is designed for Electron (single-user desktop app), not for web (multi-user, concurrent).

### Bridge to REST Mapping

The existing bridge providers in `src/common/ipcBridge.ts` can be mapped to REST endpoints:

| Bridge Category | Example Providers | REST Endpoint |
|-----------------|-------------------|---------------|
| conversation | create, get, update, remove, sendMessage | POST /api/v1/conversations<br>GET /api/v1/conversations/:id<br>PATCH /api/v1/conversations/:id<br>DELETE /api/v1/conversations/:id<br>POST /api/v1/conversations/:id/messages |
| fs | readFile, writeFile, getFilesByDir | GET /api/v1/files<br>POST /api/v1/files<br>GET /api/v1/files/metadata/:path |
| database | getAllConversations, getModels | GET /api/v1/conversations<br>GET /api/v1/models |
| model | addModel, updateModel, removeModel | POST /api/v1/models<br>PATCH /api/v1/models/:id<br>DELETE /api/v1/models/:id |
| gemini | getOAuthUrl, oauthCallback | GET /api/v1/auth/gemini/oauth<br>POST /api/v1/auth/gemini/callback |
| mcp | listServers, addServer | GET /api/v1/mcp/servers<br>POST /api/v1/mcp/servers |
| skills | listSkills, syncSkills | GET /api/v1/skills<br>POST /api/v1/skills/sync |
| cron | createJob, listJobs | POST /api/v1/cron/jobs<br>GET /api/v1/cron/jobs |

**Total estimated**: 50-100 REST endpoints needed to replace bridge system.

### Technology Stack (Current)

| Component | Technology |
|-----------|-----------|
| Framework | Express 5.x |
| WebSocket | ws (native) |
| Auth | JWT (manual impl) |
| Database | better-sqlite3 (sync, single-threaded) |
| Validation | Manual |
| Documentation | None |
| API Versioning | None |
| Error Handling | Custom middleware |
| Security | Custom helmet-like middleware |

### Refactor Requirements

#### 1. API Design Priorities

- ✅ RESTful endpoints for all bridge providers
- ✅ OpenAPI 3.0 specification
- ✅ API versioning (`/api/v1/`)
- ✅ Request/response validation (Zod)
- ✅ Consistent error responses
- ✅ Pagination for list endpoints
- ✅ Rate limiting per endpoint

#### 2. WebSocket Enhancements

- ✅ Replace `ws` with Socket.IO
- ✅ JWT authentication for connections
- ✅ Room-based messaging (per conversation)
- ✅ Auto-reconnect handling
- ✅ Event namespaces

#### 3. Database Migration

- ✅ Move from better-sqlite3 to PostgreSQL
- ✅ Implement connection pooling
- ✅ Use ORM (Drizzle or Kysely)
- ✅ Migration system
- ✅ Database seeding

#### 4. Documentation

- ✅ OpenAPI/Swagger UI at `/api/docs`
- ✅ Auto-generated from code
- ✅ Interactive API explorer

### Next Steps (R002-2/6)

1. Design complete REST API schema
   - Group endpoints by resource
   - Define request/response types
   - Plan error handling

2. Create OpenAPI 3.0 specification
   - Use tools like `@asteasolutions/zod-to-openapi`
   - Define all 50-100 endpoints
   - Include examples and descriptions

3. Implement API router structure
   - Modular route files
   - Shared middleware
   - Consistent patterns

### Estimated Work Breakdown

| Task | Sessions |
|------|----------|
| API schema design + OpenAPI spec | 1 |
| Core endpoints (conversation, messages) | 1 |
| File & database endpoints | 0.5 |
| Model & provider endpoints | 0.5 |
| Agent-related endpoints (Gemini, Codex, etc.) | 1 |
| Integration endpoints (MCP, skills, cron) | 1 |
| Testing & documentation | 1 |

**Total**: 6 sessions ✅ (matches plan)

---

## Session Summary

✅ **Completed**:
- Audited 20 webserver files
- Documented current architecture
- Identified gaps and requirements
- Mapped bridge → REST conversion
- Planned next 5 sessions

📊 **Metrics**:
- Files reviewed: 20
- API routes found: 2
- Bridge providers to convert: ~50-100
- New endpoints needed: ~50-100

🎯 **Next Session**:
- Design complete REST API schema
- Create OpenAPI 3.0 specification
- Start implementing core router structure
