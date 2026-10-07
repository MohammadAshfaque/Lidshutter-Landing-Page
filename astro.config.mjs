import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';

export default defineConfig({
  site: 'https://lidshutter.com',
  trailingSlash: 'never',
  // Pages are static; only /api/plays runs on the server.
  adapter: vercel(),
});
