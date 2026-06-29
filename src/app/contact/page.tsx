'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { showNotif } from '@/lib/ui-utils';
import { useTranslation } from 'react-i18next';
import './Contact.css';

export default function ContactPage() {
  const router = useRouter();
  const { t } = useTranslation();

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

        {/* --- FORM --- */}
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

        {/* --- SOSIAL MEDIA --- */}
        <div className="contact-card">
          <div className="card-title">
            <span className="material-icons">connect_without_contact</span>
            {t('social_media_contact', 'Sosial Media & Kontak')}
          </div>
          
          <div className="social-list-custom">
            <a href="https://instagram.com/hopehypeofficial" target="_blank" rel="noreferrer" className="social-card-btn ig">
              <div className="social-icon-wrapper">
                <svg viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
              </div>
              <div className="social-text">
                <span className="social-text-title">Instagram</span>
                <span className="social-text-sub">@hopehypeofficial</span>
              </div>
            </a>

            <a href="https://wa.me/6283841036042" target="_blank" rel="noreferrer" className="social-card-btn wa">
              <div className="social-icon-wrapper">
                <svg viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.405-.883-.733-1.48-1.638-1.653-1.935-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.299 1.262.478 1.694.611.712.22 1.36.189 1.871.114.574-.084 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
              </div>
              <div className="social-text">
                <span className="social-text-title">WhatsApp</span>
                <span className="social-text-sub">+62 838-4103-6042</span>
              </div>
            </a>

            <a href="mailto:hopeofficial2811@gmail.com" className="social-card-btn email">
              <div className="social-icon-wrapper">
                <span className="material-icons">mail</span>
              </div>
              <div className="social-text">
                <span className="social-text-title">Email</span>
                <span className="social-text-sub">hopeofficial2811@gmail.com</span>
              </div>
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}