'use client';

import { useTranslation } from 'react-i18next';
import './ChatBoxroom.css'; // 🔥 FIX: Pastikan CSS yang udah dipecah di-import ke sini

export default function ChatBox() {
  const { t } = useTranslation();

  return (
    <div id="chat-box" className="chat-display">
      <div className="msg system">
        {/* 🔥 FIX: Menggunakan translation fallback agar otomatis menyesuaikan bahasa lu 🔥 */}
        <span className="user">SISTEM:</span> 
        {t('system_rule_msg', 'Jangan gunakan kata kasar, hinaan, atau bullying dalam bentuk apa pun. Selalu jawab dengan sopan, santai, dan tetap menghargai orang lain ya!')}
      </div>
    </div>
  );
}
