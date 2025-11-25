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
    console.log("Init called");
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

    // 2. Android 頻道
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: '心情紀錄提醒', 
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    // 3. 清除舊通知
    await Notifications.cancelAllScheduledNotificationsAsync();
    await delay(1000); // 等待清除

    const now = new Date();
    let debugMsg = "排程計畫：\n"; // 收集除錯訊息

    // 4. 開始排程
    for (let i = 0; i < times.length; i++) {
      const timeStr = times[i];
      if (!timeStr) continue;

      const [hourStr, minuteStr] = timeStr.split(':');
      const hour = parseInt(hourStr, 10);
      const minute = parseInt(minuteStr, 10);

      // --- 步驟 A: 找出「下一個」正確的時間點 ---
      let targetDate = new Date();
      targetDate.setHours(hour, minute, 0, 0); // 先設為今天

      // 如果今天這個時間已經過了，就改成明天
      // (例如現在 17:00，設定 08:00 -> 改成明天 08:00)
      if (targetDate <= now) {
          targetDate.setDate(targetDate.getDate() + 1);
          debugMsg += `時段${i+1}: 已過，設為明天\n`;
      } else {
          debugMsg += `時段${i+1}: 尚未過，設為今天\n`;
      }

      // --- 步驟 B: 計算秒數差 ---
      const diffInMs = targetDate.getTime() - now.getTime();
      const diffInSeconds = Math.floor(diffInMs / 1000);

      // 再次防呆：如果秒數小於 10 秒，可能是誤判，直接跳過
      if (diffInSeconds < 10) {
          debugMsg += `-> 略過 (秒數過短: ${diffInSeconds}s)\n`;
          continue;
      }

      debugMsg += `-> 倒數: ${diffInSeconds} 秒後觸發\n`;

      // --- 步驟 C: 使用「秒數」排程 (最安全的做法) ---
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "心情紀錄時間到了！📝",
          body: `現在是第 ${i + 1} 次紀錄時間，請開始記錄。`,
          sound: true,
          color: '#FF231F7C',
        },
        trigger: {
          type: 'timeInterval', // 明確指定類型
          seconds: diffInSeconds, 
          channelId: 'default',
          repeats: false, // 一次性倒數，絕對不重複
        },
      });
    }

    console.log(debugMsg);
    
    // 【關鍵】跳出彈窗讓您確認邏輯是否正確
    Alert.alert("排程除錯資訊", debugMsg);

    return true;

  } catch (error) {
    console.error("設定失敗:", error);
    Alert.alert("錯誤", "設定通知時發生錯誤: " + error.message);
    return false;
  }
}