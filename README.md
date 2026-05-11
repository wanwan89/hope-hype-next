<a name="readme-top"></a>

<!-- PROJECT SHIELD / TITLE -->
<br />
<div align="center">
  <a href="https://github.com/username/repo-name">
    <img src="public/logo.svg" alt="Logo" width="80" height="80">
  </a>

  <h1 align="center">Galeri Sosial</h1>

  <p align="center">
    Platform berbagi karya visual dan audio, dibangun dengan Next.js dan Supabase.
    <br />
    <a href="https://your-demo.vercel.app" target="_blank"><strong>Demo Langsung</strong></a>
    &middot;
    <a href="https://github.com/username/repo-name/issues">Laporkan Masalah</a>
    &middot;
    <a href="https://github.com/username/repo-name/issues">Ajukan Fitur</a>
  </p>
</div>

<!-- BADGES -->
<div align="center">

[![Next.js](https://img.shields.io/badge/Next.js-15.x-000000?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Database-3ECF8E?style=for-the-badge&logo=supabase)](https://supabase.com/)
[![Cloudinary](https://img.shields.io/badge/Cloudinary-Media%20CDN-3448C5?style=for-the-badge&logo=cloudinary)](https://cloudinary.com/)
[![i18next](https://img.shields.io/badge/i18next-Multibahasa-26A69A?style=for-the-badge&logo=i18next)](https://react.i18next.com/)

</div>

---

## Daftar Isi

- [Tentang Proyek](#tentang-proyek)
- [Fitur Utama](#fitur-utama)
- [Teknologi](#teknologi)
- [Memulai](#memulai)
  - [Prasyarat](#prasyarat)
  - [Instalasi](#instalasi)
  - [Konfigurasi Environment](#konfigurasi-environment)
- [Struktur Proyek](#struktur-proyek)
- [Pembaruan Terbaru](#pembaruan-terbaru)
- [Kontribusi](#kontribusi)
- [Lisensi](#lisensi)
- [Kontak](#kontak)

---

## Tentang Proyek

**Galeri Sosial** adalah aplikasi web modern yang memungkinkan pengguna untuk membagikan konten multimedia—gambar, video, dan audio—dalam format feed sosial. Proyek ini dikembangkan menggunakan Next.js 15 App Router, TypeScript, Supabase sebagai backend, dan Cloudinary untuk optimalisasi media.

Fokus utama dari aplikasi ini adalah performa tinggi, pengalaman pengguna yang imersif, serta kemudahan dalam mengelola konten dan interaksi sosial.

---

## Fitur Utama

- **Feed Multimedia** – Dukungan penuh untuk gambar, video, dan audio dalam satu postingan.
- **Interaksi Sosial** – Like, repost, simpan, komentar, dan follow antar pengguna.
- **Infinite Scroll** – Muat lebih banyak konten dengan tombol "Muat Lebih Banyak Karya".
- **Autoplay Cerdas** – Audio dan video diputar otomatis saat postingan terlihat di layar (Intersection Observer).
- **Tema Gelap / Terang** – Warna teks dan ikon menyesuaikan variabel `--text-main` secara otomatis.
- **Multi-bahasa** – Dukungan internasionalisasi menggunakan react-i18next.
- **Notifikasi Real-time** – Pemberitahuan instan untuk like, follow, dan komentar.
- **Branding Halus** – Watermark dan informasi lagu muncul tanpa mengganggu navigasi.

---

## Teknologi

| Teknologi          | Kegunaan                                |
| ------------------ | --------------------------------------- |
| **Next.js 15**     | Framework React dengan App Router       |
| **TypeScript**     | Keamanan tipe dan pengembangan lebih baik |
| **Supabase**       | Database, otentikasi, dan penyimpanan   |
| **Cloudinary**     | CDN dan transformasi media (gambar/video/audio) |
| **react-i18next**  | Internasionalisasi antarmuka pengguna   |
| **Intersection Observer** | Kontrol autoplay dan lazy loading |
| **CSS Variables**  | Tema dinamis tanpa library tambahan     |

---

## Memulai

### Prasyarat

- Node.js versi 18 atau lebih baru
- npm / yarn / pnpm
- Akun Supabase dan Cloudinary (gratis)

### Instalasi

1. Clone repository
   ```bash
   git clone https://github.com/username/repo-name.git
   cd repo-name