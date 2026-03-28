import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Translation strings
const resources = {
  en: {
    translation: {
      "app": {
        "title": "CivicPath",
        "tagline": "Your community. Funded.",
        "seeker": "Grant Seeker",
        "funder": "Grant Funder",
      },
      "nav": {
        "dashboard": "Dashboard",
        "grants": "My Grants",
        "tracker": "Grant Tracker",
        "integrations": "Integrations",
        "profile": "Profile",
        "awarded": "Awarded",
        "signout": "Sign Out"
      },
      "dashboard": {
        "welcome": "Hi",
        "start": "Find My Grants",
        "status_idle": "Ready to Scan",
        "status_running": "Pipeline Active",
        "status_paused": "Awaiting Approval",
        "status_completed": "Completed",
        "agents_ready": "Agents Ready to Act"
      }
    }
  },
  es: {
    translation: {
      "app": {
        "title": "CivicPath",
        "tagline": "Tu comunidad. Financiada.",
        "seeker": "Buscador de Subvenciones",
        "funder": "Financiador de Subvenciones",
      },
      "nav": {
        "dashboard": "Tablero",
        "grants": "Mis Subvenciones",
        "tracker": "Rastreador",
        "integrations": "Integraciones",
        "profile": "Perfil",
        "awarded": "Otorgadas",
        "signout": "Cerrar Sesión"
      },
      "dashboard": {
        "welcome": "Hola",
        "start": "Buscar Subvenciones",
        "status_idle": "Listo para Escanear",
        "status_running": "Tubería Activa",
        "status_paused": "Esperando Aprobación",
        "status_completed": "Completado",
        "agents_ready": "Agentes Listos para Actuar"
      }
    }
  },
  fr: {
    translation: {
      "app": {
        "title": "CivicPath",
        "tagline": "Votre communauté. Financée.",
        "seeker": "Chercheur de Subventions",
        "funder": "Bailleur de Fonds",
      },
      "nav": {
        "dashboard": "Tableau de Bord",
        "grants": "Mes Subventions",
        "tracker": "Suivi",
        "integrations": "Intégrations",
        "profile": "Profil",
        "awarded": "Accordées",
        "signout": "Se Déconnecter"
      },
      "dashboard": {
        "welcome": "Salut",
        "start": "Trouver des Subventions",
        "status_idle": "Prêt à Scanner",
        "status_running": "Pipeline Actif",
        "status_paused": "En Attente d'Approbation",
        "status_completed": "Terminé",
        "agents_ready": "Agents Prêts à Agir"
      }
    }
  },
  pt: {
    translation: {
      "app": {
        "title": "CivicPath",
        "tagline": "Sua comunidade. Financiada.",
        "seeker": "Buscador de Subsídios",
        "funder": "Financiador",
      },
      "nav": {
        "dashboard": "Painel",
        "grants": "Meus Subsídios",
        "tracker": "Rastreador",
        "integrations": "Integrações",
        "profile": "Perfil",
        "awarded": "Concedidos",
        "signout": "Sair"
      },
      "dashboard": {
        "welcome": "Olá",
        "start": "Buscar Subsídios",
        "status_idle": "Pronto para Escanear",
        "status_running": "Pipeline Ativo",
        "status_paused": "Aguardando Aprovação",
        "status_completed": "Concluído",
        "agents_ready": "Agentes Prontos"
      }
    }
  },
  ar: {
    translation: {
      "app": {
        "title": "CivicPath",
        "tagline": "مجتمعك. مُمول.",
        "seeker": "باحث عن منحة",
        "funder": "ممُول",
      },
      "nav": {
        "dashboard": "لوحة القيادة",
        "grants": "منحي",
        "tracker": "متتبع المنح",
        "integrations": "تكاملات",
        "profile": "الملف الشخصي",
        "awarded": "المنح الممنوحة",
        "signout": "تسجيل خروج"
      },
      "dashboard": {
        "welcome": "مرحباً",
        "start": "ابحث عن المنح",
        "status_idle": "جاهز للمسح",
        "status_running": "قيد التشغيل",
        "status_paused": "في انتظار الموافقة",
        "status_completed": "اكتمل",
        "agents_ready": "الوكلاء جاهزون"
      }
    }
  },
  zh: {
    translation: {
      "app": {
        "title": "CivicPath",
        "tagline": "你的社区。获得资助。",
        "seeker": "拨款寻求者",
        "funder": "拨款资助者",
      },
      "nav": {
        "dashboard": "仪表板",
        "grants": "我的拨款",
        "tracker": "追踪器",
        "integrations": "集成",
        "profile": "个人资料",
        "awarded": "已获奖",
        "signout": "登出"
      },
      "dashboard": {
        "welcome": "你好",
        "start": "查找拨款",
        "status_idle": "准备扫描",
        "status_running": "管道活动中",
        "status_paused": "等待批准",
        "status_completed": "已完成",
        "agents_ready": "代理已准备就绪"
      }
    }
  },
  ur: {
    translation: {
      "app": {
        "title": "CivicPath",
        "tagline": "آپ کی کمیونٹی۔ فنڈڈ۔",
        "seeker": "گرانٹ کے متلاشی",
        "funder": "گرانٹ فنڈر",
      },
      "nav": {
        "dashboard": "ڈیش بورڈ",
        "grants": "میری گرانٹس",
        "tracker": "ٹریکر",
        "integrations": "انضمام",
        "profile": "پروفائل",
        "awarded": "عطیہ کردہ",
        "signout": "لاگ آؤٹ"
      },
      "dashboard": {
        "welcome": "ہیلو",
        "start": "گرانٹس تلاش کریں",
        "status_idle": "اسکین کے لیے تیار",
        "status_running": "پائپ لائن فعال",
        "status_paused": "منظوری کا انتظار ہے",
        "status_completed": "مکمل",
        "agents_ready": "ایجنٹ تیار ہیں"
      }
    }
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // React already safes from xss
    },
  });

export default i18n;
