-- Document templates + e-signature requests.
--
-- Templates hold HTML with {{merge.fields}} (rendered by lib/merge-tags). Staff
-- generate a document from a record, which populates the fields; a signature
-- request freezes the populated HTML and is signed via a secure token link. The
-- signed copy is written to the documents bucket and linked back to the record.

create table if not exists public.document_templates (
  id uuid primary key default gen_random_uuid(),
  key text unique,               -- system templates have a stable key; user-made are null
  name text not null,
  description text,
  body_html text not null,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
drop trigger if exists document_templates_updated on public.document_templates;
create trigger document_templates_updated before update on public.document_templates
  for each row execute function public.set_updated_at();

create table if not exists public.signature_requests (
  id uuid primary key default gen_random_uuid(),
  template_id uuid references public.document_templates (id) on delete set null,
  title text not null,
  body_html text not null,        -- populated document, frozen at send time
  practice_id uuid references public.practices (id) on delete set null,
  contact_id uuid references public.contacts (id) on delete set null,
  deal_id uuid references public.deals (id) on delete set null,
  signer_name text not null,
  signer_email text not null,
  token text not null unique,
  status text not null default 'draft'
    check (status in ('draft', 'sent', 'viewed', 'signed', 'declined', 'cancelled')),
  sent_at timestamptz,
  viewed_at timestamptz,
  signed_at timestamptz,
  signature_name text,            -- typed name at signing
  signature_image text,           -- drawn signature (data URL), if used
  signer_ip text,
  signed_document_id uuid references public.documents (id) on delete set null,
  decline_reason text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists signature_requests_record_idx
  on public.signature_requests (practice_id, contact_id, deal_id);
create index if not exists signature_requests_status_idx on public.signature_requests (status, created_at);
drop trigger if exists signature_requests_updated on public.signature_requests;
create trigger signature_requests_updated before update on public.signature_requests
  for each row execute function public.set_updated_at();

-- RLS: staff read/write (Control Centre gates template edits; the public signing
-- page reads/writes a single request via the service role by token).
alter table public.document_templates enable row level security;
drop policy if exists document_templates_select on public.document_templates;
create policy document_templates_select on public.document_templates for select to authenticated using (true);
drop policy if exists document_templates_insert on public.document_templates;
create policy document_templates_insert on public.document_templates for insert to authenticated with check (true);
drop policy if exists document_templates_update on public.document_templates;
create policy document_templates_update on public.document_templates for update to authenticated using (true) with check (true);
drop policy if exists document_templates_delete on public.document_templates;
create policy document_templates_delete on public.document_templates for delete to authenticated using (true);

alter table public.signature_requests enable row level security;
drop policy if exists signature_requests_select on public.signature_requests;
create policy signature_requests_select on public.signature_requests for select to authenticated using (true);
drop policy if exists signature_requests_insert on public.signature_requests;
create policy signature_requests_insert on public.signature_requests for insert to authenticated with check (true);
drop policy if exists signature_requests_update on public.signature_requests;
create policy signature_requests_update on public.signature_requests for update to authenticated using (true) with check (true);

-- ── Seed: Letter of Authority ─────────────────────────────────────────
insert into public.document_templates (key, name, description, body_html, sort_order)
values (
  'loa',
  'Letter of Authority',
  'Seller instructs FTA to sell the practice, confirming commission fees. Signed by the seller.',
  $body$
<div style="font-family: 'Hanken Grotesk', Arial, sans-serif; max-width: 720px; margin: 0 auto; color: #1a1a1a; line-height: 1.65; font-size: 14px;">
  <h1 style="text-align: center; letter-spacing: 2px; font-size: 18px; margin: 0 0 28px;">LETTER OF AUTHORITY</h1>
  <p style="margin: 0 0 20px;">Dental Estates Section<br>Frank Taylor &amp; Associates<br>1 Bradmore Building, Bradmore Green<br>Brookmans Park<br>Hertfordshire<br>AL9 7QR</p>
  <p>Dear {{agent.name|Sir/Madam}},</p>
  <p>I instruct you herewith to undertake to sell my dental practice.</p>
  <p><strong>Address:</strong><br>{{practice.address}}</p>
  <p style="text-align: right;">{{date.today}}</p>
  <p>I confirm acceptance of the Commission Fees as shown below and agree to pay the same to Frank Taylor &amp; Associates if they introduce a purchaser who proceeds to Exchange of Contracts, or take an active part or negotiate in a sale which proceeds to Exchange of Contracts, even though Frank Taylor &amp; Associates may not have introduced the purchaser or that if my existing practice associate(s), locums, and/or business partner(s) finally purchase the practice.</p>
  <p>I shall inform Frank Taylor &amp; Associates of any variances or changes to information originally provided to Frank Taylor &amp; Associates or an interested party.</p>
  <h3 style="margin: 24px 0 8px;">Commission Fees</h3>
  <p style="margin: 0 0 8px;">Open market:</p>
  <p>{{fee.percent}}% + VAT of the total agreed sale price subject to a minimum fee of {{fee.minimum}} + VAT.</p>
  <p>The commission fees quoted above expire 3 months from the date of the issued letter and will be fixed if this Letter of Authority is signed within the 3-month period.</p>
  <p>I confirm that the commission due will be invoiced to my solicitor at exchange of contracts to be paid by my solicitor on completion.</p>
  <p>Should Frank Taylor &amp; Associates not be paid the amount due in accordance with the terms set out in this Authority within thirty days after completion date the commission payable will accrue interest at 5% per annum of the total commission fee owed in accordance with the consumer credit act of 2006.</p>
  <p>By signing this letter I am giving Frank Taylor &amp; Associates authority to discuss this transaction with any professional advisors involved within the matter.</p>
  <p>If, after accepting an offer from a suitable and willing buyer at an agreed value, I withdraw from the sale, I agree to pay a cancellation fee of 75% of the sale commission due (minimum fee of £7,000 plus VAT), based on the value agreed to cover all costs and time incurred.</p>
  <p style="margin-top: 28px;">Yours faithfully</p>
  <div style="margin-top: 36px;">{{signature}}</div>
  <p style="margin-top: 6px;">{{seller.name}} for and on behalf of {{practice.legal_name}}</p>
</div>
  $body$,
  0
)
on conflict (key) do nothing;
