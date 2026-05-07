// src/lib/i18n.ts
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
      "language": "Bahasa",
      "account_security": "Akun & Keamanan",
      "personal_info": "Informasi Pribadi",
      "back": "Kembali"
    }
  },
  en: {
    translation: {
      "settings": "Settings",
      "appearance": "Appearance",
      "dark_mode": "Dark Mode",
      "dark_mode_desc": "Reduce eye strain",
      "language": "Language",
      "account_security": "Account & Security",
      "personal_info": "Personal Information",
      "back": "Back"
    }
  },
  zh: {
    translation: {
      "settings": "设置",
      "appearance": "外观",
      "dark_mode": "深色模式",
      "dark_mode_desc": "减少眼睛疲劳",
      "language": "语言",
      "account_security": "账户与安全",
      "personal_info": "个人信息",
      "back": "返回"
    }
  },
  ko: {
    translation: {
      "settings": "설정",
      "appearance": "화면 설정",
      "dark_mode": "다크 모드",
      "dark_mode_desc": "눈의 피로를 줄여줍니다",
      "language": "언어",
      "account_security": "계정 및 보안",
      "personal_info": "개인 정보",
      "back": "뒤로 가기"
    }
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'id',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
