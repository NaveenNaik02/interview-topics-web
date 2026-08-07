'use client';

import { useRouter } from 'next/navigation';
import AddTopicModal from '@/components/AddTopicModal';

interface Props {
  groupSlug: string;
}

export default function AddTopicModalWrapper({ groupSlug }: Props) {
  const router = useRouter();
  return (
    <AddTopicModal
      initialMode="subtopic"
      initialGroupSlug={groupSlug}
      onClose={() => router.replace('/')}
      onSaved={() => {
        router.replace('/');
        router.refresh();
      }}
    />
  );
}
