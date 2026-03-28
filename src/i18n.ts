import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Translation strings
const resources = {
  en: {
    translation: {
      "app": { "title": "CivicPath", "tagline": "Your community. Funded.", "seeker": "Grant Seeker", "funder": "Grant Funder" },
      "nav": { "dashboard": "Dashboard", "grants": "My Grants", "tracker": "Grant Tracker", "integrations": "Integrations", "profile": "Profile", "awarded": "Awarded", "signout": "Sign Out", "howItWorks": "How It Works", "findGrants": "Find Grants", "giveGrants": "Give Grants", "pricing": "Pricing", "logIn": "Log in", "findGrantsCta": "Find Grants →" },
      "dashboard": { "welcome": "Hi", "start": "Find My Grants", "status_idle": "Ready to Scan", "status_running": "Pipeline Active", "status_paused": "Awaiting Approval", "status_completed": "Completed", "agents_ready": "Agents Ready to Act" },
      "hero": { "badge": "🏆 Google Cloud ADK Hackathon 2026 · Finalist", "h1": "Find The Grant", "h2": "That Gets You.", "sub": "8 AI agents find, score, draft, comply, submit, and manage grants for your org — automatically. First match in 60 seconds.", "ctaFind": "Find My Grants →", "ctaGive": "Give Grants", "ctaAsk": "Ask MyLalla", "chatPlaceholder": "Ask MyLalla: What grants does my nonprofit qualify for?", "chatBtn": "Ask →", "chatCta": "Get your full personalized match →", "trust": "Free · No credit card · Sovereign data" },
      "login": { "tagline": "Your community. Funded.", "iAm": "I am a", "seeker": "Grant Seeker", "seekerSub": "I need funding", "funder": "Grant Funder", "funderSub": "I offer grants", "signIn": "Sign In", "createAccount": "Create Account", "google": "Continue with Google", "linkedin": "Continue with LinkedIn", "or": "or", "fullName": "Full Name", "email": "Email", "password": "Password", "forgotPw": "Forgot password?", "submit": "Sign In", "submitCreate": "Create Account", "terms": "By signing in you agree to our Terms & Privacy Policy.", "noAccount": "No account?", "tryDemo": "▶ Try Live Demo instead" }
    }
  },
  es: {
    translation: {
      "app": { "title": "CivicPath", "tagline": "Tu comunidad. Financiada.", "seeker": "Buscador de Subvenciones", "funder": "Financiador" },
      "nav": { "dashboard": "Tablero", "grants": "Mis Subvenciones", "tracker": "Rastreador", "integrations": "Integraciones", "profile": "Perfil", "awarded": "Otorgadas", "signout": "Cerrar Sesión", "howItWorks": "Cómo Funciona", "findGrants": "Buscar Fondos", "giveGrants": "Dar Fondos", "pricing": "Precios", "logIn": "Iniciar sesión", "findGrantsCta": "Buscar Fondos →" },
      "dashboard": { "welcome": "Hola", "start": "Buscar Subvenciones", "status_idle": "Listo para Escanear", "status_running": "Tubería Activa", "status_paused": "Esperando Aprobación", "status_completed": "Completado", "agents_ready": "Agentes Listos para Actuar" },
      "hero": { "badge": "🏆 Google Cloud ADK Hackathon 2026 · Finalista", "h1": "Encuentra la Beca", "h2": "Que Te Consigue.", "sub": "8 agentes de IA encuentran, puntúan, redactan y gestionan subvenciones — automáticamente. Primera coincidencia en 60 segundos.", "ctaFind": "Buscar Mis Fondos →", "ctaGive": "Dar Fondos", "ctaAsk": "Preguntar a MyLalla", "chatPlaceholder": "Pregunta a MyLalla: ¿Para qué subvenciones califica mi organización?", "chatBtn": "Preguntar →", "chatCta": "Obtén tu lista personalizada completa →", "trust": "Gratis · Sin tarjeta de crédito · Datos soberanos" },
      "login": { "tagline": "Tu comunidad. Financiada.", "iAm": "Soy", "seeker": "Buscador de Fondos", "seekerSub": "Necesito financiación", "funder": "Otorgante de Fondos", "funderSub": "Ofrezco subvenciones", "signIn": "Iniciar Sesión", "createAccount": "Crear Cuenta", "google": "Continuar con Google", "linkedin": "Continuar con LinkedIn", "or": "o", "fullName": "Nombre Completo", "email": "Correo Electrónico", "password": "Contraseña", "forgotPw": "¿Olvidaste tu contraseña?", "submit": "Iniciar Sesión", "submitCreate": "Crear Cuenta", "terms": "Al iniciar sesión aceptas nuestros Términos y Privacidad.", "noAccount": "¿Sin cuenta?", "tryDemo": "▶ Prueba la Demo en Vivo" }
    }
  },
  fr: {
    translation: {
      "app": { "title": "CivicPath", "tagline": "Votre communauté. Financée.", "seeker": "Chercheur de Subventions", "funder": "Bailleur de Fonds" },
      "nav": { "dashboard": "Tableau de Bord", "grants": "Mes Subventions", "tracker": "Suivi", "integrations": "Intégrations", "profile": "Profil", "awarded": "Accordées", "signout": "Se Déconnecter", "howItWorks": "Comment ça marche", "findGrants": "Trouver des Fonds", "giveGrants": "Donner des Fonds", "pricing": "Tarifs", "logIn": "Connexion", "findGrantsCta": "Trouver des Fonds →" },
      "dashboard": { "welcome": "Salut", "start": "Trouver des Subventions", "status_idle": "Prêt à Scanner", "status_running": "Pipeline Actif", "status_paused": "En Attente d'Approbation", "status_completed": "Terminé", "agents_ready": "Agents Prêts à Agir" },
      "hero": { "badge": "🏆 Google Cloud ADK Hackathon 2026 · Finaliste", "h1": "Trouvez la Subvention", "h2": "Qui Vous Correspond.", "sub": "8 agents IA trouvent, scorent, rédigent et gèrent les subventions — automatiquement. Première correspondance en 60 secondes.", "ctaFind": "Mes Subventions →", "ctaGive": "Donner des Fonds", "ctaAsk": "Demander à MyLalla", "chatPlaceholder": "Demandez à MyLalla : Quelles subventions puis-je obtenir ?", "chatBtn": "Demander →", "chatCta": "Obtenez votre liste personnalisée complète →", "trust": "Gratuit · Sans carte de crédit · Données souveraines" },
      "login": { "tagline": "Votre communauté. Financée.", "iAm": "Je suis", "seeker": "Chercheur de Fonds", "seekerSub": "J'ai besoin de financement", "funder": "Bailleur de Fonds", "funderSub": "J'offre des subventions", "signIn": "Se Connecter", "createAccount": "Créer un Compte", "google": "Continuer avec Google", "linkedin": "Continuer avec LinkedIn", "or": "ou", "fullName": "Nom Complet", "email": "E-mail", "password": "Mot de passe", "forgotPw": "Mot de passe oublié ?", "submit": "Se Connecter", "submitCreate": "Créer un Compte", "terms": "En vous connectant vous acceptez nos Conditions et Confidentialité.", "noAccount": "Pas de compte ?", "tryDemo": "▶ Essayer la Démo" }
    }
  },
  pt: {
    translation: {
      "app": { "title": "CivicPath", "tagline": "Sua comunidade. Financiada.", "seeker": "Buscador de Verbas", "funder": "Concedente" },
      "nav": { "dashboard": "Painel", "grants": "Meus Subsídios", "tracker": "Rastreador", "integrations": "Integrações", "profile": "Perfil", "awarded": "Concedidos", "signout": "Sair", "howItWorks": "Como Funciona", "findGrants": "Encontrar Verbas", "giveGrants": "Conceder Verbas", "pricing": "Preços", "logIn": "Entrar", "findGrantsCta": "Encontrar Verbas →" },
      "dashboard": { "welcome": "Olá", "start": "Buscar Verbas", "status_idle": "Pronto para Escanear", "status_running": "Pipeline Ativo", "status_paused": "Aguardando Aprovação", "status_completed": "Concluído", "agents_ready": "Agentes Prontos" },
      "hero": { "badge": "🏆 Google Cloud ADK Hackathon 2026 · Finalista", "h1": "Encontre a Verba", "h2": "Que Te Impulsiona.", "sub": "8 agentes de IA encontram, pontuam, redigem e gerenciam verbas — automaticamente. Primeiro resultado em 60 segundos.", "ctaFind": "Encontrar Minhas Verbas →", "ctaGive": "Conceder Verbas", "ctaAsk": "Perguntar ao MyLalla", "chatPlaceholder": "Pergunte ao MyLalla: Para quais verbas minha ONG se qualifica?", "chatBtn": "Perguntar →", "chatCta": "Obtenha sua lista personalizada completa →", "trust": "Gratuito · Sem cartão · Dados soberanos" },
      "login": { "tagline": "Sua comunidade. Financiada.", "iAm": "Sou", "seeker": "Buscador de Verbas", "seekerSub": "Preciso de financiamento", "funder": "Concedente", "funderSub": "Ofereço verbas", "signIn": "Entrar", "createAccount": "Criar Conta", "google": "Continuar com Google", "linkedin": "Continuar com LinkedIn", "or": "ou", "fullName": "Nome Completo", "email": "E-mail", "password": "Senha", "forgotPw": "Esqueceu a senha?", "submit": "Entrar", "submitCreate": "Criar Conta", "terms": "Ao entrar você concorda com nossos Termos e Privacidade.", "noAccount": "Sem conta?", "tryDemo": "▶ Experimentar Demo" }
    }
  },
  ar: {
    translation: {
      "app": { "title": "CivicPath", "tagline": "مجتمعك. ممول.", "seeker": "باحث عن منح", "funder": "جهة منح" },
      "nav": { "dashboard": "لوحة القيادة", "grants": "منحي", "tracker": "متتبع المنح", "integrations": "تكاملات", "profile": "الملف الشخصي", "awarded": "الممنوحة", "signout": "تسجيل خروج", "howItWorks": "كيف يعمل", "findGrants": "ابحث عن منح", "giveGrants": "امنح تمويلاً", "pricing": "الأسعار", "logIn": "تسجيل الدخول", "findGrantsCta": "ابحث عن منح ←" },
      "dashboard": { "welcome": "مرحباً", "start": "ابحث عن المنح", "status_idle": "جاهز للمسح", "status_running": "قيد التشغيل", "status_paused": "في انتظار الموافقة", "status_completed": "اكتمل", "agents_ready": "الوكلاء جاهزون" },
      "hero": { "badge": "🏆 هاكاثون Google Cloud ADK 2026 · متأهل للنهائيات", "h1": "ابحث عن المنحة", "h2": "التي تناسبك.", "sub": "8 وكلاء ذكاء اصطناعي يجدون ويقيّمون ويصيغون ويديرون المنح تلقائياً. أول تطابق في 60 ثانية.", "ctaFind": "ابحث عن منحي ←", "ctaGive": "امنح تمويلاً", "ctaAsk": "اسأل MyLalla", "chatPlaceholder": "اسأل MyLalla: ما المنح التي تؤهل لها منظمتي؟", "chatBtn": "اسأل ←", "chatCta": "احصل على قائمتك الشخصية الكاملة ←", "trust": "مجاني · بدون بطاقة · بيانات ذات سيادة" },
      "login": { "tagline": "مجتمعك. ممول.", "iAm": "أنا", "seeker": "باحث عن منح", "seekerSub": "أحتاج إلى تمويل", "funder": "جهة منح", "funderSub": "أقدم منحاً", "signIn": "تسجيل الدخول", "createAccount": "إنشاء حساب", "google": "المتابعة بـ Google", "linkedin": "المتابعة بـ LinkedIn", "or": "أو", "fullName": "الاسم الكامل", "email": "البريد الإلكتروني", "password": "كلمة المرور", "forgotPw": "نسيت كلمة المرور؟", "submit": "تسجيل الدخول", "submitCreate": "إنشاء حساب", "terms": "بتسجيل الدخول توافق على شروطنا وسياسة الخصوصية.", "noAccount": "لا حساب لديك؟", "tryDemo": "▶ جرّب العرض التوضيحي" }
    }
  },
  zh: {
    translation: {
      "app": { "title": "CivicPath", "tagline": "您的社区。已获资助。", "seeker": "资助申请者", "funder": "资助提供者" },
      "nav": { "dashboard": "仪表板", "grants": "我的资助", "tracker": "追踪器", "integrations": "集成", "profile": "个人资料", "awarded": "已获奖", "signout": "登出", "howItWorks": "使用方法", "findGrants": "寻找资助", "giveGrants": "提供资助", "pricing": "定价", "logIn": "登录", "findGrantsCta": "寻找资助 →" },
      "dashboard": { "welcome": "你好", "start": "查找资助", "status_idle": "准备扫描", "status_running": "管道活动中", "status_paused": "等待批准", "status_completed": "已完成", "agents_ready": "代理已准备就绪" },
      "hero": { "badge": "🏆 Google Cloud ADK 黑客松 2026 · 决赛选手", "h1": "找到适合您的", "h2": "资助机会。", "sub": "8个AI智能体自动为您查找、评分、起草、合规和管理资助。60秒内获得首次匹配。", "ctaFind": "查找我的资助 →", "ctaGive": "提供资助", "ctaAsk": "询问 MyLalla", "chatPlaceholder": "问 MyLalla：我的非营利组织有资格申请哪些资助？", "chatBtn": "询问 →", "chatCta": "获取您的完整个性化匹配 →", "trust": "免费 · 无需信用卡 · 主权数据" },
      "login": { "tagline": "您的社区。已获资助。", "iAm": "我是", "seeker": "资助申请者", "seekerSub": "我需要资金", "funder": "资助提供者", "funderSub": "我提供资助", "signIn": "登录", "createAccount": "创建账户", "google": "使用 Google 继续", "linkedin": "使用 LinkedIn 继续", "or": "或", "fullName": "全名", "email": "电子邮件", "password": "密码", "forgotPw": "忘记密码？", "submit": "登录", "submitCreate": "创建账户", "terms": "登录即表示您同意我们的服务条款和隐私政策。", "noAccount": "没有账户？", "tryDemo": "▶ 试用在线演示" }
    }
  },
  ur: {
    translation: {
      "app": { "title": "CivicPath", "tagline": "آپ کی کمیونٹی۔ فنڈڈ۔", "seeker": "گرانٹ متلاشی", "funder": "گرانٹ فنڈر" },
      "nav": { "dashboard": "ڈیش بورڈ", "grants": "میری گرانٹس", "tracker": "ٹریکر", "integrations": "انضمام", "profile": "پروفائل", "awarded": "عطیہ کردہ", "signout": "لاگ آؤٹ", "howItWorks": "کیسے کام کرتا ہے", "findGrants": "گرانٹس تلاش کریں", "giveGrants": "گرانٹس دیں", "pricing": "قیمت", "logIn": "لاگ ان", "findGrantsCta": "گرانٹس تلاش کریں ←" },
      "dashboard": { "welcome": "ہیلو", "start": "گرانٹس تلاش کریں", "status_idle": "اسکین کے لیے تیار", "status_running": "پائپ لائن فعال", "status_paused": "منظوری کا انتظار", "status_completed": "مکمل", "agents_ready": "ایجنٹ تیار ہیں" },
      "hero": { "badge": "🏆 Google Cloud ADK ہیکاتھون 2026 · فائنلسٹ", "h1": "وہ گرانٹ تلاش کریں", "h2": "جو آپ کو ملے۔", "sub": "8 AI ایجنٹ خودبخود آپ کی تنظیم کے لیے گرانٹس تلاش، اسکور، ڈرافٹ اور منظم کرتے ہیں۔ 60 سیکنڈ میں پہلا میچ۔", "ctaFind": "میری گرانٹس تلاش کریں ←", "ctaGive": "گرانٹس دیں", "ctaAsk": "MyLalla سے پوچھیں", "chatPlaceholder": "MyLalla سے پوچھیں: میری این جی او کس گرانٹ کی اہل ہے؟", "chatBtn": "پوچھیں ←", "chatCta": "اپنی مکمل ذاتی فہرست حاصل کریں ←", "trust": "مفت · کریڈٹ کارڈ نہیں · خودمختار ڈیٹا" },
      "login": { "tagline": "آپ کی کمیونٹی۔ فنڈڈ۔", "iAm": "میں ہوں", "seeker": "گرانٹ متلاشی", "seekerSub": "مجھے فنڈنگ چاہیے", "funder": "گرانٹ فنڈر", "funderSub": "میں گرانٹس دیتا ہوں", "signIn": "لاگ ان", "createAccount": "اکاؤنٹ بنائیں", "google": "Google کے ساتھ جاری رکھیں", "linkedin": "LinkedIn کے ساتھ جاری رکھیں", "or": "یا", "fullName": "پورا نام", "email": "ای میل", "password": "پاس ورڈ", "forgotPw": "پاس ورڈ بھول گئے؟", "submit": "لاگ ان", "submitCreate": "اکاؤنٹ بنائیں", "terms": "لاگ ان کر کے آپ ہماری شرائط و ضوابط سے متفق ہیں۔", "noAccount": "اکاؤنٹ نہیں؟", "tryDemo": "▶ لائیو ڈیمو آزمائیں" }
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
