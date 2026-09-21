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
        id, invoice_number_text, invoice_year, invoice_seq, invoice_number, invoice_date, due_date, status, comment,
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

    const invoiceNo =
      invoice.invoice_number_text ||
      `${invoice.invoice_year || new Date(invoice.invoice_date).getFullYear()}-${String(invoice.invoice_seq || invoice.invoice_number || 1).padStart(3, "0")}`;

    const formatDate = (value:string | null) => {
      if (!value) return "";
      const [y,m,d] = value.split("-");
      return `${d}.${m}.${y}`;
    };

    const html = `
<!doctype html>
<html>
<body style="margin:0;padding:0;background:#f2f5f8;font-family:Arial,Helvetica,sans-serif;color:#17233a">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f2f5f8;padding:28px 12px">
    <tr>
      <td align="center">
        <table role="presentation" width="680" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:680px;background:#ffffff;border:1px solid #dde5ee;border-radius:14px;overflow:hidden">
          <tr>
            <td style="padding:28px 34px 20px 34px">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td valign="top">
                    <img src="https://annegretheark.github.io/agk-faktura/logo.png"
                         alt="AGKSERVICES KNUTSEN"
                         width="185"
                         style="display:block;width:185px;max-width:100%;height:auto;border:0">
                  </td>
                  <td valign="top" align="right" style="font-size:12px;line-height:1.55;color:#64748b">
                    AGKSERVICES KNUTSEN<br>
                    Vælerenveien 6<br>
                    3533 Tyristrand<br>
                    Org.nr. 935 136 962
                  </td>
                </tr>
              </table>

              <div style="height:1px;background:#dbe4ee;margin:24px 0 26px 0"></div>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td valign="top">
                    <div style="font-size:12px;text-transform:uppercase;letter-spacing:1.6px;color:#147df5;font-weight:bold;margin-bottom:6px">Faktura</div>
                    <div style="font-size:28px;line-height:1.15;font-weight:800;color:#102038">${invoiceNo}</div>
                  </td>
                  <td valign="top" align="right" style="font-size:13px;line-height:1.8;color:#475569">
                    <strong style="color:#102038">Fakturadato:</strong> ${formatDate(invoice.invoice_date)}<br>
                    <strong style="color:#102038">Forfallsdato:</strong> ${formatDate(invoice.due_date)}
                  </td>
                </tr>
              </table>

              <div style="margin-top:28px;padding:16px 18px;background:#f7f9fc;border-radius:10px">
                <div style="font-size:11px;text-transform:uppercase;letter-spacing:1.2px;color:#64748b;margin-bottom:7px">Faktura til</div>
                <div style="font-size:15px;font-weight:700;color:#102038">${c.name}</div>
                <div style="font-size:13px;line-height:1.55;color:#475569;margin-top:3px">
                  ${c.address || ""}<br>
                  ${c.zip || ""} ${c.city || ""}
                  ${c.org_number ? `<br>Org.nr. ${c.org_number}` : ""}
                </div>
              </div>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top:28px;border-collapse:collapse">
                <thead>
                  <tr>
                    <th align="left" style="padding:10px 8px;border-bottom:2px solid #147df5;font-size:12px;color:#334155">Beskrivelse</th>
                    <th align="right" style="padding:10px 8px;border-bottom:2px solid #147df5;font-size:12px;color:#334155">Antall</th>
                    <th align="right" style="padding:10px 8px;border-bottom:2px solid #147df5;font-size:12px;color:#334155">Pris</th>
                    <th align="right" style="padding:10px 8px;border-bottom:2px solid #147df5;font-size:12px;color:#334155">MVA</th>
                    <th align="right" style="padding:10px 8px;border-bottom:2px solid #147df5;font-size:12px;color:#334155">Sum</th>
                  </tr>
                </thead>
                <tbody>${rows}</tbody>
              </table>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top:24px">
                <tr>
                  <td style="width:46%">&nbsp;</td>
                  <td>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td style="padding:5px 0;font-size:13px;color:#64748b">Sum eks. MVA</td>
                        <td align="right" style="padding:5px 0;font-size:13px;color:#102038">${fmt(net)} kr</td>
                      </tr>
                      <tr>
                        <td style="padding:5px 0;font-size:13px;color:#64748b">MVA</td>
                        <td align="right" style="padding:5px 0;font-size:13px;color:#102038">${fmt(vat)} kr</td>
                      </tr>
                      <tr>
                        <td colspan="2"><div style="height:1px;background:#cfd8e3;margin:7px 0"></div></td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;font-size:16px;font-weight:800;color:#102038">Å betale</td>
                        <td align="right" style="padding:6px 0;font-size:18px;font-weight:800;color:#147df5">${fmt(total)} kr</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <div style="margin-top:28px;padding:16px 18px;border:1px solid #dbe4ee;border-radius:10px">
                <div style="font-size:12px;color:#64748b;margin-bottom:4px">Betalingsinformasjon</div>
                <div style="font-size:15px;font-weight:700;color:#102038">Bankkonto 6034.05.89052</div>
                <div style="font-size:12px;color:#64748b;margin-top:4px">Merk gjerne betalingen med fakturanummer ${invoiceNo}.</div>
              </div>

              ${invoice.comment ? `<div style="margin-top:22px;font-size:13px;line-height:1.6;color:#475569">${invoice.comment}</div>` : ""}

              <div style="height:1px;background:#e5ebf1;margin:28px 0 18px 0"></div>
              <div style="font-size:11px;line-height:1.6;color:#94a3b8">
                AGKSERVICES KNUTSEN · Org.nr. 935 136 962 · Vælerenveien 6, 3533 Tyristrand
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [c.email],
        subject: `Faktura ${invoiceNo} fra AGKSERVICES KNUTSEN`,
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
