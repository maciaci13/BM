import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { notify } from "../../lib/notify";
import { Button, Card, Chip, Row, Section } from '../../components/ui';
import { analyzeRoutine, RoutineAnalysis } from '../../lib/ai';
import { useI18n } from '../../lib/i18n';
import { getProfile, supabase } from '../../lib/supabase';
import { colors, type } from '../../lib/theme';

export default function Routine() {
  const { t, lang } = useI18n();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<RoutineAnalysis | null>(null);
  const [past, setPast] = useState<any[]>([]);

  useEffect(() => {
    supabase
      .from('routines')
      .select('id, name, created_at, ai_analysis')
      .order('created_at', { ascending: false })
      .limit(5)
      .then(({ data }) => setPast(data ?? []));
  }, [result]);

  const run = async (fromCamera: boolean) => {
    const opts: ImagePicker.ImagePickerOptions = { mediaTypes: 'images', base64: true, quality: 0.5 };
    const res = fromCamera ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
    if (res.canceled || !res.assets?.[0]?.base64) return;
    setBusy(true);
    setResult(null);
    try {
      const profile = await getProfile();
      const analysis = await analyzeRoutine(res.assets[0].base64, profile, lang);
      setResult(analysis);
      const { data: auth } = await supabase.auth.getUser();
      if (auth.user) {
        await supabase.from('routines').insert({
          user_id: auth.user.id,
          name: new Date().toLocaleDateString(),
          recognized_products: analysis.products,
          ai_analysis: analysis,
        });
      }
    } catch (e: any) {
      notify(e.message ?? t('error'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 20, paddingTop: 64, paddingBottom: 48 }}>
      <Text style={type.display}>{t('routineTitle')}</Text>
      <Text style={[type.small, { marginTop: 8, marginBottom: 20 }]}>{t('routineIntro')}</Text>

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Button title={t('photoShelf')} onPress={() => run(true)} style={{ flex: 1 }} />
        <Button title={t('pickShelf')} variant="secondary" onPress={() => run(false)} style={{ flex: 1 }} />
      </View>

      {busy && (
        <Card style={{ marginTop: 20, flexDirection: 'row', gap: 12, alignItems: 'center' }}>
          <ActivityIndicator color={colors.accent} />
          <Text style={type.body}>{t('analyzingRoutine')}</Text>
        </Card>
      )}

      {result && (
        <View style={{ marginTop: 28 }}>
          <Card style={{ marginBottom: 24 }}>
            <Text style={type.body}>{result.summary}</Text>
          </Card>

          <Section title={t('recognized')}>
            <View style={{ gap: 8 }}>
              {result.products.map((p, i) => (
                <Card key={i}>
                  <Row style={{ marginBottom: 4 }}>
                    <Text style={[type.h2, { flex: 1 }]}>{p.brand ? `${p.brand} ` : ''}{p.name}</Text>
                    <Chip label={p.type} />
                  </Row>
                  <Text style={type.small}>{p.what_it_does}</Text>
                  <Text style={[type.body, { marginTop: 6, color: colors.accent }]}>{p.fit_for_user}</Text>
                </Card>
              ))}
            </View>
          </Section>

          {result.conflicts?.length > 0 && (
            <Section title="⚠︎">
              {result.conflicts.map((c, i) => (
                <Card key={i} style={{ borderColor: colors.warn, marginBottom: 8 }}>
                  <Text style={type.body}>{c}</Text>
                </Card>
              ))}
            </Section>
          )}

          <Section title={t('routineAdvice')}>
            <Card>
              {result.order_am?.length > 0 && (
                <View style={{ marginBottom: 12 }}>
                  <Text style={type.eyebrow}>AM ☀️</Text>
                  {result.order_am.map((o, i) => (
                    <Text key={i} style={type.body}>{i + 1}. {o}</Text>
                  ))}
                </View>
              )}
              {result.order_pm?.length > 0 && (
                <View style={{ marginBottom: 12 }}>
                  <Text style={type.eyebrow}>PM 🌙</Text>
                  {result.order_pm.map((o, i) => (
                    <Text key={i} style={type.body}>{i + 1}. {o}</Text>
                  ))}
                </View>
              )}
              {result.advice.map((a, i) => (
                <Text key={i} style={[type.body, { marginBottom: 6 }]}>• {a}</Text>
              ))}
            </Card>
          </Section>
        </View>
      )}

      {past.length > 0 && !result && (
        <Section title={t('pastRoutines')} style={{ marginTop: 28 }}>
          <View style={{ gap: 8 }}>
            {past.map((r) => (
              <Card key={r.id}>
                <Text style={type.h2}>{r.name}</Text>
                <Text style={type.small} numberOfLines={2}>{r.ai_analysis?.summary}</Text>
              </Card>
            ))}
          </View>
        </Section>
      )}
    </ScrollView>
  );
}
