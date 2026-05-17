# Multi-Profile Switching Design

**Date:** 2026-05-17
**Issue:** [#23 — Add support for multiple user profiles with profile switching](https://github.com/jjdubski/svelte-todo/issues/23)

## Summary

Allow users to sign into multiple different Google accounts and switch between them, with each account's todos, settings, and data fully isolated. Switching profiles uses OAuth re-authentication (sign out → sign in with different account), leveraging Google's account chooser for fast switching — the same mental model as Slack, Twitter, or YouTube channel switching.

## Architecture

Each profile **is** a separate Google OAuth identity. The app only ever has one active Auth.js session at a time. Switching profiles = sign out of current → sign in with different Google account.

```text
┌─────────────────────────────────────────────────────┐
│                   localStorage                       │
│  savedProfiles: [...]   _pendingProfileAction        │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│              Auth.js Session (1 at a time)            │
│  HttpOnly cookie JWT  |  signIn() / signOut()        │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│                    MongoDB                            │
│  Each Google account = 1 User document               │
│  Data isolated per authUserId (existing behavior)    │
└─────────────────────────────────────────────────────┘
```

### Data isolation

- Each Google account maps to its own MongoDB `User` document, keyed by `authUserId` (existing behavior — no changes needed).
- The active session determines which user's data is fetched by all API routes.
- Guest mode (localStorage-only) continues to work as-is. A guest profile appears in the switcher while guest mode is active.

## Storage

### localStorage additions

| Key                     | Type                        | Purpose                               |
| ----------------------- | --------------------------- | ------------------------------------- |
| `savedProfiles`         | `ProfileEntry[]`            | All known profiles on this device     |
| `_pendingProfileAction` | `'switch' \| 'add' \| null` | Intent flag set before OAuth redirect |

### ProfileEntry shape

```js
{
  authUserId: string,   // Google's providerAccountId
  email: string,
  name: string,
  picture: string,
  provider: 'google' | 'apple' | 'guest',
  lastUsed: number      // Date.now()
}
```

## New Route: `/profiles`

```text
src/routes/
├── +layout.svelte         # Root layout — add pending-profile-action handler
├── +page.svelte           # Login/landing page (no change)
├── profiles/
│   └── +page.svelte       # NEW — Profile switcher page
├── (app)/                 # (no changes)
└── api/                   # (no changes for MVP)
```

The `/profiles` route sits outside the `(app)` group so it doesn't inherit the StatsBar or app-layout wrapper.

## Component Changes

### NEW — ProfileSwitcher.svelte (rendered by `/profiles/+page.svelte`)

Displays:

- **ProfileCard** for each saved profile (avatar, name, email, "Active" badge, Remove button)
- **"Add Account"** button (sign out → sign in via Google)
- **Guest profile card** (when guest data exists or guest is active)
- **"Sign in" option** when no profiles exist

### MODIFIED — AuthButton.svelte

The dropdown now includes a "Switch Profile…" option above "Sign out" for authenticated users:

```text
┌─────────────────┐
│ jane@gmail.com   │  ← user info header (not clickable)
│─────────────────│
│ Switch Profile…  │  ← navigates to /profiles
│ Sign out         │
└─────────────────┘
```

Guest users still see the "Sign in" link (no change).

### NavBar.svelte — No changes

## AuthStore Changes (authStore.svelte.js)

### New methods

| Method                               | Behavior                                                                                                                                           |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `saveCurrentProfile()`               | Upserts current `auth.user` into `savedProfiles` in localStorage                                                                                   |
| `switchToProfile(authUserId)` | Sets pending flags → looks up email from savedProfiles → `signOut({ redirect: false })` → `signIn('google', { callbackUrl: '/profiles', authorizationParams: { login_hint: email } })` |
| `addNewProfile()`                    | Sets pending flag → `signOut({ redirect: false })` → `signIn('google', { callbackUrl: '/profiles' })`                                              |
| `switchToGuest()`                    | Sets `authMode = 'guest'` → `signOut({ redirect: false })` → navigates to `/tasks`                                                                 |
| `getSavedProfiles()`                 | Reads and returns `savedProfiles` from localStorage                                                                                                |
| `removeSavedProfile(authUserId)`     | Removes entry from localStorage list                                                                                                               |

## OAuth Flow: Switching Profiles

```text
User clicks "Switch to work@gmail.com"
  ↓
1. saveCurrentProfile() — saves jane@gmail.com to savedProfiles
2. _pendingProfileAction = 'switch'
3. switchToProfile('google-work-id') looks up work@gmail.com from savedProfiles
4. signOut({ redirect: false })
5. signIn('google', { callbackUrl: '/profiles', authorizationParams: { login_hint: 'work@gmail.com' } })
  ↓  (Google OAuth redirect)
6. User authorizes on Google consent/chooser
  ↓  (OAuth callback → new session)
7. Browser lands on /profiles
8. AuthStore._init() → _fetchSession() → user = work@gmail.com
9. Root layout effect fires → pendingAction detected
10. saveCurrentProfile() saves work@gmail.com
11. Clear pending flags
12. Profile list shows both accounts
```

## OAuth Flow: Adding a New Account

Same as switching, but:

- No `login_hint` is passed — Google shows the full account chooser.
- `_pendingProfileAction = 'add'`

## OAuth Flow: Switching to Guest

```text
User clicks "Switch to Guest" on /profiles
  ↓
1. Save current profile (if signed in)
2. Set authMode = 'guest' in localStorage
3. signOut({ redirect: false })
4. Navigate to /tasks
5. AuthStore._init() → no session → authMode='guest' → isGuest=true
6. localStorage data loads as before
```

## Root Layout Integration (+layout.svelte)

The existing `$effect` that watches auth state gains a new branch at the top:

```js
$effect(() => {
  if (!_authStore.isLoading && _authStore.isLoggedIn && !_authStore.isGuest) {
    // NEW: Check for pending profile action (post-OAuth return)
    const pendingAction = storageGet('_pendingProfileAction');
    if (pendingAction) {
      _authStore.saveCurrentProfile();
      storageRemove('_pendingProfileAction');
      if ($page.url.pathname !== '/profiles') {
        goto('/profiles');
      }
      return;  // ← skip loadFromApi — we're on the profiles page
    }

    // ★ Existing logic (wasGuest / MigrationDialog / loadFromApi) — unchanged
    const wasGuest = storageGet('authMode') === 'guest';
    // ... rest stays as-is
  }
});
```

## Acceptance Criteria Mapping

| Requirement                                                | How it's met                                                                 |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------- |
| User can login to a new profile (different Google account) | "Add Account" button triggers OAuth for a new Google account                 |
| User can switch between profiles                           | Profile cards on `/profiles` page trigger signOut + signIn with `login_hint` |
| Each profile has its own todos, settings, and data         | Already the case — each Google account has its own MongoDB document          |
| Profile switching is smooth and doesn't lose data          | `saveCurrentProfile()` always runs first; pending flags survive the redirect |
| Authenticated users can have multiple profiles             | `savedProfiles` list in localStorage persists across sessions                |
| Support guest profiles                                     | Guest appears as a profile option; switching to guest sets `authMode=guest`  |

## Edge Cases Covered

1. **Removing a profile:** Only removes from local `savedProfiles` list — does not affect the Google account or MongoDB data.
2. **Signing into an account not in the list:** Profile is auto-saved on first detection (via `saveCurrentProfile()` in the pending-action handler).
3. **Guest → authenticated migration:** Existing MigrationDialog flow is preserved. After migration, the new account is saved as a profile.
4. **No profiles saved + not guest:** `/profiles` page shows "Sign in with Google" as the primary action (same as login page).
5. **OAuth failure/timeout:** User lands back at `/profiles`. Pending flags may still be set — the layout handles this gracefully (checks for valid session before saving).
6. **Profile switching without `login_hint`:** Google may not always show the pre-selected account. User can pick any account from the chooser. The profile list is updated on return regardless.
7. **signOut → signIn race:** Calling `signOut({ redirect: false })` immediately followed by `signIn(...)` could race. Mitigation: both are `await`ed in sequence. `signOut` clears the cookie synchronously (resolves promise), then `signIn` triggers the OAuth redirect. If the old session cookie persists, the new signIn will replace it — no data loss.

## Out of Scope (Future)

- Cross-device profile list sync (would require a server endpoint + family grouping)
- Seamless switching (no OAuth redirect) — would require database sessions + refresh token storage
- Profile-specific custom avatars or display names
- Apple ID multi-account support (same patterns apply but OAuth behavior differs)
