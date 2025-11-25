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
    console.log("[Reminder] initializeNotifications 舊函數被呼叫。");
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
      Alert.alert('權限不足', '請允許通知權限。');
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

    console.log("[Reminder] 清除舊通知...");
    await Notifications.cancelAllScheduledNotificationsAsync();
    await delay(1000); // 等待清除完成

    const now = new Date();
    
    // 【策略調整】手動排程未來 14 天，但使用「精確日曆 (Year/Month/Day)」
    // 這種寫法是 Android 最能精準識別的，不會有秒數誤判或補償過去的問題
    const DAYS_TO_SCHEDULE = 14; 

    for (let i = 0; i < times.length; i++) {
      const timeStr = times[i];
      if (!timeStr) continue;

      const [hourStr, minuteStr] = timeStr.split(':');
      const hour = parseInt(hourStr, 10);
      const minute = parseInt(minuteStr, 10);

      for (let day = 0; day < DAYS_TO_SCHEDULE; day++) {
        
        // 1. 計算出未來的某一天
        let targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + day);
        targetDate.setHours(hour, minute, 0, 0);

        // 2. 如果時間已過，直接跳過 (連設定都不設定)
        if (targetDate <= now) {
            continue; 
        }

        console.log(`[Reminder] 排程: ${targetDate.getFullYear()}/${targetDate.getMonth()+1}/${targetDate.getDate()} ${hour}:${minute}`);

        // 3. 使用 CalendarTrigger 但指定「年、月、日」
        // 這會建立一個「一次性」的精準鬧鐘，絕對不會亂跳
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "心情紀錄時間到了！📝",
            body: `現在是第 ${i + 1} 次紀錄時間，請於 5 分鐘內開始記錄哦。`,
            sound: true,
            color: '#FF231F7C',
          },
          trigger: {
            year: targetDate.getFullYear(),
            month: targetDate.getMonth() + 1, // 注意：Expo 的月份是 1-12，JS 是 0-11
            day: targetDate.getDate(),
            hour: hour,
            minute: minute,
            channelId: 'default',
            repeats: false, // 因為我們指定了年月日，這就是一次性的
          },
        });
      }
    }
    
    console.log("[Reminder] 精確日曆排程完成。");
    return true;

  } catch (error) {
    console.error("[Reminder] 設定通知失敗:", error);
    return false;
  }
}