import { TopicGroup } from '@/lib/topics';
import {
  TopicCard,
  OverallProgressCard,
  AddTopicModalWrapper,
  DeleteTopicDialog,
} from './components';

interface Props {
  groups: TopicGroup[];
  searchParams?: {
    'add-subtopic'?: string;
    'delete-topic'?: string;
    label?: string;
  };
}

export default function Dashboard({ groups, searchParams }: Props) {
  const addTarget = searchParams?.['add-subtopic'];
  const deleteTargetSlug = searchParams?.['delete-topic'];
  const deleteTargetLabel = searchParams?.label;

  return (
    <>
      <OverallProgressCard />

      <div className="dash-grid">
        {groups.map((group) => (
          <TopicCard key={group.slug} group={group} />
        ))}
      </div>

      {addTarget && <AddTopicModalWrapper groupSlug={addTarget} />}

      {deleteTargetSlug && deleteTargetLabel && (
        <DeleteTopicDialog slug={deleteTargetSlug} label={deleteTargetLabel} />
      )}
    </>
  );
}
