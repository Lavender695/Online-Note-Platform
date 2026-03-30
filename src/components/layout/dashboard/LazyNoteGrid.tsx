import NoteCard from './NoteCard'
import {
  DASHBOARD_NOTE_CARD_CLASSNAME,
  DASHBOARD_NOTE_GRID_CLASSNAME,
} from './noteCardStyles'
import { useLazyVisibleItems } from '@/hooks/use-lazy-visible-items'
import { Note } from '@/types/note'

type Props = {
  notes: Note[]
  isEditMode?: boolean
  selectedNotes?: string[]
  onSelect?: (noteId: string) => void
}

const LazyNoteGrid = ({
  notes,
  isEditMode = false,
  selectedNotes = [],
  onSelect,
}: Props) => {
  const { visibleItems, hasMore, loadMoreRef } = useLazyVisibleItems(notes)

  return (
    <>
      <div className={DASHBOARD_NOTE_GRID_CLASSNAME}>
        {visibleItems.map((note) => (
          <NoteCard
            key={note.id}
            note={note}
            isSelected={isEditMode && selectedNotes.includes(note.id)}
            onSelect={onSelect}
            isEditMode={isEditMode}
            className={DASHBOARD_NOTE_CARD_CLASSNAME}
          />
        ))}
      </div>

      {hasMore && <div ref={loadMoreRef} className="h-8 w-full" aria-hidden="true" />}
    </>
  )
}

export default LazyNoteGrid
