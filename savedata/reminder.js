import * as Notifications from 'expo-notifications';
import { Alert, Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function initializeNotifications() {
    // 舊函數保留空殼，防止報錯
}

// 輔助函數：延遲等待
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export async function scheduleDailyReminders(times) { 
  try {
    // 1. 權限檢查
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      Alert.alert('權限不足', '請允許通知權限');
      return false;
    }

    // 2. Android 頻道
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: '心情紀錄提醒', 
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    // 3. 清除舊通知並等待
    await Notifications.cancelAllScheduledNotificationsAsync();
    await delay(1000); 

    const now = new Date();

    // 4. 開始排程
    for (let i = 0; i < times.length; i++) {
      const timeStr = times[i];
      if (!timeStr) continue;

      const [hourStr, minuteStr] = timeStr.split(':');
      const hour = parseInt(hourStr, 10);
      const minute = parseInt(minuteStr, 10);

      // --- 步驟 A: 找出目標時間 ---
      let targetDate = new Date();
      targetDate.setHours(hour, minute, 0, 0); // 設為今天

      // 如果今天這個時間已經過了 (比現在早)，就改成明天
      if (targetDate <= now) {
          targetDate.setDate(targetDate.getDate() + 1);
      }

      // --- 步驟 B: 計算秒數差 ---
      const diffInMs = targetDate.getTime() - now.getTime();
      let diffInSeconds = Math.floor(diffInMs / 1000);

      // --- 步驟 C: 處理極短秒數 (您的需求) ---
      // 原本邏輯：小於 10 秒就跳過 (造成您圖中 4s 被略過的情況)
      // 新邏輯：如果秒數在 0~10 秒之間，直接強制設為 2 秒後觸發
      // 這樣保證「無論多近都會響」，且秒數合法
      if (diffInSeconds <= 1) {
          diffInSeconds = 2; // 強制至少給系統 2 秒緩衝
      }

      // --- 步驟 D: 使用「秒數」排程 ---
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "心情紀錄時間到了！📝",
          body: `現在是第 ${i + 1} 次紀錄時間，請開始記錄。`,
          sound: true,
          color: '#FF231F7C',
        },
        trigger: {
          type: 'timeInterval', 
          seconds: diffInSeconds, 
          channelId: 'default',
          repeats: false, 
        },
      });
    }

    console.log("排程完成");
    // 除錯彈窗已移除
    return true;

  } catch (error) {
    console.error("設定失敗:", error);
    return false;
  }
}