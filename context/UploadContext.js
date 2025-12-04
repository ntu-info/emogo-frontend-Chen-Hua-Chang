// context/UploadContext.js
import React, { createContext, useState, useContext } from 'react';
import { Alert, View, Text, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { storeGpsData } from '../savedata/gpsdata';
import { storeScaleData } from '../savedata/scaledata';
import { saveVlogVideo } from '../savedata/vlogdata';

const UploadContext = createContext();

export const UploadProvider = ({ children }) => {
  // 記錄是否正在後台忙碌
  const [isUploading, setIsUploading] = useState(false);
  const [progressText, setProgressText] = useState('');

  /**
   * 背景上傳任務
   */
  const startBackgroundUpload = async (moodScore, activeSlot, vlogUri, duration, lat, lng) => {
    setIsUploading(true);
    // 這裡維持你想要的長文字提示
    setProgressText('紀錄上傳中，可離開讓app在背景跑，但請先不要關閉');

    try {
      // 1. 上傳 GPS
      console.log("[Background] 上傳 GPS...");
      const gpsId = await storeGpsData(lat, lng);

      // 2. 上傳心情
      console.log("[Background] 上傳心情...");
      const scaleId = await storeScaleData(moodScore, activeSlot, gpsId);

      // 3. 上傳影片
      console.log("[Background] 上傳影片...");
      await saveVlogVideo(vlogUri, scaleId, duration);

      console.log("[Background] 全部完成！");
      
      // --- 新增：成功後的確認視窗 ---
      // 這裡會跳出視窗，等使用者按 OK
      Alert.alert(
        "上傳完成", 
        "您的紀錄已成功備份！", 
        [{ text: "OK" }]
      );
      
    } catch (error) {
      console.error("[Background] 上傳失敗:", error);
      Alert.alert("上傳失敗", "剛才的紀錄上傳失敗，請檢查網路連線。");
    } finally {
      // 無論成功或失敗，最後都會把下方黑色進度條關掉
      setIsUploading(false);
      setProgressText('');
    }
  };

  return (
    <UploadContext.Provider value={{ startBackgroundUpload, isUploading }}>
      {children}
      
      {/* 這裡是一個全域的「浮動狀態列」 */}
      {isUploading && (
        <View style={styles.floatingStatus}>
          <ActivityIndicator size="small" color="#fff" />
          <View style={styles.textContainer}>
            <Text style={styles.statusText}>
              {progressText}
            </Text>
          </View>
        </View>
      )}
    </UploadContext.Provider>
  );
};

const styles = StyleSheet.create({
  floatingStatus: {
    position: 'absolute',
    bottom: 40, // 稍微拉高一點，避開某些手機的 Home Bar
    left: 20,
    right: 20,
    backgroundColor: 'rgba(30, 30, 30, 0.9)', // 顏色加深一點點，更有質感
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12, // 圓角稍微小一點，比較俐落
    flexDirection: 'row',
    alignItems: 'center',
    // 增加陰影讓它浮起來的感覺更明顯
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 9999,
  },
  // 新增一個文字容器來控制排版
  textContainer: {
    flex: 1, // 關鍵：讓文字區塊佔據剩下的所有空間
    marginLeft: 12, // 與轉圈圈保持距離
  },
  statusText: {
    color: 'white',
    fontSize: 14,
    lineHeight: 20, // 增加行高，如果換行才不會擠在一起
    textAlign: 'left', // 靠左對齊，閱讀起來比較舒服
  }
});

export const useUpload = () => useContext(UploadContext);