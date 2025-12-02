import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, 
  TouchableOpacity, Dimensions, 
  Button, Alert, ActivityIndicator // 1. 引入讀取圈圈
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router'; 

import { initScaleDB, storeScaleData } from '../savedata/scaledata';
import { initGpsDB, storeGpsData } from '../savedata/gpsdata';
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
  const { colors } = useTheme();

  // 2. 新增一個狀態來記錄「是否正在上傳中」
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    initScaleDB();
    initGpsDB();
  }, []);

  const handleMoodPress = (score) => {
    // 如果正在上傳，禁止更改心情，避免干擾
    if (isUploading) return;
    setSelectedMood(score); 
  };

  const handleStartVlog = async () => {
    if (selectedMood === null) {
      Alert.alert( "尚未填寫", "請先選擇一個代表您現在心情的表情" );
      return;
    }

    // 3. 防止重複點擊：如果已經在上傳，就直接無視這次點擊
    if (isUploading) return;

    try {
      // 4. 開始上傳：鎖住按鈕，顯示轉圈圈
      setIsUploading(true);

      const lat = latitude ? parseFloat(latitude) : 0;
      const lng = longitude ? parseFloat(longitude) : 0;
      
      // 這裡依然需要 await，因為我們需要 ID
      // 但現在使用者會看到轉圈圈，知道系統正在運作，就不會亂按了
      const gpsId = await storeGpsData(lat, lng);
      const scaleId = await storeScaleData(selectedMood, activeSlot, gpsId);
      
      // 上傳成功，跳轉頁面
      // 這裡不需要把 isUploading 設回 false，因為頁面都要跳轉了
      router.push({
        pathname: '/vlog', 
        params: { 
          mood: selectedMood,
          activeSlot: activeSlot,
          scaleId: scaleId 
        } 
      });

    } catch (error) {
      // 只有失敗時才需要把按鈕解鎖，讓使用者重試
      setIsUploading(false);
      Alert.alert("錯誤", "資料上傳失敗，請檢查網路連線。");
      console.error(error);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>你現在的心情如何？</Text>

      <View style={styles.moodContainer}>
        {MOODS.map((mood) => (
          <TouchableOpacity
            key={mood.score}
            style={[
              styles.moodButton, 
              { width: buttonSize, height: buttonSize },
              { backgroundColor: selectedMood === mood.score ? '#007AFF' : colors.card },
              selectedMood === mood.score && styles.selectedMoodButton,
              // 如果正在上傳，讓按鈕變半透明，視覺上告知不可點
              isUploading && { opacity: 0.5 }
            ]}
            onPress={() => handleMoodPress(mood.score)}
            disabled={isUploading} // 上傳時禁用按鈕
          >
            <Text style={[styles.emoji, { fontSize: emojiSize }]}>{mood.emoji}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.vlogButtonContainer}>
        {/* 5. 根據狀態顯示按鈕或轉圈圈 */}
        {isUploading ? (
          <ActivityIndicator size="large" color={colors.primary} />
        ) : (
          <Button
            title="開始錄製 Vlog"
            onPress={handleStartVlog}
            color={colors.primary}
          />
        )}
      </View>

      {isUploading && (
        <Text style={{ marginTop: 10, color: colors.placeholder }}>
          資料上傳中，請稍候...
        </Text>
      )}

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
  vlogButtonContainer: { marginTop: 60, width: '80%', height: 50, justifyContent: 'center' }, // 固定高度避免轉圈圈時跳動
  link: { marginTop: 20, fontSize: 14 },
});