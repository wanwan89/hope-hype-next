type Props = {
  caption: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  postType: 'image' | 'video' | 'text';
  wordCount: number;
  maxWords: number;
  showPopup: 'none' | 'mention' | 'hashtag';
  popupResults: any[];
  onSelectPopupItem: (item: string) => void;
};

export default function CaptionInput({ caption, onChange, onKeyDown, postType, wordCount, maxWords, showPopup, popupResults, onSelectPopupItem }: Props) {
  return (
    <div style={{ position: 'relative', marginTop: '20px' }}>
      {showPopup !== 'none' && (
        <div className="popup-suggestion-box">
          {popupResults.length > 0 ? (
            popupResults.map((item: any) => (
              <div key={item.id || item.tag} className="popup-item" onClick={() => onSelectPopupItem(showPopup === 'mention' ? item.username : item.tag)}>
                {showPopup === 'mention' ? (
                  <>
                    <img src={item.avatar_url || '/asets/png/profile.webp'} alt={item.username} />
                    <div className="popup-name">{item.username}</div>
                  </>
                ) : (
                  <>
                    <span className="material-icons" style={{ color: '#1DA1F2' }}>tag</span>
                    <div className="popup-tag">{item.tag}</div>
                  </>
                )}
              </div>
            ))
          ) : (
            <div className="popup-empty">Tidak ditemukan...</div>
          )}
        </div>
      )}
      <textarea
        className="post-textarea"
        placeholder={postType === 'text' ? 'Tulis cerita (maks 150 kata)...' : 'Tulis caption (maks 100 kata)...'}
        maxLength={10000}
        value={caption}
        onChange={onChange}
        onKeyDown={onKeyDown}
        style={{ width: '100%', minHeight: '120px', background: 'var(--bg-secondary)', border: '1px solid var(--border-card)', borderRadius: '16px', padding: '15px', color: 'var(--text-main)', fontSize: '15px', outline: 'none', resize: 'vertical' }}
      />
      <div style={{ textAlign: 'right', fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
        {wordCount} / {maxWords} kata
      </div>
    </div>
  );
}