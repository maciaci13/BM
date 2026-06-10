import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, Chip, Row, Section } from '../../components/ui';
import { useI18n } from '../../lib/i18n';
import { getProfile, Profile, supabase } from '../../lib/supabase';
import { colors, radius, type } from '../../lib/theme';

type Recent = { id: string; product_name: string; brand: string | null; image_url: string | null; match_score: number | null; raw_data: any };

export default function Home() {
  const { t } = useI18n();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [recent, setRecent] = useState<Recent[]>([]);

  useFocusEffect(
    useCallback(() => {
      getProfile().then(setProfile);
      supabase
        .from('scan_history')
        .select('id, product_name, brand, image_url, match_score, raw_data')
        .order('created_at', { ascending: false })
        .limit(6)
        .then(({ data }) => setRecent((data as Recent[]) ?? []));
    }, []),
  );

  const skin = profile?.current_skin_analysis;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 20, paddingTop: 64, paddingBottom: 40 }}>
      <Text style={type.display}>
        {t('hello')}
        {profile?.display_name ? `, ${profile.display_name}` : ''}
      </Text>

      <Section title={t('yourSkin')} style={{ marginTop: 24 }}>
        <Card>
          {skin ? (
            <View>
              <Row style={{ marginBottom: 10 }}>
                <Chip label={`${t('skinType')}: ${skin.skin_type}`} tone="accent" />
              </Row>
              <Row>
                {(skin.concerns ?? []).slice(0, 4).map((c: any, i: number) => (
                  <Chip key={i} label={typeof c === 'string' ? c : c.name} />
                ))}
              </Row>
              <Text style={[type.small, { marginTop: 12 }]} numberOfLines={3}>
                {skin.summary}
              </Text>
            </View>
          ) : (
            <View>
              <Text style={type.body}>{t('noSkinYet')}</Text>
              <Button title={t('scanNow')} onPress={() => router.push('/(tabs)/skin')} style={{ marginTop: 14 }} />
            </View>
          )}
        </Card>
      </Section>

      <Section title={t('quickActions')}>
        <View style={{ gap: 10 }}>
          <Action icon="scan-outline" label={t('actionScanProduct')} onPress={() => router.push('/(tabs)/search')} />
          <Action icon="chatbubble-ellipses-outline" label={t('actionAskAI')} onPress={() => router.push('/(tabs)/search')} />
          <Action icon="albums-outline" label={t('actionRoutine')} onPress={() => router.push('/(tabs)/routine')} />
        </View>
      </Section>

      <Section title={t('recentScans')}>
        {recent.length === 0 ? (
          <Text style={type.small}>{t('noRecent')}</Text>
        ) : (
          recent.map((r) => (
            <Pressable
              key={r.id}
              style={s.recentRow}
              onPress={() => router.push({ pathname: '/product/[key]', params: { key: r.raw_data?.cache_key ?? '' } })}
            >
              {r.image_url ? <Image source={{ uri: r.image_url }} style={s.thumb} /> : <View style={[s.thumb, { backgroundColor: colors.blush }]} />}
              <View style={{ flex: 1 }}>
                <Text style={type.h2} numberOfLines={1}>{r.product_name}</Text>
                {r.brand ? <Text style={type.small}>{r.brand}</Text> : null}
              </View>
              {r.match_score != null && <Text style={{ fontWeight: '800', color: colors.accent }}>{r.match_score}</Text>}
            </Pressable>
          ))
        )}
      </Section>
    </ScrollView>
  );
}

function Action({ icon, label, onPress }: { icon: any; label: string; onPress: () => void }) {
  return (
    <Pressable style={s.action} onPress={onPress}>
      <Ionicons name={icon} size={20} color={colors.accent} />
      <Text style={[type.h2, { flex: 1 }]}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color={colors.muted} />
    </Pressable>
  );
}

const s = StyleSheet.create({
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    padding: 16,
  },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  thumb: { width: 44, height: 44, borderRadius: 10, backgroundColor: colors.line },
});
