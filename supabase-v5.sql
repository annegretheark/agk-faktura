-- AGK Faktura v5 - kjør denne én gang i Supabase SQL Editor

create or replace function public.next_invoice_number()
returns integer
language sql
security invoker
set search_path = public
as $$
  select coalesce(max(invoice_number), 0) + 1
  from public.invoices
  where user_id = auth.uid();
$$;

revoke all on function public.next_invoice_number() from public;
grant execute on function public.next_invoice_number() to authenticated;
