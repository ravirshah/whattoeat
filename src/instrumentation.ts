export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('../sentry.server.config');
    const { setGlobalSentryTags } = await import('./server/instrumentation/tags');
    setGlobalSentryTags();
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('../sentry.edge.config');
  }
}

// onRequestError is a Next.js 15 hook that fires whenever a React rendering
// error or route handler error escapes into the framework. Forwarding to Sentry
// here covers errors that the error boundary cannot catch (e.g., RSC errors).
export const onRequestError = async (
  error: unknown,
  request: { path: string; method: string },
  context: { routerKind: string; routePath: string; routeType: string },
) => {
  const { captureException, withScope } = await import('@sentry/nextjs');
  withScope((scope) => {
    scope.setTag('route', context.routePath);
    scope.setTag('routeType', context.routeType);
    scope.setExtra('path', request.path);
    scope.setExtra('method', request.method);
    captureException(error);
  });
};
