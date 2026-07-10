'use strict'

// Applies pending SQL migrations from supabase/migrations/ (repo root, shared
// with the Supabase CLI) to the linked project via the Management API over
// HTTPS. Some environments block direct Postgres (port 5432) egress, which is
// what `supabase db push` needs — this works around that while writing to the
// same supabase_migrations.schema_migrations table the CLI itself uses, so
// `supabase migration list` / `db push` stay accurate from a machine that can
// reach 5432.
//
// Usage (from web/): node --env-file=.env.local scripts/migrate.js

const fs = require('fs')
const path = require('path')

const MIGRATIONS_DIR = path.resolve(__dirname, '../../supabase/migrations')
const API_BASE = 'https://api.supabase.com/v1/projects'

function projectRefFromUrl(url) {
  const m = url.match(/^https:\/\/([a-z0-9]+)\.supabase\.co/)
  if (!m) throw new Error(`Could not parse project ref from ${url}`)
  return m[1]
}

async function runQuery(ref, token, query) {
  const res = await fetch(`${API_BASE}/${ref}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  })
  const body = await res.json().catch(() => null)
  if (!res.ok) {
    throw new Error(`Query failed (${res.status}): ${JSON.stringify(body)}`)
  }
  return body
}

;(async () => {
  const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const accessToken = process.env.SUPABASE_ACCESS_TOKEN
  if (!projectUrl || !accessToken) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_ACCESS_TOKEN')
    process.exit(1)
  }
  const ref = projectRefFromUrl(projectUrl)

  // Same tracking table the Supabase CLI uses for `db push` / `migration list`.
  await runQuery(ref, accessToken, `
    create schema if not exists supabase_migrations;
    create table if not exists supabase_migrations.schema_migrations (
      version text primary key,
      statements text[],
      name text
    );
  `)

  const applied = await runQuery(ref, accessToken, `select version from supabase_migrations.schema_migrations;`)
  const appliedVersions = new Set(applied.map(r => r.version))

  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort()

  const pending = files.filter(f => {
    const m = f.match(/^(\d+)_/)
    return m && !appliedVersions.has(m[1])
  })

  if (pending.length === 0) {
    console.log('No pending migrations.')
    return
  }

  console.log(`Pending: ${pending.join(', ')}`)

  for (const file of pending) {
    const [, version, name] = file.match(/^(\d+)_(.+)\.sql$/)
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf-8')
    process.stdout.write(`Applying ${file}... `)
    await runQuery(ref, accessToken, sql)
    await runQuery(
      ref, accessToken,
      `insert into supabase_migrations.schema_migrations (version, name) values ('${version}', '${name.replace(/'/g, "''")}');`
    )
    console.log('done')
  }

  console.log(`Applied ${pending.length} migration(s).`)
})().catch(err => {
  console.error(err.message)
  process.exit(1)
})
