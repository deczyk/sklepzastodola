# Audyt panelu — 7 sierpnia 2026

Ten plik podsumowuje co naprawiłem dzisiaj (żebyś miał to w jednym miejscu, nie tylko rozproszone
w historii czatu) oraz listę rzeczy, które warto sprawdzić/rozważyć później — **nic z listy "do
rozważenia" nie zostało wdrożone bez Twojej zgody**, to tylko notatki dla przyszłej rozmowy.

## Naprawione i wypchnięte dzisiaj

1. **Notatki znikały przy odświeżeniu panelu** (główny problem dnia) — `initApp()` zawsze
   preferował dane z chmury nad lokalnymi, nawet gdy lokalne miały świeżo dodaną, jeszcze
   niewysłaną notatkę. Flaga "mam niezapisane zmiany" żyła tylko w pamięci karty, nie
   przetrwała odświeżenia. Naprawione: flaga jest teraz trwała (localStorage), zapis notatek
   jest natychmiastowy, a przy konflikcie wersji panel sam ponawia próbę (do 3 razy).
2. **Status i Priorytet nie były edytowalne w karcie klienta** — tylko z widoku tabeli. Dodane
   jako edytowalne pola bezpośrednio w karcie.
3. **Błędy zapisu notatki pokazywały ogólnik** zamiast prawdziwej przyczyny — teraz alert
   pokazuje dokładny przechwycony błąd (status HTTP + treść odpowiedzi serwera).
4. **Limit rozmiaru zapytania do `/api/panel-data` nie był jawnie ustawiony** — notatki głosowe
   (do 2 MB) mogły to przekraczać wraz z przybywaniem nagrań. Podniesiony jawnie do 20 MB.
5. **`data.powiadomienia` rosło w nieskończoność** (w `api/leads.js` i `api/lead-webhook.js`) —
   każdy nowy lead dokładał wpis na zawsze, bez przycinania (w przeciwieństwie do `data.log`,
   który miał limit 30). Ograniczone do 200 najnowszych. Bezpieczne — to tylko "skrzynka
   powiadomień", same rekordy klientów (`data.klienci`) nigdy nie są przycinane.
6. Dodane: przyciski szybkości odtwarzania notatek głosowych, integracja z Google Calendar
   (termin następnego kontaktu), zdjęcia w notatkach (drag&drop/wklej → Google Drive), usunięty
   mylący przycisk transkrypcji (wymagał niepodpiętego OpenAI).

Wszystko powyższe zostało przetestowane end-to-end (headless Chrome + symulowany backend) przed
wypchnięciem — nie zgaduję, że działa, sprawdziłem.

## Do rozważenia później (nie wdrożone — wymaga Twojej decyzji)

Nic poniżej nie jest pilne. To rzeczy, które zauważyłem przy okazji, warte krótkiej rozmowy, nie
całonocnego przepisywania kodu.

- **Spójność zabezpieczenia przed wstrzyknięciem HTML (XSS).** Panel ma ok. 124 miejsc, gdzie
  dane trafiają bezpośrednio do `innerHTML`. Większość poprawnie przechodzi przez funkcję
  `crmEsc()` (escapowanie), ale nie sprawdziłem wyczerpująco wszystkich 124 — to realnie
  osobna sesja, żeby przejść to systematycznie, a nie coś do zrobienia "przy okazji".
- **Reguła zapisu w Supabase (`save_panel_store`)** — to funkcja SQL po stronie Supabase, nie
  w tym repozytorium, więc nie mogłem sprawdzić, czy poprawnie obsługuje jednoczesny zapis od
  dwóch osób naraz (optimistic locking). Kod front-end zakłada, że tak, i ma logikę ponawiania
  przy konflikcie — ale warto kiedyś zajrzeć w samą funkcję w Supabase, żeby się upewnić.
- **Jeden wspólny "punkt awarii" dla Drive i Kalendarza** — oba korzystają z tego samego konta
  serwisowego Google. Jak dziś widzieliśmy, jak coś się z nim stanie (np. przypadkowe usunięcie
  w Google Cloud Console), obie integracje padają naraz. To świadomy wybór (prościej), ale
  warto o tym pamiętać.
- **Brak automatycznych testów** — cała weryfikacja dzisiaj (i wcześniej) była robiona ręcznie,
  na żądanie, przy każdej zmianie. Dla kluczowych ścieżek (zapis notatki, synchronizacja) dałoby
  się to zautomatyzować, żeby przyszłe zmiany nie psuły tego po cichu. To większy projekt, nie
  coś na "przy okazji".
- **Zdjęcia w notatkach (nowa funkcja) warto poobserwować** — limit 6 zdjęć/notatkę,
  kompresja do ~1600px/JPEG 82% powinny wystarczyć, ale to nowa funkcja, więc warto sprawdzić
  po tygodniu-dwóch, czy zużycie miejsca na Drive rośnie w rozsądnym tempie.
- **Plik `panel.html` ma ok. 9400 linii w jednym pliku.** Działa, ale z czasem coraz trudniej
  się w nim poruszać i coś przez przypadek zepsuć przy edycji. Rozbicie na moduły to spora,
  osobna decyzja architektoniczna — nie coś, co warto robić pod presją czasu.

## Jak z tego korzystać

Jak wrócisz do tego pliku, przeczytaj sekcję "Do rozważenia" i powiedz, co Cię interesuje —
zajmę się jednym punktem na raz, z testami przed wdrożeniem, tak jak dzisiaj.
