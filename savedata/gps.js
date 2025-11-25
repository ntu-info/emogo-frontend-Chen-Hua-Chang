import * as Location from 'expo-location';
import { Alert } from 'react-native';

/**
 * 這是一個非同步函數，用於請求 GPS 權限並取得目前座標
 */
export const fetchCurrentLocation = async () => {
  // 1. 請求前景 GPS 權限
  let { status } = await Location.requestForegroundPermissionsAsync();
  
  if (status !== 'granted') {
    // 2. 如果使用者拒絕，跳出提示
    Alert.alert(
      '權限不足', 
      '您必須允許 App 讀取您的 GPS 位置，才能繼續記錄情緒。'
    );
    return null; // 傳回 null 代表失敗
  }

  // 3. 如果使用者同意，開始讀取 GPS (設為高精準度)
  try {
    console.log("正在讀取 GPS 座標...");
    let location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });
    
    const coords = location.coords;
    
    // (未來) 在這裡我們可以呼叫 expo-sqlite 儲存
    
    // (現在) 我們先在終端機印出來，確認成功
    console.log('GPS 座標已取得:', coords.latitude, coords.longitude);
    
    // 4. 傳回座標物件
    return coords; 
    
  } catch (error) {
    Alert.alert('讀取錯誤', '無法讀取您的 GPS 位置，請稍後再試。');
    console.error('Error fetching location:', error);
    return null; // <b>傳回 null 代表失敗</b>
  }
};