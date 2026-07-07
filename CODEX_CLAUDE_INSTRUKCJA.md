# Jak używać Codex + Claude — Sklep za Stodołą

## Główna zasada

Sklep za Stodołą nie jest tylko projektem sprzedaży mlekomatów. To firma, która pomaga rolnikom uruchamiać sprzedaż bezpośrednią z gospodarstwa: mlekomaty BRUNIMAT, pawilony, punkty sprzedaży, dokumenty, finansowanie, marketing lokalny i wdrożenie.

## Stały prefiks dla AI

Te zasady mają działać automatycznie, bez dopisywania ich w każdej wiadomości:

```text
Pracuj oszczędnie. Nie czytaj całego repozytorium, jeśli nie jest to konieczne. Nie analizuj całego panel.html, jeśli wystarczy konkretna sekcja, funkcja albo tekst. Najpierw użyj AI_CONTEXT.md, AGENTS.md i tylko plików bezpośrednio związanych z zadaniem. Jeśli nie proszę wyraźnie o edycję, nie zmieniaj plików. Jeśli trzeba edytować, zrób minimalną zmianę, nie ruszaj JSONBin, hasła, CRM, danych klientów ani synchronizacji, a po pracy pokaż diff i listę zmienionych plików.
```

W Claude ustaw to w instrukcji projektu. W Codex trzymaj to w `AGENTS.md`, żeby działało jako stała instrukcja repozytorium.

## Panel prywatny

Panel traktuj jako centrum operacyjne firmy. W panelu trzymaj rzeczy, które są potrzebne codziennie przy sprzedaży i wdrożeniu:

- CRM i baza klientów,
- statusy rozmów, follow-upy, historia kontaktu,
- dokumenty, oferty, cenniki wewnętrzne i katalogowe,
- budżet startowy, finanse, koszty i marże,
- terminy, sprawy, instalacje i zadania,
- szybkie linki do najważniejszych narzędzi,
- materiały sprzedażowe, skrypty rozmów, teksty OLX i PDF-y.

Nie przenoś do panelu wszystkiego. Panel ma być szybki i praktyczny, nie ma zastępować całego dysku, poczty ani księgowości.

## Narzędzia zewnętrzne

Używaj zewnętrznych narzędzi tam, gdzie są lepsze niż własny panel:

- Google Drive / OneDrive: duże pliki, archiwum dokumentów, wersje robocze PDF/DOCX,
- Google Calendar: przypomnienia, spotkania, telefony i follow-upy,
- Gmail / poczta: oficjalna komunikacja z klientami i partnerami,
- Canva: grafiki, ulotki, wizytówki, posty i materiały OLX,
- Fakturownia / inFakt: faktury, księgowość i formalne rozliczenia,
- Google Search Console: widoczność strony i frazy z wyszukiwarki,
- GitHub: historia zmian strony i panelu,
- Claude: strategia, teksty, oferty, maile, skrypty, analiza,
- Codex: techniczne zmiany w repo, kod, diff, porządkowanie plików.

Zasada: panel ma mówić "co robić dalej", a narzędzia zewnętrzne mają przechowywać lub wykonywać cięższe rzeczy.

## Oszczędzanie limitu Claude

Domyślnie używaj najtańszego/szybkiego modelu do prostych zadań. Mocniejszy model włączaj tylko wtedy, gdy zadanie naprawdę tego wymaga.

- Haiku: krótkie teksty, maile, SMS-y, podsumowania, pomysły, proste poprawki.
- Sonnet: kod, większe analizy, oferty, dłuższe dokumenty, strategia sprzedaży.
- Opus / najmocniejszy model: tylko wyjątkowo, do trudnych decyzji, dużych dokumentów lub krytycznej analizy.

Jak oszczędzać:

- zaczynaj nową rozmowę dla nowego zadania,
- nie wklejaj całego projektu, jeśli wystarczy jeden plik albo fragment,
- zadawaj kilka powiązanych pytań w jednej wiadomości,
- proś o krótką odpowiedź albo gotowy tekst, nie o długą analizę,
- trzymaj stały kontekst w `AI_CONTEXT.md`, zamiast tłumaczyć firmę od zera,
- nie wrzucaj ponownie tych samych plików, jeśli rozmowa już je ma.

## Oszczędzanie limitu Codex

Codex uruchamiaj do konkretnych zmian technicznych, nie do luźnego myślenia. Dobre polecenie dla Codexa powinno wskazywać:

- które pliki można zmienić,
- czego nie wolno ruszać,
- jaki ma być efekt,
- czy ma pokazać tylko plan, czy od razu wdrażać.

Najlepszy krótki prompt:

```text
Przeczytaj AGENTS.md i AI_CONTEXT.md. Zmień tylko [plik/sekcję]. Nie ruszaj JSONBin, hasła, CRM, danych klientów ani synchronizacji. Zrób minimalną zmianę, pokaż diff i listę zmienionych plików.
```

Gdy chcesz tylko poradę, pisz wyraźnie:

```text
Nie edytuj plików. Odpowiedz krótko, co warto zrobić i które pliki ewentualnie zmienić.
```

Gdy zadanie jest większe, najpierw poproś:

```text
Najpierw przeczytaj kontekst i daj krótki plan. Nie edytuj plików, dopóki nie potwierdzę.
```

## Claude

Używaj do: strategii, tekstów, ofert, maili, umów roboczych, analizy sprzedaży, planowania, uproszczenia decyzji.

Claude ma patrzeć szeroko: celem jest zbudowanie rolnikowi działającego kanału sprzedaży bezpośredniej, a nie tylko sprzedanie urządzenia.

## Codex

Używaj do: kodu, panel.html, HTML/CSS/JS, repo GitHub, poprawiania błędów, wdrażania zmian, sprawdzania diffów.

Codex ma trzymać się `AGENTS.md` i `AI_CONTEXT.md`. Nie powinien ruszać CRM, JSONBin, hasła, synchronizacji ani danych klientów bez wyraźnej prośby.

## Schemat pracy

1. Claude przygotowuje treść, strategię i decyzje.
2. Wpisujesz ważną decyzję do `AI_CONTEXT.md`, jeśli ma zostać na stałe.
3. Codex czyta `AGENTS.md` i `AI_CONTEXT.md`.
4. Codex wdraża technicznie w repo.
5. Codex pokazuje diff.
6. Dopiero potem robisz commit i push.

## Prompt do Codexa

```text
Przeczytaj AGENTS.md i AI_CONTEXT.md. Zmień tylko wskazane pliki. Nie ruszaj JSONBin, hasła, CRM, danych klientów ani synchronizacji. Zachowaj styl panelu. Nie duplikuj dokumentów. Po zmianach pokaż diff i listę zmienionych plików.
```

## Prompt do Claude

```text
Przeczytaj AI_CONTEXT.md. Pomóż mi przygotować treść/strategię dla Sklepu za Stodołą. Patrz szeroko: sprzedaż bezpośrednia dla rolników, nie tylko mlekomaty. Jeśli trzeba coś wdrożyć technicznie, przygotuj jasne zadanie dla Codexa.
```

## Instrukcja projektu Claude

W projekcie Claude wklej jako instrukcję:

```text
Jesteś doradcą biznesowym, copywriterem i analitykiem dla projektu Sklep za Stodołą.

Najpierw przeczytaj AI_CONTEXT.md. Firma pomaga rolnikom uruchamiać sprzedaż bezpośrednią z gospodarstwa — nie tylko przez mlekomaty, ale też przez pawilony, punkty sprzedaży, ofertę produktową, finansowanie, dokumenty, marketing lokalny i wdrożenie całego systemu sprzedaży.

Pracuj oszczędnie: nie analizuj całego projektu, jeśli wystarczy AI_CONTEXT.md i konkretna treść od użytkownika. Odpowiadaj możliwie krótko i praktycznie. Nie proś użytkownika, żeby za każdym razem przypominał zasady oszczędzania limitu.

BRUNIMAT i mlekomaty są jednym z głównych produktów, ale szersza misja firmy to: pomóc rolnikowi sprzedawać bezpośrednio klientom końcowym, z pominięciem pośredników, w profesjonalny i opłacalny sposób.

Odpowiadaj po polsku, konkretnie, praktycznie i bez lania wody. Uwzględniaj, że firma jest na etapie startu, ma niski budżet, przygotowuje pierwszych klientów i buduje ofertę sprzedaży bezpośredniej dla gospodarstw rolnych.

Twoje główne zadania:
- przygotowywać oferty, maile, SMS-y, skrypty rozmów i treści sprzedażowe,
- pomagać w strategii sprzedaży, OLX, telefonach, follow-upach i leadach,
- analizować budżet, marżę, finansowanie, ARiMR, leasing i koszty,
- pomagać budować ofertę: mlekomat, pawilon, punkt sprzedaży, wdrożenie, materiały dla klientów i pomoc w starcie,
- porządkować pomysły i robić konkretne listy działań,
- przygotowywać jasne zadania techniczne dla Codexa.

Nie wdrażaj zmian technicznych bezpośrednio, jeśli nie jest to konieczne. Jeśli trzeba zmienić stronę lub panel, przygotuj polecenie dla Codexa.

Nie wymyślaj nowych cen, jeśli nie ma ich w kontekście. Nie publikuj wewnętrznych cenników, marż, dokumentów KRS ani podpisanych dokumentów na stronie publicznej.

Cenniki od Alfreda Bruni, cenniki partnerskie, marże, dokumenty KRS i podpisane umowy są tylko do panelu prywatnego, nie na stronę publiczną.

Patrz na projekt szeroko: celem nie jest sprzedać samo urządzenie, tylko pomóc rolnikowi zbudować działający kanał sprzedaży bezpośredniej.
```
