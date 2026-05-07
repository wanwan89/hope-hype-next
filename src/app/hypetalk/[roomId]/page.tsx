'use client';

import { Suspense } from 'react';
import ChatArea from '@/components/chat/ChatArea';

export default function ChatPageWrapper() {
  return (
    <Suspense fallback={<div className="loading-state">Loading Chat...</div>}>
      <ChatArea />
    </Suspense>
  );
}
