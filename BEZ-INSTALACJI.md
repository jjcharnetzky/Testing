# Etykietson — uruchomienie wyłącznie w przeglądarce

Użyj pliku **`Generator-etykiet.html`**. To kompletna aplikacja, a nie instalator. Ma w środku kod, style, 12 odmian fontów oraz ich licencje. Nie potrzebuje Node.js, serwera, dodatków ani internetu.

1. Pobierz plik `Generator-etykiet.html` na dysk.
2. Kliknij go prawym przyciskiem → **Otwórz za pomocą → Microsoft Edge** lub **Google Chrome**. Możesz też przeciągnąć plik do okna przeglądarki.
3. Pracuj w otwartej karcie: dodawaj rodzaje, zmieniaj treść i numerację, a na końcu wybierz **Eksportuj do druku → Pobierz wektorowy PDF**.
4. Przed zamknięciem wybierz **Projekty → Pobierz projekt**, aby zapisać kopię zlecenia wraz z szablonami, PNG i fontami. Następnym razem otwórz ten sam HTML i w razie potrzeby wybierz **Projekty → Importuj plik**.

Nie ma folderu do rozpakowywania ani skryptu do uruchamiania. Można skopiować ten jeden plik na inne stanowisko; projekty przekazuje się osobnymi plikami zleceń. Każdy użytkownik pracuje na własnych danych.

## Automatyczny zapis

Jeżeli przeglądarka dopuszcza IndexedDB, aplikacja zapisuje zmiany automatycznie. Komunikat **„Zapisano lokalnie”** pojawia się po zakończeniu transakcji zapisu. Dla plików lokalnych dostępność i zakres pamięci zależą od przeglądarki i zasad firmowych, więc używaj tego samego pliku HTML i profilu przeglądarki oraz regularnie pobieraj kopie zleceń.

Jeżeli trwały zapis jest zablokowany, aplikacja pokaże komunikat **„W tej karcie · pobierz kopię”**. Możesz nadal projektować etykiety, pobierać projekt, PDF i DXF. **W tym trybie przed zamknięciem karty koniecznie pobierz projekt do pliku**, ponieważ dane są tylko w pamięci bieżącej karty.

Plik zlecenia (`*.etykiety.json`) to dane; sam plik `Generator-etykiet.html` to aplikacja. Nie zapisuj otwartej strony poleceniem przeglądarki „Zapisz stronę” jako sposobu zapisu projektu.

## Druk

PDF pozostaje wektorowy, z osadzonymi fontami i rzeczywistymi wymiarami. W oprogramowaniu plotera wybierz skalę **100% / rzeczywisty rozmiar**, wyłącz dopasowanie do strony i najpierw sprawdź plik kontrolny 50 × 30 mm oraz odcinek 100 mm dostępny w aplikacji.

## Informacje o weryfikacji dla programisty

Testy pojedynczego HTML sprawdzają komplet osadzonych zasobów, brak pobierania fontów i bibliotek, własny TTF, import/eksport zleceń, PDF/DXF, zapis IndexedDB po restarcie przeglądarki i działanie przy zablokowanej pamięci przeglądarki. Pakiet ma CSP blokującą połączenia sieciowe.

Wbudowany Chromium tej chmury administracyjnie blokuje nawigację `file://` (`ERR_BLOCKED_BY_ADMINISTRATOR`). Nie zmieniano tej polityki. Dlatego automatyczny test ładuje **dokładnie ten sam HTML** przez lokalny serwer testera, a następnie odłącza sieć przed edycją i eksportem. Serwer testowy jest narzędziem weryfikacji, nie jest wymagany do używania dostarczonego pliku.

Bezpośrednie otwarcie przez `file://` na docelowym Windows pozostaje do potwierdzenia w jego Edge/Chrome. Do powtórzenia tego wariantu w środowisku dopuszczającym lokalne pliki służy zmienna `SINGLE_FILE_FILE_URL=1` przy uruchomieniu `tests/e2e/single-file.spec.ts`. Podsumowanie pozostałych testów: TESTY.md.

## Nowe możliwości

W oknie **Czcionki** wczytasz jednorazowo własne pliki Arial Regular, Bold i Black. Nie są dołączone do HTML i bez ich wczytania program nie używa zastępników. Wczytane fonty pozostają w lokalnej bibliotece; przy zablokowanej pamięci zachowaj je przez eksport projektu.

Przycisk PNG lub upuszczenie pliku dodaje grafikę z przezroczystością. **Wyśrodkuj treść** centruje istniejący układ tekstowy. **Pobierz pakiet PDF + DXF** pobiera ZIP z odpowiadającymi arkuszami i katalogiem `obrazy`; rozpakuj go w całości. DWG nie jest generowany. Nie wykonano testu otwarcia w DraftSight 2024.

Nazwa aplikacji to Etykietson. Nazwę `Generator-etykiet.html`, port 4173 i identyfikatory danych zachowano dla ciągłości wcześniejszych instalacji. Zastąp stary HTML w tej samej lokalizacji i używaj tego samego profilu przeglądarki. Projekty formatu 1 otwierają się bez przesuwania obiektów.
