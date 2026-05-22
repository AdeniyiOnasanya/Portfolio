// Empty shim for the `server-only` package under vitest. The package's real
// export throws at import time outside a Next.js server build to enforce
// that a module never lands in a client bundle. In a Node test runner that
// invariant is irrelevant, so resolving to an empty module lets tests
// import modules marked server-only without tripping the throw.
export {};
