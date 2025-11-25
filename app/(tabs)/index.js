import React, { useState, useCallback, useRef } from 'react';
import { View, Text, Button, StyleSheet } from "react-native";
import { useRouter, useFocusEffect } from "expo-router"; 
import { fetchCurrentLocation } from '../../savedata/gps.js';
import { loadTimeSettings, loadRecordingStatus } from '../../savedata/settingsStorage.js';
// 雖然不放按鈕了，但我們還是需要 colors 來讓背景跟文字變色，所以 useTheme 還是要留著
import { useTheme } from '../../backgroundmode/theme'; 

// 輔助函數：將 "08:00" 這樣的字串轉為今天的 Date 物件
const parseTime = (timeString) => {
  if (!timeString) return null;
  const [hours, minutes] = timeString.split(':');
  const date = new Date();
  date.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0); 
  return date;
};

const FIVE_MIN_MS = 5 * 60 * 1000;

export default function HomeScreen() {
  const router = useRouter(); 
  // 這裡只取出 colors，不需要 toggleTheme 了
  const { colors } = useTheme(); 

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
        const settings = await loadTimeSettings();
        
        if (!settings.time1) {
          setButtonState({
            text: '請先進行時間設定',
            disabled: false, 
            activeSlot: 'go_to_settings',
          });
          return; 
        }

        const status = await loadRecordingStatus();
        const slots = [
          { id: 't1', time: parseTime(settings.time1), completed: status.t1_completed },
          { id: 't2', time: parseTime(settings.time2), completed: status.t2_completed },
          { id: 't3', time: parseTime(settings.time3), completed: status.t3_completed }
        ].filter(slot => slot.time !== null);

        updateButtonState(slots);
      };

      checkTimeLogic();
      
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = setInterval(checkTimeLogic, 5000);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      };
    }, [])
  );

  const updateButtonState = (slots) => {
    const now_ms = new Date().getTime();
    let activeSlotFound = null; 
    let allCompleted = true; 
    let hasCompleted = false; 
    let hasUpcomingSlot = false; 
    let isCurrentlyMissed = false; 
    let lastMissedSlot = null; 

    for (const slot of slots) {
      if (!slot.time) continue; 

      if (slot.completed) {
        hasCompleted = true;
      } else {
        allCompleted = false;
        const slotStart = slot.time.getTime();
        const slotEnd = slotStart + FIVE_MIN_MS;

        if (now_ms >= slotStart && now_ms < slotEnd) {
          activeSlotFound = slot.id;
          break; 
        }
        
        if (now_ms < slotStart) {
          hasUpcomingSlot = true;
        } else if (now_ms >= slotEnd) {
          isCurrentlyMissed = true;
          lastMissedSlot = slot;
        }
      }
    }

    if (activeSlotFound) {
      setButtonState({ text: '開始填寫按鈕', disabled: false, activeSlot: activeSlotFound });
    } else if (allCompleted) {
      setButtonState({ text: '今日已完成', disabled: true, activeSlot: null });
    } else if (hasCompleted && isCurrentlyMissed && !hasUpcomingSlot) {
      setButtonState({ text: '尚未到下個紀錄時間', disabled: true, activeSlot: null });
    } else if (!hasCompleted && isCurrentlyMissed && !hasUpcomingSlot) {
      if (lastMissedSlot) {
        setButtonState({ text: `已錯過設定的第${slots.indexOf(lastMissedSlot) + 1}個紀錄時間`, disabled: true, activeSlot: null });
      } else {
        setButtonState({ text: '超過紀錄時間', disabled: true, activeSlot: null });
      }
    } else if (!hasCompleted && isCurrentlyMissed && hasUpcomingSlot) {
      if (lastMissedSlot) {
        setButtonState({ text: `已錯過設定的第${slots.indexOf(lastMissedSlot) + 1}個紀錄時間`, disabled: true, activeSlot: null });
      } else {
        setButtonState({ text: '超過紀錄時間', disabled: true, activeSlot: null });
      }
    } else if (hasUpcomingSlot) {
      setButtonState({ text: '尚未到下個紀錄時間', disabled: true, activeSlot: null });
    } else {
      setButtonState({ text: '載入錯誤或時區異常', disabled: true, activeSlot: null });
    }
  };

  const handleButtonPress = async () => {
    const { activeSlot, disabled } = buttonState;
    if (disabled) return; 

    if (activeSlot === 'go_to_settings') {
      router.push('/time'); 
    } else if (activeSlot) {
      const location = await fetchCurrentLocation();
      if (location) {
        router.push({
          pathname: '/scale',
          params: { 
            latitude: location.latitude,
            longitude: location.longitude,
            activeSlot: activeSlot, 
          }
        });
      }
    }
  };

  return (
    // 套用動態背景色
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* 因為我們在 TabsLayout 已經開啟了 Header (headerShown: true)，
         這行 "首頁" 標題其實可以考慮拿掉，因為上方已經有 "首頁" 兩個字了。
         不過如果您想保留大標題，這行就留著，顏色會自動跟隨主題。
      */}
      <Text style={[styles.title, { color: colors.text }]}>首頁</Text>

      <Button 
        title={buttonState.text}
        onPress={handleButtonPress} 
        disabled={buttonState.disabled}
        color={colors.primary} // 讓按鈕也跟隨主題色 (可選)
      />
      
      <View style={{ marginTop: 40, width: '80%' }}>
        <Button 
          title="查看收集到的資料 (除錯用)" 
          onPress={() => router.push('/records')} 
          color="#888"
        />
      </View>

      {/* 已移除「切換至深色模式」按鈕 
         現在使用者可以透過右上角的圖示來切換
      */}

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
});