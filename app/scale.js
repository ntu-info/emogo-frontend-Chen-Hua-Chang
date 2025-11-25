import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, 
  TouchableOpacity, Dimensions, 
  Button, Alert 
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router'; 

import { initScaleDB, storeScaleData } from '../savedata/scaledata';
import { initGpsDB, storeGpsData } from '../savedata/gpsdata';
// 引入主題
import { useTheme } from '../backgroundmode/theme';

const screenWidth = Dimensions.get('window').width;
const buttonSize = screenWidth / 6; 
const emojiSize = buttonSize * 0.7; 
const MOODS = [
  { score: 1, emoji: '😡' }, { score: 2, emoji: '😞' }, { score: 3, emoji: '😐' },
  { score: 4, emoji: '😊' }, { score: 5, emoji: '😍' },
];

export default function ScaleScreen() {
  const [selectedMood, setSelectedMood] = useState(null); 
  const router = useRouter(); 
  const { latitude, longitude, activeSlot } = useLocalSearchParams();
  
  // 取得主題顏色
  const { colors } = useTheme();

  useEffect(() => {
    initScaleDB();
    initGpsDB();
  }, []);

  const handleMoodPress = (score) => {
    setSelectedMood(score); 
  };

  const handleStartVlog = async () => {
    if (selectedMood === null) {
      Alert.alert( "尚未填寫", "請先選擇一個代表您現在心情的表情" );
      return;
    }

    try {
      const lat = latitude ? parseFloat(latitude) : 0;
      const lng = longitude ? parseFloat(longitude) : 0;
      
      const gpsId = await storeGpsData(lat, lng);
      const scaleId = await storeScaleData(selectedMood, activeSlot, gpsId);
      
      router.push({
        pathname: '/vlog', 
        params: { 
          mood: selectedMood,
          activeSlot: activeSlot,
          scaleId: scaleId 
        } 
      });

    } catch (error) {
      Alert.alert("錯誤", "資料儲存失敗");
      console.error(error);
    }
  };

  return (
    // 套用動態背景色
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* 套用動態文字色 */}
      <Text style={[styles.title, { color: colors.text }]}>你現在的心情如何？</Text>

      <View style={styles.moodContainer}>
        {MOODS.map((mood) => (
          <TouchableOpacity
            key={mood.score}
            style={[
              styles.moodButton, 
              { width: buttonSize, height: buttonSize },
              // 未選中時使用卡片背景色，選中時維持藍色
              { backgroundColor: selectedMood === mood.score ? '#007AFF' : colors.card },
              selectedMood === mood.score && styles.selectedMoodButton
            ]}
            onPress={() => handleMoodPress(mood.score)}
          >
            <Text style={[styles.emoji, { fontSize: emojiSize }]}>{mood.emoji}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.vlogButtonContainer}>
        <Button
          title="開始錄製 Vlog"
          onPress={handleStartVlog}
          color={colors.primary}
        />
      </View>

      <Text style={[styles.link, { color: colors.placeholder }]}>
        (時段: {activeSlot || 'N/A'})
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 40 },
  moodContainer: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', width: '100%' },
  moodButton: { alignItems: 'center', justifyContent: 'center', borderRadius: buttonSize / 2 },
  selectedMoodButton: { transform: [{ scale: 1.1 }] },
  emoji: {},
  vlogButtonContainer: { marginTop: 60, width: '80%' },
  link: { marginTop: 20, fontSize: 14 },
});