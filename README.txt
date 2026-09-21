AGK Faktura v5

Nyheter:
- Supabase Authentication
- Kunderegister lagres i Supabase
- Fakturaer lagres i Supabase
- Fakturalinjer lagres i Supabase
- Status: Utkast, Sendt, Betalt, Forfalt
- Automatisk fakturanummer via databasefunksjon
- Hestelogo innebygd i HTML

Før bruk:
1. Åpne Supabase SQL Editor.
2. Kjør filen supabase-v5.sql én gang.
3. Åpne index.html.
4. Logg inn med brukeren du opprettet i Supabase Authentication.

Sikkerhet:
- Frontend bruker bare Supabase publishable key.
- Tilgang til data styres av innlogging + Row Level Security.
- Ikke legg service_role/secret key i HTML.
