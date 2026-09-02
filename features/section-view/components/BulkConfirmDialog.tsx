'use client';

import { usePathname } from 'next/navigation';
import { useAppStore } from '@/lib/stores/appStore';
import { useShallow } from 'zustand/react/shallow';
import ConfirmDialog from '@/components/ConfirmDialog';
import { findSection } from '@/lib/content/topics';
import type { ParsedQuestion } from '@/lib/content/parser';

const EMPTY_ARRAY: ParsedQuestion[] = [];

interface BulkConfirmDialogProps {
  confirm: 'select' | 'unselect' | null;
  onCancel: () => void;
}

const BulkConfirmDialog = ({
  confirm,
  onCancel,
}: BulkConfirmDialogProps) => {
  const pathname = usePathname();
  const { setMany, questions, groups } = useAppStore(
    useShallow((s) => ({
      setMany: s.setMany,
      questions: s.sectionQuestionsCache[pathname] || EMPTY_ARRAY,
      groups: s.groups,
    })),
  );

  if (!confirm) return null;

  const isSelect = confirm === 'select';
  const segments = pathname.split('/').filter(Boolean);
  const section = findSection(groups, segments);
  const sectionLabel = section?.label || '';

  const handleConfirm = () => {
    const ids = questions.map((q) => q.id);
    setMany(ids, isSelect);
    onCancel();
  };

  return (
    <ConfirmDialog
      open={true}
      title={isSelect ? 'Mark all as done?' : 'Unselect all?'}
      message={
        isSelect
          ? `This will mark all ${questions.length} questions in "${sectionLabel}" as complete.`
          : `This will clear progress on all ${questions.length} questions in "${sectionLabel}". This can't be undone.`
      }
      confirmLabel={isSelect ? 'Select all' : 'Unselect all'}
      onConfirm={handleConfirm}
      onCancel={onCancel}
    />
  );
};

export default BulkConfirmDialog;
