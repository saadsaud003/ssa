# تلفزيون المسودي - Al-Masoudi TV

## وصف التطبيق
تطبيق IPTV متكامل يشبه IPTV Smarters Pro، يعرض القنوات العربية والأفلام والمسلسلات.

## التقنيات المستخدمة
- **الواجهة**: React Native + Expo SDK 54
- **الخادم**: FastAPI + MongoDB
- **مصادر البيانات**: IPTV-ORG, TheMovieDB, Videasy

## عنوان الخادم النهائي (Backend URL)
```
https://iptv-tv-overhaul.preview.emergentagent.com
```

## بناء ملف APK

### الطريقة 1: EAS Build (الموصى بها)

1. ثبّت أدوات EAS:
```bash
npm install -g eas-cli
```

2. سجّل دخول بحساب Expo:
```bash
eas login
```

3. ابنِ ملف APK:
```bash
cd frontend
eas build -p android --profile preview
```

4. انتظر حتى يكتمل البناء ثم حمّل APK من الرابط المقدم.

### الطريقة 2: بناء محلي

1. ثبّت Android Studio و Android SDK
2. شغّل:
```bash
cd frontend
npx expo prebuild --platform android
cd android
./gradlew assembleRelease
```

## هيكل المشروع
```
frontend/
├── app.json          # إعدادات التطبيق
├── eas.json          # إعدادات بناء APK
├── app/
│   ├── _layout.tsx   # التخطيط الرئيسي
│   ├── index.tsx     # الشاشة الرئيسية
│   ├── live-tv.tsx   # البث المباشر
│   ├── movies.tsx    # الأفلام (مع فلترة)
│   ├── series.tsx    # المسلسلات (مع فلترة)
│   ├── webplayer.tsx # مشغل الفيديو
│   ├── settings.tsx  # الإعدادات
│   ├── favorites.tsx # المفضلة
│   └── search.tsx    # البحث
backend/
├── server.py         # خادم FastAPI
└── requirements.txt  # متطلبات Python
```
