// savedata/gpsdata.js
import { Alert } from 'react-native';

// 【設定】您的後端網址 (末尾不需加斜線)
const BACKEND_URL = "https://emogo-backend-chen-hua-chang.onrender.com";

// 初始化函數 (現在不需要建表了，留空即可)
export const initGpsDB = async () => {
  console.log('[GpsData] 雲端模式：無需初始化本地資料庫');
};

export const storeGpsData = async (lat, lng) => {
  try {
    const timestamp = new Date().toISOString();
    
    // 1. 準備要傳送的資料包裹
    const payload = {
      latitude: lat,
      longitude: lng,
      timestamp: timestamp
    };

    console.log('[GpsData] 準備上傳 GPS:', payload);

    // 2. 發送 POST 請求到後端
    const response = await fetch(`${BACKEND_URL}/upload/gps`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    // 3. 檢查回應
    const result = await response.json();
    
    if (response.ok) {
      console.log('[GpsData] 上傳成功，ID:', result.id);
      // 回傳後端給的 ID，讓其他模組 (scaledata) 可以關聯
      return result.id; 
    } else {
      throw new Error(result.detail || '上傳失敗');
    }

  } catch (error) {
    console.error('[GpsData] 上傳失敗:', error);
    // 為了不讓流程中斷，這裡雖然報錯，但我們還是可以拋出錯誤讓 UI 層知道
    throw error;
  }
};