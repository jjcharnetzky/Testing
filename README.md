# Etykietson

Lokalna aplikacja do projektowania i seryjnego generowania etykiet produkcyjnych. Polski interfejs, wymiary w mm, wektorowy PDF z osadzonymi fontami, grafiki PNG z przezroczystością i kompletny układ DXF do CAD. Bez kont, CDN, telemetrii, AI ani zewnętrznych usług w czasie pracy.

## Bez instalacji — jeden plik HTML

Pobierz **`release/Generator-etykiet.html`** i otwórz go bezpośrednio w Edge lub Chrome. Wszystko jest w środku: interfejs, fonty, biblioteki i licencje. Nie trzeba Node.js, serwera ani internetu. Nazwa pliku pozostała bez zmian, aby można było zastąpić dotychczasowy HTML w tym samym miejscu i zachować dostęp do pamięci przeglądarki. Szczegóły: **[BEZ-INSTALACJI.md](BEZ-INSTALACJI.md)**. W „Projekty → Pobierz projekt” zapisuj kopie zleceń; gdy przeglądarka blokuje trwały zapis, aplikacja wyraźnie informuje, że dane są tylko w bieżącej karcie.

Poniższe warianty serwerowe są alternatywami dla administratora. **Nie są wymagane do używania pojedynczego HTML.**

## Aplikacja webowa w firmowej sieci LAN

Użyj **`release/Generator-etykiet-LAN.zip`**. Na jednym komputerze z Node.js 24 LTS uruchom **`start-serwer-lan.bat`**. Skrypt pokaże adresy serwera; pozostali użytkownicy otwierają wyświetlony adres w Edge/Chrome. Na ich komputerach nie potrzeba Node.js ani skryptów. Internet nie jest wymagany.

Pełna instrukcja: **[SIEC-FIRMOWA.md](SIEC-FIRMOWA.md)**, w tym dostęp przez zaporę, stały adres, HTTPS i praca offline. HTTP w LAN obsługuje edycję i eksport, ale Service Worker wymaga zaufanego HTTPS. Każde stanowisko ma własne projekty w przeglądarce; wymiana odbywa się przez pliki projektu.

## Gotowa paczka — Windows, bez internetu

1. Na komputerze z dostępem do internetu pobierz **Node.js 24 LTS** (oficjalny instalator Windows z https://nodejs.org) oraz aktualny Edge lub Chrome. Instalator Node.js można przenieść na pendrivie; runtime zainstaluj przed pierwszym użyciem.
2. Rozpakuj **`release/Generator-etykiet-offline.zip`** na stanowisku produkcyjnym. Zachowaj razem `start.bat`, `server.mjs`, cały folder `dist`, instrukcję, przykłady i licencje. `node_modules` nie jest potrzebny.
3. Uruchom **`start.bat`**. Otwiera przeglądarkę pod **http://localhost:4173** i uruchamia lokalny serwer. Nie pobiera pakietów. Jeśli przeglądarka otworzy się przed serwerem, odśwież stronę.
4. Pozostaw okno serwera otwarte. Do zakończenia pracy użyj `Ctrl+C`. Kolejnego dnia ponownie uruchom ten sam skrypt, w tej samej przeglądarce, pod tym samym adresem.
5. Komunikat **„Gotowy do pracy offline”** oznacza, że Service Worker zapisał lokalne zasoby. Zainstalowany serwer i gotowy build działają bez internetu również podczas pierwszego uruchomienia na nowym komputerze.

Serwerowego `dist/index.html` nie otwieraj przez `file://` — do bezpośredniego otwarcia przeznaczony jest wyłącznie samowystarczalny `release/Generator-etykiet.html`. Nie zamieniaj `localhost` na `127.0.0.1` w codziennej pracy: pamięć przeglądarki jest przypisana do dokładnego adresu i portu. Nie używaj trybu prywatnego do przechowywania zleceń.

Serwer domyślnie nasłuchuje tylko lokalnie. Używa wyłącznie standardowej biblioteki Node.js. Opcjonalna zmienna `LABEL_HOST` służy do zmiany adresu nasłuchu. `start-serwer-lan.bat` ustawia `0.0.0.0` i udostępnia aplikację w LAN. HTTPS jest dostępny przez `LABEL_TLS_CERT` i `LABEL_TLS_KEY`; szczegóły w SIEC-FIRMOWA.md. Domyślny port to 4173; `LABEL_PORT` pozwala administratorowi zmienić go w razie potrzeby.

## Pierwsze zlecenie

1. **Projekty → Nowy projekt**. Wpisz nazwę projektu oraz nazwę wyrobu drukowaną na etykietach.
2. Dodaj rodzaje przyciskiem **Dodaj rodzaj etykiety**. Każdy ma własną nazwę elementu, liczbę sztuk, wymiary i obrót do druku. Strzałki na karcie zmieniają kolejność produkcyjną. Rodzaje można duplikować i usuwać; co najmniej jeden pozostaje w projekcie.
3. W środkowym edytorze dodawaj tekst, prostokąty, linie i PNG. Nowe pola mają wyrównanie poziome i pionowe do środka swojej ramki; tekst wielowierszowy pozostaje jednym blokiem. **Wyśrodkuj treść** centruje grupę istniejących pól, zachowując ich wzajemne odstępy. Starsze projekty otwierają się bez przesuwania obiektów. Zaznacz pole, przesuń myszą lub wpisz X/Y, szerokość i wysokość w mm w panelu po prawej. Zoom nie zmienia wymiarów eksportu. Siatka ma 1 mm; magnes włącza przyciąganie. Narzędzie dłoni i środkowy przycisk myszy przesuwają widok.
4. W treści używaj `{nazwa_wyrobu}`, `{nazwa_elementu}`, `{typ_etykiety}`, `{nr_seryjny}`, `{miesiac}`, `{rok}`. `{nr_seryjny}` oznacza cały numer, np. `001/10/2026`. Nowe linie wprowadza się Enterem. Aplikacja nie zawija ani nie pomniejsza tekstu automatycznie.
5. Szablon zawiera wyłącznie wygląd. Może być współdzielony przez rodzaje. Przy nazwie szablonu wybierz **Duplikuj szablon**, aby edytować wygląd tylko wybranego rodzaju, albo **Nowy pusty szablon**. Nazwę szablonu można zmienić w prawym panelu. Cofanie/ponawianie dotyczy szablonów; nie zmienia numeracji ani ilości zlecenia.
6. **Numeracja**: wybierz opisany niżej tryb, ustaw krok, cyfry, miesiąc, rok i format. Miesiąc i rok są danymi projektu — nie zmieniają się po jego otwarciu w innym terminie.
7. **Materiał**: domyślnie 1400 mm szerokości, limit arkusza 3000 mm, wszystkie marginesy i odstępy dokładnie 0 mm. Dla 50 × 30 mm mieści się 28 etykiet w wierszu.
8. **Układ do druku** pokazuje arkusze, wykorzystaną długość, wolną powierzchnię oraz tabelę zakresów i wszystkich numerów. Kolor niewykorzystanego materiału jest wyłącznie pomocą ekranową.
9. **Eksportuj do druku** wykonuje kontrolę treści wszystkich etykiet, również ostatnich numerów. Kliknięcie problemu wraca do odpowiedniego obiektu. Brak glifu/fontu blokuje eksport. Przepełnienie można poprawić albo świadomie zaakceptować; aplikacja nie pomniejsza tekstu. Treść poza stroną PDF może zostać przycięta przez granicę strony — zgoda jest jawna.
10. Pobierz **PDF**, otwórz w oprogramowaniu plotera, wybierz **100% / rzeczywisty rozmiar** i wyłącz **Dopasuj do strony**. **Pobierz pakiet PDF + DXF** tworzy ZIP z plikami `arkusz-001.pdf` / `arkusz-001.dxf` itd., katalogiem `obrazy` oraz zestawieniem numerów i pozycji. Rozpakuj cały ZIP, zachowując katalog obrazów obok plików DXF. Eksport SVG został usunięty z interfejsu.

Pliki w `przyklady` zachowano także jako przykłady zgodności z formatem wersji 1; nowy eksport używa wersji 2. Przykład startowy zawiera **40, 25, 60, 10 i 5 sztuk**, razem 140. Przy wymiarach 50 × 30 mm powstaje pięć pełnych wierszy i arkusz 1400 × 150 mm. Można go przywrócić przez **Projekty → Projekt demo** lub import pliku z folderu `przyklady`.

## Trzy tryby numeracji

- **A — osobna dla rodzaju** (domyślny). Początek znajduje się we właściwościach każdego rodzaju; krok i format są wspólne. Powtórzenia między różnymi rodzajami są zamierzone.
- **B — wspólna dla zlecenia**. Licznik przechodzi po rodzajach według kolejności na liście. Zmiana tej kolejności jest świadomą zmianą zlecenia i zmienia przypisanie numerów; zmiana układu materiału go nie zmienia.
- **C — zestawy dla wyrobów**. Podaj liczbę wyrobów oraz ilość każdego rodzaju **na jeden wyrób**. Kolejność jest następująca: wyrób, rodzaj, kopia. Wszystkie etykiety jednego wyrobu mają ten sam numer. Łączna liczba jest obliczana automatycznie.

Krok musi być dodatni. Liczba cyfr jest minimalna; po 999 jest 1000. Format dopuszcza `{numer}`, `{miesiac}`, `{rok}` i musi zawierać `{numer}`. Miesiąc ma zawsze dwie cyfry. Eksport, obrót, podział stron i rozmieszczanie nie zużywają licznika.

## Zapis, przenoszenie i fonty

Każda zmiana jest zapisywana automatycznie w **IndexedDB**. **Projekty → Pobierz projekt** tworzy plik `*.etykiety.json` z wersją formatu, danymi zlecenia, szablonami, osadzonymi PNG i binarnymi plikami używanych fontów oraz wszystkich zaimportowanych fontów. Import sprawdza strukturę, zakresy liczb, odwołania szablonów, unikalność identyfikatorów i poprawność fontów. Import tworzy nową lokalną kopię, aby nie nadpisać istniejącego projektu.

**Regularnie pobieraj kopie plikowe.** Czyszczenie danych przeglądarki, usunięcie profilu lub awaria dysku usuwa zapis lokalny. Skopiowanie folderu aplikacji nie przenosi IndexedDB; przenoś projekty przez eksport/import. Duplikat projektu otrzymuje własny identyfikator, ale zachowuje numery i ustawienia oryginału.

Dołączono **Liberation Sans, Serif i Mono**, każdą w regular/bold/italic/bold italic, z polskimi znakami. Pliki i licencja **SIL Open Font License 1.1** znajdują się w `public/fonts` oraz w buildzie. Podgląd tekstu to krzywe z lokalnych fontów, a PDF osadza te same pliki. Nie ma zależności od fontów systemowych i cichego zastępowania fontów.

**Arial Regular, Arial Bold i Arial Black:** otwórz **Czcionki** i wczytaj własne statyczne pliki `arial.ttf`, `arialbd.ttf` i `ariblk.ttf` (lub odpowiednie OTF). Arial Black ma osobną rodzinę; pogrubienie wymaga rzeczywistego wariantu Bold. Program sprawdza metadane i odrzuca inny krój podany jako Arial. Plików Arial nie dołączono — bez nich odpowiednie opcje są oznaczone „brak pliku” i nie ma cichego zamiennika. Biblioteka fontów jest zapisywana w tej samej lokalnej bazie, dostępna po restarcie oraz w nowych projektach. Font użyty w projekcie trafia także do jego przenośnej kopii.

Własny font: zaznacz pole tekstowe → **Importuj font TTF / OTF**. Statyczne odmiany regular/bold/italic importuj osobno, z identyczną nazwą rodziny w metadanych. Przyciski B/I działają tylko przy dostępnej odmianie. Maksymalnie 20 MB na plik; fonty zmienne wymagają eksportu do statycznej odmiany. Za licencję importowanych fontów odpowiada użytkownik; techniczny zakaz osadzania jest sprawdzany, o ile font udostępnia go w tabeli OS/2.

## Grafiki PNG i eksport CAD

Wybierz **Dodaj grafikę PNG** (przycisk PNG) albo upuść plik na edytor. PNG jest obiektem szablonu i powtarza się we wszystkich jego etykietach. Możesz go przesuwać, zmieniać rozmiar w mm i zielonym uchwytem, obracać, centrować, duplikować, wymieniać, usuwać i przestawiać między warstwami. Domyślnie proporcje są zablokowane. Kanał alfa pozostaje w podglądzie i PDF; dane PNG są w autosave i pliku projektu. Limit: statyczny PNG do 10 MB i 40 megapikseli.

DXF używa wersji **AutoCAD 2007 / AC1021**, przestrzeni modelu i **1 jednostki = 1 mm** (`$INSUNITS=4`). Korzysta z tego samego układu, wymiarów, numerów i podziału na arkusze co PDF i podgląd. Wspólne współliniowe obramowania są scalane. Litery to wypełnione obrysy HATCH z zachowanymi otworami; krzywe są aproksymowane z tolerancją 0,005 mm. CAD nie potrzebuje zainstalowanych fontów. Tekst i linie pozostają wektorowe; cały arkusz nie jest rasteryzowany.

PNG w DXF używa IMAGE/IMAGEDEF, fizycznych wektorów skali i obrotu oraz względnych ścieżek `obrazy/grafika-001.png`. Rozpakowanie całego pakietu zachowuje odwołania bez wpisywania nowych ścieżek. Podgląd i CSV liczą Y od góry; DXF od lewego dolnego rogu. Nie ma generatora **DWG**: użyte biblioteki nie tworzą go offline. Nie ma obowiązkowego konwertera. **Nie wykonano testu w DraftSight 2024**; strukturę sprawdzono niezależnie w ezdxf.

## Kontrola skali i ograniczenia produkcyjne

W `przyklady/kontrola-skali-50x30-100mm.pdf` jest etykieta **50 × 30 mm** i odcinek **100 mm** z kreskami końcowymi. Ten sam plik można wygenerować w aplikacji. Strona kontrolna ma 200 × 70 mm. Zmierz geometrię granic/środek linii, nie zewnętrzny obrys grubości kreski.

Nie testowano rzeczywistego plotera, sterownika ani RIP. Przed serią produkcyjną sprawdź skalę w obu osiach, obrót, szerokość roboczą, zachowanie zerowych odstępów, grubość linii, rozpoznawanie fontów, stron i koloru czarnego. PDF używa wektorów i czerni RGB; docelowe zarządzanie kolorem, profil materiału, cięcie i PDF/X pozostają w oprogramowaniu produkcyjnym. Nie deklarujemy certyfikacji PDF/X ani konkretnego RIP.

Pozostałe granice:

- Do **20 000 etykiet**, 1000 rodzajów i 200 obiektów na szablon. Duże zlecenia z rozbudowanymi krzywymi wymagają pamięci przeglądarki; dziel je na mniejsze partie przy problemach z zasobami.
- Każdy wymiar strony do **5000 mm**, poniżej podstawowego limitu PDF 14 400 pt. Strony mają szerokość materiału i wysokość dopasowaną do zajętych półek + marginesy.
- Układ mieszanych rozmiarów to deterministyczne półki bez zaawansowanego nestingu. Automatyczny obrót jest wyłączony domyślnie. Ostatnie wiersze nie są uzupełniane pustymi etykietami.
- Przeznaczenie: polskie i łacińskie etykiety produkcyjne. Nie jest to edytor pełnej typografii z obsługą RTL i pisma złożonego. Interlinia i nowe linie są jawne, brak automatycznego łamania.
- Brak importu DWG/DXF, eksportu DWG, połączenia z DraftSight, kodów kreskowych i bezpośredniego sterowania ploterem.
- Cofanie dotyczy szablonów w bieżącej sesji. Usuwanie rodzajów i projektów wymaga potwierdzenia; nie jest częścią historii edytora.
- Start i `start.bat` przygotowano dla Windows; testy wykonano w Chromium na Linuksie. Końcowy test na docelowym Windows i urządzeniu pozostaje do wykonania.

## Programista — przygotowanie z dostępem do internetu

Wymagane Node.js 24 LTS i npm. Z istniejącego checkoutu:

```sh
npm ci
npm test
npm run build
npm start
```

Port jest stały: **4173**. `npm run dev` uruchamia Vite na tym samym porcie; nie uruchamiaj go równocześnie z serwerem produkcyjnym. Service Worker jest rejestrowany wyłącznie w buildzie produkcyjnym. Do testów offline używaj `npm run build` i `npm start`.

Testy HTTPS wymagają narzędzia OpenSSL na komputerze programisty; nie jest ono potrzebne do uruchomienia aplikacji.

Testy przeglądarkowe (w osobnym terminalu; serwer może już działać):

```sh
npx playwright install chromium
npm run test:e2e
```

Na maszynie z `/usr/bin/chromium` używany jest ten plik. W innym środowisku Playwright używa swojego zainstalowanego Chromium; można ustawić `CHROMIUM_PATH` na własny plik przeglądarki. Instalacja pakietów i przeglądarki jest etapem programistycznym i może wymagać internetu. **Żadnych tych poleceń nie wykonuje codzienny użytkownik paczki offline.**

Po buildzie, przy działającym `npm start`:

```sh
node scripts/collect-licenses.mjs
node scripts/package-release.mjs
```

Powstają ZIP z pojedynczym HTML, paczka LAN/offline, archiwum kompletnego projektu oraz `release/SHA256SUMS.txt`. Wersje zależności są przypięte przez `package-lock.json`. Build w `dist` jest dołączony do przekazania. Nie jest potrzebna osobna baza, usługa, klucz API ani logowanie do GitHub.

## Architektura

- `src/core/model.ts`: wersjonowany model, walidacja importu, fabryki projektów i szablonów. Dane zlecenia i wygląd mają osobne struktury.
- `numbering.ts`: deterministyczne przypisanie instancji i pełnych numerów przed układaniem.
- `layout.ts`: fizyczne rozmieszczenie w mm, podział stron, obrót, statystyki i suma współliniowych granic.
- `fonts.ts`, `text.ts`: lokalny rejestr fontów, zgodne z pdf-lib metryki, kontury glifów, kontrola brakujących znaków i przepełnienia po podstawieniu danych. Ten sam model geometrii obsługuje podgląd SVG, PDF i DXF.
- `export.ts`: PDF (pdf-lib + fontkit, osadzone pełne fonty), SVG do wewnętrznego renderowania, dokument kontrolny. PNG osadzone z kanałem alfa. Brak rasteryzacji arkuszy.
- `dxf.ts`, `curves.ts`, `print-package.ts`: CAD, wypełnione obrysy fontów i ZIP z odpowiadającymi arkuszami oraz PNG.
- `geometry.ts`, `png.ts`: wspólne transformacje fizyczne i walidacja obrazów.
- `storage.ts`: transakcyjny IndexedDB i pobieranie lokalnych plików.
- `src/components`, `App.tsx`: interfejs, edytor, projekty, dane zlecenia i historia szablonów.
- `scripts/build-offline.mjs`: wersjonowany Service Worker, lokalne zasoby, aktualizacja cache.
- `server.mjs`: serwer statyczny Node.js bez dodatkowych zależności, kontrola ścieżek i typów plików.

Przyszłe importery CAD powinny tworzyć obiekty modelu szablonów za osobnym adapterem; nie muszą zmieniać numeracji ani algorytmu rozmieszczania.

Wyniki faktycznie wykonanej weryfikacji znajdują się w **TESTY.md**.
