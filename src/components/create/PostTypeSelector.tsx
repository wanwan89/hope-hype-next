type Props = {
  postType: 'image' | 'video' | 'text';
  setPostType: (v: 'image' | 'video' | 'text') => void;
  onReset: () => void;
};

export default function PostTypeSelector({ postType, setPostType, onReset }: Props) {
  return (
    <div className="post-type-toggle" style={{ marginTop: '20px' }}>
      {(['image', 'video', 'text'] as const).map(type => (
        <button
          key={type}
          type="button"
          className={`type-btn ${postType === type ? 'active' : ''}`}
          onClick={() => { setPostType(type); onReset(); }}
        >
          {type === 'image' ? 'Foto' : type === 'video' ? 'Video' : 'Teks'}
        </button>
      ))}
    </div>
  );
}
