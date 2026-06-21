import app from './app.js';
import { env } from './config/env.js';

app.listen(env.port, () => {
  console.log(`[Wiring API] http://localhost:${env.port}`);
  if (env.devBypassAuth) {
    console.log('[Wiring API] DEV_BYPASS_AUTH aktif — auth dilewati');
  }
});
