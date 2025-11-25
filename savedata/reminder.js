import * as Notifications from 'expo-notifications';
import { Alert, Platform } from 'react-native';

// 1. 設定通知的行為：即使 App 在前景 (打開著)，也要跳出通知
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * 這是為了避免 time.js 舊有邏輯呼叫 initializeNotifications() 時找不到函數，
 * 但功能已合併到 scheduleDailyReminders 中。
 */
export async function initializeNotifications() {
    console.log("[Reminder] initializeNotifications 舊函數被呼叫。");
    // 這裡只需要一個空函數，避免 'is not a function' 錯誤
}

/**
 * 【主要排程函數】排程每日通知 (名稱已修正為 scheduleDailyReminders)
 * @param {string[]} times - 時間字串陣列 ["08:00", "14:00", ...]
 */
export async function scheduleDailyReminders(times) { 
  try {
    // A. 請求權限
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      Alert.alert('權限不足', '請允許通知權限，否則無法在時間到時提醒您。');
      return false;
    }

    // Android 頻道設定
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: '心情紀錄提醒', 
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    console.log("[Reminder] 準備設定提醒...");
    
    // B. 取消舊的排程
    await Notifications.cancelAllScheduledNotificationsAsync();

    // C. 逐一設定新的排程
    for (let i = 0; i < times.length; i++) {
      const timeStr = times[i];
      if (!timeStr) continue;

      const [hourStr, minuteStr] = timeStr.split(':');
      const hour = parseInt(hourStr, 10);
      const minute = parseInt(minuteStr, 10);

      await Notifications.scheduleNotificationAsync({
        content: {
          title: "心情紀錄時間到了！📝",
          body: `現在是第 ${i + 1} 次紀錄時間，請花 30 秒記錄一下心情吧。`,
          sound: true,
        },
        trigger: {
          hour: hour,
          minute: minute,
          seconds: 0, 
          repeats: true, 
        },
      });
      console.log(`[Reminder] 成功設定第 ${i+1} 個通知: ${hour}:${minute}`);
    }
    return true;

  } catch (error) {
    console.error("[Reminder] 設定通知失敗:", error);
    return false;
  }
}