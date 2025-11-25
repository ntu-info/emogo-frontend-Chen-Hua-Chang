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
    // 1. 基本通知權限
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
    await delay(1000);

    const now = new Date();
    
    // 【極簡策略】只排程每個時段的「下一次」，不跑14天迴圈，避免系統過載
    for (let i = 0; i < times.length; i++) {
      const timeStr = times[i];
      if (!timeStr) continue;

      const [hourStr, minuteStr] = timeStr.split(':');
      const hour = parseInt(hourStr, 10);
      const minute = parseInt(minuteStr, 10);

      // 找尋該時段的下一個觸發點
      let targetDate = new Date();
      targetDate.setHours(hour, minute, 0, 0);

      // 如果今天的時間已過，就設為明天
      if (targetDate <= now) {
          targetDate.setDate(targetDate.getDate() + 1);
      }

      console.log(`[Reminder] 嘗試排程單一通知: ${targetDate.toISOString()}`);

      // 使用 Date Trigger (一次性，最單純)
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "心情紀錄時間到了！📝",
          body: `現在是第 ${i + 1} 次紀錄時間，請開始記錄。`,
          sound: true,
          color: '#FF231F7C',
        },
        trigger: {
          date: targetDate, // 直接給絕對時間物件
          channelId: 'default',
        },
      });
    }
    
    console.log("排程完成 (僅下一次)。");
    return true;

  } catch (error) {
    console.error("設定失敗:", error);
    return false;
  }
}