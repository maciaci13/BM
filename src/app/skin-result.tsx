import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { notify } from "../lib/notify";
import { Button, Card, Chip, Row, Section } from '../components/ui';
import { SkinAnalysis } from '../lib/ai';
import { useI18n } from '../lib/i18n';
import { supabase } from '../lib/supabase';
import { colors, radius, type } from '../lib/theme';

export default function SkinResult() {
  const { t } = useI18n();
  const params = useLocalSearchParams<{ analysis: string }>();
  const [analysis] = useState<SkinAnalysis>(() => JSON.parse(params.analysis ?? '{}'));
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error('No session');
      const merged = { ...analysis, user_notes: notes || undefined, confirmed_at: new Date().toISOString() };
      const concerns = (analysis.concerns ?? []).map((c) => c.name);
      await supabase.from('skin_scans').insert({
        user_id: auth.user.id,
        ai_analysis: merged,
        user_notes: notes || null,
        confirmed: true,
      });
      await supabase
        .from('profiles')
        .update({ current_skin_analysis: merged, skin_type: analysis.skin_type, skin_concerns: concerns, onboarding_completed: true })
        .eq('id', auth.user.id);
      notify(t('saved'));
      router.replace('/(tabs)');
    } catch (e: any) {
      notify(e.message ?? t('error'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 20, paddingTop: 64, paddingBottom: 48 }}>
      <Text style={type.display}>{t('skinResult')}</Text>
      <Text style={[type.small, { marginTop: 6, marginBottom: 20 }]}>{t('skinResultHint')}</Text>

      <Card style={{ marginBottom: 16 }}>
        <Row style={{ marginBottom: 10 }}>
          <Chip label={`${t('skinType')}: ${analysis.skin_type}`} tone="accent" />
        </Row>
        <Text style={type.body}>{analysis.summary}</Text>
      </Card>

      <Section title={t('concerns')}>
        <View style={{ gap: 8 }}>
          {(analysis.concerns ?? []).map((c, i) => (
            <Card key={i}>
              <Row style={{ marginBottom: 6 }}>
                <Text style={type.h2}>{c.name}</Text>
                <Chip label={c.severity} tone={c.severity === 'notable' ? 'warn' : 'neutral'} />
              </Row>
              <Text style={type.small}>{c.note}</Text>
            </Card>
          ))}
        </View>
      </Section>

      <Section title={t('observations')}>
        {(analysis.observations ?? []).map((o, i) => (
          <Text key={i} style={[type.body, { marginBottom: 6 }]}>• {o}</Text>
        ))}
      </Section>

      <Section title={t('recommendations')}>
        {(analysis.recommendations ?? []).map((r, i) => (
          <Text key={i} style={[type.body, { marginBottom: 6 }]}>• {r}</Text>
        ))}
      </Section>

      <TextInput
        style={s.notes}
        placeholder={t('yourNotes')}
        placeholderTextColor={colors.muted}
        multiline
        value={notes}
        onChangeText={setNotes}
      />
      <Button title={t('saveToProfile')} onPress={save} loading={saving} style={{ marginTop: 16 }} />
      <Text style={[type.small, { textAlign: 'center', marginTop: 12 }]}>{t('aiDisclaimer')}</Text>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  notes: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    minHeight: 90,
    padding: 14,
    fontSize: 15,
    color: colors.ink,
    textAlignVertical: 'top',
  },
});
