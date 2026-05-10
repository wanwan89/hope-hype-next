'use client';

import { useTranslation } from 'react-i18next';
import './ChatBoxroom.css';

export default function ChatBox() {
  const { t } = useTranslation();

  return (
    <div id="chat-box" className="chat-display">
      <div className="msg system">
        <div className="sys-header">
          <span className="material-icons sys-icon">campaign</span>
          <span className="user">SISTEM HYPETALK</span>
        </div>
        <div className="sys-text">
          {t('system_rule_msg', 'Jangan gunakan kata kasar, hinaan, atau bullying dalam bentuk apa pun. Selalu jawab dengan sopan, santai, dan tetap menghargai orang lain ya!')}
        </div>
      </div>
    </div>
  );
}
