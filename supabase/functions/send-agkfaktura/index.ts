import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Mangler innlogging.");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const resendKey = Deno.env.get("RESEND_API_KEY");
    const fromEmail = Deno.env.get("INVOICE_FROM_EMAIL") || "AGK Faktura <onboarding@resend.dev>";

    if (!resendKey) throw new Error("RESEND_API_KEY er ikke satt.");

    const supabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error("Ugyldig innlogging.");

    const { invoice_id } = await req.json();
    if (!invoice_id) throw new Error("Mangler invoice_id.");

    const { data: invoice, error } = await supabase
      .from("invoices")
      .select(`
        id, invoice_number_text, invoice_date, due_date, status, comment,
        customers(name,address,zip,city,org_number,email),
        invoice_lines(description,quantity,unit_price,vat_rate)
      `)
      .eq("id", invoice_id)
      .single();

    if (error || !invoice) throw new Error(error?.message || "Fant ikke faktura.");
    if (!invoice.customers?.email) throw new Error("Kunden mangler e-postadresse.");

    const fmt = (n:number) =>
      new Intl.NumberFormat("nb-NO", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

    let net = 0;
    let vat = 0;
    const rows = (invoice.invoice_lines || []).map((l:any) => {
      const lineNet = Number(l.quantity) * Number(l.unit_price);
      const lineVat = lineNet * Number(l.vat_rate) / 100;
      net += lineNet;
      vat += lineVat;
      return `<tr>
        <td style="padding:8px;border-bottom:1px solid #ddd">${l.description}</td>
        <td style="padding:8px;border-bottom:1px solid #ddd;text-align:right">${l.quantity}</td>
        <td style="padding:8px;border-bottom:1px solid #ddd;text-align:right">${fmt(l.unit_price)}</td>
        <td style="padding:8px;border-bottom:1px solid #ddd;text-align:right">${l.vat_rate}%</td>
        <td style="padding:8px;border-bottom:1px solid #ddd;text-align:right">${fmt(lineNet)}</td>
      </tr>`;
    }).join("");

    const total = net + vat;
    const c:any = invoice.customers;

    const html = `
      <div style="font-family:Arial,sans-serif;color:#102038;max-width:760px;margin:auto"><div style="margin-bottom:24px"><img src="https://annegretheark.github.io/agk-faktura/logo.png" alt="AGKSERVICES KNUTSEN" style="display:block;max-width:320px;width:100%;height:auto;border:0"></div>
        <h1 style="color:#147df5">AGKSERVICES KNUTSEN</h1>
        <p>Vælerenveien 6, 3533 Tyristrand<br>
        Org.nr. 935 136 962<br>
        Bankkonto 6034.05.89052</p>

        <h2>Faktura ${invoice.invoice_number_text}</h2>
        <p><strong>${c.name}</strong><br>
        ${c.address || ""}<br>
        ${c.zip || ""} ${c.city || ""}</p>

        <p>Fakturadato: ${invoice.invoice_date}<br>
        Forfallsdato: ${invoice.due_date || ""}</p>

        <table style="border-collapse:collapse;width:100%">
          <thead>
            <tr>
              <th style="padding:8px;text-align:left;border-bottom:2px solid #147df5">Beskrivelse</th>
              <th style="padding:8px;text-align:right;border-bottom:2px solid #147df5">Antall</th>
              <th style="padding:8px;text-align:right;border-bottom:2px solid #147df5">Pris</th>
              <th style="padding:8px;text-align:right;border-bottom:2px solid #147df5">MVA</th>
              <th style="padding:8px;text-align:right;border-bottom:2px solid #147df5">Sum</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>

        <div style="margin-left:auto;width:300px;margin-top:20px">
          <p>Sum eks. MVA: <strong>${fmt(net)} kr</strong></p>
          <p>MVA: <strong>${fmt(vat)} kr</strong></p>
          <p style="font-size:18px">Å betale: <strong>${fmt(total)} kr</strong></p>
        </div>

        <p><strong>Betales til konto 6034.05.89052</strong></p>
        <p>${invoice.comment || "Takk for oppdraget!"}</p>
      </div>`;

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [c.email],
        subject: `Faktura ${invoice.invoice_number_text} fra AGKSERVICES KNUTSEN`,
        html,
      }),
    });

    const result = await resendResponse.json();
    if (!resendResponse.ok) {
      throw new Error(result?.message || "Resend avviste e-posten.");
    }

    return new Response(JSON.stringify({ ok: true, id: result.id }), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 400,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }
});
