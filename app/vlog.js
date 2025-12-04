import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { FontAwesome, Ionicons } from '@expo/vector-icons'; 
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera'; 

import { markRecordingAsCompleted } from '../savedata/settingsStorage';
// 引入背景上傳 Context
import { useUpload } from '../context/UploadContext';

const MIN_RECORD_TIME = 5;
const MAX_RECORD_TIME = 20;

export default function VlogScreen() {
  const router = useRouter();
  // 接收上一頁傳來的資訊
  const { mood, activeSlot, lat, lng } = useLocalSearchParams(); 
  
  // 取得背景上傳函數
  const { startBackgroundUpload } = useUpload();

  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();
  
  const cameraRef = useRef(null);
  const durationRef = useRef(0); 

  const [facing, setFacing] = useState('front'); 
  const [isRecording, setIsRecording] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [canStop, setCanStop] = useState(false); 
  const [isProcessing, setIsProcessing] = useState(false);

  const intervalRef = useRef(null);

  const toggleCameraFacing = () => {
    if (isRecording) return;
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  };

  const stopRecording = async () => {
    if (!isRecording || isProcessing) return; 
    setIsProcessing(true); 
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
    setIsRecording(true);
    setElapsedTime(0);
    durationRef.current = 0;
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
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setIsRecording(false);

      const finalTime = durationRef.current < MAX_RECORD_TIME ? durationRef.current : MAX_RECORD_TIME;
      
      // 觸發背景上傳流程 (射後不理)
      handleFinishAndLeave(videoData.uri, finalTime);

    } catch (error) {
      console.error("錄影錯誤:", error);
      setIsRecording(false);
      setIsProcessing(false);
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
  };

  const handleFinishAndLeave = async (videoUri, duration) => {
    // 1. 把資料丟給背景管理員
    startBackgroundUpload(
      parseInt(mood), 
      activeSlot, 
      videoUri, 
      duration, 
      parseFloat(lat), 
      parseFloat(lng)
    );

    // 2. 標記本地任務完成
    await markRecordingAsCompleted(activeSlot);

    // 3. 立刻回首頁
    router.push('/(tabs)');
  };

  // --- 權限檢查邏輯 ---
  
  // 1. 等待權限載入中
  if (!cameraPermission || !micPermission) {
    return <View style={styles.container} />;
  }

  // 2. 權限未授權 (這就是原本導致白畫面的地方，現在修好了)
  if (!cameraPermission.granted || !micPermission.granted) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: 'white', marginBottom: 20, fontSize: 16, textAlign: 'center' }}>
          我們需要相機與麥克風權限{'\n'}才能錄製您的心情 Vlog
        </Text>
        <TouchableOpacity 
          onPress={requestCameraPermission} 
          style={styles.permissionButton}
        >
          <Text style={styles.permissionBtnText}>授權相機</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={requestMicPermission} 
          style={styles.permissionButton}
        >
          <Text style={styles.permissionBtnText}>授權麥克風</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // 3. 權限已通過，顯示相機
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
            <Text style={styles.timerText}>{elapsedTime}s / {MAX_RECORD_TIME}s</Text>
          </View>
        )}
        
        {!isRecording && (
          <>
            <View style={styles.instructionContainer}>
              <Text style={styles.instructionTitle}>錄影提醒：</Text>
              <Text style={styles.instructionText}>• 點擊紅鈕開始錄影 (5~20秒)</Text>
            </View>
            <TouchableOpacity style={styles.flipButton} onPress={toggleCameraFacing}>
              <Ionicons name="camera-reverse" size={28} color="white" />
            </TouchableOpacity>
          </>
        )}
      </CameraView>

      <View style={styles.controlsContainer}>
        {!isRecording ? (
          <TouchableOpacity style={styles.recordButtonOuter} onPress={startRecording} disabled={isProcessing}>
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
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'black' },
  cameraPreview: { flex: 1 }, 
  timerOverlay: { position: 'absolute', top: 60, alignSelf: 'center', backgroundColor: 'rgba(255, 0, 0, 0.6)', padding: 8, borderRadius: 20 },
  timerText: { fontSize: 24, fontWeight: 'bold', color: 'white' },
  instructionContainer: { position: 'absolute', top: 60, left: 20, backgroundColor: 'rgba(0,0,0,0.5)', padding: 12, borderRadius: 10 },
  instructionTitle: { color: '#FFD700', fontWeight: 'bold', fontSize: 14 },
  instructionText: { color: 'white', fontSize: 13 },
  flipButton: { position: 'absolute', top: 60, right: 20, width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#fff' },
  controlsContainer: { height: 150, justifyContent: 'center', alignItems: 'center', backgroundColor: 'black' },
  recordButtonOuter: { width: 80, height: 80, borderRadius: 40, borderWidth: 5, borderColor: 'white', justifyContent: 'center', alignItems: 'center' },
  stopButtonOuter: { width: 80, height: 80, borderRadius: 40, borderWidth: 5, borderColor: 'white', backgroundColor: 'red', justifyContent: 'center', alignItems: 'center' },
  disabledButton: { opacity: 0.3 },
  // 新增的權限按鈕樣式
  permissionButton: { backgroundColor: 'white', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8, marginVertical: 8, width: 150, alignItems: 'center' },
  permissionBtnText: { fontWeight: 'bold', color: 'black' }
});