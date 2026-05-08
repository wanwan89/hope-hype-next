'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { showNotif } from '@/lib/ui-utils';
import { useTranslation } from 'react-i18next'; // 🔥 FIX: Import i18n
import './Contact.css';

export default function ContactPage() {
  const router = useRouter();
  const { t } = useTranslation(); // 🔥 FIX: Init i18n

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    category: 'Kritik & Saran',
    message: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.email || !formData.message) {
      showNotif(t('fill_all_fields', 'Harap isi semua kolom yang tersedia'), "warning");
      return;
    }

    setIsSubmitting(true);

    try {
      // Sesuai instruksi, URL Formspree tetep dijaga logikanya
      const response = await fetch("https://formspree.io/f/xrejygqq", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          Nama: formData.name,
          Email: formData.email,
          Kategori: formData.category,
          Pesan: formData.message,
        })
      });

      if (response.ok) {
        showNotif(t('message_sent', 'Pesan terkirim! Terima kasih atas masukannya.'), "success");
        setFormData({ name: '', email: '', category: 'Kritik & Saran', message: '' });
      } else {
        throw new Error("Gagal mengirim pesan.");
      }
    } catch (error) {
      console.error(error);
      showNotif(t('message_failed', 'Gagal mengirim pesan. Coba lagi nanti.'), "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="contact-container">
      <header className="contact-header">
        <button className="back-btn" onClick={() => router.back()}>
          <span className="material-icons">arrow_back</span>
        </button>
        <h2>{t('contact_us', 'Hubungi Kami')}</h2>
      </header>

      <main className="contact-content">
        <p className="contact-desc">
          {t('contact_desc', 'Punya keluhan, menemukan bug, atau ada ide keren buat HopeHype? Jangan ragu buat ngobrol sama kami!')}
        </p>

        {/* --- FORM KELUHAN & KRITIK --- */}
        <div className="contact-card">
          <div className="card-title">
            <span className="material-icons">support_agent</span>
            {t('send_direct_message', 'Kirim Pesan Langsung')}
          </div>
          
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>{t('your_name', 'Nama Kamu')}</label>
              <input 
                type="text" 
                name="name" 
                placeholder={t('name_placeholder', 'Misal: John Doe')} 
                value={formData.name} 
                onChange={handleChange} 
                required 
              />
            </div>

            <div className="form-group">
              <label>{t('email_address', 'Alamat Email')}</label>
              <input 
                type="email" 
                name="email" 
                placeholder="Misal: john@gmail.com" 
                value={formData.email} 
                onChange={handleChange} 
                required 
              />
            </div>

            <div className="form-group">
              <label>{t('message_category', 'Kategori Pesan')}</label>
              <select name="category" value={formData.category} onChange={handleChange}>
                <option value="Kritik & Saran">{t('cat_suggestion', 'Kritik & Saran')}</option>
                <option value="Laporan Bug / Error">{t('cat_bug', 'Laporan Bug / Error')}</option>
                <option value="Keluhan Pembayaran">{t('cat_payment', 'Keluhan Pembayaran / Koin')}</option>
                <option value="Lainnya">{t('cat_other', 'Lainnya')}</option>
              </select>
            </div>

            <div className="form-group">
              <label>{t('message_detail', 'Detail Pesan')}</label>
              <textarea 
                name="message" 
                rows={4} 
                placeholder={t('message_placeholder', 'Jelaskan keluhan atau saran kamu secara detail...')} 
                value={formData.message} 
                onChange={handleChange} 
                required 
              />
            </div>

            <button type="submit" className="btn-submit" disabled={isSubmitting}>
              {isSubmitting ? t('sending', 'Mengirim...') : (
                <>
                  <span className="material-icons" style={{fontSize: '18px'}}>send</span> {t('btn_send_message', 'Kirim Pesan')}
                </>
              )}
            </button>
          </form>
        </div>

        {/* --- SOSIAL MEDIA & KONTAK CEPAT (FIXED DATA) --- */}
        <div className="contact-card">
          <div className="card-title">
            <span className="material-icons">connect_without_contact</span>
            {t('social_media_contact', 'Sosial Media & Kontak')}
          </div>
          
          <div className="social-grid">
            <a href="https://instagram.com/hopehypeofficial" target="_blank" rel="noreferrer" className="social-btn ig">
              <svg className="social-icon" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
              Instagram
            </a>

            <a href="https://wa.me/6283841036042" target="_blank" rel="noreferrer" className="social-btn wa">
              <span className="material-icons" style={{fontSize: '18px'}}>whatsapp</span>
              WhatsApp
            </a>

            <a href="mailto:hopeofficial2811@gmail.com" className="social-btn email">
              <span className="material-icons" style={{fontSize: '18px'}}>mail</span>
              Email
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}
