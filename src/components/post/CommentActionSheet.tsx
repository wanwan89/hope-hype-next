// components/CommentActionSheet.tsx
'use client';

interface CommentActionSheetProps {
  isOpen: boolean;
  onClose: () => void;
  comment: any;
  myUserId: string | null;
  currentCreatorId: string | null;
  onDelete: () => void;
  onReport: () => void;
}

export default function CommentActionSheet({
  isOpen, onClose, comment, myUserId, currentCreatorId, onDelete, onReport
}: CommentActionSheetProps) {
  return (
    <>
      <div className={`c-action-overlay ${isOpen ? 'active' : ''}`} onClick={onClose}></div>
      <div className={`c-action-sheet ${isOpen ? 'open' : ''}`}>
        <div className="c-drag-handle"></div>
        
        {comment && (comment.user_id === myUserId || currentCreatorId === myUserId) && (
          <button className="c-action-btn danger" onClick={onDelete}>
            <span className="material-icons">delete_outline</span> Hapus Komentar
          </button>
        )}
        
        <button className="c-action-btn warning" onClick={onReport}>
          <span className="material-icons">report_problem</span> Laporkan Komentar
        </button>
      </div>
    </>
  );
}
