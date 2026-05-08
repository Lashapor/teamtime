// This is a real-time SPA: every page reads localStorage and opens a websocket
// to InstantDB. There is nothing we can usefully render on the server, and SSR
// would create hydration mismatches around the client's stored App ID.
export const ssr = false;
export const prerender = false;
