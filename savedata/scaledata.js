// savedata/scaledata.js
import { Alert } from 'react-native';

const BACKEND_URL = "https://emogo-backend-chen-hua-chang.onrender.com";

export const initScaleDB = async () => {
  console.log('[ScaleData] 雲端模式：無需初始化本地資料庫');
};

export const storeScaleData = async (score, slot, gpsId) => {
  try {
    const timestamp = new Date().toISOString();
    
    const payload = {
      score: score,
      slot: slot,
      gps_id: gpsId, // 這是剛剛 gpsdata 回傳的雲端 ID
      timestamp: timestamp
    };

    console.log('[ScaleData] 準備上傳心情:', payload);

    const response = await fetch(`${BACKEND_URL}/upload/sentiment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('[ScaleData] 上傳成功，ID:', result.id);
      return result.id;
    } else {
      throw new Error(result.detail || '上傳失敗');
    }

  } catch (error) {
    console.error('[ScaleData] 上傳失敗:', error);
    throw error;
  }
};