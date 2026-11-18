// =============================================================================
// Agent ID Daily Check-in — frontend (statis, tanpa server, tanpa build step)
// =============================================================================
// KEPATUHAN RED LINE HACKATHON (Binance Agent ID Hackathon):
//  - Connect wallet standar via injected provider (window.ethereum / Binance
//    Wallet). TIDAK ADA login QR / pairing code di website ini.
//  - TIDAK ADA sesi user yang disimpan di server (bahkan tidak ada server:
//    halaman ini file statis; tidak ada localStorage/session untuk sesi).
//  - TIDAK ADA auto-transaction: check-in HANYA terjadi saat user klik tombol
//    dan konfirmasi sendiri di wallet-nya.
//  - Kontrak TIDAK PERNAH menerima/menyimpan dana user (tanpa payable).
// =============================================================================

const CHECKIN_ABI = [
  "function checkIn()",
  "function currentDay() view returns (uint256)",
  "function getStreak(address) view returns (uint256)",
  "function getLiveStreak(address) view returns (uint256)",
  "function getLastCheckIn(address) view returns (uint256)",
  "function getTotalCheckIns(address) view returns (uint256)",
  "function getUserInfo(address) view returns (uint256 streak, uint256 lastCheckInDay, uint256 totalCheckIns)",
  "function hasCheckedInToday(address) view returns (bool)",
  "function totalCheckers() view returns (uint256)",
  "event CheckIn(address indexed user, uint256 indexed day, uint256 streak, uint256 totalCheckIns)",
  "error NotAgentIDHolder()",
  "error AlreadyCheckedInToday()",
];
const AGENT_ID_ABI = ["function balanceOf(address) view returns (uint256)"];

const $ = (id) => document.getElementById(id);
const short = (a) => (a ? a.slice(0, 6) + "..." + a.slice(-4) : "-");
const dayToDate = (day) =>
  new Date(Number(day) * 86400 * 1000).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

const isDeployed =
  CONFIG.CONTRACT_ADDRESS &&
  CONFIG.CONTRACT_ADDRESS !== "0x0000000000000000000000000000000000000000";

const readProvider = new ethers.JsonRpcProvider(CONFIG.CHAIN_RPC);
const readContract = isDeployed
  ? new ethers.Contract(CONFIG.CONTRACT_ADDRESS, CHECKIN_ABI, readProvider)
  : null;
const agentIdContract = new ethers.Contract(
  CONFIG.AGENT_ID_ADDRESS,
  AGENT_ID_ABI,
  readProvider
);

let browserProvider = null; // ethers v6 BrowserProvider (hanya setelah connect)
let signer = null;
let account = null;

function setMsg(text, kind) {
  const el = $("msg");
  el.textContent = text || "";
  el.className = "msg" + (kind ? " " + kind : "");
}

// ---------------------------------------------------------------- status ----
async function refreshStatus() {
  if (!isDeployed) {
    $("stat-streak").textContent = "-";
    $("stat-total").textContent = "-";
    $("stat-last").textContent = "-";
    $("stat-agentid").textContent = "Kontrak belum di-deploy";
    $("btn-checkin").disabled = true;
    return;
  }
  try {
    const total = await readContract.totalCheckers();
    $("stat-checkers").textContent = total.toString();
  } catch (e) {
    console.warn("totalCheckers gagal:", e);
  }
  if (!account) return;
  try {
    const [bal, info, today] = await Promise.all([
      agentIdContract.balanceOf(account),
      readContract.getUserInfo(account),
      readContract.hasCheckedInToday(account),
    ]);
    const hasId = bal > 0n;
    $("stat-agentid").textContent = hasId
      ? "✅ Punya Agent ID"
      : "❌ Belum punya Agent ID";
    $("stat-agentid").className = hasId ? "ok" : "bad";
    $("stat-streak").textContent = info[0].toString();
    $("stat-total").textContent = info[2].toString();
    $("stat-last").textContent =
      info[1] === 0n ? "Belum pernah" : dayToDate(info[1]);
    const btn = $("btn-checkin");
    if (!hasId) {
      btn.disabled = true;
      btn.textContent = "Butuh Agent ID dulu";
    } else if (today) {
      btn.disabled = true;
      btn.textContent = "✅ Sudah check-in hari ini";
    } else {
      btn.disabled = false;
      btn.textContent = "Check-in hari ini";
    }
  } catch (e) {
    console.warn("refresh status gagal:", e);
    setMsg("Gagal baca status on-chain: " + (e.shortMessage || e.message), "err");
  }
}

// ------------------------------------------------------------ leaderboard ----
async function refreshLeaderboard() {
  const body = $("lb-body");
  if (!isDeployed) {
    body.innerHTML =
      '<tr><td colspan="4">Kontrak belum di-deploy — leaderboard muncul setelah deploy.</td></tr>';
    return;
  }
  body.innerHTML = '<tr><td colspan="4">Memuat event on-chain…</td></tr>';
  try {
    const from = CONFIG.DEPLOY_BLOCK > 0 ? CONFIG.DEPLOY_BLOCK : 0;
    const events = await readContract.queryFilter(
      readContract.filters.CheckIn,
      from,
      "latest"
    );
    // Agregasi: streak & total terakhir per alamat.
    const latest = new Map();
    for (const ev of events) {
      latest.set(ev.args.user, {
        streak: ev.args.streak,
        total: ev.args.totalCheckIns,
        day: ev.args.day,
      });
    }
    // Live streak per alamat (0 bila sudah bolong sehari).
    const rows = [];
    for (const [user, v] of latest.entries()) {
      let live = v.streak;
      try {
        live = await readContract.getLiveStreak(user);
      } catch (e) {
        /* pakai streak dari event bila view gagal */
      }
      rows.push({ user, streak: live, total: v.total });
    }
    rows.sort((a, b) => Number(b.streak - a.streak) || Number(b.total - a.total));
    const top = rows.slice(0, CONFIG.LEADERBOARD_TOP);
    if (top.length === 0) {
      body.innerHTML =
        '<tr><td colspan="4">Belum ada yang check-in. Jadilah yang pertama!</td></tr>';
      return;
    }
    body.innerHTML = top
      .map(
        (r, i) =>
          `<tr${r.user === account ? ' class="me"' : ""}><td>${i + 1}</td>` +
          `<td><a href="${CONFIG.BSCSCAN_ADDRESS}${r.user}" target="_blank" rel="noopener">${short(r.user)}</a>${r.user === account ? " (kamu)" : ""}</td>` +
          `<td><b>${r.streak}</b></td><td>${r.total}</td></tr>`
      )
      .join("");
    $("lb-note").textContent = `${rows.length} alamat pernah check-in • dari ${events.length} event • hari UTC ${await readContract.currentDay()}`;
  } catch (e) {
    console.warn("leaderboard gagal:", e);
    body.innerHTML =
      '<tr><td colspan="4">Gagal memuat leaderboard (RPC sibuk?). Coba tombol Muat Ulang.</td></tr>';
  }
}

// --------------------------------------------------------------- connect ----
async function connectWallet() {
  setMsg("", "");
  if (!window.ethereum) {
    setMsg(
      "Wallet tidak ketemu. Buka halaman ini dari Binance Wallet / browser yang ada wallet-nya.",
      "err"
    );
    return;
  }
  try {
    browserProvider = new ethers.BrowserProvider(window.ethereum);
    const accounts = await browserProvider.send("eth_requestAccounts", []);
    account = accounts[0];
    signer = await browserProvider.getSigner();

    // Pastikan di BNB Smart Chain (56).
    const net = await browserProvider.getNetwork();
    if (Number(net.chainId) !== CONFIG.CHAIN_ID) {
      try {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: "0x38" }],
        });
      } catch (switchErr) {
        if (switchErr.code === 4902) {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: "0x38",
                chainName: "BNB Smart Chain",
                nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 },
                rpcUrls: ["https://bsc-dataseed.binance.org/"],
                blockExplorerUrls: ["https://bscscan.com"],
              },
            ],
          });
        } else {
          throw switchErr;
        }
      }
      browserProvider = new ethers.BrowserProvider(window.ethereum);
      signer = await browserProvider.getSigner();
    }

    $("wallet-addr").textContent = short(account);
    $("btn-connect").textContent = "Terhubung";
    $("btn-connect").disabled = true;
    setMsg("Wallet terhubung: " + account, "ok");
    await refreshStatus();
    await refreshLeaderboard();

    // Bila user ganti akun / chain di wallet, refresh tampilan.
    window.ethereum.on("accountsChanged", () => window.location.reload());
    window.ethereum.on("chainChanged", () => window.location.reload());
  } catch (e) {
    if (e.code === 4001) {
      setMsg("Kamu membatalkan connect di wallet.", "err");
    } else {
      setMsg("Gagal connect: " + (e.shortMessage || e.message), "err");
    }
  }
}

// -------------------------------------------------------------- check-in ----
async function doCheckIn() {
  setMsg("", "");
  if (!account || !signer) {
    setMsg("Connect wallet dulu.", "err");
    return;
  }
  const btn = $("btn-checkin");
  btn.disabled = true;
  btn.textContent = "Menunggu konfirmasi di wallet…";
  try {
    const writeContract = new ethers.Contract(
      CONFIG.CONTRACT_ADDRESS,
      CHECKIN_ABI,
      signer
    );
    // Ini SATU-SATUNYA transaksi di app ini — dipicu klik tombol,
    // dikonfirmasi user sendiri di wallet. Tidak ada auto-tx.
    const tx = await writeContract.checkIn();
    setMsg("Transaksi dikirim: " + tx.hash + " — menunggu konfirmasi…", "ok");
    $("tx-link").innerHTML =
      `<a href="${CONFIG.BSCSCAN_TX}${tx.hash}" target="_blank" rel="noopener">Lihat di BscScan ↗</a>`;
    const receipt = await tx.wait();
    if (receipt.status === 1) {
      setMsg("✅ Check-in berhasil! Streak kamu bertambah.", "ok");
    } else {
      setMsg("Transaksi gagal di chain (status 0). Cek BscScan.", "err");
    }
    await refreshStatus();
    await refreshLeaderboard();
  } catch (e) {
    const msg = e.shortMessage || e.message || "";
    if (e.code === 4001 || /user rejected/i.test(msg)) {
      setMsg("Kamu membatalkan transaksi di wallet.", "err");
    } else if (/AlreadyCheckedInToday/i.test(msg)) {
      setMsg("Kamu sudah check-in hari ini. Balik lagi besok (UTC).", "err");
    } else if (/NotAgentIDHolder/i.test(msg)) {
      setMsg("Alamat ini tidak punya Agent ID.", "err");
    } else {
      setMsg("Check-in gagal: " + msg, "err");
    }
  } finally {
    await refreshStatus();
  }
}

// ------------------------------------------------------------------ init ----
$("btn-connect").addEventListener("click", connectWallet);
$("btn-checkin").addEventListener("click", doCheckIn);
$("btn-refresh-lb").addEventListener("click", refreshLeaderboard);

if (!isDeployed) {
  $("deploy-note").style.display = "block";
  $("contract-addr").textContent = "belum di-deploy";
} else {
  $("contract-addr").innerHTML =
    `<a href="${CONFIG.BSCSCAN_ADDRESS}${CONFIG.CONTRACT_ADDRESS}" target="_blank" rel="noopener">${short(CONFIG.CONTRACT_ADDRESS)}</a>`;
}
refreshStatus();
refreshLeaderboard();
