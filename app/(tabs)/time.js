import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Button, Alert, ScrollView, Platform, ActivityIndicator } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useRouter } from 'expo-router';

// 引入資料儲存與通知邏輯
import { saveTimeSettings, canEditSettings, loadTimeSettings } from '../../savedata/settingsStorage'; 
import { scheduleDailyReminders } from '../../savedata/reminder'; 
// 引入主題 Hook
import { useTheme } from '../../backgroundmode/theme';

const HOURS = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
const MINUTES = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));

const timeToMinutes = (hour, minute) => {
  return parseInt(hour, 10) * 60 + parseInt(minute, 10);
};

const SIX_HOURS_IN_MINUTES = 6 * 60;

export default function TimeScreen() {
  const { colors } = useTheme(); // 取得動態顏色
  
  const [time1Hour, setTime1Hour] = useState("08");
  const [time1Minute, setTime1Minute] = useState("00");
  const [time2Hour, setTime2Hour] = useState("14");
  const [time2Minute, setTime2Minute] = useState("00");
  const [time3Hour, setTime3Hour] = useState("20");
  const [time3Minute, setTime3Minute] = useState("00");
  
  const [isLocked, setIsLocked] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkLockStatus = async () => {
      setIsLoading(true);
      const canEdit = await canEditSettings();
      setIsLocked(!canEdit); 

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
            await saveTimeSettings(time1, time2, time3);
            const timesArray = [time1, time2, time3];
            await scheduleDailyReminders(timesArray);
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
      {/* 標籤文字變色 */}
      <Text style={[styles.pickerLabel, { color: colors.text }]}>{label}</Text>
      
      <View style={styles.wheelContainer}>
        {/* 小時選擇器 */}
        <View style={[
          styles.pickerWrapper, 
          { backgroundColor: colors.inputBackground, borderColor: colors.border } // 動態背景
        ]}>
          <Picker
            style={[
              styles.pickerStyle, 
              { backgroundColor: colors.inputBackground, color: colors.inputText } // 修正 Android 顏色
            ]}
            itemStyle={[styles.wheelItem, { color: colors.text }]} // iOS 文字顏色
            selectedValue={hourVal}
            onValueChange={(itemValue) => setHourVal(itemValue)}
            enabled={!isLocked}
            dropdownIconColor={colors.inputText} // 修正 Android 下拉箭頭顏色
            mode="dropdown"
          >
            {HOURS.map((hour) => (
              <Picker.Item 
                key={hour} 
                label={hour} 
                value={hour} 
                color={colors.inputText} // 修正 Android 選項顏色
                style={{ backgroundColor: colors.inputBackground }} // 修正 Android 選項背景
              />
            ))}
          </Picker>
        </View>
        
        <Text style={[styles.colon, { color: colors.text }]}>:</Text>
        
        {/* 分鐘選擇器 */}
        <View style={[
          styles.pickerWrapper, 
          { backgroundColor: colors.inputBackground, borderColor: colors.border }
        ]}>
          <Picker
            style={[
              styles.pickerStyle, 
              { backgroundColor: colors.inputBackground, color: colors.inputText }
            ]}
            itemStyle={[styles.wheelItem, { color: colors.text }]}
            selectedValue={minuteVal}
            onValueChange={(itemValue) => setMinuteVal(itemValue)}
            enabled={!isLocked}
            dropdownIconColor={colors.inputText}
            mode="dropdown"
          >
            {MINUTES.map((minute) => (
              <Picker.Item 
                key={minute} 
                label={minute} 
                value={minute} 
                color={colors.inputText}
                style={{ backgroundColor: colors.inputBackground }}
              />
            ))}
          </Picker>
        </View>
      </View>
    </View>
  );

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: 10, color: colors.text }}>載入設定中...</Text>
      </View>
    )
  }

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: colors.background }]} // 動態背景
      contentContainerStyle={styles.scrollContainer}
    >
      <Text style={[styles.title, { color: colors.text }]}>設定每日紀錄時間</Text>
      
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
          color={colors.primary}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // backgroundColor: '#fff', // 移除寫死的背景
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
    marginBottom: 10,
    alignItems: 'center',
  },
  pickerLabel: {
    fontSize: 18,
    fontWeight: '500',
    marginBottom: 5,
  },
  wheelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '90%', 
    marginBottom: 10,
  },
  pickerWrapper: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    // borderColor: '#ddd', // 移除寫死的邊框色
    marginHorizontal: 5,
    overflow: 'hidden',
  },
  pickerStyle: {
    width: '100%',
    height: 50, 
  },
  wheelItem: {
    fontSize: 26,
    height: 120,
  },
  colon: {
    fontSize: 26,
    fontWeight: 'bold',
    marginHorizontal: 5,
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
    fontSize: 14,       // 【修改】從 16 改為 14，確保一行塞得下
    color: 'red',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    paddingVertical: 10,   // 【修改】維持垂直高度舒適
    paddingHorizontal: 5,  // 【修改】減少左右留白，讓文字有更多空間
    borderWidth: 1,
    borderColor: 'red',
    borderRadius: 5,
    width: '100%',         // 【新增】確保寬度撐滿容器
  }
});