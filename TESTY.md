# Wyniki weryfikacji

Wykonano 16.10.2026 w środowisku Linux, Node.js 24.19.0, Chromium z Playwright. **Nie wykonano testu na rzeczywistym Windows, ploterze ani RIP.**

## Zakończone sprawdzenia

- Dostosowanie do sieci LAN: test serwera HTTPS z zaufanym certyfikatem i pełną weryfikacją TLS; brak klucza zatrzymuje serwer zamiast przełączać na HTTP. Przetestowano także UUID w środowisku bez `crypto.randomUUID`. Dwa dodatkowe scenariusze Chromium łączą się z rzeczywistym adresem IPv4 maszyny (bez `localhost`), sprawdzają tworzenie, zapis po odświeżeniu, PDF 1400 × 180 mm dla 141 etykiet oraz rozdzielenie projektów dwóch stanowisk. W teście LAN dozwolone jest bezpośrednie połączenie wyłącznie do interfejsu testowej maszyny i loopback; pozostałe adresy są kierowane na nieaktywny lokalny port proxy.
- `npm run check`: kompilacja typów TypeScript bez błędów.
- `npm test`: **30/30 zaliczonych**, bez testów pominiętych. Testy obejmują numerację A/B/C, zamierzone i niezamierzone powtórzenia, krok i format, przejście powyżej 999, trwałość miesiąca/roku, niezależność numerów od układu/obrotu/szablonu/eksportu, ilości, marginesy, odstępy, półki o różnych rozmiarach, obrót opcjonalny, podział stron, kolizje, granice szerokości i scalanie odcinków. Sprawdzono również polskie glify, brak glifu, długą nazwę i numer, przepełnienie wielowierszowe i obrócone, import/eksport projektu z fontami oraz odrzucanie niepoprawnych plików.
- `npm run build`: gotowy build produkcyjny w `dist`, lokalne zasoby i wersjonowany Service Worker. Vite zgłasza informację o dużym pakiecie JS (~1,35 MB przed kompresją; zawiera silniki PDF/fontów); nie jest to błąd buildu ani zasób pobierany z internetu podczas pracy.
- `npm run test:e2e`: **9/9 zaliczonych** w rzeczywistym Chromium. Sprawdzono projekt demo, PDF/SVG, edycję, duplikowanie/usuwanie obiektów, przesunięcie myszą, cofanie/ponawianie, niezależny szablon, numerację B/C, ostrzeganie o przepełnieniu i blokadę za szerokiej etykiety. Test offline importuje własny TTF, eksportuje i importuje kompletny projekt z fontami, odłącza sieć przez Playwright, ponownie ładuje aplikację z Service Workera, otwiera zapisany projekt, edytuje i pobiera PDF. Zarejestrowano **0 żądań do zewnętrznych hostów**.
- Dodatkowe sprawdzenie narzędziami `pdfinfo`, `pdffonts` i `pdftotext`: PDF jest wektorowy, strona 1400 × 150 mm, użyte fonty osadzone, mapa Unicode dostępna, tekst „Zażółć gęślą jaźń” odzyskiwany poprawnie. Test automatyczny sprawdza brak obrazów w zasobach PDF, obecność strumieni fontów i fizyczne rozmiary wielostronicowego eksportu. SVG zawiera mm, viewBox i ścieżki glifów, bez obiektów tekstowych i siatki edytora.

## Pojedynczy HTML bez instalacji

`release/Generator-etykiet.html` (ok. 8,5 MB) zawiera całą aplikację, 12 fontów, style oraz licencje. Połączenia sieciowe są blokowane jego CSP. Trzy dodatkowe scenariusze przeszły: komplet zasobów i eksport/import z własnym fontem, PDF i SVG po odłączeniu sieci; zapis IndexedDB po całkowitym zamknięciu i ponownym uruchomieniu przeglądarki; edycja, pobieranie projektu i PDF przy celowo zablokowanych IndexedDB oraz localStorage. W ostatnim wariancie aplikacja wyraźnie pokazuje, że zapis istnieje tylko w bieżącej karcie.

Naprawiono także krótki okres, w którym po edycji stary komunikat „Zapisano lokalnie” mógł pozostać widoczny przed rozpoczęciem nowej transakcji. Teraz edycja natychmiast pokazuje „Zapisywanie…”, a stan zapisany pojawia się dopiero po zakończeniu transakcji.

**Ograniczenie testera:** bezpośrednia nawigacja do `file:///…/Generator-etykiet.html` została zablokowana przez administracyjną politykę Chromium (`ERR_BLOCKED_BY_ADMINISTRATOR`). Nie zmieniano polityki. Testy zakończone powodzeniem ładują dokładnie ten sam samowystarczalny HTML przez lokalny serwer testera, a przed edycją i eksportem odłączają sieć. Przy sprawdzeniu ponownego uruchomienia przeglądarki HTML jest każdorazowo ładowany przez tester, a następnie sieć jest odłączana. Tego wyniku nie należy opisywać jako wykonanego testu `file://` na Windows. Bezpośrednie otwarcie pliku w docelowym Edge/Chrome pozostaje do potwierdzenia; instrukcja i sposób odtworzenia wariantu w BEZ-INSTALACJI.md.

## Obowiązkowe przypadki odbioru

| Przypadek | Wynik |
|---|---|
| 28 × 50 × 30 mm na szerokości 1400 mm | 28 etykiet, 1 wiersz, 30 mm długości |
| 29 × 50 × 30 mm | Dokładnie 29 etykiet, 2 wiersze, 60 mm |
| 140 × 50 × 30 mm | Dokładnie 140 etykiet, 5 wierszy, 150 mm |
| Szerokość etykiety 1401 mm na materiale 1400 mm | Czytelny błąd; eksport zablokowany |
| Wspólna krawędź dwóch etykiet | Jedna granica, łącznie 5 scalonych odcinków obrysu |
| Częściowo pokrywające się odcinki 0–50 i 25–75 mm | Jeden odcinek 0–75 mm |
| Zmiana układu i powtórzony eksport | Numery identyczne |
| Odłączenie sieci, ponowne otwarcie, edycja i PDF | Zaliczony test przeglądarkowy offline |

`node scripts/verify-release.mjs`: **zaliczony, kod wyjścia 0**. Sprawdzono sumy SHA-256 i gotowy ZIP wypakowany do katalogu tymczasowego. Serwer uruchomił się bez `node_modules`, przy dopuszczeniu wyłącznie localhost. Zapisano projekt, zatrzymano i ponownie uruchomiono serwer oraz aplikację, potwierdzono zachowane dane, odłączono sieć przeglądarki, wykonano edycję i wyeksportowano PDF 1400 × 150 mm. **0 żądań do hostów zewnętrznych.** Do powtórzenia tego testu port 4173 musi być wolny.

`npm ci --cache /tmp/generator-npm-cache --no-audit --no-fund`: odtworzenie 112 pakietów z lockfile zakończone pomyślnie. Następnie ponownie wykonano build. Początkowy przebieg osobnego testu paczki został zakłócony w sprzątaniu przeglądarki przez równoległą reinstalację zależności testera; po zakończeniu instalacji wykonano go ponownie w całości, z wynikiem powyżej.

## Pliki przekazania

- `release/Generator-etykiet.html`: samowystarczalna aplikacja do otwarcia w przeglądarce, z fontami i licencjami; bez instalacji, Node.js i serwera.
- `dist/`: produkcyjny build, lokalne fonty i Service Worker.
- `release/Generator-etykiet-LAN.zip`: paczka serwera firmowej sieci, z `start-serwer-lan.bat`, obsługą HTTP/HTTPS i instrukcją SIEC-FIRMOWA.md.
- `release/Generator-etykiet-offline.zip`: gotowa paczka stanowiskowa, serwer Node.js, `start.bat`, dokumentacja, przykłady i licencje; bez npm i `node_modules`.
- `release/Generator-etykiet-projekt.zip`: komplet źródeł, testy, skrypty, lockfile i gotowy build.
- `release/SHA256SUMS.txt` oraz manifesty wewnątrz ZIP: sumy do weryfikacji przeniesienia.
- `przyklady/projekt-demonstracyjny.etykiety.json`: kompletne zlecenie 40/25/60/10/5 wraz z fontami.
- `przyklady/demo-140-etykiet.pdf`: wyeksportowany przykład 1400 × 150 mm.
- `przyklady/kontrola-skali-50x30-100mm.pdf`: etykieta 50 × 30 mm i odcinek kontrolny 100 mm na stronie 200 × 70 mm.

## Do sprawdzenia na stanowisku produkcyjnym

Uruchomienie `start.bat` na docelowym Windows, profil i trwałość danych przeglądarki, wydruk kontrolny w skali 100%, wymiary w obu osiach, obsługa fontów oraz stron przez właściwy RIP, kolor, jakość linii i rzeczywista szerokość materiału. Tej zgodności nie można potwierdzić testami przeglądarkowymi.

Test pakietu LAN można odtworzyć poleceniem `node scripts/verify-release.mjs Generator-etykiet-LAN` przy wolnym porcie 4173. Weryfikuje odtworzenie serwera z gotowej paczki bez node_modules, zachowanie danych, restart i PDF offline.
