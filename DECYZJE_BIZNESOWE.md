# DECYZJE_BIZNESOWE.md — rejestr decyzji biznesowych

Ten plik służy do zapisywania ważnych decyzji, założeń roboczych i zmian strategii projektu Sklep za Stodołą.

Zapisywać tutaj szczególnie:

- ceny, marże i warianty oferty,
- modele finansowania, leasingu, dotacji i płatności,
- założenia budżetowe,
- strategię sprzedaży i marketingu,
- priorytety panelu prywatnego,
- decyzje dotyczące workflow Gemini / Claude / Codex,
- stałe ustalenia, które mają być pamiętane w kolejnych rozmowach.

Nie wpisywać tutaj haseł, tokenów, danych klientów, danych JSONBin ani poufnych danych dostępowych.

## Format wpisu

```text
## RRRR-MM-DD — [temat decyzji]

Status: robocze / potwierdzone / do weryfikacji
Źródło: rozmowa / dokument / ustalenie użytkownika

Decyzja / założenie:
- [krótki opis decyzji]

Uzasadnienie:
- [dlaczego tak]

Do sprawdzenia / następne kroki:
- [opcjonalnie]
```

## Decyzje

Poniżej zapisane są decyzje i założenia robocze.

## 2026-07-08 — cennik katalogowy i zasady liczenia marży

Status: robocze / do weryfikacji
Źródło: cennik katalogowy `_pliki-0xyqdz4t/cennik.png`, obowiązuje od 03.07.2026

Decyzja / założenie:
- Cennik katalogowy dla klienta końcowego obowiązuje od 03.07.2026. Ceny są netto w EUR, bez VAT. Transport jest wyceniany indywidualnie.
- Pakiet Sklep za Stodołą 650 Premium DUO ma cenę katalogową 14 500 EUR netto.
- Konfiguracja pakietu 650 Premium DUO: 2 zbiorniki, GSM, monitoring poziomu mleka, system gotówkowy monety/banknoty/wydawanie reszty, drukarka, automatyczne płukanie, ogrzewanie Anti-Frost, alarm, 2 x pojemnik 50 l, certyfikacja CE-MID.
- W projekcie trzeba rozróżniać trzy poziomy cen: katalog klienta końcowego, cennik partnerski oraz cennik BRUNIMAT/zakupowy.
- Nie wolno liczyć marży jako proste `14 500 EUR - 6 400 EUR` bez doliczenia opcji, pawilonu, transportu, montażu, kursu EUR/PLN i kosztów operacyjnych.
- Pawilon 15 000-25 000 zł pozostaje roboczym założeniem. Marża na pawilonie jest nieznana.
- Projekt 220 000 zł / 55 000 zł marży jest hipotezą do weryfikacji, nie potwierdzonym faktem.

Uzasadnienie:
- Cennik katalogowy pokazuje cenę końcową i konfigurację oferty, ale nie wystarcza samodzielnie do policzenia realnej marży projektu.
- Do kalkulacji trzeba oddzielać cenę sprzedaży, koszt zakupu, koszt opcji, kurs EUR/PLN, pawilon, transport, montaż i koszty operacyjne.

Do sprawdzenia / następne kroki:
- Potwierdzić aktualny cennik partnerski i zakupowy BRUNIMAT.
- Rozpisać pełną kalkulację marży dla wariantu 650 Premium DUO z pawilonem i transportem.

## 2026-07-08 — koszt pełnego pakietu 650 Premium DUO do weryfikacji

Status: robocze / do weryfikacji u BRUNIMAT lub na fakturze.

Decyzja / założenie:
- Nie traktujemy kwoty 9 490 EUR jako pewnego kosztu pełnego pakietu. To było robocze odtworzenie kosztu z opcji BRUNIMAT, ale prawdopodobnie nie zawierało 2 x pojemnik 50 l.

Dotychczasowe liczby:
- 6 400 EUR — baza BRUNIMAT 650 Premium DUO.
- 9 490 EUR — robocze odtworzenie kosztu z opcji, prawdopodobnie bez pojemników.
- 9 750 EUR — wcześniejsza liczba robocza z `AI_CONTEXT.md`.
- 9 950 EUR — możliwy koszt po doliczeniu 2 x pojemnik 50 l po 230 EUR/szt.

Wniosek:
- Do czasu potwierdzenia nie zapisujemy jednej pewnej kwoty kosztu. Bezpiecznie traktujemy koszt pełnego pakietu jako zakres roboczy ok. 9 750-9 950 EUR.

Do weryfikacji:
- Czy 2 x pojemnik 50 l są wliczone w pakiet.
- Czy CE-MID / certyfikacja jest liczona jako 150 EUR, 250 EUR czy inaczej.
- Czy monitoring poziomu mleka jest liczony jako dodatkowy GSM 160 EUR.
- Czy system gotówkowy 1 250 EUR obejmuje pełną konfigurację.
- Czy istnieją jeszcze inne opcje w pakiecie 14 500 EUR.

Wpływ na marżę:
- Cena katalogowa klienta: 14 500 EUR netto.
- Roboczy koszt pełnego pakietu: ok. 9 750-9 950 EUR.
- Robocza marża na urządzeniu przy sprzedaży bezpośredniej: ok. 4 550-4 750 EUR przed innymi kosztami.
- Przy kursie 4,30 PLN/EUR daje to ok. 19 565-20 425 zł.

Wniosek sprzedażowy:
- Marża na urządzeniu nadal jest ważną dźwignią zysku, ale nie wolno jej zawyżać przez liczenie `14 500 EUR - 6 400 EUR` ani przez pomijanie pojemników/opcji.

## 2026-07-08 — sklepy autonomiczne 24/7 jako opcjonalny upsell, nie rdzeń oferty

Status: rozpoznawcze / do weryfikacji rynkowej.

Źródło:
- Analiza Claude na podstawie researchu dostawców: Kesseböhmer, INEOGroup, Contio/ArrowSys, MAGO, Dwa Jabłka, HM Vending.

Decyzja / założenie:
- Sklepy autonomiczne 24/7 nie są na dziś nowym rdzeniem modelu biznesowego Sklep za Stodołą. Traktować je jako opcjonalny, premium upsell do pawilonu / punktu sprzedaży przy gospodarstwie.

Kluczowe wnioski:
- Sklep za Stodołą pozostaje firmą od sprzedaży bezpośredniej dla rolnika: BRUNIMAT + pawilon + wdrożenie + finansowanie + serwis.
- Technologia sklepu autonomicznego może być dodatkiem dla większych klientów albo wariantem premium.
- Kesseböhmer, Contio i podobne firmy traktować na razie bardziej jako potencjalnych dostawców/partnerów niż konkurencję.
- INEOGroup może być szczególnie ważny jako polski integrator fiskalizacji, płatności i serwisu.
- MAGO wygląda raczej na większe realizacje/sieci, nie pierwszy wybór na start.
- Dwa Jabłka i HM Vending to prostsze alternatywy, bardziej skrytkomat/automat niż pełny sklep wejściowy.

Ceny Contio orientacyjne, nie do ofert:
- Kiosk samoobsługowy: 35 000 CZK, ok. 6 200 zł.
- Contio Shop Mini: 78 499 CZK, ok. 13 900 zł.
- Contio Shop: 125 000 CZK, ok. 22 200 zł.
- System z kołowrotem: 275 000 CZK, ok. 48 800 zł.

Zastrzeżenia do cen:
- Ceny są bez budynku, transportu i dostosowania do polskich przepisów.
- Kurs CZK/PLN jest orientacyjny.
- Nie używać tego jako gotowej oferty klientowi.

Ryzyka:
- Za wysoki koszt dla pierwszych klientów.
- Ryzyko walutowe CZK/EUR.
- Dostawcy zagraniczni = logistyka i serwis.
- Niepewna fiskalizacja i przepisy.
- Ryzyko rozmycia marki.
- Brak potwierdzonego popytu.

Wniosek panelowy:
- Na razie nie budować osobnego modułu sklepów autonomicznych. Jeśli temat dojrzeje, wystarczy w module ofert / CRM pole „wariant punktu sprzedaży” i status wyceny od dostawcy.

Notatka prawna:
- Założenia prawne o płatności bezgotówkowej i wyjątku od gotówki trzeba zweryfikować w oficjalnym tekście ustawy albo u prawnika przed użyciem w ofercie dla klienta.

## 2026-07-08 — „Nasze korzenie” jako mała sekcja zaufania, nie argument sprzedażowy

Status: do oceny / nie wdrażać automatycznie.

Źródło:
- Analiza Claude o sekcji „Nasze korzenie” i wątku Kazimierza Deczyńskiego.

Decyzja / założenie:
- Wątek Kazimierza Deczyńskiego i rodzinnych korzeni można rozważyć jako małą, spokojną sekcję „Nasze korzenie”, najlepiej na podstronie „O nas”, a nie jako główny blok na stronie głównej.

Kluczowe wnioski:
- Temat może budować autentyczność, związek z polską wsią i zaufanie.
- Nie powinien odciągać od głównego celu strony: sprzedaży rozwiązań dla rolników.
- Nie powinien być głównym argumentem sprzedażowym.
- Nie powinien być używany jako CTA.
- Nie powinien być pisany patetycznie.
- Nie porównywać wprost „pańszczyzny” do dzisiejszych pośredników.
- Nie pisać „nasz przodek”, jeśli pokrewieństwo nie jest potwierdzone genealogicznie.

Bezpieczne zalecenie tekstowe:
- Używać ostrożnej formy bez twierdzenia o bezpośrednim przodku:
  „Historia Kazimierza Deczyńskiego jest nam bliska, bo przypomina o tym, jak ważna była i nadal jest niezależność gospodarza.”
- Alternatywnie:
  „Odwołujemy się do historii polskiej wsi i ludzi, którzy upominali się o sprawiedliwe traktowanie gospodarzy.”
- Jeśli pokrewieństwo zostanie potwierdzone dokumentami, można rozważyć mocniejsze:
  „Kazimierz Deczyński, nasz przodek...”

Roboczy tekst do rozważenia:

```text
Nasze korzenie

Historia Kazimierza Deczyńskiego jest nam bliska, bo przypomina o tym, jak ważna była i nadal jest niezależność gospodarza.

W XIX wieku Kazimierz Deczyński, chłop spod Sieradza, latami upominał się o sprawiedliwe traktowanie wiejskich gospodarzy — pisał skargi, szukał prawa, a swoją historię spisał w pamiętniku, który do dziś czyta się jako świadectwo losu polskiej wsi.

Dziś pomagamy rolnikom w innej sprawie — żeby mogli sprzedawać swoje produkty bezpośrednio, bez zbędnych pośredników, na uczciwych zasadach. Inne czasy, ten sam kierunek: żeby to gospodarz decydował o wartości swojej pracy.
```

Notatka:
- Na razie nie wdrażać tego na stronie. Używać ostrożnej formy bez twierdzenia o bezpośrednim przodku, chyba że pokrewieństwo zostanie potwierdzone dokumentami.

## 2026-07-08 — struktura marż i logika ofertowa

Status: robocze / do weryfikacji.

Decyzja / założenie:
- Marża na urządzeniu pozostaje najważniejszą dziś dźwignią zysku, ale po korekcie kosztu pełnego pakietu nie traktujemy wcześniejszej marży 4 750-5 010 EUR jako pewnej.

Aktualne bezpieczne założenie:
- Cena katalogowa klienta: 14 500 EUR netto.
- Roboczy koszt pełnego pakietu: ok. 9 750-9 950 EUR.
- Robocza marża na urządzeniu: ok. 4 550-4 750 EUR.
- Przy kursie 4,30 PLN/EUR: ok. 19 565-20 425 zł.

Kluczowe ustalenia:
- Marża na urządzeniu jest dziś najbardziej konkretna, ale nadal wymaga potwierdzenia kosztu u BRUNIMAT lub na fakturze.
- Marża na pawilonie nie jest jeszcze znana.
- Transport nie jest jeszcze znany i musi być liczony osobno.
- Realny koszt serwisu nie jest jeszcze znany.
- Model ofertowy Podstawowy / Standard / Premium zostaje przyjęty jako kierunek roboczy.
- Prowizja od finansowania lub leasingu jest dodatkiem, nie fundamentem rentowności.
- Sub-partnerzy zostają odłożeni do czasu minimum 3-5 zrealizowanych projektów.
- Najpierw trzeba dopracować własną sprzedaż, ofertę, wdrożenie, kalkulator marży i realne koszty.

Do weryfikacji:
- Koszt pełnego pakietu: 9 750-9 950 EUR.
- Czy 2 x pojemnik 50 l są wliczone.
- Koszt i cena sprzedaży pawilonu.
- Koszt transportu.
- Realny koszt serwisu.
- Czy klienci zaakceptują ofertę Podstawowy / Standard / Premium.
- Czy abonament serwisowy jest sprzedawalny rolnikom.

## 2026-07-08 — Domyślna strategia sprzedaży: Premium 14 500 EUR jako punkt odniesienia

Temat:
- Domyślna strategia sprzedaży — wariant Premium / pełny pakiet 14 500 EUR jako punkt odniesienia.

Status: robocze — do przetestowania na kolejnych rozmowach sprzedażowych.

Decyzja / założenie:
- W rozmowach z klientami wariant Premium / pełny pakiet 14 500 EUR prezentować jako pierwszy, jako „gotowe rozwiązanie”, a nie jako górną opcję w cenniku.
- Tańsze warianty pokazywać dopiero później jako kompromis i jako pokazanie, co klient traci przy oszczędzaniu.
- Wariant Podstawowy nie powinien być aktywnie proponowany na start rozmowy.

Kluczowe zasady:
- Nie sprzedawać tego jako „mlekomat za 14 500 EUR”.
- Sprzedawać jako „gotowy punkt sprzedaży, który działa sam”.
- Premium ma być punktem odniesienia, nie luksusową górną półką.
- Tańsze warianty pokazywać jako kompromis: co odpada i jakie ryzyka zostają po stronie rolnika.
- Wariant Podstawowy trzymać jako fallback przy obiekcji budżetowej.

Argumenty sprzedażowe bez ujawniania marż:
- System gotówkowy z wydawaniem reszty: klient z banknotem może kupić, zamiast rezygnować.
- GSM / monitoring: rolnik dostaje informację, zanim klient przyjedzie do pustego zbiornika.
- Automatyczne płukanie i Anti-Frost: mniej pilnowania i mniejsze ryzyko problemów.
- Alarm: ochrona gotówki i urządzenia stojącego przy drodze.
- CE-MID / legalizowany pomiar: mniejsze ryzyko problemów przy kontroli.

Framing cenowy:
- Mówić „gotowy punkt sprzedaży”, nie „mlekomat”.
- Różnice między wariantami pokazywać kwotowo, nie procentowo.
- Przypominać o możliwości finansowania / leasingu / dotacji bez obiecywania uzyskania dotacji.
- Płatność 50/50 traktować jako argument ułatwiający akceptację wyższej kwoty.
- Nie ujawniać marż, kosztów zakupowych ani cen partnerskich.

Roboczy skrypt otwarcia:

```text
Mamy gotowe rozwiązanie, które działa samo — klient płaci gotówką albo banknotem, dostaje resztę, a Pan/Pani dostaje informację, kiedy trzeba dolać mleka. Nie trzeba tam stać ani pilnować sprzedaży cały czas. To nasz pełny pakiet za 14 500 EUR netto. Mamy też tańsze warianty — pokażę różnicę, żeby zobaczył Pan/Pani, co się traci przy oszczędzaniu.
```

Do przetestowania:
- Czy klient lepiej reaguje, gdy Premium jest pokazane jako pierwsze.
- Czy wariant Podstawowy powinien być ukrywany do momentu obiekcji cenowej.
- Czy argument „gotowy punkt sprzedaży” działa lepiej niż „mlekomat”.
- Czy dotacja / leasing realnie obniżają opór cenowy.
- Jak rolnicy reagują na różnicę między wariantami pokazywaną jako „co odpada”.
