import { SectionSkeleton } from '@/features/section-view'

export default function Loading() {
  // On the dashboard we could have a different skeleton, 
  // but SectionSkeleton is a good enough placeholder for the content area.
  return <SectionSkeleton />
}
