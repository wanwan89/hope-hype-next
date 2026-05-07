'use client';

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const resources = {
  id: {
    translation: {
      "settings": "Pengaturan",
      "appearance": "Tampilan",
      "dark_mode": "Mode Gelap",
      "dark_mode_desc": "Kurangi silau pada mata",
      "language": "Bahasa Aplikasi",
      "lang_desc": "Memilih bahasa akan mengubah seluruh teks pada antarmuka aplikasi.",
      "account_security": "Akun & Keamanan",
      "personal_info": "Informasi Pribadi",
      "back": "Kembali",
      "lang_updated": "Bahasa berhasil diubah!"
    }
  },
  en: {
    translation: {
      "settings": "Settings",
      "appearance": "Appearance",
      "dark_mode": "Dark Mode",
      "dark_mode_desc": "Reduce eye strain",
      "language": "App Language",
      "lang_desc": "Choosing a language will change all text on the application interface.",
      "account_security": "Account & Security",
      "personal_info": "Personal Information",
      "back": "Back",
      "lang_updated": "Language updated successfully!"
    }
  },
  zh: {
    translation: {
      "settings": "设置",
      "appearance": "外观",
      "dark_mode": "深色模式",
      "dark_mode_desc": "减少眼睛疲劳",
      "language": "应用语言",
      "lang_desc": "选择语言将更改应用程序界面的所有文本。",
      "account_security": "账户与安全",
      "personal_info": "个人信息",
      "back": "返回",
      "lang_updated": "语言更新成功！"
    }
  },
  ko: {
    translation: {
      "settings": "설정",
      "appearance": "화면 설정",
      "dark_mode": "다크 모드",
      "dark_mode_desc": "눈의 피로를 줄여줍니다",
      "language": "앱 언어",
      "lang_desc": "언어를 선택하면 애플리케이션 인터페이스의 모든 텍스트가 변경됩니다.",
      "account_security": "계정 및 보안",
      "personal_info": "개인 정보",
      "back": "뒤로 가기",
      "lang_updated": "언어가 성공적으로 업데이트되었습니다!"
    }
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'id',
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'cookie', 'navigator'],
      caches: ['localStorage']
    }
  });

export default i18n;
