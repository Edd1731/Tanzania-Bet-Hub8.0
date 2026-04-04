import { useState } from "react";
import { useCreateDeposit, useGetMyDeposits, getGetMyDepositsQueryKey, getGetMeQueryKey } from "@workspace/api-client-react";
import { useTranslation } from "@/hooks/use-translation";
import { useQueryClient } from "@tanstack/react-query";

const GOLD = "#FDD017";
const NAVY = "#0d1f3c";
const LIPA_NUMBER = "148738859";

// ─── Parse Tanzania mobile money SMS ─────────────────────────────
// Handles M-Pesa, TigoPesa, HaloPesa, Airtel Tanzania confirmation SMS formats
function parseSms(sms: string): { amount: number | null; txId: string | null; method: string } {
  const text = sms.trim();

  // Detect method
  let method = "mpesa";
  if (/tigo/i.test(text))   method = "tigopesa";
  if (/halo/i.test(text))   method = "halopesa";
  if (/airtel/i.test(text)) method = "airtel";

  // Extract amount — handles: TSH 5,000 / TZS 5000 / Sh 5,000 / 5000 TZS
  let amount: number | null = null;
  const amtMatch =
    text.match(/(?:TSH|TZS|Sh)[.\s]*([0-9][0-9,\.]*)/i) ||
    text.match(/([0-9][0-9,\.]+)\s*(?:TSH|TZS)/i) ||
    text.match(/sent\s+([0-9][0-9,\.]+)/i);
  if (amtMatch) {
    amount = parseFloat(amtMatch[1].replace(/,/g, ""));
  }

  // Extract transaction ID — various Tanzania carrier formats
  // M-Pesa: RO18xxx, MP12xxx, SL12xxx, HXY12xxx (capital letters + digits)
  // Tigo: T + digits, or SAxxxx
  // Airtel: A + digits, Ref: XXXXXXX
  // Halo: H + digits
  let txId: string | null = null;
  const txMatch =
    text.match(/Transaction\s+ID[:\s]+([A-Z0-9]+)/i) ||
    text.match(/Ref(?:erence)?[:\s#]+([A-Z0-9]+)/i) ||
    text.match(/ID[:\s]+([A-Z0-9]{6,})/i) ||
    text.match(/\b([A-Z]{1,3}[0-9]{7,12})\b/) ||
    text.match(/\b([A-Z][0-9]{7,})\b/);
  if (txMatch) txId = txMatch[1].toUpperCase();

  return { amount, txId, method };
}

function detectMethodFromSms(sms: string): string {
  const t = sms.toLowerCase();
  if (t.includes("tigo"))   return "tigopesa";
  if (t.includes("halo"))   return "halopesa";
  if (t.includes("airtel")) return "airtel";
  return "mpesa";
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, { bg: string; text: string; label: string }> = {
    pending:  { bg: "rgba(253,208,23,0.12)", text: "#FDD017",  label: "Pending" },
    approved: { bg: "rgba(27,138,60,0.15)",  text: "#4ade80",  label: "Approved" },
    rejected: { bg: "rgba(239,68,68,0.12)",  text: "#f87171",  label: "Rejected" },
  };
  const c = colors[status] ?? { bg: "rgba(255,255,255,0.08)", text: "rgba(255,255,255,0.4)", label: status };
  return (
    <span className="text-[10px] font-black px-2 py-0.5 rounded-full uppercase" style={{ background: c.bg, color: c.text }}>
      {c.label}
    </span>
  );
}

const METHOD_ICONS: Record<string, { label: string; icon: string; color: string }> = {
  mpesa:    { label: "M-Pesa",       icon: "📱", color: "#00A651" },
  tigopesa: { label: "Tigo Pesa",    icon: "📲", color: "#009BDE" },
  halopesa: { label: "HaloPesa",     icon: "💳", color: "#F7941D" },
  airtel:   { label: "Airtel Money", icon: "📡", color: "#ED1C24" },
};

export default function DepositPage() {
  const { t, lang } = useTranslation();
  const qc = useQueryClient();

  const createDeposit = useCreateDeposit();
  const { data: deposits, isLoading } = useGetMyDeposits({ query: { queryKey: getGetMyDepositsQueryKey() } });

  const [sms, setSms]         = useState("");
  const [phone, setPhone]     = useState("");
  const [parsed, setParsed]   = useState<{ amount: number | null; txId: string | null; method: string } | null>(null);
  const [copyDone, setCopyDone] = useState(false);
  const [msg, setMsg]         = useState<{ ok: boolean; text: string; auto?: boolean } | null>(null);
  const isSw = lang === "sw";

  const handleSmsChange = (val: string) => {
    setSms(val);
    setMsg(null);
    if (val.trim().length > 10) {
      setParsed(parseSms(val));
    } else {
      setParsed(null);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(LIPA_NUMBER).then(() => {
      setCopyDone(true);
      setTimeout(() => setCopyDone(false), 2000);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);

    if (!parsed?.txId)    { setMsg({ ok: false, text: isSw ? "Hakuna nambari ya muamala iliyopatikana kwenye ujumbe." : "No transaction ID found in your SMS. Paste the full confirmation message." }); return; }
    if (!parsed?.amount)  { setMsg({ ok: false, text: isSw ? "Kiasi hakikupatikana kwenye ujumbe." : "Amount not detected. Make sure you paste the full payment SMS." }); return; }
    if (parsed.amount < 500) { setMsg({ ok: false, text: isSw ? "Kiasi cha chini ni TZS 500." : "Minimum deposit is TZS 500." }); return; }
    if (!phone.trim() || phone.trim().replace(/\s/g, "").length < 9) {
      setMsg({ ok: false, text: isSw ? "Weka nambari yako ya simu." : "Enter your mobile phone number." });
      return;
    }

    try {
      const result = await createDeposit.mutateAsync({
        data: {
          amount: parsed.amount,
          txId: parsed.txId,
          method: parsed.method,
        },
      });
      qc.invalidateQueries({ queryKey: getGetMyDepositsQueryKey() });
      qc.invalidateQueries({ queryKey: getGetMeQueryKey() });

      const isAutoApproved = (result as any).status === "approved";
      setMsg({
        ok: true,
        auto: isAutoApproved,
        text: isAutoApproved
          ? (isSw
              ? `✓ Malipo ya TZS ${parsed.amount.toLocaleString()} yamethibitishwa! Akaunti yako imejazwa.`
              : `✓ TZS ${parsed.amount.toLocaleString()} verified and credited to your account instantly!`)
          : (isSw
              ? `✓ Ombi la TZS ${parsed.amount.toLocaleString()} limewasilishwa. Linasubiri idhini.`
              : `✓ Deposit of TZS ${parsed.amount.toLocaleString()} submitted. Pending admin review.`),
      });
      setSms(""); setPhone(""); setParsed(null);
    } catch (err: any) {
      const errMsg = err?.data?.message ?? err?.message ?? "Error";
      setMsg({ ok: false, text: errMsg });
    }
  };

  const steps = isSw ? [
    { num: "1", text: "Fungua M-Pesa, TigoPesa, HaloPesa au Airtel Money yako" },
    { num: "2", text: 'Chagua "Lipa" au "Tuma Pesa"' },
    { num: "3", text: <>Lipa kwa namba hii ya Lipa: <span style={{ color: GOLD }} className="font-black">{LIPA_NUMBER}</span></> },
    { num: "4", text: "Weka kiasi unachotaka kuweka" },
    { num: "5", text: "Thibitisha kwa PIN yako" },
  ] : [
    { num: "1", text: "Open M-Pesa, TigoPesa, HaloPesa or Airtel Money" },
    { num: "2", text: 'Select "Lipa" / "Send Money"' },
    { num: "3", text: <>Pay to Lipa number: <span style={{ color: GOLD }} className="font-black">{LIPA_NUMBER}</span></> },
    { num: "4", text: "Enter the amount you want to deposit" },
    { num: "5", text: "Confirm with your PIN" },
  ];

  return (
    <div className="max-w-lg mx-auto px-0 pt-0 pb-8" style={{ background: "#0a1628", minHeight: "100vh" }}>

      {/* ── How to deposit card ── */}
      <div className="mx-3 mt-4 rounded-2xl overflow-hidden mb-4" style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.08)" }}>
        {/* Header */}
        <div className="px-4 py-3" style={{ background: "rgba(253,208,23,0.08)", borderBottom: "1px solid rgba(253,208,23,0.12)" }}>
          <div className="flex items-center gap-2">
            <span className="text-base">📋</span>
            <span className="text-sm font-black uppercase tracking-wider" style={{ color: GOLD }}>
              {isSw ? "JINSI YA KUWEKA PESA" : "HOW TO DEPOSIT"}
            </span>
          </div>
        </div>

        {/* Steps */}
        <div className="px-4 pt-4 pb-3 space-y-2.5">
          {steps.map(s => (
            <div key={s.num} className="flex items-start gap-3">
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[10px] font-black text-black mt-0.5"
                style={{ background: GOLD }}
              >
                {s.num}
              </div>
              <p className="text-sm text-white/80 leading-snug">{s.text}</p>
            </div>
          ))}
        </div>

        {/* Lipa number display */}
        <div className="mx-4 mb-4 rounded-xl py-4 px-4 text-center"
          style={{ background: NAVY, border: `1px solid rgba(253,208,23,0.2)` }}>
          <div className="text-[11px] text-white/40 mb-1 uppercase tracking-widest">
            {isSw ? "Namba ya Lipa" : "Lipa Number"}
          </div>
          <div
            className="text-4xl font-black tracking-widest cursor-pointer select-all mb-1"
            style={{ color: GOLD }}
            onClick={handleCopy}
          >
            {LIPA_NUMBER}
          </div>
          <div className="text-[10px] text-white/30 mb-3">
            {isSw ? "Inakubali M-Pesa, Tigo, Airtel, Halo" : "Accepts M-Pesa, Tigo, Airtel, Halo"}
          </div>
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-black transition-all"
            style={{
              background: copyDone ? "rgba(74,222,128,0.15)" : "rgba(253,208,23,0.12)",
              color: copyDone ? "#4ade80" : GOLD,
              border: `1px solid ${copyDone ? "rgba(74,222,128,0.3)" : "rgba(253,208,23,0.25)"}`,
            }}
          >
            {copyDone
              ? <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg> Copied!</>
              : <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg> {isSw ? "Nakili" : "Copy Number"}</>
            }
          </button>
        </div>
      </div>

      {/* ── Paste SMS card ── */}
      <form onSubmit={handleSubmit} className="mx-3 space-y-4">
        <div className="rounded-2xl overflow-hidden" style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.08)" }}>
          <div className="px-4 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="flex items-center gap-2">
              <span className="text-base">📨</span>
              <div>
                <div className="text-sm font-black text-white">
                  {isSw ? "Bandika ujumbe wa malipo hapa chini:" : "Paste your payment SMS below:"}
                </div>
                <div className="text-[10px] text-white/35 mt-0.5">
                  {isSw
                    ? "Baada ya kulipa, bandika ujumbe uliopokea — tutajaza fomu kiotomatiki"
                    : "After paying, paste the SMS you received — we'll auto-fill the form"}
                </div>
              </div>
            </div>
          </div>

          <div className="px-4 pt-3 pb-4">
            <textarea
              value={sms}
              onChange={e => handleSmsChange(e.target.value)}
              rows={3}
              placeholder={
                isSw
                  ? "Mfano: Confirmed. TSH 5,000 sent to 148738859...\nTransaction ID: MP12345678"
                  : "Example: Confirmed. TSH 5,000 sent to 148738859...\nTransaction ID: MP12345678"
              }
              className="w-full px-3 py-3 rounded-xl text-sm text-white placeholder-white/20 outline-none resize-none leading-relaxed"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
            />

            {/* Auto-parsed preview */}
            {parsed && (parsed.amount || parsed.txId) && (
              <div
                className="mt-2 px-3 py-2.5 rounded-xl flex items-center gap-3"
                style={{ background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.2)" }}
              >
                <svg className="shrink-0" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <div className="text-[11px] text-white/60 flex flex-wrap gap-x-4 gap-y-0.5">
                  {parsed.amount && (
                    <span>Amount: <strong className="text-white">TZS {parsed.amount.toLocaleString()}</strong></span>
                  )}
                  {parsed.txId && (
                    <span>Ref: <strong className="text-white">{parsed.txId}</strong></span>
                  )}
                  <span>Via: <strong style={{ color: METHOD_ICONS[parsed.method]?.color }}>
                    {METHOD_ICONS[parsed.method]?.label}
                  </strong></span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Phone number ── */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background: "#111827",
            border: `1px solid ${parsed?.txId ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.04)"}`,
            opacity: parsed?.txId ? 1 : 0.55,
            transition: "opacity 0.2s",
          }}
        >
          <div className="px-4 pt-3 pb-4">
            <div className="text-[10px] font-black tracking-widest mb-2 flex items-center gap-2"
              style={{ color: parsed?.txId ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.25)" }}>
              {isSw ? "NAMBARI YAKO YA SIMU" : "YOUR MOBILE NUMBER"}
            </div>
            {!parsed?.txId && (
              <div className="flex items-center gap-1.5 mb-2">
                <span className="text-xs">⚠️</span>
                <span className="text-[10px]" style={{ color: GOLD }}>
                  {isSw
                    ? "Bandika ujumbe wa malipo kwanza ili kufungua sehemu hii"
                    : "Paste your payment SMS above first to unlock this field"}
                </span>
              </div>
            )}
            <div className="flex gap-2">
              <div
                className="px-3 py-3 rounded-xl text-sm font-bold text-white/50 shrink-0"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
              >
                +255
              </div>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder={isSw ? "7XX XXX XXX" : "7XX XXX XXX"}
                disabled={!parsed?.txId}
                className="flex-1 px-3 py-3 rounded-xl text-sm text-white outline-none placeholder-white/20"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  cursor: parsed?.txId ? "text" : "not-allowed",
                }}
              />
            </div>
          </div>
        </div>

        {/* ── Feedback ── */}
        {msg && (
          <div
            className="px-4 py-3 rounded-xl text-sm font-semibold flex items-start gap-2.5 leading-relaxed"
            style={{
              background: msg.ok ? (msg.auto ? "rgba(27,138,60,0.2)" : "rgba(253,208,23,0.08)") : "rgba(239,68,68,0.12)",
              border: `1px solid ${msg.ok ? (msg.auto ? "rgba(74,222,128,0.4)" : "rgba(253,208,23,0.25)") : "rgba(239,68,68,0.3)"}`,
              color: msg.ok ? (msg.auto ? "#4ade80" : GOLD) : "#f87171",
            }}
          >
            {msg.ok
              ? <svg className="shrink-0 mt-0.5" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
              : <svg className="shrink-0 mt-0.5" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
            }
            {msg.text}
          </div>
        )}

        {/* ── Submit button ── */}
        <button
          type="submit"
          disabled={createDeposit.isPending || !parsed?.txId}
          className="w-full py-4 rounded-xl font-black text-base uppercase tracking-wide transition-all"
          style={{
            background: parsed?.txId ? "#4CAF50" : "rgba(255,255,255,0.1)",
            color: parsed?.txId ? "#fff" : "rgba(255,255,255,0.3)",
            opacity: createDeposit.isPending ? 0.7 : 1,
            cursor: !parsed?.txId ? "not-allowed" : "pointer",
            letterSpacing: "0.05em",
          }}
        >
          {createDeposit.isPending
            ? (isSw ? "Inathibitisha..." : "Verifying...")
            : `${isSw ? "WEKA" : "DEPOSIT"} TSH ${parsed?.amount ? parsed.amount.toLocaleString() : "0"}`}
        </button>
      </form>

      {/* ── History ── */}
      {(deposits && deposits.length > 0) && (
        <div className="mx-3 mt-8">
          <div className="text-[11px] font-black text-white/40 uppercase tracking-widest mb-3">
            {isSw ? "Historia ya Malipo" : "Transaction History"}
          </div>
          <div className="space-y-2">
            {[...deposits].reverse().slice(0, 10).map(tx => {
              const m = METHOD_ICONS[tx.method] ?? { label: tx.method, icon: "💰", color: GOLD };
              return (
                <div key={tx.id}
                  className="rounded-xl px-4 py-3 flex items-center justify-between gap-4"
                  style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.06)" }}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{m.icon}</span>
                    <div>
                      <div className="font-black text-white text-sm">TZS {Number(tx.amount).toLocaleString()}</div>
                      <div className="text-[10px] text-white/30">{m.label} · {tx.txId}</div>
                      <div className="text-[9px] text-white/20">
                        {tx.createdAt ? new Date(tx.createdAt).toLocaleString() : ""}
                      </div>
                    </div>
                  </div>
                  <StatusBadge status={tx.status} />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
