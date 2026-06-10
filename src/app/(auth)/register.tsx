import { router } from 'expo-router';
import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput } from 'react-native';
import { Button } from '../../components/ui';
import { useI18n } from '../../lib/i18n';
import { supabase } from '../../lib/supabase';
import { colors, radius, type } from '../../lib/theme';
import { signInWithGoogle } from './login';

export default function Register() {
  const { t } = useI18n();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { full_name: name.trim() } },
    });
    setLoading(false);
    if (error) return Alert.alert('', error.message);
    if (data.session) router.replace('/(tabs)');
    else Alert.alert('', t('checkEmail'));
  };

  const google = async () => {
    try {
      await signInWithGoogle();
      router.replace('/(tabs)');
    } catch (e: any) {
      Alert.alert('', e.message ?? t('error'));
    }
  };

  return (
    <KeyboardAvoidingView style={s.wrap} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Text style={[type.display, { marginBottom: 24 }]}>{t('signUp')}</Text>
      <TextInput style={s.input} placeholder={t('name')} placeholderTextColor={colors.muted} value={name} onChangeText={setName} />
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
      <Button title={t('signUp')} onPress={submit} loading={loading} style={{ marginTop: 4 }} />
      <Button title={t('signInGoogle')} onPress={google} variant="secondary" style={{ marginTop: 10 }} />
      <Text style={s.link} onPress={() => router.back()}>
        {t('haveAccount')}
      </Text>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg, padding: 24, justifyContent: 'center' },
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
