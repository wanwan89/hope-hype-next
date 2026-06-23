type Props = {
  isSubmitting: boolean;
  destination: 'feed' | 'story';
  draftId: string | null;
  onSubmit: (isDraft: boolean) => void;
};

export default function SubmitButtons({ isSubmitting, destination, draftId, onSubmit }: Props) {
  return (
    <div style={{ display: 'flex', gap: '10px', marginTop: '30px', width: '100%' }}>
      {destination !== 'story' && (
        <button
          type="button"
          disabled={isSubmitting}
          onClick={() => onSubmit(true)}
          style={{
            flex: 1,
            padding: '16px',
            borderRadius: '14px',
            border: '1px solid var(--border-card)',
            background: 'var(--bg-secondary)',
            color: 'var(--text-main)',
            fontSize: '15px',
            fontWeight: 700,
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
            transition: '0.2s ease',
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
          padding: '16px',
          color: '#fff',
          border: 'none',
          borderRadius: '14px',
          fontSize: '16px',
          fontWeight: 800,
          cursor: isSubmitting ? 'not-allowed' : 'pointer',
          position: 'relative',
          overflow: 'hidden',
          background: isSubmitting ? 'var(--bg-input)' : '#1f3cff',
          transform: 'translateZ(0)',
        }}
      >
        <span style={{ position: 'relative', zIndex: 2, textShadow: isSubmitting ? '0px 2px 4px rgba(0,0,0,0.5)' : 'none', color: isSubmitting ? 'var(--text-muted)' : '#fff' }}>
          {isSubmitting ? `Menyiapkan...` : (draftId ? 'Publikasikan Draf' : 'Posting')}
        </span>
      </button>
    </div>
  );
}