'use strict'

// Grants or revokes the `is_admin` app_metadata flag that the
// questions_update_admin / questions_delete_admin RLS policies check
// (see supabase/migrations/20260711194952_admin_question_access.sql).
// app_metadata can only be set via the service role (this script), never by
// the user themselves through the client SDK — that's what makes it safe
// to trust in RLS.
//
// Usage (from web/):
//   node --env-file=.env.local scripts/set-admin.js user@example.com
//   node --env-file=.env.local scripts/set-admin.js user@example.com --revoke

const { createClient } = require('@supabase/supabase-js')

;(async () => {
  const email = process.argv[2]
  const revoke = process.argv.includes('--revoke')
  if (!email) {
    console.error('Usage: node --env-file=.env.local scripts/set-admin.js <email> [--revoke]')
    process.exit(1)
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
    process.exit(1)
  }

  const supabase = createClient(url, serviceKey)

  // supabase-js has no getUserByEmail — page through listUsers to find it.
  let user = null
  for (let page = 1; !user; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 })
    if (error) throw error
    user = data.users.find(u => u.email === email) || null
    if (data.users.length < 200) break
  }
  if (!user) {
    console.error(`No user found with email ${email}`)
    process.exit(1)
  }

  const { error } = await supabase.auth.admin.updateUserById(user.id, {
    app_metadata: { ...user.app_metadata, is_admin: revoke ? false : true },
  })
  if (error) throw error

  console.log(`${revoke ? 'Revoked' : 'Granted'} admin for ${email} (${user.id})`)
})()
