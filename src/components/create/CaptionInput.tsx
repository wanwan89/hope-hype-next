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
  inputRef?: React.RefObject<HTMLTextAreaElement>;
};

export default function CaptionInput({
  caption,
  onChange,
  onKeyDown,
  postType,
  wordCount,
  maxWords,
  showPopup,
  popupResults,
  onSelectPopupItem,
  inputRef,
}: Props) {
  return (
    <div style={{ position: 'relative', marginTop: '20px' }}>
      {/* Popup Mention / Hashtag */}
      {showPopup !== 'none' && (
        <div className="popup-suggestion-box">
          {popupResults.length > 0 ? (
            popupResults.map((item: any) => (
              <div
                key={item.id || item.tag}
                className="popup-item"
                onClick={() =>
                  onSelectPopupItem(
                    showPopup === 'mention' ? item.username : item.tag
                  )
                }
              >
                {showPopup === 'mention' ? (
                  <>
                    <img
                      src={item.avatar_url || '/asets/png/profile.webp'}
                      alt={item.username}
                    />
                    <div className="popup-name">{item.username}</div>
                  </>
                ) : (
                  <>
                    <span
                      className="material-icons"
                      style={{ color: 'var(--primary)' }}
                    >
                      tag
                    </span>
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

      {/* Textarea utama */}
      <textarea
        ref={inputRef}
        className="post-textarea"
        placeholder={
          postType === 'text'
            ? 'Tulis cerita (maks 150 kata)...'
            : 'Tulis caption (maks 100 kata)...'
        }
        maxLength={10000}
        value={caption}
        onChange={onChange}
        onKeyDown={onKeyDown}
      />

      <div
        style={{
          textAlign: 'right',
          fontSize: '12px',
          color: 'var(--text-muted)',
          marginTop: '4px',
        }}
      >
        {wordCount} / {maxWords} kata
      </div>
    </div>
  );
}