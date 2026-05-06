'use client';

// 👇 FIX: Kasih tau TypeScript kalau window punya fungsi naikKeStage 👇
declare global {
  interface Window {
    naikKeStage?: (index: number) => void;
  }
}

export default function Stage() {
  return (
    <section id="stage-grid" className="stage-container">
      <div className="speaker-item empty">
        {/* Panggil window.naikKeStage karena fungsinya udah kita tempelin di window pada file page.tsx */}
        <div className="avatar" onClick={() => window.naikKeStage && window.naikKeStage(0)}>
          <span className="material-icons">add</span>
        </div>
        <span className="name-label">KOSONG</span>
      </div>
    </section>
  );
}
