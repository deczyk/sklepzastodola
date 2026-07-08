# AGENTS.md — instrukcje dla Codex

## Najważniejsze

Zawsze najpierw przeczytaj plik `AI_CONTEXT.md` w głównym katalogu repozytorium. Ten plik zawiera aktualny kontekst firmy Sklep za Stodołą, model sprzedaży, dokumenty, strukturę panelu i zasady pracy.

Projekt dotyczy strony i panelu prywatnego firmy Sklep za Stodołą Sp. z o.o. Firma pomaga rolnikom uruchamiać sprzedaż bezpośrednią z gospodarstwa: mlekomaty BRUNIMAT, pawilony, punkty sprzedaży, finansowanie, dokumenty, marketing lokalny i wdrożenie. Mlekomaty są ważnym produktem, ale nie opisuj firmy wyłącznie jako sprzedawcy mlekomatów.

## Stały tryb pracy AI

Traktuj poniższe zasady tak, jakby użytkownik dopisał je przed każdą wiadomością:

> Pracuj oszczędnie. Nie czytaj całego repozytorium ani całego `panel.html`, jeśli nie jest to konieczne. Najpierw użyj `AI_CONTEXT.md`, `AGENTS.md` i tylko plików bezpośrednio związanych z zadaniem. Jeśli użytkownik nie prosi wyraźnie o edycję, nie zmieniaj plików. Jeśli trzeba edytować, zrób minimalną zmianę i pokaż diff oraz listę zmienionych plików.

Nie proś użytkownika, żeby powtarzał te zasady w promptach. Są domyślne dla każdej rozmowy w tym repozytorium.

## Automatyczna publikacja

Traktuj poniższe jako stałą zgodę użytkownika dla tego repozytorium:

- Po zakończonej, sprawdzonej i bezpiecznej edycji automatycznie zrób `git add`, `git commit` i `git push` do właściwego repozytorium.
- Nie pytaj za każdym razem "czy wrzucić na GitHub", chyba że zmiana jest ryzykowna, dotyczy sekretów, wymaga konfiguracji Vercel/JSONBin albo może ujawnić dane wewnętrzne.
- Nie publikuj zmian, jeśli panel może przestać działać bez ręcznej konfiguracji po stronie Vercel lub innego serwisu.
- Jeśli automatyczna publikacja jest zablokowana, powiedz krótko dokładnie co blokuje push i co użytkownik ma kliknąć/ustawić.
- Commit ma być mały i opisowy. Nie łącz przypadkowo niezwiązanych zmian.

Domyślny remote do publikacji: `upstream main`, jeśli `origin` nie ma uprawnień.

## Zasady bezpieczeństwa

- Nie zmieniaj hasła do panelu, JSONBin, synchronizacji ani logiki zapisu danych, chyba że użytkownik wyraźnie o to poprosi.
- Nie usuwaj istniejących danych CRM, klientów, finansów, dokumentów ani historii kontaktów.
- Nie publikuj publicznie dokumentów wewnętrznych, cenników od Alfreda Bruni, podpisanych dokumentów KRS ani umów.
- Nie twórz publicznej strony cennika bez wyraźnej zgody użytkownika.
- Dokumenty wewnętrzne mają być dostępne tylko w prywatnym `panel.html`.
- Nie dodawaj duplikatów dokumentów do `_pliki-0xyqdz4t`.
- Nie publikuj na stronie publicznej kosztów, marż, cenników partnerskich ani dokumentów formalnych.

## Styl pracy

- Zmieniaj tylko pliki wskazane przez użytkownika.
- Zachowuj istniejący styl wizualny strony i panelu: zieleń, złoto, jasne tło, karty, zaokrąglenia, układ podobny do obecnego.
- Jeśli dodajesz nową sekcję w panelu, dopasuj ją do istniejących zakładek, przycisków, tabel i kart.
- Nie przebudowuj całego panelu, jeśli wystarczy dodać lub poprawić jedną sekcję.
- Nie mieszaj treści publicznych ze sprawami wewnętrznymi.
- Gdy dodajesz dokument, przypisz go do właściwej kategorii i upewnij się, że link działa z folderu `_pliki-0xyqdz4t`.
- W treściach publicznych pokazuj firmę jako partnera rolnika w uruchamianiu sprzedaży bezpośredniej, nie tylko jako sprzedawcę urządzenia.

## Obowiązkowy workflow przed zmianą

Przed edycją:

1. Przeczytaj `AI_CONTEXT.md`.
2. Sprawdź strukturę plików.
3. Ustal, które pliki naprawdę trzeba zmienić.
4. Jeśli zadanie jest większe, najpierw podaj krótki plan.

## Oszczędzanie limitu i zakresu pracy

- Jeśli użytkownik pyta ogólnie lub strategicznie, nie czytaj całego repozytorium bez potrzeby.
- Najpierw sprawdzaj tylko `AI_CONTEXT.md`, `AGENTS.md` i pliki bezpośrednio związane z zadaniem.
- Nie analizuj dużego `panel.html` w całości, jeśli wystarczy wyszukać konkretną zakładkę, funkcję albo tekst.
- Do prostych odpowiedzi nie uruchamiaj testów, serwera ani szerokich skanów projektu.
- Przy pracy technicznej rób minimalny diff i unikaj przebudowy niezwiązanych sekcji.
- Jeśli użytkownik pisze "nie edytuj", odpowiadaj tylko poradą i nie zmieniaj plików.
- Jeśli użytkownik prosi o plan, nie wdrażaj zmian przed akceptacją.

Po edycji:

1. Pokaż listę zmienionych plików.
2. Pokaż krótkie podsumowanie zmian.
3. Pokaż diff albo opisz dokładnie, co zostało zmienione.
4. Wskaż, co użytkownik ma wrzucić na GitHub.

## Panel prywatny

Główny plik panelu to `panel.html`.

Nie ruszaj bez wyraźnej prośby:

- hasła,
- JSONBin,
- synchronizacji,
- funkcji CRM,
- bazy klientów,
- historii kontaktu,
- istniejących danych startowych,
- importu/eksportu XLSX.

Można modyfikować, jeśli użytkownik prosi:

- zakładkę Dokumenty i oferty,
- zakładkę Cenniki,
- zakładkę Budżet startowy,
- zakładkę Finanse,
- zakładkę Materiały sprzedażowe,
- listę Do zrobienia.

## Dokumenty

Folder dokumentów to `_pliki-0xyqdz4t`.

Zasady:

- Plik dodawaj tylko raz.
- Jeśli istnieje kilka wersji tego samego dokumentu, wybierz najnowszą albo najbardziej kompletną.
- Podpisane dokumenty KRS zachowuj w panelu, bo użytkownik chce mieć wszystko w jednym miejscu.
- Cenniki od Alfreda Bruni i partnerskie trzymaj tylko w panelu jako wewnętrzne.
- Publiczne materiały mogą iść na stronę tylko po wyraźnej zgodzie.

## Strona publiczna

Nie dodawaj na publiczną stronę:

- cennika od Alfreda Bruni,
- cennika partnerskiego,
- podpisanych dokumentów,
- umów,
- wewnętrznych kosztów i marż.

Na publiczną stronę można przygotowywać tylko:

- ofertę ogólną sprzedaży bezpośredniej dla rolników,
- opisy mlekomatów,
- opisy pawilonów i punktów sprzedaży,
- CTA do rozmowy,
- kalkulator opłacalności,
- poradniki,
- materiały marketingowe bez danych wewnętrznych.

## Budżet

Aktualne założenia budżetowe:

- wirtualne biuro: 600 zł jednorazowo za cały rok,
- pawilon drewniany: około 15 000–25 000 zł,
- instalację robimy samodzielnie,
- elektryk nie jest wymaganym kosztem,
- woda nie jest potrzebna,
- szkolenie jest wliczone,
- roboczy koszt pełnego pakietu BRUNIMAT 650 Premium DUO z dodatkami: ok. 9 750-9 950 EUR, do weryfikacji u BRUNIMAT lub na fakturze,
- cena referencyjna: 13 500 EUR,
- cena standardowa: 13 900 EUR,
- cena katalogowa: 14 500 EUR,
- roboczy kurs: 4,30 zł/EUR.

## Jak odpowiadać użytkownikowi po zmianach

Pisz krótko i konkretnie po polsku.

Najlepszy format odpowiedzi:

- co zmieniłem,
- które pliki zmieniłem,
- czego nie ruszałem,
- co wrzucić na GitHub,
- na co uważać.

Nie używaj długich technicznych wyjaśnień, jeśli użytkownik nie pyta.

## Workflow AI i podział ról

W projekcie obowiązuje podział ról między narzędziami:

- Gemini: tani szkicownik do wstępnych pomysłów, układania promptów, porządkowania notatek i prostych wariantów treści.
- Claude: strateg, copywriter, analityk sprzedaży i doradca biznesowy. Przygotowuje treści, oferty, maile, SMS-y, skrypty rozmów, analizy i zadania dla Codexa, ale nie wdraża kodu.
- Codex: narzędzie techniczne do repozytorium, plików, HTML/CSS/JS, panelu, API, diffów, commitów i pushy.

Jeśli użytkownik daje zadanie do złego narzędzia, krótko go upomnij i zaproponuj właściwy kierunek. Przykład: strategia i teksty powinny trafić do Claude/Gemini, a edycja `panel.html`, API lub GitHub do Codexa.

## Oszczędzanie limitów AI

- Nie czytaj całego repozytorium, jeśli wystarczy `AI_CONTEXT.md`, `AGENTS.md` i konkretny plik.
- Nie analizuj całego `panel.html`, jeśli wystarczy konkretna sekcja, funkcja albo tekst.
- Do prostych tekstów i szkiców używać tańszego narzędzia lub krótszej odpowiedzi.
- Nie generować dużych bloków kodu ani długich analiz, jeśli użytkownik prosi tylko o opinię, ocenę wiadomości, strategię albo komentarz biznesowy.
- Claude nie ma automatycznie dodawać sekcji „Zadanie dla Codexa”, jeśli użytkownik prosi tylko o opinię, analizę, ocenę wiadomości, strategię albo komentarz biznesowy.

## Synchronizacja instrukcji

Pliki instrukcyjne mają mieć jasne role:

- `CLAUDE.md` — główna instrukcja dla Claude.
- `CODEX_CLAUDE_INSTRUKCJA.md` — wspólny workflow Claude/Codex.
- `AGENTS.md` — instrukcja dla narzędzi technicznych i Codexa.
- `AI_CONTEXT.md` — kontekst biznesowy projektu.
- `DECYZJE_BIZNESOWE.md` — rejestr decyzji biznesowych.

Jeśli użytkownik zmienia zasady pracy AI, workflow, instrukcje projektu albo sposób współpracy, uwzględnij to także w odpowiednim pliku instrukcyjnym. Nie nadpisuj istniejących treści bez potrzeby.

## Porzucone tematy i decyzje

Jeśli w rozmowie pojawił się ważny temat, ale użytkownik zmienił temat bez decyzji, można krótko przypomnieć o nim na końcu odpowiedzi. Przypomnienie ma być krótkie i nie może przeszkadzać w głównym zadaniu.

Ważne decyzje biznesowe zapisuj lub proponuj do zapisania w `DECYZJE_BIZNESOWE.md`: nowe ceny, marże, model oferty, finansowanie, strategia sprzedaży, workflow AI, priorytety panelu i inne ustalenia stałe.

## Kierunek panelu

Panel prywatny ma docelowo być centrum firmy: CRM, dokumenty, budżet, finanse, zadania, materiały sprzedażowe, follow-upy i szybkie linki. W przyszłości może mieć moduł AI Workflow, który porządkuje pracę Gemini / Claude / Codex, przypomina właściwe narzędzie i zbiera decyzje do rejestru.
