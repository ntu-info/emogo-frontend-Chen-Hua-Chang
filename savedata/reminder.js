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
    // 保留空函數
}

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

    // 2. Android 頻道設定
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: '心情紀錄提醒', 
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    // 3. 清除舊通知並等待
    console.log("[Reminder] 清除舊排程...");
    await Notifications.cancelAllScheduledNotificationsAsync();
    await delay(1000); 

    const now = new Date();
    const nowTime = now.getTime();

    // 4. 開始排程 (堅持使用行得通的秒數邏輯)
    // 策略：一次排好未來 14 天的倒數計時
    // 只要使用者兩週內有開過 App，我們可以在 App 啟動時再次呼叫此函數來補滿
    const DAYS_TO_SCHEDULE = 14; 

    for (let i = 0; i < times.length; i++) {
      const timeStr = times[i];
      if (!timeStr) continue;

      const [hourStr, minuteStr] = timeStr.split(':');
      const hour = parseInt(hourStr, 10);
      const minute = parseInt(minuteStr, 10);

      // 對未來 14 天的每一天進行排程
      for (let day = 0; day < DAYS_TO_SCHEDULE; day++) {
        
        // 步驟 A: 找出目標時間 (今天 + day)
        let targetDate = new Date();
        targetDate.setDate(now.getDate() + day);
        targetDate.setHours(hour, minute, 0, 0);

        const targetTime = targetDate.getTime();
        const diffInMs = targetTime - nowTime;

        // 步驟 B: 如果已經過了 (例如今天的早上)，直接跳過
        if (diffInMs <= 0) {
            continue; 
        }

        // 步驟 C: 計算秒數
        let diffInSeconds = Math.floor(diffInMs / 1000);

        // 步驟 D: 秒數防呆 (小於等於 1 秒則強制設為 2 秒)
        if (diffInSeconds <= 1) {
            diffInSeconds = 2;
        }

        // 步驟 E: 使用您驗證過行得通的「秒數倒數」
        // Android 系統這下沒話說了，這就是單純的倒數
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
            repeats: false, // 絕對不重複，一次性炸彈最準
          },
        });
      }
    }

    console.log(`[Reminder] 未來 ${DAYS_TO_SCHEDULE} 天排程完成 (秒數倒數模式)。`);
    return true;

  } catch (error) {
    console.error("設定失敗:", error);
    return false;
  }
}