import * as SQLite from 'expo-sqlite';

// 使用 Sync 方法開啟資料庫 (確保所有 DB 檔案都使用同一個連接)
const db = SQLite.openDatabaseSync('emotional_log.db');

export const initScaleDB = async () => {
  try {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS mood_scales (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        mood_score INTEGER NOT NULL,
        active_slot TEXT,
        gps_id INTEGER, 
        timestamp TEXT
      );
    `);
    console.log('[ScaleData] 資料表 mood_scales 初始化成功');
  } catch (error) {
    console.log('[ScaleData] 資料表建立失敗: ', error);
  }
};

export const storeScaleData = async (score, slot, gpsId) => {
  try {
    const timestamp = new Date().toISOString();
    const result = await db.runAsync(
      'INSERT INTO mood_scales (mood_score, active_slot, gps_id, timestamp) VALUES (?, ?, ?, ?)',
      [score, slot, gpsId, timestamp]
    );
    
    console.log('[ScaleData] 量表資料儲存成功, ID:', result.lastInsertRowId);
    return result.lastInsertRowId;
  } catch (error) {
    console.log('[ScaleData] 量表資料儲存失敗:', error);
    throw error;
  }
};