import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Button, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { FontAwesome, Ionicons } from '@expo/vector-icons'; 
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera'; 

import { initVlogDB, saveVlogVideo } from '../savedata/vlogdata'; 
import { markRecordingAsCompleted } from '../savedata/settingsStorage';
import { useTheme } from '../backgroundmode/theme';

const MIN_RECORD_TIME = 5;
const MAX_RECORD_TIME = 20;

export default function VlogScreen() {
  const router = useRouter();
  const { mood, activeSlot, scaleId } = useLocalSearchParams(); 
  const { colors } = useTheme();

  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();
  
  const cameraRef = useRef(null);
  const durationRef = useRef(0); 

  const [facing, setFacing] = useState('front'); 
  const [isRecording, setIsRecording] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [canStop, setCanStop] = useState(false); 
  
  // 1. 新增「上傳中」的狀態
  const [isUploading, setIsUploading] = useState(false);

  // 用來避免重複呼叫 stop
  const [isProcessing, setIsProcessing] = useState(false);

  const intervalRef = useRef(null);

  useEffect(() => {
    initVlogDB();
  }, []);

  const toggleCameraFacing = () => {
    if (isRecording) return; // 錄影中禁止切換
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  };

  const stopRecording = async () => {
    if (!isRecording || isProcessing) return; 
    
    setIsProcessing(true); 
    console.log("使用者手動停止錄影...");

    try {
      if (cameraRef.current) {
        cameraRef.current.stopRecording();
      }
    } catch (error) {
      console.error("停止錄影失敗:", error);
      setIsProcessing(false);
    }
  };

  const startRecording = async () => {
    if (!cameraRef.current || isProcessing) return;
    
    console.log("開始錄製... 對應 ScaleID:", scaleId);
    setIsRecording(true);
    setElapsedTime(0);
    durationRef.current = 0; // 重置計時
    setCanStop(false);
    setIsProcessing(false);

    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setElapsedTime((prevTime) => {
        const newTime = prevTime + 1;
        durationRef.current = newTime; 
        
        if (newTime >= MIN_RECORD_TIME) setCanStop(true);
        
        return newTime; 
      });
    }, 1000);

    try {
      const videoData = await cameraRef.current.recordAsync({
        maxDuration: MAX_RECORD_TIME,
        quality: '720p', 
      });

      // --- 錄影結束 ---
      console.log("錄影結束，暫存路徑:", videoData.uri);
      
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setIsRecording(false);

      const finalTime = durationRef.current < MAX_RECORD_TIME ? durationRef.current : MAX_RECORD_TIME;
      
      // 呼叫儲存流程
      await handleSaveAndFinish(videoData.uri, finalTime);

    } catch (error) {
      console.error("錄影過程發生錯誤:", error);
      setIsRecording(false);
      setIsProcessing(false);
      if (intervalRef.current) clearInterval(intervalRef.current);
      
      if (error.message && error.message.includes('permissions')) {
        Alert.alert("權限不足", "請確認您已允許麥克風權限");
      }
    }
  };

  const handleSaveAndFinish = async (tempUri, finalDuration) => {
    try {
      // 2. 開始上傳：顯示轉圈圈畫面
      setIsUploading(true); 

      // 這一步會很久，因為要網路上傳影片
      await saveVlogVideo(tempUri, scaleId, finalDuration);
      
      // 標記完成
      await markRecordingAsCompleted(activeSlot);

      // 3. 上傳完成：隱藏轉圈圈 (其實不用，因為 Alert 跳出來就擋住了)
      setIsUploading(false);

      Alert.alert(
        "上傳完成",
        "影片已成功儲存至雲端！",
        [
          { 
            text: "回到首頁", 
            onPress: () => router.push('/(tabs)') 
          }
        ],
        { cancelable: false }
      );
    } catch (error) {
      setIsUploading(false); // 失敗要取消轉圈圈，讓使用者可以重試或離開
      Alert.alert("儲存失敗", "影片上傳時發生錯誤，請檢查網路。");
      console.error(error);
    }
  };

  if (!cameraPermission || !micPermission) {
    return <View style={styles.container} />;
  }

  if (!cameraPermission.granted || !micPermission.granted) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: 'white', textAlign: 'center', marginBottom: 20, fontSize: 16 }}>
          錄製 Vlog 需要同時開啟 {'\n'}「相機」與「麥克風」權限
        </Text>
        {!cameraPermission.granted && (
          <View style={{ marginVertical: 10 }}>
             <Button onPress={requestCameraPermission} title="授權相機" />
          </View>
        )}
        {!micPermission.granted && (
          <View style={{ marginVertical: 10 }}>
            <Button onPress={requestMicPermission} title="授權麥克風" />
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView 
        style={styles.cameraPreview} 
        facing={facing} 
        mode="video"   
        ref={cameraRef}
      >
        {isRecording && (
          <View style={styles.timerOverlay}>
            <Text style={styles.timerText}>
              {elapsedTime}s / {MAX_RECORD_TIME}s
            </Text>
          </View>
        )}

        {!isRecording && !isUploading && (
          <>
            <View style={styles.instructionContainer}>
              <Text style={styles.instructionTitle}>錄影提醒：</Text>
              <Text style={styles.instructionText}>• 點擊紅鈕開始錄影 (5~20秒)</Text>
              <Text style={styles.instructionText}>• 鏡頭方向只能在錄影前切換</Text>
            </View>

            <TouchableOpacity 
              style={styles.flipButton} 
              onPress={toggleCameraFacing}
            >
              <Ionicons name="camera-reverse" size={28} color="white" />
            </TouchableOpacity>
          </>
        )}

        {/* 4. 上傳時的遮罩層 */}
        {isUploading && (
          <View style={styles.uploadingOverlay}>
            <ActivityIndicator size="large" color="#ffffff" />
            <Text style={styles.uploadingText}>正在上傳影片，請稍候...</Text>
            <Text style={styles.uploadingSubText}>(這可能需要幾秒鐘)</Text>
          </View>
        )}

      </CameraView>

      <View style={styles.controlsContainer}>
        {/* 如果正在上傳，隱藏操作按鈕，避免誤觸 */}
        {!isUploading && (
          !isRecording ? (
            <TouchableOpacity 
              style={styles.recordButtonOuter}
              onPress={startRecording}
              disabled={isProcessing}
            >
              <FontAwesome name="circle" size={40} color="red" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              style={[ styles.stopButtonOuter, !canStop && styles.disabledButton ]} 
              onPress={stopRecording} 
              disabled={!canStop || isProcessing} 
            >
              <FontAwesome name="square" size={40} color="white" />
            </TouchableOpacity>
          )
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'black' },
  cameraPreview: { flex: 1 }, 
  
  timerOverlay: { 
    position: 'absolute', 
    top: 60, 
    alignSelf: 'center',
    backgroundColor: 'rgba(255, 0, 0, 0.6)', 
    paddingVertical: 8,
    paddingHorizontal: 15, 
    borderRadius: 20 
  },
  timerText: { fontSize: 24, fontWeight: 'bold', color: 'white' },

  instructionContainer: {
    position: 'absolute',
    top: 60, 
    left: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)', 
    padding: 12,
    borderRadius: 10,
    maxWidth: '75%', 
  },
  instructionTitle: {
    color: '#FFD700', 
    fontWeight: 'bold',
    fontSize: 14,
    marginBottom: 4,
  },
  instructionText: {
    color: 'white',
    fontSize: 13,
    marginBottom: 2,
    lineHeight: 18,
  },

  flipButton: {
    position: 'absolute',
    top: 60,    
    right: 20,  
    width: 50,
    height: 50,
    borderRadius: 25, 
    backgroundColor: 'rgba(0,0,0,0.5)', 
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)' 
  },
  
  // 新增：上傳遮罩樣式
  uploadingOverlay: {
    ...StyleSheet.absoluteFillObject, // 填滿整個相機畫面
    backgroundColor: 'rgba(0,0,0,0.7)', // 半透明黑底
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  uploadingText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 20,
  },
  uploadingSubText: {
    color: '#ccc',
    fontSize: 14,
    marginTop: 5,
  },

  controlsContainer: { 
    height: 150, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: 'black' 
  },
  recordButtonOuter: { width: 80, height: 80, borderRadius: 40, borderWidth: 5, borderColor: 'white', backgroundColor: 'transparent', justifyContent: 'center', alignItems: 'center' },
  stopButtonOuter: { width: 80, height: 80, borderRadius: 40, borderWidth: 5, borderColor: 'white', backgroundColor: 'red', justifyContent: 'center', alignItems: 'center' },
  disabledButton: { opacity: 0.3 },
});