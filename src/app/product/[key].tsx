import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MatchRing } from '../../components/MatchRing';
import { Button, Card, Chip, Row, Section } from '../../components/ui';
import { AltItem, findAlternatives, findDupes, Personalization, personalize } from '../../lib/ai';
import { useI18n } from '../../lib/i18n';
import { getProfile, supabase } from '../../lib/supabase';
import { colors, radius, type } from '../../lib/theme';

export default function ProductScreen() {
  const { t, lang } = useI18n();
  const { key } = useLocalSearchParams<{ key: string }>();
  const [product, setProduct] = useState<any>(null);
  const [personal, setPersonal] = useState<Personalization | null>(null);
  const [alts, setAlts] = useState<{ kind: 'dupe' | 'alternative'; items: AltItem[] } | null>(null);
  const [altBusy, setAltBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('product_cache').select('*').eq('cache_key', key).maybeSingle();
      setProduct(data);
      if (!data) return;
      supabase.from('product_cache').update({ hit_count: (data.hit_count ?? 0) + 1 }).eq('cache_key', key).then(() => {});
      const profile = await getProfile();
      if (profile?.current_skin_analysis || profile?.skin_type) {
        try {
          const p = await personalize(
            {
              name: data.product_name,
              brand: data.brand,
              category: data.category,
              summary: data.summary,
              ingredients: data.ingredients ?? [],
              formula_analysis: data.insights?.formula_analysis ?? '',
              review_summary: data.reviews ?? {},
              base_match_score: data.base_match_score ?? 50,
            },
            profile,
            lang,
          );
          setPersonal(p);
          await supabase
            .from('scan_history')
            .update({ match_score: p.match_score })
            .eq('user_id', profile.id)
            .contains('raw_data', { cache_key: key });
        } catch {}
      }
    })();
  }, [key]);

  const loadAlts = async (kind: 'dupe' | 'alternative') => {
    setAltBusy(true);
    setAlts(null);
    try {
      const base = { name: product.product_name, brand: product.brand, ingredients_text: product.source_meta?.ingredients_text };
      const res =
        kind === 'dupe' ? await findDupes(base, lang) : await findAlternatives(base, await getProfile(), lang);
      setAlts({ kind, items: res.items ?? [] });
    } catch (e: any) {
      Alert.alert('', e.message ?? t('error'));
    } finally {
      setAltBusy(false);
    }
  };

  const saveFav = async () => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user || !product) return;
    await supabase.from('favorites').insert({
      user_id: auth.user.id,
      product_name: product.product_name,
      brand: product.brand,
      barcode: product.source_meta?.barcode ?? null,
      image_url: product.image_url,
    });
    setSaved(true);
  };

  if (!product)
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );

  const score = personal?.match_score ?? product.base_match_score ?? 50;
  const reviews = product.reviews ?? {};

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 20, paddingTop: 56, paddingBottom: 48 }}>
      <Pressable onPress={() => router.back()} style={{ marginBottom: 12 }}>
        <Ionicons name="chevron-back" size={26} color={colors.ink} />
      </Pressable>

      <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}>
        {product.image_url ? (
          <Image source={{ uri: product.image_url }} style={s.hero} />
        ) : (
          <View style={[s.hero, { backgroundColor: colors.blush }]} />
        )}
        <View style={{ flex: 1 }}>
          {product.brand ? <Text style={type.eyebrow}>{product.brand}</Text> : null}
          <Text style={type.title}>{product.product_name}</Text>
          {product.category ? <Text style={[type.small, { marginTop: 4 }]}>{product.category}</Text> : null}
        </View>
      </View>

      <Card style={{ marginTop: 20, alignItems: 'center', paddingVertical: 24 }}>
        <MatchRing score={score} label={t('matchLabel')} size={132} />
        <Text style={[type.body, { marginTop: 14, textAlign: 'center' }]}>{product.summary}</Text>
      </Card>

      {personal && personal.warnings?.length > 0 && (
        <Section title={t('warnings')} style={{ marginTop: 24 }}>
          <View style={{ gap: 8 }}>
            {personal.warnings.map((w, i) => (
              <Card key={i} style={{ borderColor: w.level === 'avoid' ? colors.danger : colors.warn }}>
                <Row style={{ marginBottom: 4 }}>
                  <Text style={type.h2}>{w.ingredient}</Text>
                  <Chip label={w.level} tone={w.level === 'avoid' ? 'danger' : 'warn'} />
                </Row>
                <Text style={type.small}>{w.reason}</Text>
              </Card>
            ))}
          </View>
        </Section>
      )}

      <Section title={t('formula')} style={{ marginTop: personal?.warnings?.length ? 0 : 24 }}>
        <Card>
          <Text style={type.body}>{product.insights?.formula_analysis}</Text>
          {personal?.personal_notes?.map((n, i) => (
            <Text key={i} style={[type.small, { marginTop: 8, color: colors.accent }]}>• {n}</Text>
          ))}
        </Card>
      </Section>

      <Section title={t('ingredients')}>
        <View style={{ gap: 6 }}>
          {(product.ingredients ?? []).map((ing: any, i: number) => (
            <View key={i} style={s.ingRow}>
              <View style={[s.dot, { backgroundColor: ing.risk === 'high' ? colors.danger : ing.risk === 'medium' ? colors.gold : colors.accent }]} />
              <View style={{ flex: 1 }}>
                <Text style={type.h2}>{ing.name}</Text>
                <Text style={type.small}>{ing.role}{ing.note ? ` — ${ing.note}` : ''}</Text>
              </View>
            </View>
          ))}
        </View>
      </Section>

      <Section title={t('reviews')}>
        <Card>
          <Text style={type.body}>{reviews.overall}</Text>
          {!!reviews.pros?.length && (
            <View style={{ marginTop: 12 }}>
              <Text style={[type.eyebrow]}>{t('pros')}</Text>
              {reviews.pros.map((p: string, i: number) => (
                <Text key={i} style={type.body}>+ {p}</Text>
              ))}
            </View>
          )}
          {!!reviews.cons?.length && (
            <View style={{ marginTop: 12 }}>
              <Text style={[type.eyebrow, { color: colors.warn }]}>{t('cons')}</Text>
              {reviews.cons.map((c: string, i: number) => (
                <Text key={i} style={type.body}>− {c}</Text>
              ))}
            </View>
          )}
          {!!reviews.sources?.length && (
            <View style={{ marginTop: 12 }}>
              <Text style={type.eyebrow}>{t('sources')}</Text>
              {reviews.sources.slice(0, 5).map((src: any, i: number) => (
                <Text key={i} style={[type.small, { color: colors.accent }]} onPress={() => Linking.openURL(src.url)}>
                  {src.title || src.url}
                </Text>
              ))}
            </View>
          )}
        </Card>
      </Section>

      <Button
        title={t('askAI')}
        onPress={() => router.push({ pathname: '/product-chat/[key]', params: { key } })}
        style={{ marginBottom: 10 }}
      />
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Button title={t('findDupes')} variant="secondary" onPress={() => loadAlts('dupe')} style={{ flex: 1 }} />
        <Button title={t('alternatives')} variant="secondary" onPress={() => loadAlts('alternative')} style={{ flex: 1 }} />
      </View>
      <Button title={saved ? '✓ ' + t('saved') : t('save')} variant="ghost" onPress={saveFav} style={{ marginTop: 6 }} />

      {altBusy && (
        <Card style={{ marginTop: 16, flexDirection: 'row', gap: 12, alignItems: 'center' }}>
          <ActivityIndicator color={colors.accent} />
          <Text style={type.body}>{t('searchingWeb')}</Text>
        </Card>
      )}

      {alts && (
        <Section title={alts.kind === 'dupe' ? t('dupesTitle') : t('altTitle')} style={{ marginTop: 24 }}>
          <View style={{ gap: 8 }}>
            {alts.items.map((a, i) => (
              <Card key={i}>
                <Row style={{ marginBottom: 4 }}>
                  <Text style={[type.h2, { flex: 1 }]}>{a.brand} {a.name}</Text>
                  <Chip label={`${a.similarity}% ${t('similarity')}`} tone="accent" />
                </Row>
                <Text style={type.small}>{a.basis}</Text>
                <Text style={[type.body, { marginTop: 6 }]}>{a.why}</Text>
              </Card>
            ))}
          </View>
        </Section>
      )}

      <Text style={[type.small, { textAlign: 'center', marginTop: 20 }]}>{t('aiDisclaimer')}</Text>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  hero: { width: 84, height: 84, borderRadius: radius.md, backgroundColor: colors.line },
  ingRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.sm,
    padding: 12,
  },
  dot: { width: 10, height: 10, borderRadius: 5, marginTop: 5 },
});
