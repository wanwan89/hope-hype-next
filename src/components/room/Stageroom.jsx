'use client'; // Pake ini karena kita manggil fungsi dari window (Vanilla JS)

export default function Stage() {
  return (
    <section id="stage-grid" className="stage-container">
      <div className="speaker-item empty">
        {/* Panggil window.naikKeStage karena fungsinya udah kita tempein di window pada file page.jsx */}
        <div className="avatar" onClick={() => window.naikKeStage && window.naikKeStage(0)}>
          <span className="material-icons">add</span>
        </div>
        <span className="name-label">KOSONG</span>
      </div>
    </section>
  );
}
