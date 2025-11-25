// savedata/gpsdata.js
import * as SQLite from 'expo-sqlite';

// 使用 Sync 方法開啟資料庫 (Expo SDK 50+ 適用)
const db = SQLite.openDatabaseSync('emotional_log.db');

export const initGpsDB = async () => {
  try {
    // 新版寫法：使用 execAsync 執行 SQL 指令
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS gps_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        latitude REAL,
        longitude REAL,
        timestamp TEXT
      );
    `);
    console.log('[GpsData] 資料表 gps_logs 初始化成功');
  } catch (error) {
    console.log('[GpsData] 資料表建立失敗: ', error);
  }
};

export const storeGpsData = async (lat, lng) => {
  try {
    const timestamp = new Date().toISOString();
    // 新版寫法：使用 runAsync 執行插入，並直接取得結果
    const result = await db.runAsync(
      'INSERT INTO gps_logs (latitude, longitude, timestamp) VALUES (?, ?, ?)',
      [lat, lng, timestamp]
    );
    
    console.log('[GpsData] GPS 資料儲存成功, ID:', result.lastInsertRowId);
    return result.lastInsertRowId; // 回傳 ID
  } catch (error) {
    console.log('[GpsData] GPS 資料儲存失敗:', error);
    throw error;
  }
};