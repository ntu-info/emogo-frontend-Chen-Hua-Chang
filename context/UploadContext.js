// context/UploadContext.js
import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { Alert, View, Text, ActivityIndicator, StyleSheet, AppState } from 'react-native';

// 引入一次性上傳函式
import { saveVlogVideo } from '../savedata/vlogdata';

const UploadContext = createContext();

export const UploadProvider = ({ children }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [progressText, setProgressText] = useState('');
  
  const pendingAlertRef = useRef(null); 
  const appStateRef = useRef(AppState.currentState);

  // 依然保留監聽邏輯，以防使用者接到電話或不小心跳出
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
        checkPendingAlert();
      }
      appStateRef.current = nextAppState;
    });
    return () => {
      subscription.remove();
    };
  }, []);

  const checkPendingAlert = () => {
    if (pendingAlertRef.current) {
      const { title, message, buttons } = pendingAlertRef.current;
      Alert.alert(title, message, buttons);
      pendingAlertRef.current = null; 
    }
  };

  const showAlertSafe = (title, message, buttons) => {
    if (appStateRef.current === 'active') {
      Alert.alert(title, message, buttons);
    } else {
      console.log("App 在背景，訊息已排入佇列:", title);
      pendingAlertRef.current = { title, message, buttons };
    }
  };

  /**
   * 背景上傳任務 (One-Shot 版本)
   */
  const startBackgroundUpload = async (moodScore, activeSlot, vlogUri, duration, lat, lng) => {
    setIsUploading(true);
    
    // --- 修改重點：更新提示文字，明確引導使用者停留 ---
    setProgressText('紀錄上傳中，請稍候數秒並先不要離開app');

    try {
      console.log("[Background] 啟動 One-Shot 上傳...");
      
      await saveVlogVideo(
        vlogUri, 
        moodScore, 
        activeSlot, 
        duration, 
        lat, 
        lng
      );

      console.log("[Background] 全部完成！");
      
      // 成功提示
      showAlertSafe(
        "上傳完成", 
        "您的紀錄已成功備份！現在可以關閉 App 了。", 
        [{ text: "OK" }]
      );
      
    } catch (error) {
      console.error("[Background] 上傳流程異常:", error);
      
      // 錯誤提示
      showAlertSafe(
        "資料已保存 (未上傳)", 
        "紀錄已成功儲存在手機中。\n\n剛才的雲端上傳因故中斷，這不影響資料保存，下次開啟 App 時我們再嘗試補傳。\n\n現在您可以安心關閉 App。",
        [{ text: "OK" }]
      );

    } finally {
      setIsUploading(false);
      setProgressText('');
    }
  };

  return (
    <UploadContext.Provider value={{ startBackgroundUpload, isUploading }}>
      {children}
      {isUploading && (
        <View style={styles.floatingStatus}>
          <ActivityIndicator size="small" color="#fff" />
          <View style={styles.textContainer}>
            <Text style={styles.statusText}>{progressText}</Text>
          </View>
        </View>
      )}
    </UploadContext.Provider>
  );
};

const styles = StyleSheet.create({
  floatingStatus: {
    position: 'absolute',
    bottom: 40, 
    left: 20,
    right: 20,
    backgroundColor: 'rgba(30, 30, 30, 0.9)', 
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12, 
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 9999,
  },
  textContainer: {
    flex: 1, 
    marginLeft: 12, 
  },
  statusText: {
    color: 'white',
    fontSize: 14,
    lineHeight: 20, 
    textAlign: 'left', 
  }
});

export const useUpload = () => useContext(UploadContext);