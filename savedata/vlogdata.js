// savedata/vlogdata.js

// --- 修正重點 1: 改用 legacy 引入 ---
// 新版 Expo 強制要求舊方法 (getInfoAsync, moveAsync 等) 必須從 legacy 引入
import * as FileSystem from 'expo-file-system/legacy'; 

import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native'; 

const BACKEND_URL = "https://emogo-backend-chen-hua-chang.onrender.com";
// 注意：legacy 模式下，documentDirectory 依然可以使用
const VIDEO_DIR = FileSystem.documentDirectory + 'vlogs/';

const ensureDirExists = async () => {
  // 這裡就是報錯的地方，改用 legacy import 後就能正常運作了
  const dirInfo = await FileSystem.getInfoAsync(VIDEO_DIR);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(VIDEO_DIR, { intermediates: true });
  }
};

export const initVlogDB = async () => {
  await ensureDirExists();
};

export const saveVlogVideo = async (tempUri, moodScore, activeSlot, duration, lat, lng) => {
  try {
    await ensureDirExists();
    const filename = `vlog_${Date.now()}.mp4`;
    const newPath = VIDEO_DIR + filename;

    // 1. 搬移檔案
    await FileSystem.moveAsync({
      from: tempUri,
      to: newPath,
    });
    console.log('影片已暫存至:', newPath);

    console.log('[VlogData] 開始背景上傳 (One-Shot)...');

    // --- 修正重點 2: UploadType 的相容性處理 ---
    // 在 legacy 模式下，常數名稱可能是 FileSystemUploadType
    // 為了雙重保險，如果找不到屬性，直接用數字 1 (代表 Multipart)
    const uploadType = (FileSystem.UploadType && FileSystem.UploadType.MULTIPART) 
      || (FileSystem.FileSystemUploadType && FileSystem.FileSystemUploadType.MULTIPART) 
      || 1;

    // 2. 背景上傳
    const response = await FileSystem.uploadAsync(
      `${BACKEND_URL}/upload/full_record`, 
      newPath, 
      {
        fieldName: 'file',
        httpMethod: 'POST',
        uploadType: uploadType, 
        mimeType: 'video/mp4', 
        parameters: {
          'mood_score': String(moodScore),
          'slot': String(activeSlot),
          'duration': duration ? String(duration) : "0",
          'latitude': String(lat),
          'longitude': String(lng),
          'timestamp': new Date().toISOString(),
        },
      }
    );

    console.log('[VlogData] 回應狀態:', response.status);
    console.log('[VlogData] 回應內容:', response.body); 

    if (response.status >= 200 && response.status < 300) {
      console.log('[VlogData] 上傳成功!');
      // 成功後刪除暫存，節省空間
      await FileSystem.deleteAsync(newPath).catch(e => console.log("刪除暫存失敗(不影響功能):", e));
      return newPath;
    } else {
      throw new Error(`伺服器拒絕: ${response.status} - ${response.body}`);
    }

  } catch (error) {
    console.error("上傳失敗細節:", error);
    throw error;
  }
};

export const shareVlogVideo = async (fileUri) => {
  if (!(await Sharing.isAvailableAsync())) {
    Alert.alert('錯誤', '不支援分享');
    return;
  }
  await Sharing.shareAsync(fileUri);
};