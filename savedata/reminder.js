import * as Notifications from 'expo-notifications';
import { Alert, Platform } from 'react-native';

// 設定通知的行為：即使 App 在前景 (打開著)，也要跳出通知
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function initializeNotifications() {
    console.log("[Reminder] initializeNotifications 舊函數被呼叫。");
}

/**
 * 【倒數計時排程版】
 * 解決 Android 亂跳通知的最終手段：
 * 不給日期 (Date)，改給「秒數 (Seconds)」。
 * 系統只需要知道「還有幾秒」，就不會誤判為過去或現在。
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
      Alert.alert('權限不足', '請允許通知權限。');
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

    console.log("[Reminder] 清除舊通知，準備開始倒數計時排程...");
    
    // B. 取消舊的排程 (重要！先清空那 41 個)
    await Notifications.cancelAllScheduledNotificationsAsync();

    // C. 開始排程
    const now = new Date(); // 取得現在時間 (基準點)
    const nowTime = now.getTime(); // 轉成毫秒數字，方便計算

    // 外層迴圈：遍歷 3 個時段
    for (let i = 0; i < times.length; i++) {
      const timeStr = times[i];
      if (!timeStr) continue;

      const [hourStr, minuteStr] = timeStr.split(':');
      const hour = parseInt(hourStr, 10);
      const minute = parseInt(minuteStr, 10);

      // 內層迴圈：手動排程未來 14 天
      // 雖然 Android 上限通常是 50 個，但 3x14=42 安全過關
      for (let day = 0; day < 14; day++) {
        
        // 1. 建立目標時間點
        let targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + day); // 今天 + day 天
        targetDate.setHours(hour, minute, 0, 0);        // 設定時分

        const targetTime = targetDate.getTime();

        // 2. 計算「目標時間」與「現在」的毫秒差
        const diffInMs = targetTime - nowTime;

        // 3. 如果是過去的時間 (差值為負)，直接跳過
        if (diffInMs <= 0) {
          continue; 
        }

        // 4. 將毫秒轉為秒 (Expo 需要秒)
        const diffInSeconds = Math.floor(diffInMs / 1000);

        // 5. 使用「倒數計時」排程
        // 這是最單純的指令：「X 秒後叫我」。系統不會有任何誤解。
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "心情紀錄時間到了！📝",
            body: `現在是第 ${i + 1} 次紀錄時間，請於 5 分鐘內開始記錄哦。`,
            sound: true,
            color: '#FF231F7C',
          },
          trigger: {
            seconds: diffInSeconds, // 【重點】只給秒數
            channelId: 'default',
            // 不要寫 repeats: true，因為這是一次性倒數
          },
        });
      }
    }
    
    console.log("排程完成。");
    return true;

  } catch (error) {
    console.error("[Reminder] 設定通知失敗:", error);
    return false;
  }
}