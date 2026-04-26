// Empty mock for the 'server-only' Next.js sentinel.
// In production Next.js enforces this import throws in browser bundles.
// In Vitest we stub it so server-side modules can be imported and tested.
export {};
