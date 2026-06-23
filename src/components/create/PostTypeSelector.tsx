type Props = {
  postType: 'image' | 'video' | 'text';
  setPostType: (v: 'image' | 'video' | 'text') => void;
  onReset: () => void;
};

export default function PostTypeSelector({ postType, setPostType, onReset }: Props) {
  return (
    <div className="post-type-toggle" style={{ display: 'flex', gap: '8px', marginTop: '20px', background: 'var(--bg-secondary)', padding: '6px', borderRadius: '14px' }}>
      {(['image', 'video', 'text'] as const).map(type => (
        <button
          key={type}
          type="button"
          className={`type-btn ${postType === type ? 'active' : ''}`}
          onClick={() => { setPostType(type); onReset(); }}
          style={{
            flex: 1,
            padding: '10px',
            borderRadius: '10px',
            border: 'none',
            background: postType === type ? 'var(--bg-input)' : 'transparent',
            color: postType === type ? 'var(--text-main)' : 'var(--text-muted)',
            fontWeight: 700,
            cursor: 'pointer',
            transition: '0.2s',
          }}
        >
          {type === 'image' ? 'Foto' : type === 'video' ? 'Video' : 'Teks'}
        </button>
      ))}
    </div>
  );
}