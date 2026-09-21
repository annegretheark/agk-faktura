-- AGK Faktura v6
-- Automatisk kundenummer + fakturanummer med årstall

alter table public.customers
  add column if not exists customer_number integer;

-- Gi eksisterende kunder kundenummer dersom noen finnes.
with numbered as (
  select id, row_number() over (partition by user_id order by created_at, id) as rn
  from public.customers
  where customer_number is null
)
update public.customers c
set customer_number = numbered.rn
from numbered
where c.id = numbered.id;

create unique index if not exists customers_user_customer_number_uidx
  on public.customers(user_id, customer_number);

create or replace function public.next_customer_number()
returns integer
language sql
security invoker
set search_path = public
as $$
  select coalesce(max(customer_number), 0) + 1
  from public.customers
  where user_id = auth.uid();
$$;

revoke all on function public.next_customer_number() from public;
grant execute on function public.next_customer_number() to authenticated;


alter table public.invoices
  add column if not exists invoice_year integer,
  add column if not exists invoice_seq integer,
  add column if not exists invoice_number_text text;

-- Flytt eksisterende fakturaer over til år + løpenummer.
update public.invoices
set
  invoice_year = coalesce(invoice_year, extract(year from invoice_date)::integer),
  invoice_seq = coalesce(invoice_seq, invoice_number),
  invoice_number_text = coalesce(
    invoice_number_text,
    extract(year from invoice_date)::integer::text || '-' ||
    lpad(invoice_number::text, 3, '0')
  )
where invoice_year is null
   or invoice_seq is null
   or invoice_number_text is null;

-- Den gamle unike regelen hindrer at 001 kan brukes på nytt neste år.
alter table public.invoices
  drop constraint if exists invoices_user_id_invoice_number_key;

create unique index if not exists invoices_user_year_seq_uidx
  on public.invoices(user_id, invoice_year, invoice_seq);

create unique index if not exists invoices_user_number_text_uidx
  on public.invoices(user_id, invoice_number_text);

create or replace function public.next_invoice_sequence(p_year integer)
returns integer
language sql
security invoker
set search_path = public
as $$
  select coalesce(max(invoice_seq), 0) + 1
  from public.invoices
  where user_id = auth.uid()
    and invoice_year = p_year;
$$;

revoke all on function public.next_invoice_sequence(integer) from public;
grant execute on function public.next_invoice_sequence(integer) to authenticated;
