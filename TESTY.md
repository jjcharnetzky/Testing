# Weryfikacja Etykietson 2.0

Wykonano 16.10.2026: Linux, Node.js 24.19.0, TypeScript 5.7, Chromium / Playwright. Aplikacja i generowanie plików działają w przeglądarce, bez dodatkowych programów na stanowisku użytkownika.

## Wyniki

- **`npm run build` — zaliczony**. Kontrola TypeScript, build `dist`, Service Worker i samowystarczalny `release/Generator-etykiet.html` (8,62 MiB). Biblioteki, style, 12 odmian Liberation i licencje są lokalne. Vite informuje o wielkości głównego JS (ok. 1,48 MB); build zakończył się poprawnie.
- **`npm test` — 42/42**. Dotychczasowe przypadki numeracji A/B/C, układu, marginesów, podziału stron, wspólnych granic, glifów i PDF oraz nowe przypadki: stare projekty v1 bez przemieszczeń, pionowe wyrównanie bloków wielowierszowych, centrowanie grupy osobnych pól, rozpoznawanie odmian Arial, brak fontu bez cichego zamiennika, import prawdziwego lokalnego TTF, PNG/CRC/proporcje/zapis, kanał alfa PDF, obrót obrazu, IMAGE/IMAGEDEF, wypełnione kontury glifów, ZIP z kilkoma arkuszami i deduplikacja PNG. Dwa testy HTTPS weryfikują zaufany certyfikat; brak klucza zatrzymuje serwer bez przechodzenia na HTTP.
- **`npm run test:e2e` — 12/12**. Projekt demo; edycja tekstu, geometria i drag; cofanie; kopia szablonu; numeracja i błędy eksportu; działanie po odłączeniu sieci; jednorazowa biblioteka fontów po odświeżeniu i w nowym projekcie; migracja istniejącej bazy IndexedDB v1 do v2; PNG przez przycisk i drop, uchwyt rozmiaru, blokada proporcji, obrót, warstwy, duplikowanie, wymiana, usuwanie, zapis/odtworzenie oraz przenoszenie projektu; PDF + DXF offline. Dwa scenariusze LAN używają rzeczywistego adresu IPv4 maszyny i sprawdzają osobne dane stanowisk. Testy sieciowe zachowują dotychczasowe ograniczenia połączeń lokalnych.
- **Audyt CAD w ezdxf 1.4.4 — 4/4 plików: 0 błędów, 0 napraw**. DXF AC1021, jednostki 4 = mm, model space, puste paperspace, wypełnione HATCH z otworami, geometryczne obramowania, bez TEXT/MTEXT zależnych od systemowych fontów. IMAGE/IMAGEDEF oraz reaktory są poprawne; ścieżki `obrazy/grafika-001.png` wskazują istniejące pliki. Przezroczystość włączona, ramka obrazu wyłączona przez RASTERVARIABLES. Powtórzenie: `npm test`, następnie `XDG_CACHE_HOME=/tmp/etykietson-cache python scripts/verify-cad.py` (ezdxf jest wyłącznie narzędziem programisty).
- **Niezależne porównanie renderów PDF/CAD**: próbka 50 × 30 mm z polskimi literami, numerem i PNG, 254 dpi, PDF przez PyMuPDF, DXF przez ezdxf/Matplotlib. Pozycje tekstu i linii pokrywają się w granicy 0,1 mm (100% pikseli wektorowych próbki ma odpowiednik w tym sąsiedztwie); PNG wyłączono z tej miary. Oddzielnie sprawdzono osadzony kanał alfa PDF, dane PNG bez modyfikacji oraz wektory pozycji/skali/obrotu obrazu w DXF, także przy obrocie całej etykiety o 90°. To porównanie próbki, nie certyfikacja całego oprogramowania CAD.

**Gotowa paczka LAN:** `LABEL_VERIFY_PORT=4177 node scripts/verify-release.mjs Generator-etykiet-LAN` zakończył się kodem 0. Potwierdzono sumy SHA-256, uruchomienie wypakowanego buildu bez `node_modules`, restart serwera i aplikacji, zachowanie projektu, edycję i PDF offline oraz 0 żądań zewnętrznych. Użyto osobnego portu testowego, ponieważ 4173 był zajęty.

## Przypadki wymiarów i kompletności

| Przypadek | Wynik |
|---|---|
| 28 etykiet 50 × 30 mm, materiał 1400 mm, przerwy/marginesy 0 | Jeden wiersz, wysokość 30 mm |
| 29 etykiet bez ograniczenia długości | Dwa wiersze, wysokość 60 mm |
| 140 etykiet demo | Pięć wierszy, arkusz 1400 × 150 mm |
| 29 etykiet, limit arkusza 30 mm | Dwa PDF i dwa DXF o odpowiadających nazwach; 28 + 1 etykiet |
| Wspólna krawędź dwóch etykiet | Jedna granica; pięć scalonych odcinków obramowania |
| Powtórzony eksport / zmiana układu | Brak zmian numeracji |
| 28 powtórzeń tego samego PNG | Jeden plik PNG w ZIP, osobne poprawnie położone IMAGE |
| Pakiet produkcyjny | `arkusz-NNN.pdf`, `arkusz-NNN.dxf`, `obrazy/`, `zestawienie.csv`, instrukcja |
| Stary projekt i aktualizacja lokalnej bazy | Te same pozycje, teksty, numery i identyfikatory; centrowanie dopiero po poleceniu użytkownika |

## Pojedynczy HTML

Trzy scenariusze sprawdzają dokładny plik przekazania: osadzone zasoby, lokalny TTF i PNG, przenośny projekt oraz eksport PDF + DXF po odłączeniu sieci; zachowanie projektu po całkowitym zamknięciu i ponownym uruchomieniu przeglądarki; pracę przy zablokowanych IndexedDB i localStorage z jawnym komunikatem o zapisie tylko w bieżącej karcie. CSP pojedynczego HTML blokuje połączenia sieciowe; nie ma pobierania fontów ani bibliotek z hostów zewnętrznych.

Chromium tej chmury administracyjnie blokuje nawigację `file://` (`ERR_BLOCKED_BY_ADMINISTRATOR`). Polityki nie zmieniano. Test ładuje **te same bajty pojedynczego HTML** przez lokalny serwer testera, po czym odłącza sieć przed edycją i eksportem. Przy restarcie przeglądarki HTML jest ponownie ładowany przez tester, a następnie sieć jest odłączana. Bezpośrednie otwarcie pobranego pliku na docelowym Windows pozostaje do sprawdzenia w jego Edge/Chrome. Sposób powtórzenia testu `file://` w środowisku dopuszczającym pliki lokalne: `SINGLE_FILE_FILE_URL=1 npx playwright test tests/e2e/single-file.spec.ts`.

## Ograniczenia weryfikacji

**Brak plików Arial w repozytorium i środowisku testowym.** Sprawdzono rozpoznawanie metadanych odmian Regular/Bold/Black, osobną rodzinę Black, brak zamienników, walidację błędnego pliku dla wybranej odmiany i pełny mechanizm zapamiętywanego importu/eksportu na rzeczywistym Liberation TTF z polskimi znakami. Nie wykonano renderowania rzeczywistych plików Arial, Arial Bold ani Arial Black. Użytkownik wczytuje własne TTF/OTF w oknie Czcionki; te same bajty trafiają do edytora i PDF, a DXF wykorzystuje ich kontury.

**Nie wykonano testu otwarcia w DraftSight 2024.** Wybrano DXF 2007 i sprawdzono go niezależnym parserem oraz rendererem. Nie ma eksportu DWG — użyte biblioteki nie generują tego formatu offline. Nie stosuje się zmiany rozszerzenia ani obowiązkowych konwerterów.

Nie wykonano testu Windows, plotera, sterownika ani RIP. Przed produkcją pozostaje wydruk kontrolny 100%, sprawdzenie wymiarów, zachowania PNG i linii w docelowym CAD/RIP oraz trwałości zapisu w firmowym profilu przeglądarki.

## Pliki przekazania

- `release/Generator-etykiet.html`: Etykietson do otwarcia bez instalacji; zachowana dotychczasowa nazwa pliku dla ciągłości zapisu.
- `release/Generator-etykiet-bez-instalacji.zip`: ten sam HTML i instrukcja.
- `dist/`: build serwerowy i lokalny Service Worker.
- `release/Generator-etykiet-LAN.zip`, `release/Generator-etykiet-offline.zip`: gotowy serwer, build, skrypty startowe, instrukcje, przykłady i licencje; bez `node_modules`.
- `release/Generator-etykiet-projekt.zip`: źródła, testy, skrypty, lockfile i build.
- `release/SHA256SUMS.txt`: sumy wszystkich paczek i pojedynczego HTML; manifesty również wewnątrz paczek serwerowych.
- `przyklady/`: dotychczasowy projekt formatu 1 i PDF, zachowane także jako przykłady kompatybilności.

Test gotowej paczki można powtórzyć przy wolnym porcie 4173: `node scripts/verify-release.mjs` albo `node scripts/verify-release.mjs Generator-etykiet-LAN`. Gdy domyślny port jest zajęty, ustaw wyłącznie port testera: `LABEL_VERIFY_PORT=4177 node scripts/verify-release.mjs Generator-etykiet-LAN`. Nie zmienia to domyślnego portu aplikacji. Tester sprawdza SHA-256, uruchomienie wypakowanego serwera bez node_modules, restart, zapis projektu, edycję i PDF offline bez żądań do zewnętrznych hostów.
