type Props = {
  isSubmitting: boolean;
  destination: 'feed' | 'story';
  draftId: string | null;
  onSubmit: (isDraft: boolean) => void;
};

export default function SubmitButtons({
  isSubmitting,
  destination,
  draftId,
  onSubmit,
}: Props) {
  return (
    <div
      style={{
        display: 'flex',
        gap: '12px',
        marginTop: '30px',
        width: '100%',
      }}
    >
      {destination !== 'story' && (
        <button
          type="button"
          disabled={isSubmitting}
          onClick={() => onSubmit(true)}
          style={{
            flex: 1,
            padding: '16px 0',
            borderRadius: '14px',
            border: 'none',                         // ✅ hilangkan border
            background: 'var(--bg-input)',          // ✅ bg senada textarea
            color: 'var(--text-main)',
            fontSize: '15px',
            fontWeight: 700,
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
            transition: '0.2s ease',
            opacity: isSubmitting ? 0.5 : 1,
          }}
        >
          Simpan Draft
        </button>
      )}

      <button
        type="button"
        onClick={() => onSubmit(false)}
        disabled={isSubmitting}
        style={{
          flex: destination !== 'story' ? 2 : 1,
          padding: '16px 0',
          color: '#fff',
          border: 'none',
          borderRadius: '14px',
          fontSize: '16px',
          fontWeight: 800,
          cursor: isSubmitting ? 'not-allowed' : 'pointer',
          position: 'relative',
          overflow: 'hidden',
          background: isSubmitting
            ? 'var(--bg-input)'
            : 'var(--primary-bg)',
          transform: 'translateZ(0)',
        }}
      >
        <span
          style={{
            position: 'relative',
            zIndex: 2,
            color: isSubmitting ? 'var(--text-muted)' : '#fff',
          }}
        >
          {isSubmitting
            ? 'Memposting...'
            : draftId
            ? 'Publikasikan Draf'
            : 'Posting'}
        </span>
      </button>
    </div>
  );
}