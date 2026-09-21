AGK Faktura v6

Nytt:
- Automatisk kundenummer: 1, 2, 3 ...
- Fakturanummer med årstall: 2026-001, 2026-002 ...
- Nummereringen starter på 001 på nytt hvert år.
- Send faktura på e-post via Supabase Edge Function + Resend.
- E-postknappen oppdaterer status til Sendt etter vellykket sending.

OPPGRADERING

1. Kjør supabase-v6.sql i Supabase SQL Editor.

2. Legg index.html i Git-repoet i stedet for v5-versjonen.

3. Opprett Supabase Edge Function med navnet:
   send-invoice

   Innholdet ligger i:
   supabase/functions/send-invoice/index.ts

4. Sett secrets for Edge Function:
   RESEND_API_KEY = din Resend API key
   INVOICE_FROM_EMAIL = f.eks. "AGK Faktura <faktura@dittdomene.no>"

   SUPABASE_URL og SUPABASE_ANON_KEY finnes normalt automatisk i Edge Functions.

5. Deploy funksjonen send-invoice.

VIKTIG OM E-POST
- Resend-nøkkelen skal aldri legges i index.html eller GitHub.
- Avsenderadressen må være godkjent/verifisert hos Resend for normal utsending.
- Med Resends onboarding-adresse kan sending være begrenset til testmottakere.
- Denne versjonen sender fakturaen som en pen HTML-e-post. PDF ligger fortsatt under Skriv ut / PDF i programmet.


E-postlogo:
- logo.png ligger i roten av repoet.
- Edge Function send-agkfaktura bruker:
  https://annegretheark.github.io/agk-faktura/logo.png
- Etter git push må GitHub Pages ha publisert logo.png før e-postlogoen vises.


v8:
- Eget Glemt passord-knapp på innloggingssiden.
- Sender recovery med redirect til GitHub Pages.
- Fanger Supabase PASSWORD_RECOVERY.
- Viser skjema for nytt passord.
- Oppdaterer passord via supabase.auth.updateUser().


v9:
- Retter recovery-lenker som kommer tilbake med #access_token.
- Leser access_token, refresh_token og type=recovery direkte fra URL.
- Kaller supabase.auth.setSession() eksplisitt.
- Viser deretter Sett nytt passord-skjemaet.


v10:
- Retter Supabase Project URL til:
  https://gokzsexvzvmuigqtmcdn.supabase.co
- Beholder password recovery-fiksen fra v9.


v11:
- Ny profesjonell e-postlayout for faktura.
- Mindre logo.
- Fjerner dobbelt firmanavn.
- Fakturanummer vises som 2026-001 med fallback fra år/løpenummer.
- Hvit fakturaflate som fungerer bedre i dark mode.
- Ryddigere kunde-, dato-, betalings- og totalsoner.
