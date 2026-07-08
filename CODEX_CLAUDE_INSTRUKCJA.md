# Jak używać Codex + Claude — Sklep za Stodołą

## Główna zasada

Sklep za Stodołą nie jest tylko projektem sprzedaży mlekomatów. To firma, która pomaga rolnikom uruchamiać sprzedaż bezpośrednią z gospodarstwa: mlekomaty BRUNIMAT, pawilony, punkty sprzedaży, dokumenty, finansowanie, marketing lokalny i wdrożenie.

## Stały prefiks dla AI

Te zasady mają działać automatycznie, bez dopisywania ich w każdej wiadomości:

```text
Pracuj oszczędnie. Nie czytaj całego repozytorium, jeśli nie jest to konieczne. Nie analizuj całego panel.html, jeśli wystarczy konkretna sekcja, funkcja albo tekst. Najpierw użyj AI_CONTEXT.md, AGENTS.md i tylko plików bezpośrednio związanych z zadaniem. Jeśli nie proszę wyraźnie o edycję, nie zmieniaj plików. Jeśli trzeba edytować, zrób minimalną zmianę, nie ruszaj JSONBin, hasła, CRM, danych klientów ani synchronizacji, a po pracy pokaż diff i listę zmienionych plików.
```

W Claude ustaw to w instrukcji projektu. W Codex trzymaj to w `AGENTS.md`, żeby działało jako stała instrukcja repozytorium.

## Automatyczna publikacja Codex

Domyślnie Codex ma po zakończonej bezpiecznej zmianie zrobić:

1. minimalną edycję,
2. krótkie sprawdzenie,
3. commit,
4. push na GitHub,
5. krótkie podsumowanie.

Nie trzeba pisać za każdym razem "wrzuć na GitHub".

Wyjątki:

- nie publikować, jeśli brakuje sekretów w Vercel,
- nie publikować, jeśli zmiana może ujawnić dane wewnętrzne,
- nie publikować, jeśli użytkownik napisał "nie wrzucaj" albo "tylko lokalnie",
- nie mieszać w jednym commicie niezwiązanych zmian.

Jeśli Vercel jest podłączony do GitHub, strona aktualizuje się automatycznie po pushu.

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

## Najtańszy workflow: Gemini -> Claude -> Codex

Cel: zużywać najmniej płatnych limitów.

### 1. Gemini jako darmowy szkicownik

Używaj Gemini do tanich, wstępnych rzeczy:

- układ promptu,
- lista pytań,
- pierwsza wersja planu,
- warianty postów,
- uporządkowanie chaotycznych notatek.

Prompt do Gemini:

```text
Pomóż mi przygotować krótki prompt do Claude. Projekt: Sklep za Stodołą pomaga rolnikom uruchamiać sprzedaż bezpośrednią z gospodarstwa: mlekomaty BRUNIMAT, pawilony, dokumenty, finansowanie, marketing lokalny i wdrożenie.

Chcę, żeby Claude przygotował [tu wpisz temat].

Prompt ma być krótki, konkretny i oszczędzać limit. Ma zakazać analizowania całego projektu i ma poprosić o gotowy wynik oraz krótkie zadanie dla Codexa, jeśli trzeba coś wdrożyć w panel.html.
```

### 2. Claude jako strateg i copywriter

Do Claude wklejaj tylko dopracowany prompt z Gemini oraz `AI_CONTEXT.md`, jeśli projekt Claude go jeszcze nie ma.

Claude ma przygotować:

- plan,
- teksty,
- ofertę,
- zadanie dla Codexa.

Claude nie ma pisać kodu i nie ma analizować `panel.html`, jeśli nie musi.

Prompt bazowy do Claude:

```text
Pracuj oszczędnie. Na podstawie AI_CONTEXT.md przygotuj gotowy wynik dla tematu: [temat].

Nie analizuj całego projektu. Nie pisz kodu. Nie ujawniaj cenników wewnętrznych, marż, dokumentów KRS ani umów.

Na końcu daj krótkie zadanie dla Codexa: co zmienić w panel.html, w której zakładce, czego nie usuwać i jak sprawdzić efekt.
```

### 3. Codex tylko do wdrożenia

Do Codexa wklejaj tylko końcowe zadanie od Claude, nie całą rozmowę.

Najlepszy prompt do Codexa:

```text
Wdróż poniższe zadanie. Pracuj oszczędnie. Zmień tylko wskazane pliki. Nie czytaj całego repo, jeśli nie musisz. Po bezpiecznej zmianie zrób commit i push, chyba że zmiana wymaga ustawienia sekretów w Vercel.

[wklej zadanie od Claude]
```

### 4. Kiedy nie używać Claude

Jeśli chodzi tylko o:

- literówkę,
- dopisanie kontaktu,
- drobną zmianę w panelu,
- commit/push,
- plik na GitHub,

pisz od razu do Codexa. Claude nie jest wtedy potrzebny.

### 5. Kiedy nie używać Codexa

Jeśli chodzi tylko o:

- pomysł,
- tekst posta,
- SMS,
- mail,
- rozmowę sprzedażową,
- strategię,

użyj Gemini albo Claude. Codex nie jest wtedy potrzebny.

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

## Pakiet startowy Claude po odnowieniu limitu

Cel: po odnowieniu limitu Claude nie tracić wiadomości na tłumaczenie projektu od zera. Najpierw ustaw projekt, potem pracuj krótkimi zadaniami.

### 1. Utwórz projekt Claude

1. Wejdź do Claude.
2. Otwórz sekcję Projects / Projekty.
3. Kliknij New project / Nowy projekt.
4. Nazwij projekt: `Sklep za Stodołą`.
5. W opisie wpisz krótko:

```text
Firma pomaga rolnikom uruchamiać sprzedaż bezpośrednią z gospodarstwa: mlekomaty BRUNIMAT, pawilony, dokumenty, finansowanie, marketing lokalny i wdrożenie.
```

### 2. Wklej instrukcję projektu

W ustawieniach projektu Claude wklej całą sekcję z tego pliku: `Instrukcja projektu Claude`.

Jeśli Claude ma mało miejsca na instrukcje, użyj krótszej wersji:

```text
Jesteś doradcą biznesowym, copywriterem i analitykiem dla projektu Sklep za Stodołą.

Firma pomaga rolnikom uruchamiać sprzedaż bezpośrednią z gospodarstwa: mlekomaty BRUNIMAT, pawilony, punkt sprzedaży, dokumenty, finansowanie, marketing lokalny i wdrożenie.

Pracuj oszczędnie. Odpowiadaj krótko, konkretnie i po polsku. Nie analizuj całego projektu, jeśli wystarczy AI_CONTEXT.md i treść od użytkownika.

Nie publikuj na stronie publicznej cenników od Alfreda Bruni, cenników partnerskich, marż, kosztów wewnętrznych, dokumentów KRS, podpisanych dokumentów ani umów.

Claude służy do strategii, ofert, maili, SMS-ów, skryptów rozmów, treści OLX/Facebook, analizy sprzedaży i porządkowania decyzji. Jeśli trzeba zmienić stronę lub panel, przygotuj jasne zadanie dla Codexa, zamiast wdrażać technicznie.
```

### 3. Dodaj tylko najważniejszy plik

Na start dodaj do projektu Claude tylko:

- `AI_CONTEXT.md`

Nie dodawaj od razu całego repozytorium, `panel.html`, wszystkich PDF-ów ani całego folderu dokumentów. To szybciej zużywa limit.

### 4. Pierwsze 10 zadań dla Claude

Wykonuj jedno zadanie na osobnej rozmowie albo w krótkich blokach. Nie każ Claude analizować wszystkiego naraz.

1. Przygotuj krótki opis firmy w 3 wariantach: na stronę, do maila i do rozmowy telefonicznej.
2. Napisz skrypt pierwszej rozmowy telefonicznej z gospodarstwem mlecznym.
3. Przygotuj SMS po nieodebranym telefonie.
4. Przygotuj mail po rozmowie z rolnikiem zainteresowanym mlekomatem.
5. Przygotuj tekst ogłoszenia OLX bez cenników wewnętrznych.
6. Przygotuj krótką ofertę: mlekomat + pawilon + wdrożenie, bez ujawniania marży.
7. Wypisz 20 pytań kwalifikujących klienta przed ofertą.
8. Przygotuj listę argumentów: mlekomat vs sprzedaż do skupu.
9. Przygotuj prosty plan follow-upów na 30 dni.
10. Przygotuj zadanie dla Codexa: co zmienić na stronie lub w panelu.

### 5. Gotowe krótkie prompty

Do tekstu dla klienta:

```text
Na podstawie AI_CONTEXT.md przygotuj gotowy tekst do wysłania klientowi. Krótko, po polsku, bez lania wody. Nie ujawniaj cenników wewnętrznych, marż ani dokumentów formalnych.
```

Do rozmowy telefonicznej:

```text
Przygotuj krótki skrypt rozmowy telefonicznej z rolnikiem. Cel: sprawdzić, czy gospodarstwo nadaje się do sprzedaży bezpośredniej mleka przez mlekomat. Daj wersję naturalną, nie korporacyjną.
```

Do OLX:

```text
Przygotuj ogłoszenie OLX dla rolników zainteresowanych sprzedażą mleka bezpośrednio z gospodarstwa. Bez cenników wewnętrznych. Ma zachęcać do kontaktu i rozmowy.
```

Do oferty:

```text
Przygotuj krótką ofertę opisową dla klienta: mlekomat BRUNIMAT, pawilon, wdrożenie, dokumenty i pomoc w starcie sprzedaży. Nie pokazuj marży ani cennika dostawcy.
```

Do decyzji biznesowej:

```text
Pomóż mi podjąć decyzję. Daj: 3 opcje, plusy, minusy, ryzyka i rekomendację. Odpowiedz krótko.
```

Do zadania dla Codexa:

```text
Przygotuj gotowe zadanie dla Codexa. Ma zawierać: które pliki zmienić, czego nie ruszać, jaki ma być efekt i jak sprawdzić zmianę.
```

### 6. Czego nie robić w Claude, żeby nie tracić limitu

- Nie wrzucaj całego `panel.html`, jeśli pytanie dotyczy tekstu sprzedażowego.
- Nie dodawaj wszystkich PDF-ów naraz.
- Nie prowadź jednej rozmowy przez wiele dni z różnymi tematami.
- Nie pytaj o stronę, panel, CRM, strategię, OLX i finanse w jednej wiadomości.
- Nie używaj najmocniejszego modelu do prostych SMS-ów i maili.

### 7. Najlepszy rytm pracy

1. Claude wymyśla treść, strategię albo zadanie.
2. Ty wybierasz wariant.
3. Jeśli trzeba coś wdrożyć, wklejasz zadanie tutaj do Codexa.
4. Codex zmienia pliki, pokazuje diff, robi commit i push.
5. Decyzje stałe trafiają do `AI_CONTEXT.md`.

## Docelowy podział plików instrukcyjnych

- `CLAUDE.md` — główna instrukcja dla Claude: rola stratega, copywritera, analityka i doradcy biznesowego.
- `CODEX_CLAUDE_INSTRUKCJA.md` — wspólna instrukcja workflow Claude/Codex: jak dzielić pracę, oszczędzać limit i przekazywać zadania.
- `AGENTS.md` — instrukcja dla narzędzi technicznych i Codexa: jak pracować w repozytorium, czego nie ruszać i kiedy robić commit/push.
- `AI_CONTEXT.md` — kontekst biznesowy projektu Sklep za Stodołą.
- `DECYZJE_BIZNESOWE.md` — rejestr decyzji biznesowych, założeń roboczych i zmian strategii.

Nie usuwać treści z tych plików bez potrzeby. Jeśli pojawia się duplikat, najpierw uporządkować role plików, a dopiero potem ewentualnie skracać po akceptacji użytkownika.

## Gemini / Claude / Codex

Najtańszy workflow:

1. Gemini — darmowy lub tani szkicownik: pomysły, porządkowanie notatek, warianty promptów, pierwsze listy pytań.
2. Claude — strateg i copywriter: treści, oferty, maile, SMS-y, skrypty rozmów, analiza sprzedaży, decyzje i zadania dla Codexa.
3. Codex — wykonawca techniczny: repozytorium, `panel.html`, HTML/CSS/JS, API, GitHub, diff, commit i push.

Jeśli zadanie trafia do złego narzędzia, AI ma krótko upomnieć użytkownika i wskazać właściwe narzędzie. Nie robić z tego długiej analizy.

## Zasady oszczędzania limitów

- Nie wklejać i nie analizować całego repozytorium, jeśli wystarczy `AI_CONTEXT.md` albo jeden plik.
- Nie wrzucać całego `panel.html` do Claude, jeśli pytanie dotyczy strategii, tekstu lub oferty.
- Nie używać Claude do typowo technicznego wdrożenia, jeśli ma to zrobić Codex.
- Nie używać Codexa do luźnych pomysłów, jeśli wystarczy Gemini lub Claude.
- Zaczynać nowe rozmowy dla nowych tematów, żeby nie mieszać kontekstu.
- Odpowiadać krótko, jeśli użytkownik prosi tylko o opinię, ocenę wiadomości, strategię albo komentarz biznesowy.

## Zadanie dla Codexa tylko wtedy, gdy potrzebne

Claude nie ma automatycznie dodawać sekcji „Zadanie dla Codexa”, jeśli użytkownik prosi tylko o:

- opinię,
- analizę,
- ocenę wiadomości,
- strategię,
- komentarz biznesowy,
- uporządkowanie myśli,
- decyzję, czy coś ma sens.

Sekcję „Zadanie dla Codexa” dodawać tylko wtedy, gdy jest konkretna zmiana techniczna do wdrożenia albo użytkownik wyraźnie o to prosi.

## Synchronizacja i porzucone tematy

Jeśli użytkownik zmienia zasady pracy AI, workflow, instrukcje projektu albo sposób współpracy, trzeba uwzględnić to równolegle dla Claude, Codexa, `AI_CONTEXT.md`, `AGENTS.md` i przyszłego modułu AI Workflow w panelu.

Jeśli ważny temat został porzucony bez decyzji, można krótko przypomnieć: „Przypomnienie: wcześniej omawialiśmy [temat], ale nie ma decyzji. Chcesz do tego wrócić?”.

## Rejestr decyzji biznesowych

Ważne decyzje i założenia zapisywać albo proponować do zapisania w `DECYZJE_BIZNESOWE.md`. Dotyczy to szczególnie:

- cen, marż i wariantów oferty,
- modeli finansowania,
- priorytetów panelu,
- strategii sprzedaży,
- workflow AI,
- stałych ustaleń dotyczących firmy.

Decyzje robocze oznaczać jako robocze, a nie jako potwierdzone fakty.

## Panel jako centrum firmy

Panel prywatny ma docelowo być centrum operacyjnym firmy: CRM, dokumenty, cenniki, budżet, finanse, zadania, follow-upy, materiały sprzedażowe i szybkie linki. W przyszłości panel powinien mieć moduł AI Workflow, który pomaga wybrać Gemini / Claude / Codex, przypomina zasady oszczędzania limitów i kieruje decyzje do rejestru.
