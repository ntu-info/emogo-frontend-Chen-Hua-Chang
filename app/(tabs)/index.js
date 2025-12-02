import React, { useState, useCallback, useRef } from 'react';
import { View, Text, Button, StyleSheet } from "react-native";
import { useRouter, useFocusEffect } from "expo-router"; 
import { fetchCurrentLocation } from '../../savedata/gps.js';
import { loadTimeSettings, loadRecordingStatus } from '../../savedata/settingsStorage.js';
import { useTheme } from '../../backgroundmode/theme'; 

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
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>首頁</Text>

      <Button 
        title={buttonState.text}
        onPress={handleButtonPress} 
        disabled={buttonState.disabled}
        color={colors.primary} 
      />
      
      {/* 這裡原本的除錯按鈕已移除 */}

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