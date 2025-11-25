import { initGpsDB } from './gpsdata';
import { initScaleDB } from './scaledata';
import { initVlogDB } from './vlogdata';

/**
 * 集中初始化所有資料庫表格。
 * 確保 App 在任何頁面存取資料之前，資料表都已存在。
 */
export const initializeAllDatabases = async () => {
  try {
    // 雖然這些初始化函數會檢查資料表是否已存在 (CREATE IF NOT EXISTS)，
    // 但我們統一呼叫一次，確保資料庫在 App 啟動時就是就緒狀態。
    await initGpsDB();
    await initScaleDB();
    await initVlogDB();
    console.log("[DB Check] 所有資料表檢查與初始化完成。");
  } catch (error) {
    console.error("[DB Check] 資料表初始化失敗:", error);
  }
};