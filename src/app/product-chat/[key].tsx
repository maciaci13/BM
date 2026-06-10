import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { productChat } from '../../lib/ai';
import { useI18n } from '../../lib/i18n';
import { getProfile, supabase } from '../../lib/supabase';
import { colors, radius, type } from '../../lib/theme';

type Msg = { id: string; role: 'user' | 'assistant'; content: string };

export default function ProductChat() {
  const { t, lang } = useI18n();
  const { key } = useLocalSearchParams<{ key: string }>();
  const [product, setProduct] = useState<any>(null);
  const [chatId, setChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const list = useRef<FlatList>(null);

  useEffect(() => {
    (async () => {
      const { data: p } = await supabase.from('product_cache').select('*').eq('cache_key', key).maybeSingle();
      setProduct(p);
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user || !p) return;
      let { data: chat } = await supabase
        .from('product_chats')
        .select('id')
        .eq('user_id', auth.user.id)
        .eq('cache_key', key)
        .maybeSingle();
      if (!chat) {
        const ins = await supabase
          .from('product_chats')
          .insert({ user_id: auth.user.id, cache_key: key, product_name: p.product_name, brand: p.brand })
          .select('id')
          .single();
        chat = ins.data;
      }
      if (chat) {
        setChatId(chat.id);
        const { data: msgs } = await supabase
          .from('product_chat_messages')
          .select('id, role, content')
          .eq('chat_id', chat.id)
          .order('created_at');
        setMessages((msgs as Msg[]) ?? []);
      }
    })();
  }, [key]);

  const send = async () => {
    const q = input.trim();
    if (!q || busy || !product) return;
    setInput('');
    const userMsg: Msg = { id: `u${Date.now()}`, role: 'user', content: q };
    setMessages((m) => [...m, userMsg]);
    setBusy(true);
    try {
      if (chatId) supabase.from('product_chat_messages').insert({ chat_id: chatId, role: 'user', content: q }).then(() => {});
      const history = messages.map(({ role, content }) => ({ role, content }));
      const profile = await getProfile();
      const res = await productChat(
        {
          name: product.product_name,
          brand: product.brand,
          summary: product.summary,
          ingredients_text: product.source_meta?.ingredients_text ?? (product.ingredients ?? []).map((i: any) => i.name).join(', '),
        },
        history,
        q,
        profile,
        lang,
      );
      const aiMsg: Msg = { id: `a${Date.now()}`, role: 'assistant', content: res.answer };
      setMessages((m) => [...m, aiMsg]);
      if (chatId) supabase.from('product_chat_messages').insert({ chat_id: chatId, role: 'assistant', content: res.answer }).then(() => {});
    } catch (e: any) {
      setMessages((m) => [...m, { id: `e${Date.now()}`, role: 'assistant', content: t('error') }]);
    } finally {
      setBusy(false);
      setTimeout(() => list.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={s.header}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={26} color={colors.ink} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={type.h2} numberOfLines={1}>{product?.product_name ?? '…'}</Text>
          <Text style={type.small}>{t('askAI')}</Text>
        </View>
      </View>

      <FlatList
        ref={list}
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ padding: 20, gap: 10 }}
        ListEmptyComponent={<Text style={[type.small, { textAlign: 'center', marginTop: 30 }]}>{t('chatIntro')}</Text>}
        renderItem={({ item }) => (
          <View style={[s.bubble, item.role === 'user' ? s.user : s.ai]}>
            <Text style={[type.body, item.role === 'user' && { color: '#fff' }]}>{item.content}</Text>
          </View>
        )}
        ListFooterComponent={busy ? <ActivityIndicator color={colors.accent} style={{ marginTop: 8 }} /> : null}
        onContentSizeChange={() => list.current?.scrollToEnd({ animated: true })}
      />

      <View style={s.inputRow}>
        <TextInput
          style={s.input}
          placeholder={t('chatPlaceholder')}
          placeholderTextColor={colors.muted}
          value={input}
          onChangeText={setInput}
          onSubmitEditing={send}
          returnKeyType="send"
        />
        <Pressable style={s.send} onPress={send} disabled={busy}>
          <Ionicons name="arrow-up" size={20} color="#fff" />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    backgroundColor: colors.surface,
  },
  bubble: { maxWidth: '85%', padding: 12, borderRadius: radius.md },
  user: { alignSelf: 'flex-end', backgroundColor: colors.accent, borderBottomRightRadius: 4 },
  ai: { alignSelf: 'flex-start', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderBottomLeftRadius: 4 },
  inputRow: { flexDirection: 'row', gap: 10, padding: 14, paddingBottom: 28, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.line },
  input: {
    flex: 1,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.pill,
    height: 46,
    paddingHorizontal: 18,
    fontSize: 15,
    color: colors.ink,
  },
  send: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
});
