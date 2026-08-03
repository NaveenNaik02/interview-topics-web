'use strict';

// One-time migration helper: reassigns all content/personal-data ownership
// from one account to another. Written for moving a real user's own data
// (e.g. interview-prep questions authored under an old GitHub-OAuth account)
// onto their new email/Google account once reads became owner-scoped (see
// 20260802120000_owner_scoped_content_reads.sql) — without this, that
// content would just become invisible under the new account.
//
// Usage (from web/):
//   node --env-file=.env.local scripts/reassign-owner.js <from-email> <to-email>

const { createClient } = require('@supabase/supabase-js');

// user_settings is deliberately excluded — treated as fresh per-account
// preferences, not prep content, so the destination account keeps its own.
const TABLES = [
  ['questions', 'created_by'],
  ['topic_groups', 'created_by'],
  ['sections', 'created_by'],
  ['progress', 'user_id'],
  ['priority', 'user_id'],
  ['starred_questions', 'user_id'],
  ['question_position', 'user_id'],
  ['inbox_items', 'user_id'],
  ['set_aside_items', 'user_id'],
];

(async () => {
  const [fromEmail, toEmail] = process.argv.slice(2);
  if (!fromEmail || !toEmail) {
    console.error(
      'Usage: node --env-file=.env.local scripts/reassign-owner.js <from-email> <to-email>',
    );
    process.exit(1);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local',
    );
    process.exit(1);
  }

  const supabase = createClient(url, serviceKey);

  // supabase-js has no getUserByEmail — page through listUsers to find it.
  const findUser = async (email) => {
    for (let page = 1; ; page++) {
      const { data, error } = await supabase.auth.admin.listUsers({
        page,
        perPage: 200,
      });
      if (error) throw error;
      const found = data.users.find((u) => u.email === email);
      if (found) return found;
      if (data.users.length < 200) return null;
    }
  };

  const [fromUser, toUser] = await Promise.all([
    findUser(fromEmail),
    findUser(toEmail),
  ]);
  if (!fromUser) {
    console.error(`No user found with email ${fromEmail}`);
    process.exit(1);
  }
  if (!toUser) {
    console.error(`No user found with email ${toEmail}`);
    process.exit(1);
  }

  console.log(
    `Reassigning ${fromEmail} (${fromUser.id}) -> ${toEmail} (${toUser.id})`,
  );

  for (const [table, column] of TABLES) {
    const { data, error } = await supabase
      .from(table)
      .update({ [column]: toUser.id })
      .eq(column, fromUser.id)
      .select('*');

    if (error) {
      console.error(`  ${table}: FAILED — ${error.message}`);
      continue;
    }
    console.log(`  ${table}: ${data?.length ?? 0} row(s) reassigned`);
  }
})();
