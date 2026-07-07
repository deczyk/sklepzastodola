# Jak używać Codex + Claude

## Claude
Używaj do: strategii, tekstów, ofert, maili, umów roboczych, analizy sprzedaży, planowania, uproszczenia decyzji.

## Codex
Używaj do: kodu, panel.html, HTML/CSS/JS, repo GitHub, poprawiania błędów, wdrażania zmian, sprawdzania diffów.

## Schemat pracy
1. Claude przygotowuje treść i decyzje.
2. Wpisujesz decyzję do AI_CONTEXT.md lub TODO_AI.md.
3. Codex czyta AI_CONTEXT.md i wdraża technicznie w repo.
4. Codex pokazuje diff.
5. Dopiero potem commit.

## Prompt do Codexa
Przeczytaj AI_CONTEXT.md. Zmień tylko wskazane pliki. Nie ruszaj JSONBin, hasła, CRM, danych klientów ani synchronizacji. Zachowaj styl panelu. Nie duplikuj dokumentów. Po zmianach pokaż diff i listę zmienionych plików.

## Prompt do Claude
Przeczytaj AI_CONTEXT.md. Pomóż mi przygotować treść/strategię, ale nie wymyślaj zmian technicznych bez osobnej listy zadań dla Codexa. Pisz konkretnie i praktycznie pod Sklep za Stodołą.
