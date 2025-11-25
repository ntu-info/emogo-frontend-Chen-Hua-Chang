import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, 
  TouchableOpacity, Dimensions, 
  Button, Alert 
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router'; 

// 1. 同時引入兩個資料儲存模組
// 使用 ../ 回到上一層目錄去抓 savedata
import { initScaleDB, storeScaleData } from '../savedata/scaledata';
import { initGpsDB, storeGpsData } from '../savedata/gpsdata';

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

  // 2. 初始化兩個資料庫
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
      // 步驟 A: 先存 GPS 資料 (獨立儲存)
      const lat = latitude ? parseFloat(latitude) : 0;
      const lng = longitude ? parseFloat(longitude) : 0;
      
      // 取得剛存好的 GPS 資料 ID
      const gpsId = await storeGpsData(lat, lng);
      
      // 步驟 B: 再存情緒資料 (把 gpsId 關聯進去)
      const scaleId = await storeScaleData(selectedMood, activeSlot, gpsId);
      
      // 步驟 C: 跳轉到 Vlog
      // 我們依然把 scaleId 傳下去，之後 Vlog 資料表可以關聯這個 scaleId
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

  // ... (render 和 styles 部分完全不用動) ...
  return (
    <View style={styles.container}>
      <Text style={styles.title}>你現在的心情如何？</Text>

      <View style={styles.moodContainer}>
        {MOODS.map((mood) => (
          <TouchableOpacity
            key={mood.score}
            style={[
              styles.moodButton, { width: buttonSize, height: buttonSize },
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
          color="#007AFF"
        />
      </View>

      <Text style={styles.link}>
        (時段: {activeSlot || 'N/A'})
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16, backgroundColor: 'white' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 40 },
  moodContainer: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', width: '100%' },
  moodButton: { alignItems: 'center', justifyContent: 'center', borderRadius: buttonSize / 2, backgroundColor: '#f0f0f0' },
  selectedMoodButton: { backgroundColor: '#007AFF', transform: [{ scale: 1.1 }] },
  emoji: {},
  vlogButtonContainer: { marginTop: 60, width: '80%' },
  link: { marginTop: 20, fontSize: 14, color: 'gray' },
});