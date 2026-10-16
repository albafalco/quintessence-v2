# Admin kétlépcsős azonosítás – vészhelyzeti visszaállítás

Az admin felület (`/hu/admin`) csak hitelesítő appal (TOTP) megerősített
munkamenetben érhető el. Ha az összes hitelesítő eszközöd elveszett
(pl. elveszett vagy lecserélt telefon, és nincs második eszköz), így
állíthatod vissza a hozzáférést.

## 1. Az eszközök törlése a Supabase-ben

Supabase Dashboard → **SQL Editor** → futtasd (az e-mail-cím a saját fiókodé):

```sql
DELETE FROM auth.mfa_factors
WHERE user_id = (SELECT id FROM auth.users WHERE lower(email) = 'albafalco@gmail.com');
```

Ez csak a kétlépcsős eszközöket törli, a fiókot és az adatokat nem.

## 2. Új eszköz beállítása

1. Jelentkezz ki az appból, majd jelentkezz be újra.
2. Nyisd meg a `/hu/admin` oldalt: a beállító képernyő fogad, ahol a
   QR-kóddal felveheted az új eszközt.
3. Érdemes rögtön egy második eszközt is hozzáadni
   (Admin felület → Áttekintés → Kétlépcsős eszközök → „Eszköz hozzáadása”).

## Megjegyzés

A Supabase SQL Editor a projekt tulajdonosaként fut, ezért ez a lépés csak a
Supabase-fiókodba belépve végezhető el – az app felől nem.
