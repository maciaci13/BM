import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import React, { useRef, useState } from 'react';
import { ActivityIndicator, Image, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { notify } from "../../lib/notify";
import { Button, Card } from '../../components/ui';
import { cacheKeyFor, identifyProduct, obfByBarcode, obfSearch, OBFProduct } from '../../lib/ai';
import { useI18n } from '../../lib/i18n';
import { supabase } from '../../lib/supabase';
import { colors, radius, type } from '../../lib/theme';

export default function Search() {
  const { t, lang } = useI18n();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<OBFProduct[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const handled = useRef(false);

  // ---- shared: resolve a product into a cached analysis, then open it ----
  const openProduct = async (q: { name: string; brand?: string | null; barcode?: string | null; ingredients_text?: string | null; image_url?: string | null }) => {
    const key = cacheKeyFor(q);
    // Navigate immediately with the basic data we already have from Open Beauty Facts.
    // The product page itself runs the AI analysis in the background with loaders.
    router.push({
      pathname: '/product/[key]',
      params: {
        key,
        name: q.name,
        brand: q.brand ?? '',
        image_url: q.image_url ?? '',
        ingredients_text: q.ingredients_text ?? '',
        barcode: q.barcode ?? '',
      },
    });
  };

  // ---- name search ----
  const searchByName = async () => {
    if (!query.trim()) return;
    setBusy(t('byName') + '…');
    const found = await obfSearch(query.trim());
    setResults(found);
    setBusy(null);
    if (found.length === 0) {
      // fall back to AI-only analysis from the name
      openProduct({ name: query.trim() });
    }
  };

  // ---- barcode ----
  const onBarcode = async ({ data }: { data: string }) => {
    if (handled.current) return;
    handled.current = true;
    setScannerOpen(false);
    setBusy(t('identifying'));
    const p = await obfByBarcode(data);
    setBusy(null);
    if (p) openProduct({ name: p.product_name, brand: p.brands, barcode: data, ingredients_text: p.ingredients_text, image_url: p.image_url });
    else openProduct({ name: `Barcode ${data}`, barcode: data });
    setTimeout(() => (handled.current = false), 2000);
  };

  // ---- photo ----
  const byPhoto = async (fromCamera: boolean) => {
    const opts: ImagePicker.ImagePickerOptions = { mediaTypes: 'images', base64: true, quality: 0.4 };
    const res = fromCamera ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
    if (res.canceled || !res.assets?.[0]?.base64) return;
    setBusy(t('identifying'));
    try {
      const id = await identifyProduct(res.assets[0].base64, lang);
      setBusy(null);
      openProduct({ name: id.name, brand: id.brand });
    } catch (e: any) {
      setBusy(null);
      notify(e.message ?? t('error'));
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 64, paddingBottom: 40 }}>
        <Text style={type.display}>{t('searchTitle')}</Text>

        <View style={s.searchRow}>
          <TextInput
            style={s.input}
            placeholder={t('searchPlaceholder')}
            placeholderTextColor={colors.muted}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={searchByName}
            returnKeyType="search"
          />
          <Pressable style={s.searchBtn} onPress={searchByName}>
            <Ionicons name="search" size={20} color="#fff" />
          </Pressable>
        </View>

        <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
          <ModeBtn icon="barcode-outline" label={t('byBarcode')} onPress={async () => {
            if (!permission?.granted) {
              const r = await requestPermission();
              if (!r.granted) return;
            }
            setScannerOpen(true);
          }} />
          <ModeBtn icon="camera-outline" label={t('byPhoto')} onPress={() => byPhoto(true)} />
          <ModeBtn icon="image-outline" label="Galeria" onPress={() => byPhoto(false)} />
        </View>

        {busy && (
          <Card style={{ marginTop: 20, flexDirection: 'row', gap: 12, alignItems: 'center' }}>
            <ActivityIndicator color={colors.accent} />
            <Text style={[type.body, { flex: 1 }]}>{busy}</Text>
          </Card>
        )}

        {results.length > 0 && (
          <View style={{ marginTop: 24 }}>
            <Text style={[type.eyebrow, { marginBottom: 10 }]}>{t('results')}</Text>
            {results.map((p) => (
              <Pressable
                key={p.code}
                style={s.resultRow}
                onPress={() => openProduct({ name: p.product_name, brand: p.brands, barcode: p.code, ingredients_text: p.ingredients_text, image_url: p.image_url })}
              >
                {p.image_url ? <Image source={{ uri: p.image_url }} style={s.thumb} /> : <View style={[s.thumb, { backgroundColor: colors.blush }]} />}
                <View style={{ flex: 1 }}>
                  <Text style={type.h2} numberOfLines={2}>{p.product_name}</Text>
                  {p.brands ? <Text style={type.small}>{p.brands}</Text> : null}
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.muted} />
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>

      <Modal visible={scannerOpen} animationType="slide" onRequestClose={() => setScannerOpen(false)}>
        <View style={{ flex: 1, backgroundColor: '#000' }}>
          <CameraView
            style={StyleSheet.absoluteFill}
            barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128'] }}
            onBarcodeScanned={onBarcode}
          />
          <View style={s.scanGuide} pointerEvents="none" />
          <Text style={s.scanHint}>{t('scanBarcodeHint')}</Text>
          <View style={{ position: 'absolute', bottom: 40, left: 20, right: 20 }}>
            <Button title={t('cancel')} variant="secondary" onPress={() => setScannerOpen(false)} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

function ModeBtn({ icon, label, onPress }: { icon: any; label: string; onPress: () => void }) {
  return (
    <Pressable style={s.mode} onPress={onPress}>
      <Ionicons name={icon} size={22} color={colors.accent} />
      <Text style={{ fontSize: 13, fontWeight: '600', color: colors.ink }}>{label}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  searchRow: { flexDirection: 'row', gap: 10, marginTop: 20 },
  input: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    height: 52,
    paddingHorizontal: 16,
    fontSize: 16,
    color: colors.ink,
  },
  searchBtn: { width: 52, height: 52, borderRadius: radius.md, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  mode: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    gap: 6,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  thumb: { width: 48, height: 48, borderRadius: 10, backgroundColor: colors.line },
  scanGuide: {
    position: 'absolute',
    alignSelf: 'center',
    top: '35%',
    width: '80%',
    height: 140,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.8)',
  },
  scanHint: { position: 'absolute', top: '28%', alignSelf: 'center', color: '#fff', fontWeight: '600' },
});
