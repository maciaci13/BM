import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Card, Chip, Row, Section } from '../../components/ui';
import { Lang, useI18n } from '../../lib/i18n';
import { getProfile, Profile, supabase } from '../../lib/supabase';
import { colors, radius, type } from '../../lib/theme';

export default function ProfileScreen() {
  const { t, lang, setLang } = useI18n();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [favs, setFavs] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);

  useFocusEffect(
    useCallback(() => {
      getProfile().then(setProfile);
      supabase.from('favorites').select('*').order('created_at', { ascending: false }).limit(10).then(({ data }) => setFavs(data ?? []));
      supabase
        .from('scan_history')
        .select('id, product_name, brand, match_score, created_at, raw_data')
        .order('created_at', { ascending: false })
        .limit(10)
        .then(({ data }) => setHistory(data ?? []));
    }, []),
  );

  const switchLang = async (l: Lang) => {
    setLang(l);
    if (profile) supabase.from('profiles').update({ language: l }).eq('id', profile.id).then(() => {});
  };

  const skin = profile?.current_skin_analysis;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 20, paddingTop: 64, paddingBottom: 48 }}>
      <Text style={type.display}>{t('profileTitle')}</Text>
      {profile?.display_name && <Text style={[type.small, { marginTop: 4 }]}>{profile.display_name}</Text>}

      <Section title={t('language')} style={{ marginTop: 24 }}>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <LangBtn label="Български" active={lang === 'bg'} onPress={() => switchLang('bg')} />
          <LangBtn label="English" active={lang === 'en'} onPress={() => switchLang('en')} />
        </View>
      </Section>

      <Section title={t('skinProfile')}>
        <Card>
          {skin ? (
            <View>
              <Row style={{ marginBottom: 8 }}>
                <Chip label={`${t('skinType')}: ${skin.skin_type}`} tone="accent" />
              </Row>
              <Row>
                {(profile?.skin_concerns ?? []).map((c, i) => (
                  <Chip key={i} label={c} />
                ))}
              </Row>
              {skin.user_notes ? <Text style={[type.small, { marginTop: 10 }]}>{skin.user_notes}</Text> : null}
            </View>
          ) : (
            <Text style={type.small}>{t('noSkinYet')}</Text>
          )}
          <Button title={t('rescan')} variant="secondary" onPress={() => router.push('/(tabs)/skin')} style={{ marginTop: 14 }} />
        </Card>
      </Section>

      <Section title={t('favorites')}>
        {favs.length === 0 ? (
          <Text style={type.small}>—</Text>
        ) : (
          favs.map((f) => (
            <View key={f.id} style={s.row}>
              <Text style={[type.body, { flex: 1 }]} numberOfLines={1}>
                {f.brand ? `${f.brand} · ` : ''}{f.product_name}
              </Text>
            </View>
          ))
        )}
      </Section>

      <Section title={t('history')}>
        {history.map((h) => (
          <Pressable
            key={h.id}
            style={s.row}
            onPress={() => h.raw_data?.cache_key && router.push({ pathname: '/product/[key]', params: { key: h.raw_data.cache_key } })}
          >
            <Text style={[type.body, { flex: 1 }]} numberOfLines={1}>
              {h.brand ? `${h.brand} · ` : ''}{h.product_name}
            </Text>
            {h.match_score != null && <Text style={{ fontWeight: '700', color: colors.accent }}>{h.match_score}</Text>}
          </Pressable>
        ))}
      </Section>

      <Button
        title={t('signOut')}
        variant="ghost"
        onPress={async () => {
          await supabase.auth.signOut();
          router.replace('/(auth)/login');
        }}
      />
    </ScrollView>
  );
}

function LangBtn({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={[s.lang, active && { backgroundColor: colors.accent, borderColor: colors.accent }]}
    >
      <Text style={{ fontWeight: '700', color: active ? '#fff' : colors.ink }}>{label}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.line },
  lang: {
    flex: 1,
    height: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
