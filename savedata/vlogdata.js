import * as SQLite from 'expo-sqlite';

// 【關鍵修正】：使用 legacy 確保舊函數可用
import * as FileSystem from 'expo-file-system/legacy'; 

import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native'; 

const db = SQLite.openDatabaseSync('emotional_log.db');
const VIDEO_DIR = FileSystem.documentDirectory + 'vlogs/';

const ensureDirExists = async () => {
  // 檢查資料夾是否存在
  // 即使 getInfoAsync 拋出警告，我們也讓它執行
  const dirInfo = await FileSystem.getInfoAsync(VIDEO_DIR);
  
  // 如果資料夾不存在
  if (!dirInfo.exists) {
    console.log("[FS] 建立 Vlog 資料夾...");
    await FileSystem.makeDirectoryAsync(VIDEO_DIR, { intermediates: true });
  }
};

export const initVlogDB = async () => {
  try {
    await ensureDirExists(); 
    
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS vlog_files (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        scale_id INTEGER,
        file_uri TEXT,
        duration INTEGER,
        timestamp TEXT
      );
    `);
    console.log('[VlogData] 資料表 vlog_files 初始化成功');
  } catch (error) {
    console.log('[VlogData] 資料表建立失敗: ', error);
  }
};

export const saveVlogVideo = async (tempUri, scaleId, duration) => {
  try {
    // 確保資料夾存在 
    await ensureDirExists(); 
    
    const filename = `vlog_${Date.now()}.mp4`;
    const newPath = VIDEO_DIR + filename;

    // 搬移檔案
    await FileSystem.moveAsync({
      from: tempUri,
      to: newPath,
    });
    console.log('影片已搬移至:', newPath);

    // 寫入資料庫
    const timestamp = new Date().toISOString();
    const result = await db.runAsync(
      'INSERT INTO vlog_files (scale_id, file_uri, duration, timestamp) VALUES (?, ?, ?, ?)',
      [scaleId, newPath, duration, timestamp]
    );

    console.log('[VlogData] 資料庫記錄成功, ID:', result.lastInsertRowId);
    return newPath;

  } catch (error) {
    console.error("儲存影片流程失敗:", error);
    Alert.alert("儲存失敗", "影片存檔時發生錯誤。");
    throw error;
  }
};

export const shareVlogVideo = async (fileUri) => {
  if (!(await Sharing.isAvailableAsync())) {
    Alert.alert('錯誤', '您的裝置不支援分享功能');
    return;
  }
  await Sharing.shareAsync(fileUri);
};