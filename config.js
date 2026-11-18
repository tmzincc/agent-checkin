// =============================================================================
// KONFIGURASI — ISI SETELAH DEPLOY (lihat README.md)
// =============================================================================
// 1. Deploy kontrak ke BSC mainnet (script/Deploy.s.sol).
// 2. Isi CONTRACT_ADDRESS dengan alamat hasil deploy.
// 3. Isi DEPLOY_BLOCK dengan nomor blok saat kontrak di-deploy
//    (dipakai leaderboard supaya query event tidak mulai dari blok 0).
// =============================================================================
const CONFIG = {
  // ALAMAT KONTRAK AgentCheckIn — WAJIB DIISI SETELAH DEPLOY.
  // Sebelum diisi, halaman jalan dalam mode "belum di-deploy".
  CONTRACT_ADDRESS: "0x33df612106a92E44C594417C3cdcDbD44c545f7B",
  DEPLOY_BLOCK: 134313585,

  // BNB Smart Chain mainnet.
  CHAIN_ID: 56,
  CHAIN_NAME: "BNB Smart Chain",
  CHAIN_RPC: "https://bsc-dataseed1.defibit.io", // RPC publik read-only, tanpa key
  BSCSCAN_TX: "https://bscscan.com/tx/",
  BSCSCAN_ADDRESS: "https://bscscan.com/address/",

  // Kontrak SPACE ID Agent ID (ERC-721, non-transferable) — alamat resmi dari
  // pengumuman Binance Agent ID Hackathon.
  AGENT_ID_ADDRESS: "0x60b9262456de011f7d15a54cdd8c48baaa8b022f",

  LEADERBOARD_TOP: 20,
};
