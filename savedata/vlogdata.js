// savedata/vlogdata.js
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native'; 

const BACKEND_URL = "https://emogo-backend-chen-hua-chang.onrender.com";

// 雖然不存資料庫，但我們可能還是需要暫存資料夾來處理影片
const VIDEO_DIR = FileSystem.documentDirectory + 'vlogs/';

const ensureDirExists = async () => {
  const dirInfo = await FileSystem.getInfoAsync(VIDEO_DIR);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(VIDEO_DIR, { intermediates: true });
  }
};

export const initVlogDB = async () => {
  await ensureDirExists();
  console.log('[VlogData] 雲端模式：已確認暫存資料夾存在');
};

export const saveVlogVideo = async (tempUri, scaleId, duration) => {
  try {
    // 1. 雖然不存本地 DB，但我們先把影片搬到 App 專屬目錄比較安全，避免暫存檔被系統清掉
    await ensureDirExists();
    const filename = `vlog_${Date.now()}.mp4`;
    const newPath = VIDEO_DIR + filename;

    await FileSystem.moveAsync({
      from: tempUri,
      to: newPath,
    });
    console.log('影片已暫存至:', newPath);

    // 2. 準備上傳表單 (FormData)
    // 注意：React Native 上傳檔案的格式比較特殊
    const formData = new FormData();
    
    formData.append('file', {
      uri: newPath,
      name: filename,
      type: 'video/mp4', // 必須指定型態
    });
    formData.append('slot', 'default'); // 這裡可以根據需求修改
    formData.append('mood', '0'); // 這裡也可以傳遞心情分數，若無則傳預設值

    // 注意：因為您的 scale.js 呼叫此函數時只傳了 scaleId，
    // 如果後端需要把影片跟 scaleId 關聯，我們應該要把 scaleId 也傳上去
    formData.append('scale_id', String(scaleId)); 
    formData.append('duration', String(duration));

    console.log('[VlogData] 開始上傳影片...');

    // 3. 發送 POST 請求 (Multipart/Form-Data)
    // 這裡 fetch 會自動處理 Content-Type 為 multipart/form-data，不需要手動設定 header
    const response = await fetch(`${BACKEND_URL}/upload/vlog`, {
      method: 'POST',
      body: formData,
      headers: {
        'Accept': 'application/json',
      },
    });

    const result = await response.json();

    if (response.ok) {
      console.log('[VlogData] 影片上傳成功:', result);
      // 上傳成功後，我們可以選擇刪除本地檔案以節省空間
      // await FileSystem.deleteAsync(newPath); 
      return newPath; // 回傳路徑讓 UI 顯示預覽
    } else {
      throw new Error(result.detail || '影片上傳失敗');
    }

  } catch (error) {
    console.error("上傳影片流程失敗:", error);
    Alert.alert("上傳失敗", "影片上傳時發生錯誤，請檢查網路。");
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