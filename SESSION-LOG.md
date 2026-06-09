# Quintessence — Session log (Claude Code handoff)

> **Dátum:** 2026-06-09  
> **Projekt:** Quintessence PWA v2  
> **Repo:** https://github.com/albafalco/quintessence-v2.git (`main`)  
> **Helyi útvonal:** `C:\Users\Fazekas\Documents\Weblap\00-composer25\quintessence`  
> **Éles URL:** https://quintessence-v2.vercel.app  
> **Utolsó commit:** `771da04` — *Push fix: közvetlen Supabase mentés PWA-ban, betöltéskori szinkron*

---

## Projekt röviden

Next.js 14 PWA személyes fejlődés app:

- **Auth:** Supabase (meghívókódos regisztráció)
- **Modulok:** Mágia (10 fokozat), Kreatív Angol (hu nyelvű felhasználóknak)
- **i18n:** hu, en, de, es, it (next-intl)
- **Design:** cosmic purple/gold, glass UI, Outfit + Cinzel betűtípusok
- **PWA:** next-pwa, custom service worker push kezeléssel
- **Push:** web-push + VAPID, angol napi emlékeztető Budapest idő szerint

---

## Mit csináltunk ebben a sessionben (időrendben)

### 1. Betűtípus + kijelentkezés
- Betűtípus: **Outfit** (body) + **Cinzel** (display)
- Kijelentkezés: navbar (ikon), sidebar (alul), profil oldal (gomb)

### 2. iPhone mobil overflow / scrollbar
- `overflow-x: hidden`, `100dvh`, safe area padding
- Viewport: `viewport-fit: cover`
- Kompaktabb navbar mobilon, kisebb paddingek
- Fájlok: `globals.css`, `AppShell.tsx`, `Navbar.tsx`, `MobileNav.tsx`, dashboard oldal

### 3. Logó
- Generált SVG pajzs helyett a felhasználó `favicon.png`-je (`public/favicon.png`)
- `ShieldLogo.tsx` → Next.js `Image` `/favicon.png`

### 4. Desktop zászlók a nyelvválasztóban
- Windows nem renderel emoji zászlókat → `FlagIcon.tsx` SVG zászlók
- `LanguageSwitcher.tsx`, `ProfileForm.tsx` frissítve
- Mobilon is zászló gombok (korábban `<select>` volt, ott nem látszott zászló)

### 5. Angol push értesítések
- Logika: `lib/push-reminders.ts` — Budapest idő, napi aktivitás ellenőrzés
- Küldés feltétele: `push_enabled` + `push_angol_reminders` + `preferred_language === 'hu'` + beállított időpont + **ma még nincs angol aktivitás** (szólap `last_seen` vagy vizsga `taken_at`)
- Alapértelmezett angol idő: **20:00** Budapest (`003_push_angol_default.sql`)
- Duplikáció elkerülés: `last_angol_push_date` oszlop a `profiles` táblában

### 6. Vercel auto-deploy meghibásodás — JAVÍTVA
- **Ok:** `vercel.json` cron `*/5 * * * *` → **Vercel Hobby csak napi cront enged** → deploy hiba
- **Megoldás:** `vercel.json` törölve; cron átrakva **GitHub Actions**-re (`.github/workflows/push-reminders.yml`, 5 percenként hívja `/api/push/send`)

### 7. CRON_SECRET
- Generált érték (user beállította Vercel + GitHub Actions Secrets-ben):
  ```
  B8FHtWzpsu6dt1ZHntZhAR9cNEO2qKBwgN9EWb10zDA=
  ```

### 8. Push értesítések — több körös javítás
- Hibakezelés + visszajelzés a `PushToggle`-ban
- Teszt endpoint: `POST /api/push/test`
- Service worker push handler: `worker/index.js` (next-pwa `customWorkerDir`)
- Manifest: `id`, `scope` hozzáadva (iOS PWA push)
- **Utolsó kritikus fix (`771da04`):** PWA-ban a `/api/push/subscribe` nem mentette el megbízhatóan a sessiont → **közvetlen Supabase mentés** a kliensről (`lib/push-subscription.ts`)
- Betöltéskori szinkron: ha a böngészőben megvan a push feliratkozás, profil megnyitásakor bekapcsolja a kapcsolót és szinkronizálja a DB-t

---

## Fontos fájlok (push + PWA)

| Fájl | Szerep |
|------|--------|
| `components/push/PushToggle.tsx` | UI kapcsoló, engedélykérés, feliratkozás |
| `lib/push-client.ts` | SW regisztráció, VAPID subscribe, kulcskinyerés iOS-re |
| `lib/push-subscription.ts` | Közvetlen Supabase insert/delete |
| `lib/push-reminders.ts` | Budapest idő, aktivitás ellenőrzés |
| `lib/push.ts` | web-push küldés |
| `app/api/push/send/route.ts` | Cron endpoint (GitHub Actions hívja) |
| `app/api/push/test/route.ts` | Teszt értesítés bejelentkezett usernek |
| `app/api/push/subscribe/route.ts` | Meglévő, de PWA-ban már **nem használjuk** a kliens |
| `worker/index.js` | `push` + `notificationclick` események |
| `.github/workflows/push-reminders.yml` | 5 percenkénti cron |

---

## Környezeti változók

### Vercel (Settings → Environment Variables)

| Változó | Kötelező | Megjegyzés |
|---------|----------|------------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Regisztráció API, push cron |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | ✅ | Push feliratkozás |
| `VAPID_PRIVATE_KEY` | ✅ | Push küldés (párja a public-nak!) |
| `VAPID_SUBJECT` | ✅ | pl. `mailto:email@cimed.hu` |
| `CRON_SECRET` | ✅ | GitHub Actions + `/api/push/send` védelem |

VAPID generálás: `npx web-push generate-vapid-keys`

### GitHub (Settings → Secrets → Actions)

| Secret | Érték |
|--------|-------|
| `CRON_SECRET` | Ugyanaz, mint Vercelen |

---

## Supabase migrációk

Futtatandó a Supabase SQL Editorban (ha még nem):

1. `supabase/migrations/001_initial.sql` — alap séma
2. `supabase/migrations/002_grants_and_permissions.sql` — GRANT-ok, RLS WITH CHECK, invite seed
3. `supabase/migrations/003_push_angol_default.sql` — `push_angol_time` default `20:00`, `last_angol_push_date` oszlop

---

## Ismert korlátok / nyitott pontok

### Push értesítések (user utolsó állapota)
- Engedélykérés megjelenik iPhone PWA-ban ✅
- Kapcsoló újranyitás után kikapcsolt maradt ❌ → **utolsó fix deploy után tesztelendő** (`771da04`)
- Ha még mindig hibás: kapcsoló alatti piros hibaüzenet + „Teszt értesítés” gomb a profilon

### iPhone PWA push követelmények
- iOS 16.4+
- **Kezdőképernyőre telepített app** (Safari → Megosztás → Kezdőképernyőre)
- Az ikonról kell megnyitni, nem Safari tab-ból
- Régi ikon törlése + újratelepítés deploy után ajánlott

### Angol „napi aktivitás” definíció
- Számol: `angol_card_progress.last_seen` + `angol_exam_results.taken_at` (Budapest nap)
- **Nem számol:** gyakorló modul (PracticeSession) — nincs DB naplózás

### Egyéb nyitott (nem implementált)
- Angol lecke aloldalak designje elmaradhat a fő redesign mögött
- `GET /api/auth/register` → 405 (szándékos, csak POST)
- Next.js 14.2.18 security advisory (npm) — upgrade nem kért

---

## Commit történet (session releváns)

```
771da04 Push fix: közvetlen Supabase mentés PWA-ban, betöltéskori szinkron
82d9d4b Push értesítés javítás: hibakezelés, SW regisztráció, teszt értesítés
989b622 Mobil nyelvválasztó: SVG zászlók visszaállítva
59f3c88 Fix: Vercel Hobby-kompatibilis deploy, push cron GitHub Actions-re
3f650ff Zászló SVG ikonok desktopon, angol push emlékeztető Budapest idővel
750ed23 Logó: favicon.png
d8fe45a Mobil overflow javítás iPhone-ra
cdc39cd Outfit + Cinzel betűtípus, láthatóbb kijelentkezés
```

---

## Tesztelési checklist (Claude Code-nak)

1. **Deploy:** Vercel `main` branch auto-deploy működik-e (`vercel.json` cron nélkül)
2. **Push bekapcsolás PWA-ból (iPhone):**
   - Profil → kapcsoló ON → engedély → kapcsoló maradjon ON
   - DB: `profiles.push_enabled = true`, `push_subscriptions` sor létezik
   - „Teszt értesítés” gomb → értesítés megjelenik
3. **Push újranyitás:** app bezárás → újranyitás → profil → kapcsoló továbbra is ON
4. **GitHub Actions:** `Push reminders` workflow fut-e 5 percenként (CRON_SECRET-tel)
5. **Angol emlékeztető:** user 20:00-ra állítva, nincs mai angol aktivitás → értesítés érkezik

---

## Gyors parancsok

```bash
cd quintessence
npm run dev          # lokális fejlesztés
npm run build        # production build (PWA SW generálás)
git push origin main # deploy trigger Vercelre
```

---

## Kontextus az AI-nak

A felhasználó (albafalco) magyarul kommunikál. A projekt élesben fut Vercelen, Supabase backenddel. A session fő fájdalompontjai: **iPhone PWA UX** (overflow, push), **Vercel Hobby korlátok**, és **push feliratkozás megbízhatósága PWA standalone módban**. A push mentés mostantól **közvetlen Supabase kliens** úton megy, ne az API route-on keresztül.