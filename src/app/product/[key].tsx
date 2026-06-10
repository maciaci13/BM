import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MatchRing } from '../../components/MatchRing';
import { Button, Card, Chip, Row, Section } from '../../components/ui';
import {
  AltItem,
  analyzeProduct,
  findAlternatives,
  findDupes,
  Personalization,
  personalize,
  ProductAnalysis,
} from '../../lib/ai';
import { useI18n } from '../../lib/i18n';
import { notify } from '../../lib/notify';
import { getProfile, supabase } from '../../lib/supabase';
import { colors, radius, type } from '../../lib/theme';

function Skel({ w = '100%', h = 14, mb = 8 }: { w?: any; h?: number; mb?: number }) {
  return <View style={{ width: w, height: h, borderRadius: 6, backgroundColor: colors.line, marginBottom: mb }} />;
}

export default function ProductScreen() {
  const { t, lang } = useI18n();
  const params = useLocalSearchParams<{
    key: string;
    name?: string;
    brand?: string;
    image_url?: string;
    ingredients_text?: string;
    barcode?: string;
  }>();
  const key = params.key;
  const baseName = params.name || '';
  const baseBrand = params.brand || '';
  const baseImage = params.image_url || '';

  const [analysis, setAnalysis] = useState<ProductAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(true);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [personal, setPersonal] = useState<Personalization | null>(null);
  const [alts, setAlts] = useState<{ kind: 'dupe' | 'alternative'; items: AltItem[] } | null>(null);
  const [altBusy, setAltBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setAnalyzing(true);
      setAnalysisError(null);
      try {
        const { data: cached } = await supabase.from('product_cache').select('*').eq('cache_key', key).maybeSingle();
        if (cached && !cancelled) {
          const a: ProductAnalysis = {
            name: cached.product_name,
            brand: cached.brand,
            category: cached.category,
            summary: cached.summary,
            ingredients: cached.ingredients ?? [],
            formula_analysis: cached.insights?.formula_analysis ?? '',
            review_summary: cached.reviews ?? { overall: '', pros: [], cons: [], themes: [], sources: [] },
            base_match_score: cached.base_match_score ?? 50,
          };
          setAnalysis(a);
          setAnalyzing(false);
          runPersonalize(a);
          supabase.from('product_cache').update({ hit_count: (cached.hit_count ?? 0) + 1 }).eq('cache_key', key).then(() => {});
          return;
        }

        const a = await analyzeProduct(
          { name: baseName, brand: baseBrand, barcode: params.barcode, ingredients_text: params.ingredients_text },
          lang,
        );
        if (cancelled) return;
        setAnalysis(a);
        setAnalyzing(false);
        runPersonalize(a);

        supabase
          .from('product_cache')
          .upsert(
            {
              cache_key: key,
              product_name: a.name || baseName,
              brand: a.brand ?? baseBrand ?? null,
              category: a.category,
              image_url: baseImage || null,
              summary: a.summary,
              ingredients: a.ingredients,
              insights: { formula_analysis: a.formula_analysis },
              reviews: a.review_summary,
              base_match_score: a.base_match_score,
              source_meta: { barcode: params.barcode ?? null, ingredients_text: params.ingredients_text ?? null },
            },
            { onConflict: 'cache_key' },
          )
          .then(() => {});
        supabase.auth.getUser().then(({ data: auth }) => {
          if (auth.user)
            supabase
              .from('scan_history')
              .insert({
                user_id: auth.user.id,
                product_name: a.name || baseName,
                brand: a.brand ?? baseBrand ?? null,
                barcode: params.barcode ?? null,
                image_url: baseImage || null,
                source: params.barcode ? 'barcode' : 'search',
                raw_data: { cache_key: key },
              })
              .then(() => {});
        });
      } catch (e: any) {
        if (!cancelled) {
          setAnalyzing(false);
          setAnalysisError(e.message ?? t('error'));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [key]);

  const runPersonalize = async (a: ProductAnalysis) => {
    try {
      const profile = await getProfile();
      if (!profile?.current_skin_analysis && !profile?.skin_type) return;
      const p = await personalize(a, profile, lang);
      setPersonal(p);
      supabase.from('scan_history').update({ match_score: p.match_score }).contains('raw_data', { cache_key: key }).then(() => {});
    } catch {
      /* personalization optional */
    }
  };

  const loadAlts = async (kind: 'dupe' | 'alternative') => {
    if (!analysis) return;
    setAltBusy(true);
    setAlts(null);
    try {
      const base = { name: analysis.name, brand: analysis.brand, ingredients_text: params.ingredients_text };
      const res = kind === 'dupe' ? await findDupes(base, lang) : await findAlternatives(base, await getProfile(), lang);
      setAlts({ kind, items: res.items ?? [] });
    } catch (e: any) {
      notify(e.message ?? t('error'));
    } finally {
      setAltBusy(false);
    }
  };

  const saveFav = async () => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;
    await supabase.from('favorites').insert({
      user_id: auth.user.id,
      product_name: analysis?.name || baseName,
      brand: analysis?.brand ?? baseBrand,
      barcode: params.barcode ?? null,
      image_url: baseImage || null,
    });
    setSaved(true);
  };

  const score = personal?.match_score ?? analysis?.base_match_score ?? null;
  const reviews = analysis?.review_summary;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 20, paddingTop: 56, paddingBottom: 48 }}>
      <Pressable onPress={() => router.back()} style={{ marginBottom: 12 }}>
        <Ionicons name="chevron-back" size={26} color={colors.ink} />
      </Pressable>

      <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}>
        {baseImage ? (
          <Image source={{ uri: baseImage }} style={s.hero} />
        ) : (
          <View style={[s.hero, { backgroundColor: colors.blush }]} />
        )}
        <View style={{ flex: 1 }}>
          {(analysis?.brand || baseBrand) ? <Text style={type.eyebrow}>{analysis?.brand || baseBrand}</Text> : null}
          <Text style={type.title}>{analysis?.name || baseName}</Text>
          {analysis?.category ? <Text style={[type.small, { marginTop: 4 }]}>{analysis.category}</Text> : null}
        </View>
      </View>

      <Card style={{ marginTop: 20, alignItems: 'center', paddingVertical: 24 }}>
        {analyzing ? (
          <View style={{ alignItems: 'center', gap: 12 }}>
            <ActivityIndicator color={colors.accent} size="large" />
            <Text style={[type.small, { textAlign: 'center' }]}>{t('analyzingProduct')}</Text>
          </View>
        ) : analysisError ? (
          <Text style={[type.body, { textAlign: 'center', color: colors.warn }]}>{analysisError}</Text>
        ) : (
          <>
            {score != null && <MatchRing score={score} label={t('matchLabel')} size={132} />}
            <Text style={[type.body, { marginTop: 14, textAlign: 'center' }]}>{analysis?.summary}</Text>
          </>
        )}
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

      <Section title={t('formula')} style={{ marginTop: 24 }}>
        <Card>
          {analyzing ? (
            <>
              <Skel w="90%" />
              <Skel w="80%" />
              <Skel w="60%" mb={0} />
            </>
          ) : (
            <>
              <Text style={type.body}>{analysis?.formula_analysis}</Text>
              {personal?.personal_notes?.map((n, i) => (
                <Text key={i} style={[type.small, { marginTop: 8, color: colors.accent }]}>• {n}</Text>
              ))}
            </>
          )}
        </Card>
      </Section>

      <Section title={t('ingredients')}>
        {analyzing ? (
          <View style={{ gap: 8 }}>
            {[0, 1, 2, 3].map((i) => (
              <Card key={i}>
                <Skel w="50%" h={16} />
                <Skel w="85%" mb={0} />
              </Card>
            ))}
          </View>
        ) : (
          <View style={{ gap: 6 }}>
            {(analysis?.ingredients ?? []).map((ing, i) => (
              <View key={i} style={s.ingRow}>
                <View style={[s.dot, { backgroundColor: ing.risk === 'high' ? colors.danger : ing.risk === 'medium' ? colors.gold : colors.accent }]} />
                <View style={{ flex: 1 }}>
                  <Text style={type.h2}>{ing.name}</Text>
                  <Text style={type.small}>{ing.role}{ing.note ? ` — ${ing.note}` : ''}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </Section>

      <Section title={t('reviews')}>
        <Card>
          {analyzing ? (
            <>
              <Skel w="95%" />
              <Skel w="88%" />
              <Skel w="70%" mb={0} />
            </>
          ) : (
            <>
              <Text style={type.body}>{reviews?.overall}</Text>
              {!!reviews?.pros?.length && (
                <View style={{ marginTop: 12 }}>
                  <Text style={type.eyebrow}>{t('pros')}</Text>
                  {reviews.pros.map((p, i) => (
                    <Text key={i} style={type.body}>+ {p}</Text>
                  ))}
                </View>
              )}
              {!!reviews?.cons?.length && (
                <View style={{ marginTop: 12 }}>
                  <Text style={[type.eyebrow, { color: colors.warn }]}>{t('cons')}</Text>
                  {reviews.cons.map((c, i) => (
                    <Text key={i} style={type.body}>− {c}</Text>
                  ))}
                </View>
              )}
              {!!reviews?.sources?.length && (
                <View style={{ marginTop: 12 }}>
                  <Text style={type.eyebrow}>{t('sources')}</Text>
                  {reviews.sources.slice(0, 5).map((src, i) => (
                    <Text key={i} style={[type.small, { color: colors.accent }]} onPress={() => Linking.openURL(src.url)}>
                      {src.title || src.url}
                    </Text>
                  ))}
                </View>
              )}
            </>
          )}
        </Card>
      </Section>

      {!analyzing && !analysisError && (
        <>
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
        </>
      )}

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
