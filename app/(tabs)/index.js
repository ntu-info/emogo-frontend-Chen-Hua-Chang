import React, { useState, useCallback, useRef } from 'react';
import { View, Text, Button, StyleSheet, AppState } from "react-native";
import { useRouter, useFocusEffect } from "expo-router"; 
import { fetchCurrentLocation } from '../../savedata/gps.js';
import { loadTimeSettings, loadRecordingStatus } from '../../savedata/settingsStorage.js';

// 輔助函數：將 "08:00" 這樣的字串轉為今天的 Date 物件
const parseTime = (timeString) => {
  if (!timeString) return null;
  const [hours, minutes] = timeString.split(':');
  const date = new Date();
  // 注意：這裡設定的是本地時間
  date.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0); 
  return date;
};

const FIVE_MIN_MS = 5 * 60 * 1000; // 5 分鐘的毫秒數

export default function HomeScreen() {
  const router = useRouter(); 
  
  const [buttonState, setButtonState] = useState({
    text: '載入中...',
    disabled: true,
    activeSlot: null,
  });

  const intervalRef = useRef(null);

  useFocusEffect(
    useCallback(() => {
      console.log("[Index] 進入首頁，開始檢查時間...");

      const checkTimeLogic = async () => {
        // 讀取所有設定
        const settings = await loadTimeSettings();
        
        // --- 邏輯 A (未設定) ---
        if (!settings.time1) {
          setButtonState({
            text: '請先進行時間設定',
            disabled: false, 
            activeSlot: 'go_to_settings',
          });
          return; 
        }

        // --- 邏輯 B (已設定) ---
        const status = await loadRecordingStatus();
        
        // 確保 slots 包含了 T1, T2, T3 的時間 (從 settings 讀取) 和完成狀態
        const slots = [
          { id: 't1', time: parseTime(settings.time1), completed: status.t1_completed },
          { id: 't2', time: parseTime(settings.time2), completed: status.t2_completed },
          { id: 't3', time: parseTime(settings.time3), completed: status.t3_completed }
        ].filter(slot => slot.time !== null);

        // 執行「按鈕狀態」檢查
        updateButtonState(slots);
      };

      // 立即執行一次
      checkTimeLogic();
      
      // 建立一個計時器，每 5 秒檢查一次
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = setInterval(checkTimeLogic, 5000);

      // 當使用者「離開」這個頁面時，清除計時器
      return () => {
        if (intervalRef.current) {
          console.log("[Index] 離開首頁，清除計時器。");
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      };
    }, [])
  );

  // 核心判斷邏輯 (V12.0 - 區分是否有完成過時段)
  const updateButtonState = (slots) => {
    const now_ms = new Date().getTime();

    let activeSlotFound = null; 
    let allCompleted = true; 
    let hasCompleted = false; // 是否有任何時段已完成
    let hasUpcomingSlot = false; // 是否有尚未開始的時段
    let isCurrentlyMissed = false; // 是否有未完成且已過期的時段
    let lastMissedSlot = null; // 記錄最後一個（最接近現在的）未完成且已過期的時段

    // 第一遍迴圈：檢查所有時段的狀態
    for (const slot of slots) {
      if (!slot.time) continue; 

      if (slot.completed) {
        hasCompleted = true;
      } else {
        allCompleted = false;

        const slotStart = slot.time.getTime();
        const slotEnd = slotStart + FIVE_MIN_MS;

        if (now_ms >= slotStart && now_ms < slotEnd) {
          // 情況 A：在 5 分鐘窗口內！ (可點擊)
          activeSlotFound = slot.id;
          break; // 找到可按的，停止迴圈
        }
        
        // 不在窗口內，繼續檢查並收集所有信息
        if (now_ms < slotStart) {
          // 情況 B：未來時段
          hasUpcomingSlot = true;
        } else if (now_ms >= slotEnd) {
          // 情況 C：已錯過 (持續更新到最後一個已過期的未完成時段)
          isCurrentlyMissed = true;
          lastMissedSlot = slot;
        }
      }
    }

    // 2. 根據檢查結果更新 UI
    if (activeSlotFound) {
      // (A) 在窗口內 (優先級最高)
      setButtonState({
        text: '開始填寫按鈕',
        disabled: false,
        activeSlot: activeSlotFound,
      });
    } else if (allCompleted) {
      // (B) 今日所有時段都已完成
      setButtonState({
        text: '今日已完成',
        disabled: true,
        activeSlot: null,
      });
    } else if (hasCompleted && isCurrentlyMissed && !hasUpcomingSlot) {
      // (C) 已完成過至少一個時段，但還有未完成的已過期時段，且沒有未來時段
      setButtonState({
        text: '尚未到下個紀錄時間',
        disabled: true,
        activeSlot: null,
      });
    } else if (!hasCompleted && isCurrentlyMissed && !hasUpcomingSlot) {
      // (D) 完全沒完成過任何時段，所有未完成時段都已過期，沒有未來時段
      if (lastMissedSlot) {
        setButtonState({
          text: `已錯過設定的第${slots.indexOf(lastMissedSlot) + 1}個紀錄時間`,
          disabled: true,
          activeSlot: null,
        });
      } else {
        setButtonState({
          text: '超過紀錄時間',
          disabled: true,
          activeSlot: null,
        });
      }
    } else if (!hasCompleted && isCurrentlyMissed && hasUpcomingSlot) {
      // (E) 完全沒完成過任何時段，但有已過期的未完成時段，也有未來時段
      if (lastMissedSlot) {
        setButtonState({
          text: `已錯過設定的第${slots.indexOf(lastMissedSlot) + 1}個紀錄時間`,
          disabled: true,
          activeSlot: null,
        });
      } else {
        setButtonState({
          text: '超過紀錄時間',
          disabled: true,
          activeSlot: null,
        });
      }
    } else if (hasUpcomingSlot) {
      // (F) 沒有已錯過的時段，但有未來的時段
      setButtonState({
        text: '尚未到下個紀錄時間',
        disabled: true,
        activeSlot: null,
      });
    } else {
        // 保護性 else
        setButtonState({
            text: '載入錯誤或時區異常',
            disabled: true,
            activeSlot: null,
        });
    }
  };

  // 3. 按鈕的「總控制器」
  const handleButtonPress = async () => {
    const { activeSlot, disabled } = buttonState;
    
    if (disabled) return; 

    if (activeSlot === 'go_to_settings') {
      // 狀態 1：未設定 -> 跳轉到 time 頁面
      router.push('/time'); 
    } else if (activeSlot) {
      // 狀態 2：已設定且在時段內 -> 執行 GPS 並跳轉到 scale
      const location = await fetchCurrentLocation();
      if (location) {
        console.log(`[Action] GPS 成功，正在跳轉... (時段: ${activeSlot})`);
        router.push({
          pathname: '/scale',
          params: { 
            latitude: location.latitude,
            longitude: location.longitude,
            activeSlot: activeSlot, 
          }
        });
      } else {
        console.log("[Action] GPS 失敗或被拒絕，停止跳轉。");
      }
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>首頁</Text>

      {/* 主要功能按鈕 */}
      <Button 
        title={buttonState.text}
        onPress={handleButtonPress} 
        disabled={buttonState.disabled}
      />
      
      {/* -------- 新增：查看收集到的資料按鈕 -------- */}
      <View style={{ marginTop: 40, width: '80%' }}>
        <Button 
          title="查看收集到的資料 (除錯用)" 
          onPress={() => router.push('/records')} 
          color="#888" // 灰色，代表開發者/除錯功能
        />
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  title: {
    fontSize: 24,
    marginBottom: 24,
  },
  link: {
    fontSize: 16,
    marginBottom: 12,
    textDecorationLine: "underline",
  },
});