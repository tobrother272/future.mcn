/**
 * Test script: chạy export Google Sheets ngay lập tức
 * Usage: npx tsx scripts/test-sheets-export.ts
 */
import "dotenv/config";
import { exportChannelsToSheet } from "../src/services/sheets.service.js";

console.log("🔄 Bắt đầu export lên Google Sheets...");

try {
  const { written } = await exportChannelsToSheet();
  console.log(`✅ Export thành công — ${written} kênh đã được ghi vào Sheet`);
} catch (err) {
  console.error("❌ Export thất bại:", err);
  process.exit(1);
}
