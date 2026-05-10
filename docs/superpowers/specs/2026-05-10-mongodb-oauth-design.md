# MongoDB + OAuth Design

## Objective

Add persistent cloud-backed storage (MongoDB Atlas) and OAuth authentication
(Google & Apple Sign-In) to the svelte-todo app, while keeping the option to
use the app as a guest with localStorage-only storage.

## Architecture

### Before

```md
Browser → Static SPA → localStorage
```

### After

```md
Browser → SvelteKit App (client SPA) → SvelteKit Server Routes (API) → MongoDB Atlas
```

The app switches from `@sveltejs/adapter-static` to `@sveltejs/adapter-vercel`.
Client pages are still prerendered SPAs; API routes run as Vercel serverless
functions.

### Storage modes

| Mode      | Storage       | Auth required            | API calls |
| --------- | ------------- | ------------------------ | --------- |
| Guest     | localStorage  | No                       | None      |
| Signed in | MongoDB Atlas | Yes (Google/Apple OAuth) | All CRUD  |

Guest data is migrated to the cloud when the user signs in (prompt shown once).

## Routes

| Path        | Purpose                                                                | Auth required           |
| ----------- | ---------------------------------------------------------------------- | ----------------------- |
| `/`         | Login page (or auto-redirect to `/tasks` if already signed in / guest) | No                      |
| `/tasks`    | Main todo list (moved from `/`)                                        | No (guest or signed in) |
| `/board`    | Kanban board                                                           | No                      |
| `/calendar` | Calendar view                                                          | No                      |
| `/stats`    | Analytics                                                              | No                      |
| `/archived` | Archived tasks                                                         | No                      |

All existing features work identically for guests (localStorage) and signed-in
users (MongoDB).

### API routes

| Method | Path                          | Purpose                      |
| ------ | ----------------------------- | ---------------------------- |
| GET    | `/api/todos`                  | Fetch user's todos           |
| POST   | `/api/todos`                  | Create todo                  |
| PUT    | `/api/todos/[id]`             | Update todo                  |
| DELETE | `/api/todos/[id]`             | Archive/delete todo          |
| POST   | `/api/todos/archive`          | Batch archive                |
| POST   | `/api/todos/restore`          | Batch restore                |
| POST   | `/api/todos/permanent-delete` | Permanent delete             |
| POST   | `/api/todos/migrate`          | Import guest data on sign-in |

All API routes require authentication (Auth.js session). Guest calls are
rejected with 401.

## Authentication

### Technology

Auth.js (`@auth/sveltekit`) with two providers:

- **Google**: OAuth 2.0 Web Client (free, requires Google Cloud project)
- **Apple**: Sign in with Apple (requires paid Apple Developer account, or can
  be omitted if user doesn't have one)

### Session strategy

JWT sessions (no database adapter needed). The Auth.js user ID is stored in the
MongoDB todo document to associate data with the user.

### UI

- **Login page (`/`)**: Two sign-in buttons (Google, Apple) + "Continue as
  Guest" link
- **Guest users**: Guest flag in localStorage (`authMode: 'guest'`). Full app
  functionality using localStorage only. NavBar shows "Sign in" button.
- **Signed-in users**: NavBar shows avatar/name + "Sign out" button.
- **First sign-in (guest → user)**: If the guest has local todos, show a dialog
  asking if they want to sync them to their account.

## Data Model (MongoDB)

### Collection: `users`

One document per authenticated user:

```js
{
  _id: ObjectId,
  authUserId: String,       // Auth.js user ID (sub claim from provider)
  email: String,
  name: String,
  picture: String,          // Avatar URL
  provider: String,         // 'google' or 'apple'
  createdAt: Date,
  lastLoginAt: Date,
  // App data (embedded for single-query reads)
  nextId: Number,
  todos: [
    {
      id: Number,
      title: String,
      description: String,
      dueDate: String,
      priority: String,      // 'high' | 'medium' | 'low'
      category: String,
      tags: [String],
      recurring: String,
      subtasks: [{ text: String, done: Boolean }],
      completed: Boolean,
      completedAt: String,   // ISO date
      createdAt: String      // ISO date
    }
  ],
  archivedTodos: [ /* same shape as todos */ ],
  categories: [String],
  categoryColors: Object,   // { "Work": "#3b82f6", ... }
  availableTags: [String],
  tagColors: Object,        // { "urgent": "#ef4444", ... }
  templates: [
    {
      name: String,
      title: String,
      description: String,
      dueDate: String,
      priority: String,
      category: String,
      tags: [String]
    }
  ],
  darkMode: Boolean
}
```

One document per user keeps reads fast (single query). The free MongoDB M0
cluster has 512 MB storage, more than enough for thousands of users' todos.

### Index

```js
db.users.createIndex({ authUserId: 1 }, { unique: true });
```

## Files to Create / Modify

### New files

| File                                               | Purpose                                                          |
| -------------------------------------------------- | ---------------------------------------------------------------- |
| `src/hooks.server.js`                              | Auth.js SvelteKit handle                                         |
| `src/lib/server/auth.js`                           | Auth.js config (providers, callbacks)                            |
| `src/lib/server/db.js`                             | Mongoose connection + schemas                                    |
| `src/lib/server/models/User.js`                    | Mongoose User model                                              |
| `src/lib/server/todoService.js`                    | CRUD operations against MongoDB                                  |
| `src/routes/api/todos/+server.js`                  | GET list, POST create                                            |
| `src/routes/api/todos/[id]/+server.js`             | PUT update, DELETE archive                                       |
| `src/routes/api/todos/archive/+server.js`          | Batch archive                                                    |
| `src/routes/api/todos/restore/+server.js`          | Batch restore                                                    |
| `src/routes/api/todos/permanent-delete/+server.js` | Permanent delete                                                 |
| `src/routes/api/todos/migrate/+server.js`          | Guest data migration                                             |
| `src/routes/tasks/+page.svelte`                    | Main todo list (moved from `+page.svelte`)                       |
| `src/routes/+page.svelte`                          | Login page (redirects to `/tasks` if already signed in or guest) |
| `src/lib/state/authStore.svelte.js`                | Auth state (user, login, logout)                                 |
| `src/lib/components/AuthButton.svelte`             | Login/logout buttons                                             |
| `src/lib/components/MigrationDialog.svelte`        | Guest→user data sync dialog                                      |
| `.env.example`                                     | Document required env vars                                       |

### Modified files

| File                                | Changes                                                        |
| ----------------------------------- | -------------------------------------------------------------- |
| `svelte.config.js`                  | Switch to `adapter-vercel`, remove `fallback`                  |
| `vercel.json`                       | Adjust for `adapter-vercel`                                    |
| `package.json`                      | Add `@auth/sveltekit`, `mongoose`, `@auth/core`                |
| `.gitignore`                        | Ensure `.env` is ignored                                       |
| `src/routes/+layout.js`             | Remove `prerender = true`, add `ssr = false` for client routes |
| `src/routes/+layout.svelte`         | Init auth store alongside todo store                           |
| `src/lib/components/NavBar.svelte`  | Add auth UI (avatar / sign-in button)                          |
| `src/lib/state/todoStore.svelte.js` | Add API sync layer when signed in                              |
| `src/lib/scripts/storage.js`        | Add guest mode helpers                                         |

### Deleted/moved files

| File                      | Action                                                         |
| ------------------------- | -------------------------------------------------------------- |
| `src/routes/+page.svelte` | Content moved to `tasks/+page.svelte`, root becomes login page |

## Data Flow

### Guest user

```md
TodoStore CRUD → localStorage (same as current behavior)
No API calls made.
```

### Signed-in user

```md
TodoStore CRUD → update local state (instant UI) → fire API call (async)
→ on success: nothing extra
→ on failure: toast error
```

### Migration (guest → signed in)

Triggered when a user who was previously using the app as a guest signs in
for the first time through OAuth. Subsequent sign-ins use MongoDB directly.

```md
User signs in with Google/Apple
→ Auth.js callback creates/updates MongoDB user doc
→ Client detects: was using guest mode, now signed in
→ If local todos exist: show MigrationDialog
→ User clicks "Sync my data" → POST /api/todos/migrate
→ Server merges local todos into DB (dedup by id, import local)
→ localStorage guest flag cleared, API mode activated
→ User clicks "Start fresh" → localStorage cleared, API mode activated
→ If no local todos: just activate API mode silently
```

## Environmental Configuration

### Required env vars

```env
# MongoDB Atlas
MONGODB_URI=mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/todo-app?retryWrites=true&w=majority

# Auth.js
AUTH_SECRET=<random base64 string from: openssl rand -base64 32>
AUTH_TRUST_HOST=http://localhost:5173  # Vercel sets this automatically in prod

# Google OAuth
GOOGLE_CLIENT_ID=xxxxxxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxx

# Apple OAuth (optional — requires paid Apple Developer account)
# APPLE_CLIENT_ID=com.example.service
# APPLE_TEAM_ID=XXXXXXXXXX
# APPLE_KEY_ID=XXXXXXXXXX
# APPLE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----
```

## Error Handling

- **API unreachable**: Toast "Could not sync to cloud. Your changes are saved
  locally." Data stays in local state and localStorage. Retry on next operation.
- **Session expired**: Auto-redirect to login page with message.
- **MongoDB connection failure**: API returns 503. Client shows offline toast.
- **Rate limiting**: Not anticipated at this scale, but API returns
  `Retry-After` header on 429 if needed later.

## Testing

- Unit tests in `src/lib/__tests__/` for the new API sync logic
- E2E tests in `e2e/` for the login flow and guest mode
- Manual: full flow test (guest → sign in → migrate → CRUD → sign out →
  sign back in → data persists)

## Out of Scope

- Password-based auth (OAuth-only)
- Sharing/collaboration
- Real-time sync (polling or WebSocket)
- Admin panel
- Analytics on cloud data

## Config Checklist (User Needs to Do)

1. **MongoDB Atlas**: Create free M0 cluster → add IP whitelist (0.0.0.0/0) →
   create DB user → copy connection string
2. **Google Cloud Console**: Enable Google+ API → create OAuth 2.0 Web Client →
   add redirect URI `http://localhost:5173/api/auth/callback/google` and
   `https://your-domain.vercel.app/api/auth/callback/google`
3. **Apple Developer** (optional): Set up Sign in with Apple Service ID →
   generate private key → add redirect URI
4. **Vercel**: Set all env vars in project settings
5. **Local**: Create `.env` file with all values from `.env.example`
