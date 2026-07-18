import InboxClient from '@/components/InboxClient'

// No server-side fetch needed — inbox items are simple per-user rows
// already loaded client-side into ProgressContext (see loadInbox), the same
// way progress/priority are, rather than requiring a join like Priority Mix.
export default function InboxPage() {
  return <InboxClient />
}
