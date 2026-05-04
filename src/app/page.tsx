// src/app/page.tsx
import Gallery from '@/components/post/Gallerypost';
import CommentModal from '@/components/post/CommentModalpost';
import PostModal from '@/components/post/PostModal';
import GiftSheet from '@/components/post/GiftSheetpost';

export default function HomePage() {
  return (
    <>
      {/* Cukup panggil Gallery saja di sini */}
      <Gallery />
      
      <CommentModal />
      <PostModal />
      <GiftSheet />
    </>
  );
}
