# BeautyMatch 💄🔬

AI помощник за козметика: разбери дали един продукт е подходящ за **твоята** кожа — по състав, формула и реални потребителски мнения.

Built with **Expo (React Native) + Supabase + Claude AI**. Двуезичен интерфейс (BG/EN).

## Функционалности

1. **Вход** — имейл/парола + Google
2. **AI скан на кожата** — предна камера заснема кадри от различни ъгли; AI описва тип кожа и видими състояния; редактираш и потвърждаваш в профила си
3. **Анализ на продукт** — по име, баркод или снимка → пълен INCI състав, анализ на формулата, персонални предупреждения и обобщение на реални ревюта (Reddit, Amazon, форуми) с източници
4. **Чат за продукта** — „Този крем как ще се отрази на розацея?“
5. **Дюпове и алтернативи** — по формула и ревюта, съобразени с твоята кожа
6. **Анализ на рутината** — снимка на шкафа → AI разпознава продуктите, посочва конфликти и правилния AM/PM ред

## Структура

```
src/app          — екрани (expo-router)
src/lib          — supabase, ai (edge fn клиент), i18n, theme
src/components   — UI primitives + MatchRing (signature елемент)
supabase/functions/ai — Claude AI backend (deploy-ва се в Supabase)
supabase/migrations   — SQL схема
```

## Setup

### 1. Зависимости
```bash
npm install
```

### 2. Supabase
Проектът е конфигуриран в `app.json → extra` (URL + publishable key).

**Задължително — API ключ за AI функцията** (Dashboard → Edge Functions → Secrets, или CLI):
```bash
supabase secrets set ANTHROPIC_API_KEY=sk-ant-... --project-ref trwtjyekccdxwhphbkfl
```

**Deploy на функцията** (ако не е deploy-ната):
```bash
supabase functions deploy ai --project-ref trwtjyekccdxwhphbkfl
```

### 3. Google вход
1. Google Cloud Console → Credentials → OAuth Client ID (Web)
2. Authorized redirect URI: `https://trwtjyekccdxwhphbkfl.supabase.co/auth/v1/callback`
3. Supabase Dashboard → Authentication → Providers → Google → Client ID + Secret
4. Authentication → URL Configuration → Redirect URLs: добави `beautymatch://`

### 4. Стартиране
```bash
npx expo start          # Expo Go / dev client
```
Камерата изисква dev build или реално устройство:
```bash
npx expo run:ios        # или eas build
```

### 5. App Store
```bash
npm i -g eas-cli && eas login
eas build --platform ios --profile production
eas submit --platform ios
```

## Бележки
- Продуктовите данни идват от Open Beauty Facts + AI web search; анализите се кешират в `product_cache`
- AI анализът на кожата е информативен и не замества дерматолог
- Всички таблици са с Row Level Security
