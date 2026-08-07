'use client';

import { useRouter } from 'next/navigation';
import AddTopicModal from '@/components/AddTopicModal';

export default function AddTopicModalClient() {
  const router = useRouter();
  return (
    <AddTopicModal
      onClose={() => router.replace('/')}
      onSaved={() => {
        router.replace('/');
        router.refresh();
      }}
    />
  );
}
