# React Query Migration Checklist

## Standard Migration Recipe
1. Define a stable query key in `src/lib/query/keys.ts`.
2. Add a typed fetcher or mutation function in `src/lib/query/<feature>.ts`.
3. Use `useQuery`/`useInfiniteQuery` for reads in interactive client surfaces.
4. Use `useMutation` for writes and update/invalidate the relevant query cache.
5. Add optimistic updates only for user actions that need instant feedback.
6. Keep server components for initial/static rendering where interactivity is not required.

## Guardrails
- Enable queries only where needed (`enabled`) to avoid unnecessary background work.
- Keep `refetchOnWindowFocus: false` for editor-heavy screens to prevent flicker.
- Use polling intervals only while related panels are open.
- Do not persist client-only optimistic status fields to the database.
- Use consistent cache key helpers instead of ad hoc string arrays.

## Migration TODOs

### Workspaces List
- Move `listMyWorkspaces` consumers to `useQuery`.
- Add optimistic create workspace behavior where UX benefits.

### Workspace Members and Invites
- Split into dedicated query keys for members and invites.
- Migrate role update/revoke/join flows to `useMutation` with precise cache updates.

### Diagram Load and Save
- Introduce query + mutation pattern for interactive diagram metadata panels first.
- Keep canvas/document hot path optimized and avoid broad invalidations.
