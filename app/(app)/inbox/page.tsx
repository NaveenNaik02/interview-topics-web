import { createClient } from '@/lib/supabase/server';
import { InboxClient, InboxCaptureButton } from '@/features/inbox/components';
import type { InboxItem } from '@/features/inbox/db';
import type { SetAsideItem } from '@/lib/db/setAside';

export default async function InboxPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let inboxItems: InboxItem[] = [];
  let setAsideItems: SetAsideItem[] = [];

  if (user) {
    const [{ data: inboxRows }, { data: asideRows }] = await Promise.all([
      supabase
        .from('inbox_items')
        .select('id, text, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('set_aside_items')
        .select(
          'id, title, markdown, body_html, lang, tags, problem, topic, file, label, created_at',
        )
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
    ]);

    inboxItems = (inboxRows ?? []).map((r) => ({
      id: r.id,
      text: r.text,
      createdAt: r.created_at,
    }));
    setAsideItems = (asideRows ?? []).map((r) => ({
      id: r.id,
      title: r.title,
      markdown: r.markdown,
      bodyHtml: r.body_html,
      lang: r.lang,
      tags: r.tags,
      problem: r.problem,
      topic: r.topic,
      file: r.file,
      label: r.label,
      createdAt: r.created_at,
    }));
  }

  return (
    <div className="content-wrapper">
      <div className="subtopic-header" style={{ marginBottom: 'var(--s-5)' }}>
        <div className="ic-page-head">
          <div>
            <div className="eyebrow">Save for later</div>
            <h1 className="subtopic-title">Inbox</h1>
            <p className="build-lede">
              New questions waiting on an answer, and ones you&apos;ve set aside
              — assign each to a topic whenever you&apos;re ready.
            </p>
          </div>
          <InboxCaptureButton />
        </div>
      </div>

      <InboxClient inboxItems={inboxItems} setAsideItems={setAsideItems} />
    </div>
  );
}
