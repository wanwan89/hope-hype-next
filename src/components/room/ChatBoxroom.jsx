'use client'; // Biar aman kalau nanti lu mau tambahin interaksi di client

export default function ChatBox() {
  return (
    <div id="chat-box" className="chat-display">
      <div className="msg system">
        <span className="user">SISTEM:</span> 
        Jangan gunakan kata kasar, hinaan, atau bullying dalam bentuk apa pun. Selalu jawab dengan sopan, santai, dan tetap menghargai orang lain ya!
      </div>
    </div>
  );
}
