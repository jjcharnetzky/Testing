# Generator etykiet jako aplikacja webowa w sieci firmowej

**Jeden komputer uruchamia serwer. Pozostałe stanowiska otwierają aplikację w Edge lub Chrome, bez instalowania Node.js i bez skryptów startowych.** Internet nie jest potrzebny ani serwerowi, ani użytkownikom. Aplikacja nie korzysta z usług chmurowych.

## Uruchomienie na jednym komputerze Windows

1. Wybierz komputer pełniący rolę serwera, dostępny dla pozostałych stanowisk w firmowej sieci. Zainstaluj na nim wcześniej **Node.js 24 LTS**. Runtime jest potrzebny tylko na serwerze.
2. Rozpakuj **`Generator-etykiet-LAN.zip`**. Zachowaj cały folder `dist` oraz `server.mjs` i skrypty. Niczego nie pobieraj przez npm.
3. Uruchom **`start-serwer-lan.bat`**. Serwer nasłuchuje na interfejsach sieciowych, na stałym porcie **4173**. Okno wyświetli dostępne adresy IPv4, np. `http://192.168.1.20:4173` (to przykład; użyj adresu rzeczywiście wyświetlonego na swoim serwerze).
4. Jeśli Zapora Windows wyświetli pytanie, zezwól Node.js na dostęp w używanej sieci prywatnej lub domenowej. Administrator może zamiast tego dodać regułę TCP 4173 z dostępem z firmowej podsieci. Skrypt sam nie zmienia zapory.
5. Na drugim komputerze otwórz **wyświetlony adres** w Edge/Chrome. Dodaj go do zakładek. Dostępne są edycja, automatyczny zapis, numeracja i pobieranie PDF/SVG.
6. Okno serwera musi pozostać uruchomione, a komputer nie może przechodzić w uśpienie podczas pracy innych stanowisk. Zatrzymanie: `Ctrl+C`.

Adres `localhost` zawsze wskazuje komputer użytkownika. Na innych stanowiskach używaj adresu lub nazwy komputera-serwera. Administrator powinien nadać mu stały adres IP lub rezerwację DHCP i ewentualnie stałą nazwę DNS, np. `etykiety.firma.local`. Nie jest potrzebna publiczna domena ani publikacja w internecie.

## HTTP i praca bez internetu

Przez zwykły **HTTP w sieci LAN** aplikacja pozwala tworzyć i edytować projekty oraz eksportować PDF/SVG. Nie potrzebuje internetu, ale potrzebuje połączenia z serwerem firmowym do otwarcia strony i jej zasobów. W nagłówku wyświetla się **„Sieć lokalna · tryb online”** — chodzi o połączenie z serwerem LAN.

Przeglądarki dopuszczają Service Workera, czyli ponowne uruchamianie aplikacji po utracie również sieci lokalnej, pod **HTTPS** lub pod `localhost`. Zwykły adres `http://192.168…` nie spełnia tego warunku. Aplikacja pokazuje **„Gotowy do pracy offline”** dopiero po faktycznym zapisaniu zasobów przez Service Workera.

## HTTPS w sieci firmowej

Administrator przygotowuje certyfikat serwera wraz z łańcuchem oraz odpowiadający mu klucz prywatny w formacie PEM. Certyfikat musi być zaufany na stanowiskach, np. wydany przez firmowe CA, i zawierać nazwę DNS lub IP, pod którym użytkownicy otwierają aplikację. Przy firmowym CA jego certyfikat zaufania dystrybuuje administrator (np. przez zasady domenowe). Nie wyłączaj weryfikacji certyfikatów w przeglądarce.

Certyfikat i klucz przechowuj **poza folderem `dist`, poza repozytorium i paczką aplikacji**, z prawami dostępu tylko dla konta serwera. Przykład uruchomienia w wierszu polecenia na serwerze:

```bat
set "LABEL_TLS_CERT=C:\Certyfikaty\etykiety-fullchain.pem"
set "LABEL_TLS_KEY=C:\Certyfikaty\etykiety-key.pem"
call start-serwer-lan.bat
```

Serwer uruchomi teraz **HTTPS na porcie 4173**, np. `https://etykiety.firma.local:4173`. Używaj nazwy wskazanej w certyfikacie; samo otwarcie adresu IP nie zadziała poprawnie, jeżeli certyfikat obejmuje wyłącznie nazwę DNS. Certyfikat obejmujący tylko firmową nazwę może również nie pasować do adresu `localhost` wypisanego pomocniczo przez serwer.

Po otwarciu prawidłowego adresu poczekaj na **„Gotowy do pracy offline”**. Sprawdź zapis i eksport po odłączeniu sieci na stanowisku. Alternatywnie administrator może udostępnić folder `dist` przez istniejący firmowy serwer WWW z HTTPS lub reverse proxy (np. IIS), w głównym katalogu osobnej witryny. Node.js na stanowiskach użytkowników nadal nie jest potrzebny.

Przełączenie z HTTP na HTTPS, zmiana nazwy serwera lub portu oznacza inny adres dla pamięci przeglądarki. **Najpierw pobierz pliki projektów ze starego adresu, a potem zaimportuj je na nowym.**

## Dane użytkowników

- Serwer udostępnia aplikację i dołączone fonty. Nie przyjmuje projektów ani plików użytkowników.
- Każde stanowisko/profil przeglądarki ma własny zapis IndexedDB. Nie ma wspólnej bazy projektów, synchronizacji ani wspólnej rezerwacji numerów między użytkownikami.
- Do wymiany zlecenia używaj **Projekty → Pobierz projekt / Importuj plik**. Plik zawiera dane, szablony i użyte fonty.
- Numery w projekcie pozostają deterministyczne; jeśli kilka osób przygotowuje niezależne zlecenia, wspólne zakresy produkcyjne uzgadnia się poza aplikacją.

## Sprawdzenie po uruchomieniu w firmie

1. Na drugim komputerze otwórz adres serwera i potwierdź projekt demonstracyjny: **140 etykiet, 150 mm długości**.
2. Zmień nazwę elementu, odśwież stronę i sprawdź, że zmiana została zapisana.
3. Pobierz PDF i potwierdź rozmiar strony **1400 × 150 mm**. Pobierz plik kontrolny, wydrukuj w skali 100% i zmierz odcinek 100 mm oraz etykietę 50 × 30 mm.
4. Przy HTTPS potwierdź „Gotowy do pracy offline”, odłącz sieć na stanowisku, ponownie otwórz stronę i wyeksportuj PDF.

W tej chmurze sprawdzono rzeczywisty dostęp przez nielokalny adres IPv4 w Chromium: tworzenie, zapis, odświeżenie i PDF bez `crypto.randomUUID`. HTTPS sprawdzono z testowym certyfikatem i jawnym zaufaniem do niego, z zachowaną weryfikacją TLS. Dostępność **Twojego** serwera, reguły zapory, zaufanie certyfikatu i wydruk wymagają sprawdzenia w firmie — środowisko chmurowe nie jest połączone z Twoją siecią.
