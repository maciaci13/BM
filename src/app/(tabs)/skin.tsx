import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import React, { useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { notify } from "../../lib/notify";
import { Button, Card } from '../../components/ui';
import { analyzeSkin } from '../../lib/ai';
import { useI18n } from '../../lib/i18n';
import { colors, type } from '../../lib/theme';

const FRAME_COUNT = 4;
const FRAME_INTERVAL_MS = 1200;

export default function SkinScan() {
  const { t, lang } = useI18n();
  const [permission, requestPermission] = useCameraPermissions();
  const camRef = useRef<CameraView>(null);
  const [phase, setPhase] = useState<'idle' | 'scanning' | 'analyzing'>('idle');
  const [progress, setProgress] = useState(0);

  const start = async () => {
    if (!camRef.current) return;
    setPhase('scanning');
    const frames: string[] = [];
    try {
      for (let i = 0; i < FRAME_COUNT; i++) {
        const photo = await camRef.current.takePictureAsync({ base64: true, quality: 0.35, skipProcessing: true });
        if (photo?.base64) frames.push(photo.base64);
        setProgress(i + 1);
        if (i < FRAME_COUNT - 1) await new Promise((r) => setTimeout(r, FRAME_INTERVAL_MS));
      }
      setPhase('analyzing');
      const analysis = await analyzeSkin(frames, undefined, lang);
      setPhase('idle');
      setProgress(0);
      router.push({ pathname: '/skin-result', params: { analysis: JSON.stringify(analysis) } });
    } catch (e: any) {
      setPhase('idle');
      setProgress(0);
      notify(e.message ?? t('error'));
    }
  };

  if (!permission) return <View style={s.center}><ActivityIndicator color={colors.accent} /></View>;

  if (!permission.granted)
    return (
      <View style={[s.center, { padding: 24 }]}>
        <Text style={[type.body, { textAlign: 'center', marginBottom: 16 }]}>{t('needCamera')}</Text>
        <Button title={t('grantCamera')} onPress={requestPermission} />
      </View>
    );

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ padding: 20, paddingTop: 64 }}>
        <Text style={type.display}>{t('skinScanTitle')}</Text>
      </View>
      <View style={s.camWrap}>
        <CameraView ref={camRef} style={StyleSheet.absoluteFill} facing="front" />
        {/* face guide */}
        <View pointerEvents="none" style={s.guide} />
        {phase === 'scanning' && (
          <View style={s.overlay}>
            <Text style={s.overlayText}>{t('scanning')}</Text>
            <Text style={s.overlayText}>{progress}/{FRAME_COUNT}</Text>
          </View>
        )}
        {phase === 'analyzing' && (
          <View style={s.overlay}>
            <ActivityIndicator color="#fff" />
            <Text style={s.overlayText}>{t('analyzing')}</Text>
          </View>
        )}
      </View>
      <View style={{ padding: 20 }}>
        <Card style={{ marginBottom: 14 }}>
          <Text style={type.small}>{t('skinScanIntro')}</Text>
        </Card>
        <Button title={t('startScan')} onPress={start} loading={phase !== 'idle'} />
        <Text style={[type.small, { textAlign: 'center', marginTop: 10 }]}>{t('aiDisclaimer')}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  camWrap: { flex: 1, marginHorizontal: 20, borderRadius: 24, overflow: 'hidden', backgroundColor: '#000' },
  guide: {
    position: 'absolute',
    alignSelf: 'center',
    top: '12%',
    width: '62%',
    height: '70%',
    borderRadius: 999,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.7)',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  overlayText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
