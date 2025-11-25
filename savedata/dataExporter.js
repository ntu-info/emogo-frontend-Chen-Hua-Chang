// savedata/dataExporter.js
import * as FileSystem from 'expo-file-system/legacy'; // 【關鍵修正】: 必須使用 legacy
import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native'; 
import { fetchAllRecords } from './recordLoader'; 

export const exportDataAsJSON = async () => {
  try {
    // 1. 取得所有資料
    const data = await fetchAllRecords();
    
    if (data.length === 0) {
      Alert.alert("無資料", "目前沒有紀錄可以匯出。");
      return;
    }

    // 2. 將資料轉換成 JSON 字串 (格式化過，方便閱讀)
    const jsonString = JSON.stringify(data, null, 2);

    // 3. 定義暫存檔案路徑
    const fileName = `mood_data_export_${Date.now()}.json`;
    // 修正: 確保路徑正確
    const filePath = FileSystem.documentDirectory + fileName; 

    // 4. 寫入檔案
    await FileSystem.writeAsStringAsync(filePath, jsonString);

    // 5. 呼叫分享功能
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(filePath, {
        mimeType: 'application/json',
        dialogTitle: '匯出實驗數據',
        UTI: 'public.json' // for iOS
      });
    } else {
      Alert.alert("錯誤", "此裝置不支援分享功能");
    }

  } catch (error) {
    console.error("匯出失敗:", error);
    Alert.alert("錯誤", "匯出過程中發生錯誤。");
  }
};