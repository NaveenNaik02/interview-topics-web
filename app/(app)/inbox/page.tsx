import { InboxClient, InboxCaptureButton, fetchInitialInboxPageData } from '@/features/inbox';

export default async function InboxPage() {
  const { inboxItems, setAsideItems } = await fetchInitialInboxPageData();

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
