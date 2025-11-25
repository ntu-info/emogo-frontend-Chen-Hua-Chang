import AsyncStorage from '@react-native-async-storage/async-storage';

// 1. 定義我們所有的儲存「鑰匙」(Key)
const KEYS = {
  TIME_1: 'time1',
  TIME_2: 'time2',
  TIME_3: 'time3',
  LAST_SET_DATE: 'lastSetDate', // 儲存 "YYYY-MM-DD"
  RECORDING_STATUS: 'recordingStatus', // 儲存 { date, t1_completed, t2_completed, t3_completed }
};

// 2. 輔助函數：取得 "YYYY-MM-DD" 格式的今天日期
const getTodayString = () => {
  const date = new Date();
  // 處理本地時區，確保日期是正確的本地日期
  const offset = date.getTimezoneOffset() * 60000;
  const localDate = new Date(date.getTime() - offset);
  return localDate.toISOString().split('T')[0];
};

/**
 * 儲存「時間設定」 (T1, T2, T3)
 * (這會在 time.js 頁面被呼叫)
 */
export const saveTimeSettings = async (time1, time2, time3) => {
  try {
    const today = getTodayString();
    await AsyncStorage.setItem(KEYS.TIME_1, time1);
    await AsyncStorage.setItem(KEYS.TIME_2, time2);
    await AsyncStorage.setItem(KEYS.TIME_3, time3);
    // 儲存「今天」為最後設定日期
    await AsyncStorage.setItem(KEYS.LAST_SET_DATE, today);
    // 當使用者重新設定時間時，我們必須「重設」今天的完成狀態
    await resetRecordingStatus(); 
    console.log('[Storage] 設定已儲存！日期：', today);
  } catch (e) {
    console.error('[Storage] 儲存設定失敗', e);
  }
};

/**
 * 讀取「時間設定」 (T1, T2, T3)
 * (這會在 index.js 頁面被呼叫)
 */
export const loadTimeSettings = async () => {
  try {
    const time1 = await AsyncStorage.getItem(KEYS.TIME_1);
    const time2 = await AsyncStorage.getItem(KEYS.TIME_2);
    const time3 = await AsyncStorage.getItem(KEYS.TIME_3);
    const lastSetDate = await AsyncStorage.getItem(KEYS.LAST_SET_DATE);
    
    return { time1, time2, time3, lastSetDate };
  } catch (e) {
    console.error('[Storage] 讀取設定失敗', e);
    return { time1: null, time2: null, time3: null, lastSetDate: null };
  }
};

/**
 * 檢查今天是否「可以編輯」時間設定
 * (這會在 time.js 頁面被呼叫，用來鎖定 UI)
 */
export const canEditSettings = async () => {
  const { lastSetDate } = await loadTimeSettings();
  if (!lastSetDate) {
    return true; // 從來沒設定過，當然可以編輯
  }
  const today = getTodayString();
  // 如果「最後設定日期」不是「今天」，就可以編輯 (午夜 00:00 解鎖)
  return lastSetDate !== today; 
};

/**
 * 讀取「今日完成狀態」 (核心邏輯)
 * (這會在 index.js 頁面被呼叫，用來判斷按鈕狀態)
 */
export const loadRecordingStatus = async () => {
  const today = getTodayString();
  const defaultStatus = { 
    date: today, 
    t1_completed: false, 
    t2_completed: false, 
    t3_completed: false 
  };

  try {
    const storedStatusString = await AsyncStorage.getItem(KEYS.RECORDING_STATUS);
    if (!storedStatusString) {
      // 情況 A：手機裡沒有任何狀態 -> 儲存並回傳「今天」的預設值
      await AsyncStorage.setItem(KEYS.RECORDING_STATUS, JSON.stringify(defaultStatus));
      return defaultStatus;
    }

    const storedStatus = JSON.parse(storedStatusString);

    if (storedStatus.date === today) {
      // 情況 B：日期是今天 -> 完美，直接回傳儲存的狀態
      return storedStatus;
    } else {
      // 情況 C：日期是昨天 (或更久) -> 「跨天了！」
      // 我們儲存並回傳「今天」的預設值 (自動重設)
      console.log('[Storage] 偵測到跨天，重設完成狀態。');
      await AsyncStorage.setItem(KEYS.RECORDING_STATUS, JSON.stringify(defaultStatus));
      return defaultStatus;
    }
  } catch (e) {
    console.error('[Storage] 讀取狀態失敗', e);
    return defaultStatus; // 失敗時回傳預設值
  }
};

/**
 * 標記某個時段為「已完成」
 * (這會在 vlog.js 頁面被呼叫)
 */
export const markRecordingAsCompleted = async (slotId) => { // slotId 會是 't1', 't2', or 't3'
  if (!slotId || slotId === 'go_to_settings') { 
    console.warn('[Storage] markRecordingAsCompleted 呼叫時缺少 slotId');
    return;
  }

  try {
    // 1. 先讀取「目前」的狀態 (這會自動處理跨天)
    const currentStatus = await loadRecordingStatus(); 
    
    // 2. 更新狀態
    const newStatus = {
      ...currentStatus,
      [`${slotId}_completed`]: true, // 使用動態屬性名稱 (e.g., 't1_completed' = true)
    };

    // 3. 儲存回去
    await AsyncStorage.setItem(KEYS.RECORDING_STATUS, JSON.stringify(newStatus));
    console.log(`[Storage] 時段 ${slotId} 已標記為完成。`);
  } catch (e) {
    console.error('[Storage] 標記完成失敗', e);
  }
};

/**
 * 內部輔助函數，用於重設狀態
 * (例如在 saveTimeSettings 時)
 */
const resetRecordingStatus = async () => {
  const today = getTodayString();
  const defaultStatus = { 
    date: today, 
    t1_completed: false, 
    t2_completed: false, 
    t3_completed: false 
  };
  try {
    await AsyncStorage.setItem(KEYS.RECORDING_STATUS, JSON.stringify(defaultStatus));
  } catch (e) {
    console.error('[Storage] 重設狀態失敗', e);
  }
};