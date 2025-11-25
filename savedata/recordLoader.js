// savedata/recordLoader.js
import * as SQLite from 'expo-sqlite';

// 開啟同一個資料庫
const db = SQLite.openDatabaseSync('emotional_log.db');

/**
 * 取得所有完整的紀錄
 * 包含：情緒分數、時段、時間、經緯度 (從 GPS 表)、影片路徑 (從 Vlog 表)
 */
export const fetchAllRecords = async () => {
  try {
    // 這段 SQL 是關鍵：
    // 我們以 mood_scales (情緒) 為主，去串連 gps_logs 和 vlog_files
    const query = `
      SELECT 
        m.id, 
        m.mood_score, 
        m.active_slot, 
        m.timestamp,
        g.latitude, 
        g.longitude,
        v.file_uri
      FROM mood_scales m
      LEFT JOIN gps_logs g ON m.gps_id = g.id
      LEFT JOIN vlog_files v ON v.scale_id = m.id
      ORDER BY m.id DESC; 
    `;

    // 使用 getAllAsync 取得所有結果
    const results = await db.getAllAsync(query);
    return results;

  } catch (error) {
    console.error("讀取紀錄失敗:", error);
    return [];
  }
};

/**
 * (選用) 刪除所有資料 (重置用)
 */
export const clearAllData = async () => {
  try {
    await db.execAsync('DELETE FROM mood_scales; DELETE FROM gps_logs; DELETE FROM vlog_files;');
    console.log("所有資料已清空");
  } catch (error) {
    console.error("清空資料失敗:", error);
  }
};