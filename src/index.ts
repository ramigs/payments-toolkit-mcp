import 'dotenv/config';

const useHttp = process.argv.includes('--http');

// Set before importing either transport module, and via dynamic `import()`
// rather than a static one, so `logger.ts` (imported transitively by both
// transport modules) sees it at its own module-evaluation time. A static
// import of both transports at the top of this file would be hoisted ahead
// of this assignment, making it too late for logger.ts's module-level
// `pino.destination()` call to pick up.
process.env.MCP_TRANSPORT = useHttp ? 'http' : 'stdio';

if (useHttp) {
  const { runHttp } = await import('./transports/http.js');
  await runHttp(Number(process.env.PORT ?? 3000));
} else {
  const { runStdio } = await import('./transports/stdio.js');
  await runStdio();
}
