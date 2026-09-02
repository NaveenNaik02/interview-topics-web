'use strict';

// One-time migration helper: the static curriculum's subtopics (lib/content/topics.ts
// TOPIC_GROUPS[].sections) never had corresponding rows in the `sections`
// table — only a placeholder `topic_groups` row existed per topic (see
// 20260717120000_seed_static_topic_groups.sql). Before
// 20260802120000_owner_scoped_content_reads.sql, that was fine: getAllGroups()
// merged TOPIC_GROUPS in at read time. Now that the merge is gone and reads
// are owner-scoped, those subtopics are unreachable until real `sections`
// rows exist, owned by the account that should see them.
//
// Usage (from web/):
//   node --env-file=.env.local scripts/backfill-static-sections.js <email>

const { createClient } = require('@supabase/supabase-js');

(async () => {
  const email = process.argv[2];
  if (!email) {
    console.error(
      'Usage: node --env-file=.env.local scripts/backfill-static-sections.js <email>',
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

  const { TOPIC_GROUPS } = await import('../lib/content/topics.ts');
  const supabase = createClient(url, serviceKey);

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

  const user = await findUser(email);
  if (!user) {
    console.error(`No user found with email ${email}`);
    process.exit(1);
  }

  const { data: existingGroups, error: groupErr } = await supabase
    .from('topic_groups')
    .select('slug')
    .eq('created_by', user.id);
  if (groupErr) throw groupErr;
  const ownedSlugs = new Set((existingGroups ?? []).map((g) => g.slug));

  const rows = TOPIC_GROUPS.filter((g) => ownedSlugs.has(g.slug)).flatMap((g) =>
    g.sections.map((s) => ({
      topic: s.topic,
      file: s.file,
      label: s.label,
      group_slug: g.slug,
      created_by: user.id,
    })),
  );

  console.log(
    `Backfilling ${rows.length} section(s) across ${ownedSlugs.size} owned topic group(s) for ${email} (${user.id})`,
  );

  const { data, error } = await supabase
    .from('sections')
    .upsert(rows, { onConflict: 'topic,file', ignoreDuplicates: true })
    .select('topic, file');

  if (error) {
    console.error(`FAILED — ${error.message}`);
    process.exit(1);
  }
  console.log(`  sections: ${data?.length ?? 0} row(s) inserted`);
})();
