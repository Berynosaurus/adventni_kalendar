// Konfigurace
const TZ = "Europe/Prague";
// ⚠️ ZMĚŇ: první den (00:00 v CZ). Např. "2025-12-01T00:00:00"
const START_ISO = "2025-12-01T00:00:00";

dayjs.extend(dayjs_plugin_utc);
dayjs.extend(dayjs_plugin_timezone);

const $msg = document.getElementById("message");
const $sub = document.getElementById("sub");
const $footer = document.getElementById("footer");

const start = dayjs.tz(START_ISO, TZ);

async function loadMessages(){
  const res = await fetch("messages.json", {cache:"no-store"});
  if(!res.ok) throw new Error("Nepodařilo se načíst messages.json");
  return res.json();
}
function pragueNow(){ return dayjs().tz(TZ); }
function dayIndexFor(now){
  const diffDays = now.startOf("day").diff(start.startOf("day"), "day");
  return diffDays + 1; // 1 = první den
}
function msToNextMidnight(now){
  const nextMidnight = now.add(1, "day").startOf("day");
  return nextMidnight.diff(now, "millisecond");
}
function formatDate(d){
  return d.format("D. MMMM YYYY HH:mm").replace(" ", "\u00A0");
}

async function render(){
  try{
    const msgs = await loadMessages();
    const total = msgs.length;
    const now = pragueNow();
    const idx = dayIndexFor(now);

    if(idx < 1){
      $sub.textContent = "Ještě to nezačalo.";
      $msg.textContent = `První zpráva se otevře ${formatDate(start)} (${TZ}).`;
      $footer.textContent = "Tip: Přidej si stránku do záložek.";
      scheduleTick(); return;
    }
    if(idx > total){
      $sub.textContent = "Hotovo 🎁";
      $msg.textContent = "Přidej další řádky do messages.json, pokud chceš pokračovat.";
      $footer.textContent = `Období: ${formatDate(start)} – ${formatDate(start.add(total-1, "day"))}`;
      scheduleTick(); return;
    }

    const todayText = String(msgs[idx-1] ?? "").trim() || "(prázdná zpráva)";
    $sub.textContent = `Den ${idx} z ${total}`;
    $msg.textContent = todayText;

    const endOfPeriod = start.add(total-1, "day");
    $footer.textContent =
      `Dnešní zpráva se odemkla ${formatDate(now.startOf("day"))}. ` +
      `Další se objeví o půlnoci. Období: ${formatDate(start)} – ${formatDate(endOfPeriod)} (${TZ}).`;

    scheduleTick();
  }catch(e){
    console.error(e);
    $msg.textContent = "Nastala chyba při načítání. Zkus obnovit stránku.";
    $sub.textContent = ""; $footer.textContent = "";
  }
}
function scheduleTick(){
  const ms = msToNextMidnight(pragueNow());
  setTimeout(render, ms + 50);
}
render();

// Náhled: přidej ?day=N do URL (jen pro tebe)
const url = new URL(location.href);
const forced = url.searchParams.get("day");
if (forced){
  const n = parseInt(forced, 10);
  if(!Number.isNaN(n)){
    (async ()=>{
      const msgs = await loadMessages();
      const total = msgs.length;
      const i = Math.max(1, Math.min(total, n));
      document.getElementById("sub").textContent = `Den ${i} z ${total} (náhled)`;
      document.getElementById("message").textContent = String(msgs[i-1]).trim();
      document.getElementById("footer").textContent = "Náhled pomocí ?day=…";
    })();
  }
}
