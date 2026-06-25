'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ChatInput({ replyToMsg, onCancelReply, onSendMessage }: any) {
  const [text, setText] = useState('');

  const handleSend = () => {
    if (text.trim() || replyToMsg) {
      onSendMessage(text);
      setText(''); // Reset input setelah terkirim
    }
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: 0, left: 0, right: 0,
      backgroundColor: '#131520', // Sesuaikan warna latar belakang dengan tema gelap aplikasi Anda
      padding: '10px 16px max(10px, env(safe-area-inset-bottom))',
      borderTop: '1px solid rgba(255, 255, 255, 0.05)',
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column'
    }}>
      
      {/* 1 & 2. BOX REPLY: Muncul di atas input, Rata Kiri, dan Teks Terpotong Otomatis */}
      <AnimatePresence>
        {replyToMsg && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: 'rgba(255, 255, 255, 0.05)', // Background agak gelap/transparan
              borderRadius: '12px 12px 4px 4px',
              padding: '8px 12px',
              borderLeft: '4px solid #a855f7', // Penanda warna ungu
              marginBottom: '6px',
              width: '100%',
              boxSizing: 'border-box'
            }}
          >
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              textAlign: 'left', // PERBAIKAN 2: Box reply rata kiri
              overflow: 'hidden', 
              flex: 1,
              marginRight: '12px'
            }}>
              <span style={{ 
                fontSize: '12px', 
                fontWeight: 'bold', 
                color: '#a855f7',
                marginBottom: '2px'
              }}>
                Membalas {replyToMsg.profiles?.username || replyToMsg.username || 'User'}
              </span>
              
              {/* PERBAIKAN 1: Teks panjang dipotong & jadi satu baris sesuai ukuran input */}
              <p style={{
                fontSize: '13px',
                color: 'rgba(255, 255, 255, 0.7)',
                margin: 0,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                width: '100%'
              }}>
                {replyToMsg.message || 'Media'}
              </p>
            </div>

            <button 
              onClick={onCancelReply}
              style={{
                background: 'none',
                border: 'none',
                color: 'rgba(255, 255, 255, 0.6)',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <span className="material-icons" style={{ fontSize: '18px' }}>close</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* BAR INPUT UTAMA */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%' }}>
        
        {/* Kolom Teks (Rounded) */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          backgroundColor: '#1e2230',
          borderRadius: '24px',
          padding: '6px 14px',
          flex: 1,
        }}>
          <span className="material-icons" style={{ color: 'rgba(255,255,255,0.6)', cursor: 'pointer', marginRight: '8px' }}>
            sentiment_satisfied
          </span>

          <input 
            type="text" 
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ketik pesan..."
            style={{
              flex: 1,
              background: 'none',
              border: 'none',
              outline: 'none',
              color: '#ffffff',
              fontSize: '14px',
              padding: '8px 0',
              width: '100%'
            }}
          />

          <span className="material-icons" style={{ color: 'rgba(255,255,255,0.6)', cursor: 'pointer', marginLeft: '8px' }}>
            photo_camera
          </span>
        </div>

        {/* PERBAIKAN 3. TOMBOL KIRIM: Biru Glosi & Tanpa Shadow */}
        <button
          onClick={handleSend}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '42px',
            height: '42px',
            borderRadius: '50%',
            // Efek Glosi Biru (Gradasi Linear)
            background: 'linear-gradient(180deg, #3b82f6 0%, #1d4ed8 100%)',
            // Border tipis untuk menambah detail pantulan kaca
            border: '1px solid rgba(255, 255, 255, 0.15)',
            color: '#ffffff',
            cursor: 'pointer',
            outline: 'none',
            padding: 0,
            flexShrink: 0,
            boxShadow: 'none', // Memastikan TIDAK ADA efek shadow
            transition: 'opacity 0.2s ease'
          }}
          onMouseOver={(e) => e.currentTarget.style.opacity = '0.85'}
          onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
        >
          <span className="material-icons" style={{ fontSize: '20px', fontWeight: 'bold' }}>send</span>
        </button>

      </div>
    </div>
  );
}
