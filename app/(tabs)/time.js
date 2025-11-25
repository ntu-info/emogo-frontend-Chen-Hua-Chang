import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Button, Alert, ScrollView, Platform, ActivityIndicator } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useRouter } from 'expo-router';

// 1. 引入資料儲存邏輯
import { saveTimeSettings, canEditSettings, loadTimeSettings } from '../../savedata/settingsStorage'; 
// 2. 引入單一通知排程函數 (名稱已修正為 scheduleDailyReminders)
import { scheduleDailyReminders } from '../../savedata/reminder'; 

// ====================================================
// 畫面元件開始
// ====================================================

const HOURS = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
const MINUTES = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));

const timeToMinutes = (hour, minute) => {
  return parseInt(hour, 10) * 60 + parseInt(minute, 10);
};

const SIX_HOURS_IN_MINUTES = 6 * 60;

export default function TimeScreen() {
  const [time1Hour, setTime1Hour] = useState("08");
  const [time1Minute, setTime1Minute] = useState("00");
  const [time2Hour, setTime2Hour] = useState("14");
  const [time2Minute, setTime2Minute] = useState("00");
  const [time3Hour, setTime3Hour] = useState("20");
  const [time3Minute, setTime3Minute] = useState("00");
  
  const [isLocked, setIsLocked] = useState(false);
  const [isLoading, setIsLoading] = useState(true); // 保留載入狀態
  const router = useRouter();

  useEffect(() => {
    const checkLockStatus = async () => {
      setIsLoading(true);
      
      const canEdit = await canEditSettings();
      setIsLocked(!canEdit); 

      // 載入已儲存的時間
      const { time1, time2, time3 } = await loadTimeSettings();
      if (time1) {
        setTime1Hour(time1.split(':')[0]);
        setTime1Minute(time1.split(':')[1]);
      }
      if (time2) {
        setTime2Hour(time2.split(':')[0]);
        setTime2Minute(time2.split(':')[1]);
      }
      if (time3) {
        setTime3Hour(time3.split(':')[0]);
        setTime3Minute(time3.split(':')[1]);
      }
      
      setIsLoading(false);
    };
    
    checkLockStatus();
  }, []);

  const handleSaveSettings = async () => {
    const t1_minutes = timeToMinutes(time1Hour, time1Minute);
    const t2_minutes = timeToMinutes(time2Hour, time2Minute);
    const t3_minutes = timeToMinutes(time3Hour, time3Minute);

    // 檢查間隔 6 小時
    if (t2_minutes - t1_minutes < SIX_HOURS_IN_MINUTES) {
      Alert.alert("時間間隔不足", "「第二次」的時間必須在「第一次」的 6 小時之後。");
      return;
    }
    if (t3_minutes - t2_minutes < SIX_HOURS_IN_MINUTES) {
      Alert.alert("時間間隔不足", "「第三次」的時間必須在「第二次」的 6 小時之後。");
      return;
    }

    const time1 = `${time1Hour}:${time1Minute}`;
    const time2 = `${time2Hour}:${time2Minute}`;
    const time3 = `${time3Hour}:${time3Minute}`;
    
    Alert.alert(
      "確認設定？",
      `您設定的時間為：\n${time1}, ${time2}, ${time3}\n\n此設定將「立即生效」，並為您設定每日提醒通知。`,
      [
        { text: "取消", style: "cancel" },
        { 
          text: "確定", 
          onPress: async () => { 
            // 儲存設定 (包含今日日期鎖定)
            await saveTimeSettings(time1, time2, time3);
            
            // 設定通知鬧鐘
            const timesArray = [time1, time2, time3];
            await scheduleDailyReminders(timesArray); // <-- 這裡呼叫修正後的函數
            
            console.log("已確認設定並排程通知！");
            setIsLocked(true); 
            router.push('/(tabs)');
          }
        }
      ]
    );
  };

  const renderTimePicker = (label, hourVal, setHourVal, minuteVal, setMinuteVal) => (
    <View style={styles.pickerContainer}>
      <Text style={styles.pickerLabel}>{label}</Text>
      <View style={styles.wheelContainer}>
        <Picker
          style={styles.wheel}
          itemStyle={styles.wheelItem}
          selectedValue={hourVal}
          onValueChange={(itemValue) => setHourVal(itemValue)}
          enabled={!isLocked} 
        >
          {HOURS.map((hour) => (
            <Picker.Item key={hour} label={hour} value={hour} />
          ))}
        </Picker>
        <Text style={styles.colon}>:</Text>
        <Picker
          style={styles.wheel}
          itemStyle={styles.wheelItem}
          selectedValue={minuteVal}
          onValueChange={(itemValue) => setMinuteVal(itemValue)}
          enabled={!isLocked}
        >
          {MINUTES.map((minute) => (
            <Picker.Item key={minute} label={minute} value={minute} />
          ))}
        </Picker>
      </View>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={{ marginTop: 10 }}>載入設定中...</Text>
      </View>
    )
  }

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.scrollContainer}
    >
      <Text style={styles.title}>設定每日紀錄時間</Text>
      
      {isLocked && (
        <Text style={styles.lockedText}>
          您今天已設定過時間，如需修改請明天再來。
        </Text>
      )}

      {renderTimePicker("第一次", time1Hour, setTime1Hour, time1Minute, setTime1Minute)}
      {renderTimePicker("第二次", time2Hour, setTime2Hour, time2Minute, setTime2Minute)}
      {renderTimePicker("第三次", time3Hour, setTime3Hour, time3Minute, setTime3Minute)}

      <Text style={styles.instructions}>
        請設定三個時間點，時段之間須間隔 6 小時。
      </Text>

      <View style={styles.buttonContainer}>
        <Button 
          title={isLocked ? "今日已設定完成" : "設定完成"} 
          onPress={handleSaveSettings} 
          disabled={isLocked}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContainer: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 50,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  pickerContainer: {
    width: '100%',
    marginBottom: 0,
    alignItems: 'center',
  },
  pickerLabel: {
    fontSize: 18,
    fontWeight: '500',
    marginBottom: 0,
    color: '#333'
  },
  wheelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: Platform.OS === 'android' ? '60%' : '80%',
    height: 120,
    overflow: 'hidden',
  },
  wheel: {
    flex: 1,
    height: 120,
  },
  wheelItem: {
    fontSize: 26,
    height: 120,
  },
  colon: {
    fontSize: 26,
    fontWeight: 'bold',
    marginHorizontal: 10,
    transform: [{ translateY: Platform.OS === 'android' ? -15 : 0 }]
  },
  instructions: {
    fontSize: 14,
    color: 'gray',
    textAlign: 'center',
    marginTop: 15,
    marginBottom: 25,
  },
  buttonContainer: {
    width: '80%',
  },
  lockedText: {
    fontSize: 16,
    color: 'red',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    padding: 10,
    borderWidth: 1,
    borderColor: 'red',
    borderRadius: 5,
  }
});