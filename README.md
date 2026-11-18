# Agent ID Daily Check-in

dApp check-in harian khusus pemegang **Agent ID** (`.ai`) di BNB Chain — dibangun
untuk **Binance Agent ID Hackathon** (submit 18 Nov – 9 Des 2026, total hadiah 60.000 USDC).

- Check-in 1x per hari (hari UTC), streak beruntun tersimpan on-chain.
- Leaderboard dari event on-chain — tanpa server, tanpa database.
- Gate: `balanceOf(msg.sender) > 0` di kontrak SPACE ID Agent ID
  `0x60b9262456de011f7d15a54cdd8c48baaa8b022f` (ERC-721 non-transferable).

## Struktur

```
checkin/
├── src/AgentCheckIn.sol      # kontrak utama (tanpa owner, tanpa dana)
├── test/
│   ├── AgentCheckIn.t.sol    # 12 tes Foundry — semua lolos
│   └── MockAgentID.sol       # mock Agent ID buat tes lokal
├── script/
│   ├── Deploy.s.sol          # deploy ke BSC (butuh DEPLOYER_PRIVATE_KEY)
│   └── DeployLocal.s.sol     # deploy lokal ke Anvil (mock) — LOCAL ONLY
├── frontend/
│   ├── index.html            # halaman statis
│   ├── config.js             # ISI CONTRACT_ADDRESS + DEPLOY_BLOCK setelah deploy
│   └── app.js                # connect wallet + check-in + leaderboard (ethers v6)
└── README.md
```

## Tes lokal

```bash
cd ~/workspace/agent-hackathon/checkin
forge test            # 12 tes — wajib 12/12 lolos sebelum deploy
forge test -vv        # verbose
```

Yang dites: check-in pertama (streak 1), 2 hari beruntun (streak 2), streak 5 hari,
reset streak bila bolong sehari, double check-in sehari revert, non-holder revert,
holder yang kehilangan Agent ID revert, multi-user + `totalCheckers`, live streak
jadi 0 bila bolong, check-in tepat di batas tengah malam UTC, constructor revert
bila alamat nol, kontrak menolak kiriman BNB.

**Hasil terakhir (18 Nov 2026): 12/12 PASS.**

Smoke test deploy lokal (Anvil):

```bash
anvil --port 8545 &
forge script script/DeployLocal.s.sol:DeployLocal --rpc-url http://127.0.0.1:8545 --broadcast
# lalu, dengan alamat kontrak hasil output:
cast send <ALAMAT> "checkIn()" --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 --rpc-url http://127.0.0.1:8545
cast call <ALAMAT> "getStreak(address)(uint256)" 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 --rpc-url http://127.0.0.1:8545
# (key di atas adalah key test Anvil bawaan Foundry — BUKAN key user, hanya lokal)
```

## Deploy ke BSC mainnet

> ⚠️ **Butuh approval user** — deploy bayar gas BNB dari wallet deployer.
> Jangan deploy sebelum user bilang "Gas" atas preview (alamat + estimasi gas).

```bash
export DEPLOYER_PRIVATE_KEY=0x...   # JANGAN di-commit, JANGAN taruh di file
export BSC_RPC_URL=https://bsc-dataseed1.defibit.io
export BSCSCAN_API_KEY=...          # dari akun BscScan (gratis)

forge script script/Deploy.s.sol:Deploy \
  --rpc-url $BSC_RPC_URL --broadcast --verify \
  --etherscan-api-key $BSCSCAN_API_KEY
```

Catat dari output: **alamat kontrak** + **nomor blok deploy**, lalu isi di
`frontend/config.js` (`CONTRACT_ADDRESS` dan `DEPLOY_BLOCK`).

Verifikasi manual (tanpa deploy ulang):

```bash
forge verify-contract <ALAMAT_KONTRAK> src/AgentCheckIn.sol:AgentCheckIn \
  --chain-id 56 --etherscan-api-key $BSCSCAN_API_KEY \
  --constructor-args $(cast abi-encode "constructor(address)" 0x60b9262456de011f7d15a54cdd8c48baaa8b022f)
```

## Frontend

File statis — tidak butuh build, tidak butuh server. Hosting termurah: GitHub Pages /
Vercel / IPFS, atau buka `frontend/index.html` langsung (butuh akses internet buat
CDN ethers + RPC BSC).

```bash
# tes lokal cepat (opsional)
cd frontend && python3 -m http.server 8000
# buka http://localhost:8000
```

Sebelum deploy kontrak, halaman jalan dalam mode "belum di-deploy" (banner kuning,
tombol check-in nonaktif). Setelah `config.js` diisi, semua fitur aktif.

## Cara user berinteraksi (4 wallet)

Keempat wallet user sudah terverifikasi pegang Agent ID (`balanceOf = 1` semua,
dicek on-chain 18 Nov 2026):

| Akun | Alamat | Agent ID |
| --- | --- | --- |
| tmzincc (tmz) | `0xfea097F1dB5f4eee91b79c49FaaE6D0D07107099` | ✅ 1 |
| yanznosmoke (Ade) | `0xc78A679E0a08231630293266ed112d5000232fDf` | ✅ 1 |
| yadisembako (yadi) | `0x328d689c20961A050934E2E09D4313b424c255B6` | ✅ 1 |
| zalcopbusi (zalc) | `0xa918cC593ea184c12D821551003a781a1d05f435` | ✅ 1 |

Cara check-in: buka halaman → Connect Wallet (Binance Wallet / injected provider)
→ pastikan chain BNB Smart Chain → klik **Check-in hari ini** → konfirmasi di
wallet. Gas per check-in kecil (satu SSTORE + event; estimasi kasar < 0,001 BNB —
cek estimasi gas di wallet sebelum konfirmasi). Masing-masing dari 4 wallet bisa
check-in 1x/hari dan membangun streak sendiri.

## Cara submit ke hackathon

Sumber: pengumuman resmi Binance —
https://www.binance.com/en/support/announcement/detail/95f5dbe0ea674a48a739b59e046648bf

1. Deploy + verifikasi kontrak (di atas), isi `frontend/config.js`, hosting frontend.
2. Submit selama periode **18 Nov – 9 Des 2026 08:00 UTC**: nama proyek, website,
   alamat kontrak, dan deskripsi penggunaan Agent ID. Tanpa registrasi terpisah.
3. Selama periode submit, ajak pemegang Agent ID berinteraksi dengan kontrak.
   Review internal 9–17 Des, review publik 17–20 Des, hadiah dibayar ≤ 14 hari
   kerja setelah pengumuman.

Kategori hadiah (total 60.000 USDC):
- **Project Awards** (29.000 USDC, top 10; juara 1 = 10.000): skor dari jumlah
  alamat Agent ID yang berinteraksi + volume/jumlah tx.
- **Innovation Award** (29.000 USDC, top 10; juri, 100 poin): kedalaman integrasi
  Agent ID (30%), kepraktisan (25%), kelengkapan produk (25%), inovasi (20%).
  Syarat: produk live + **minimal 30 alamat Agent ID berinteraksi** selama
  periode submit.
- **Community Promotion** (2.000 USDC): 20 pemenang @ 100 USDC lewat post X
  dengan `#BinanceWalletHackathon` + `#AgenticWallet`.

## Keamanan & kepatuhan red line

- **Tanpa owner/admin/pause/blacklist/upgrade.** Kontrak immutable setelah deploy.
- **Tanpa payable/receive:** kontrak tidak bisa menerima BNB/token — tidak ada
  dana yang bisa di-drain, tidak ada fungsi withdraw.
- **Satu-satunya panggilan eksternal** adalah `balanceOf` (read-only) ke kontrak
  Agent ID. Bila panggilan itu revert, `checkIn` ikut revert (fail-closed).
- **Frontend:** connect standar via injected provider. **TIDAK ADA** login QR /
  pairing code di website, **TIDAK ADA** sesi user disimpan (tidak ada server,
  tidak ada localStorage sesi), **TIDAK ADA** auto-transaction — setiap check-in
  dikonfirmasi user sendiri di wallet. Tidak ada janji return/pasif income.
- Kontrak open-source + terverifikasi di BscScan (wajib hackathon).

## Risiko & kelemahan (jujur)

1. **Syarat 30 alamat buat Innovation Award adalah tantangan terbesar.**
   User cuma punya 4 alamat Agent ID — butuh promosi (mis. channel AIRDROP BIT)
   supaya 30+ holder lain check-in selama 18 Nov–9 Des. Tanpa itu, peluang
   Innovation Award kecil; Project Awards juga butuh volume interaksi.
2. **Hari = UTC, bukan WIB.** Check-in "hari ini" reset jam 07:00 WIB. User yang
   biasa jam WIB bisa salah kira sudah ganti hari. Frontend menampilkan
   tanggal UTC terakhir check-in.
3. **Streak tersimpan vs live.** `getStreak` menampilkan streak saat check-in
   terakhir; bila user bolong, nilainya basi sampai check-in berikut. Leaderboard
   memakai `getLiveStreak` (0 bila sudah bolong) — tapi itu satu call per alamat,
   jadi leaderboard lambat bila pesertanya sudah ratusan.
4. **Leaderboard dari event.** Query `queryFilter` dari `DEPLOY_BLOCK` — makin
   lama makin banyak event. Buat skala besar butuh indexer/subgraph; untuk
   hackathon (3 minggu) masih aman.
5. **Ketergantungan kontrak Agent ID.** Bila `balanceOf` di kontrak SPACE ID
   berubah perilaku (sangat kecil kemungkinannya — kontrak ERC-721 immutable),
   `checkIn` akan revert. Tidak ada jalan darurat karena memang tidak ada owner.
6. **Sybil.** Satu Agent ID per alamat (aturan Binance: 1 Agent ID per user),
   tapi satu orang bisa punya beberapa wallet — hackathon menghitung alamat,
   bukan orang. Ini sesuai aturan lomba.
7. **Lint warning (diketahui, disengaja).** `forge build` memberi warning
   `incorrect-strict-equality` di `balanceOf(msg.sender) == 0` — itu memang cek
   yang dimaksud (bukan bug); dibiarkan demi keterbacaan audit.
8. **Gas check-in.** Per check-in bayar gas BNB (kecil, tapi tidak nol). 4 wallet
   × tiap hari selama 3 minggu ≈ 84 check-in — siapkan BNB receh di tiap wallet.

## Status

- [x] Kontrak + 12/12 tes lokal lolos (18 Nov 2026)
- [x] Gate Agent ID terverifikasi on-chain (4 wallet user `balanceOf = 1`)
- [x] Frontend statis selesai (belum diisi alamat kontrak)
- [ ] Deploy BSC mainnet — **menunggu approval gas user**
- [ ] Verifikasi BscScan + isi `frontend/config.js`
- [ ] Hosting frontend + submit ke hackathon (tutup 9 Des 2026 08:00 UTC)
- [ ] Promosi ke 30+ alamat Agent ID + post X Community Promotion
