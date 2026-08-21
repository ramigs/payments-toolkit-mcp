import { runStdio } from './transports/stdio.js';
import { runHttp } from './transports/http.js';

const useHttp = process.argv.includes('--http');

if (useHttp) {
  const port = Number(process.env.PORT ?? 3000);
  await runHttp(port);
} else {
  await runStdio();
}
