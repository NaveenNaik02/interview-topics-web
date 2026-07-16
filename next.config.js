/** @type {import('next').NextConfig} */
module.exports = {
  // dev:local sets DEV_LOCAL=1 so it builds into its own directory, avoiding
  // the "Another next dev server is already running" lock conflict with a
  // plain `npm run dev` (prod Supabase) running at the same time.
  distDir: process.env.DEV_LOCAL ? '.next-local' : '.next',
}
