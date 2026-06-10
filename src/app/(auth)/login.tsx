import { makeRedirectUri } from 'expo-auth-session';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { notify } from "../../lib/notify";
import { Button } from '../../components/ui';
import { useI18n } from '../../lib/i18n';
import { supabase } from '../../lib/supabase';
import { colors, radius, type } from '../../lib/theme';

WebBrowser.maybeCompleteAuthSession();
const redirectTo = makeRedirectUri({ scheme: 'beautymatch' });

export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error) throw error;
  const res = await WebBrowser.openAuthSessionAsync(data.url!, redirectTo);
  if (res.type === 'success' && res.url) {
    const url = new URL(res.url);
    const code = url.searchParams.get('code');
    if (code) {
      const { error: exErr } = await supabase.auth.exchangeCodeForSession(code);
      if (exErr) throw exErr;
    }
  }
}

export default function Login() {
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (error) notify(error.message);
    else router.replace('/(tabs)');
  };

  const google = async () => {
    try {
      await signInWithGoogle();
      router.replace('/(tabs)');
    } catch (e: any) {
      notify(e.message ?? t('error'));
    }
  };

  return (
    <KeyboardAvoidingView style={s.wrap} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Text style={s.logo}>Beauty<Text style={{ color: colors.accent }}>Match</Text></Text>
      <Text style={[type.title, { marginBottom: 6 }]}>{t('welcome')}</Text>
      <Text style={[type.small, { marginBottom: 28 }]}>{t('tagline')}</Text>

      <TextInput
        style={s.input}
        placeholder={t('email')}
        placeholderTextColor={colors.muted}
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={s.input}
        placeholder={t('password')}
        placeholderTextColor={colors.muted}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <Button title={t('signIn')} onPress={submit} loading={loading} style={{ marginTop: 4 }} />
      <Button title={t('signInGoogle')} onPress={google} variant="secondary" style={{ marginTop: 10 }} />
      <Text style={s.link} onPress={() => router.push('/(auth)/register')}>
        {t('noAccount')}
      </Text>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg, padding: 24, justifyContent: 'center' },
  logo: { fontSize: 34, fontWeight: '800', letterSpacing: -1, color: colors.ink, marginBottom: 20 },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    height: 52,
    paddingHorizontal: 16,
    fontSize: 16,
    color: colors.ink,
    marginBottom: 12,
  },
  link: { textAlign: 'center', marginTop: 22, color: colors.accent, fontWeight: '600' },
});
