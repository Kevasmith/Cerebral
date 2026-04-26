import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useAuthStore from '../store/authStore';

const IS_WEB = Platform.OS === 'web';

function alert(msg) {
  if (IS_WEB) window.alert(msg);
  else Alert.alert('Info', msg);
}

export default function SignIn() {
  const [mode, setMode]               = useState('signin');
  const [email, setEmail]             = useState('');
  const [password, setPassword]       = useState('');
  const [name, setName]               = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');

  const { signIn, signUp } = useAuthStore();

  const validate = () => {
    if (!email.trim()) return 'Email is required.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return 'Enter a valid email address.';
    if (!password) return 'Password is required.';
    if (mode === 'signup') {
      if (!name.trim()) return 'Name is required.';
      if (password.length < 8) return 'Password must be at least 8 characters.';
    }
    return null;
  };

  const submit = async () => {
    const err = validate();
    if (err) { setError(err); return; }
    setError('');
    setLoading(true);
    try {
      if (mode === 'signin') await signIn(email.trim(), password);
      else await signUp(email.trim(), password, name.trim());
    } catch (e) {
      setError(e.message || 'Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>

      {/* Dark navy → blue gradient background */}
      <View
        style={[
          StyleSheet.absoluteFill,
          IS_WEB
            ? { backgroundImage: 'linear-gradient(145deg, #0F172A 0%, #0b2018 28%, #085c3a 58%, #0a9165 100%)' }
            : { backgroundColor: '#0F172A' },
        ]}
      />

      {/* Radial glow overlay */}
      {IS_WEB && (
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundImage:
                'radial-gradient(ellipse 80% 60% at 70% 10%, rgba(10,145,101,0.3) 0%, transparent 65%)',
            },
          ]}
        />
      )}

      {/* Cerebral logo — top left */}
      <View style={styles.logoArea}>
        <View style={styles.logoIconWrap}>
          <Ionicons name="analytics-outline" size={13} color="#fff" />
        </View>
        <Text style={styles.logoText}>Cerebral</Text>
      </View>

      {/* Card */}
      <KeyboardAvoidingView
        style={styles.cardArea}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Gradient border: outer View with gradient bg + 1.5px "padding" */}
        <View
          style={[
            styles.cardBorder,
            IS_WEB && {
              backgroundImage:
                'linear-gradient(150deg, rgba(10,145,101,0.6) 0%, rgba(255,255,255,0.05) 48%, rgba(15,23,42,0.6) 100%)',
            },
            !IS_WEB && styles.cardBorderNative,
          ]}
        >
          <View
            style={[
              styles.card,
              IS_WEB && {
                backdropFilter: 'blur(28px)',
                WebkitBackdropFilter: 'blur(28px)',
                backgroundColor: 'rgba(255,255,255,0.72)',
              },
            ]}
          >
            {/* Icon */}
            <View style={styles.iconWrap}>
              <Ionicons name="log-in-outline" size={22} color="#0F172A" />
            </View>

            <Text style={styles.title}>
              {mode === 'signin' ? 'Sign in to Cerebral' : 'Create your account'}
            </Text>
            <Text style={styles.subtitle}>
              Your AI-powered financial awareness starts here.
            </Text>

            {/* Name — signup only */}
            {mode === 'signup' && (
              <View style={styles.inputRow}>
                <Ionicons name="person-outline" size={15} color="#b0b8c1" style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, IS_WEB && { outlineStyle: 'none' }]}
                  placeholder="Your name"
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                  placeholderTextColor="#c4cdd6"
                />
              </View>
            )}

            {/* Email */}
            <View style={styles.inputRow}>
              <Ionicons name="mail-outline" size={15} color="#b0b8c1" style={styles.inputIcon} />
              <TextInput
                style={[styles.input, IS_WEB && { outlineStyle: 'none' }]}
                placeholder="Email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholderTextColor="#c4cdd6"
              />
            </View>

            {/* Password */}
            <View style={styles.inputRow}>
              <Ionicons name="lock-closed-outline" size={15} color="#b0b8c1" style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { flex: 1 }, IS_WEB && { outlineStyle: 'none' }]}
                placeholder="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                placeholderTextColor="#c4cdd6"
              />
              <TouchableOpacity onPress={() => setShowPassword((v) => !v)} style={styles.eyeBtn}>
                <Ionicons
                  name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                  size={16}
                  color="#b0b8c1"
                />
              </TouchableOpacity>
            </View>

            {/* Forgot password */}
            <TouchableOpacity
              style={styles.forgotRow}
              onPress={() => alert('Password reset is coming soon. Contact support for help.')}
            >
              <Text style={styles.forgotText}>Forgot password?</Text>
            </TouchableOpacity>

            {/* Error */}
            {!!error && <Text style={styles.errorText}>{error}</Text>}

            {/* CTA */}
            <TouchableOpacity style={styles.btn} onPress={submit} disabled={loading}>
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.btnText}>
                    {mode === 'signin' ? 'Sign In' : 'Create Account'}
                  </Text>
              }
            </TouchableOpacity>

            {/* Toggle mode */}
            <TouchableOpacity
              onPress={() => { setMode((m) => m === 'signin' ? 'signup' : 'signin'); setError(''); }}
            >
              <Text style={styles.toggleText}>
                {mode === 'signin'
                  ? "Don't have an account? Sign up"
                  : 'Already have an account? Sign in'}
              </Text>
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerLabel}>Or sign in with</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Social buttons */}
            <View style={styles.socialRow}>
              <TouchableOpacity
                style={styles.socialBtn}
                onPress={() => alert('Google sign-in is coming soon.')}
                activeOpacity={0.7}
              >
                <Text style={styles.googleG}>G</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.socialBtn}
                onPress={() => alert('Facebook sign-in is coming soon.')}
                activeOpacity={0.7}
              >
                <Ionicons name="logo-facebook" size={19} color="#1877F2" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.socialBtn}
                onPress={() => alert('Apple sign-in is coming soon.')}
                activeOpacity={0.7}
              >
                <Ionicons name="logo-apple" size={20} color="#111" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F172A',
  },

  logoArea: {
    position: 'absolute',
    top: 24, left: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    zIndex: 10,
  },
  logoIconWrap: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: '#0a9165',
    justifyContent: 'center', alignItems: 'center',
  },
  logoText: { fontSize: 15, fontWeight: '700', color: '#fff' },

  cardArea: {
    width: '100%',
    maxWidth: 380,
    paddingHorizontal: 20,
  },

  cardBorder: {
    borderRadius: 26,
    padding: 1.5,
    backgroundColor: 'transparent',
  },
  cardBorderNative: {
    borderWidth: 1,
    borderColor: 'rgba(10,145,101,0.35)',
  },

  card: {
    backgroundColor: 'rgba(255,255,255,0.88)',
    borderRadius: 25,
    paddingHorizontal: 28,
    paddingTop: 32,
    paddingBottom: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.35,
    shadowRadius: 48,
    elevation: 14,
  },

  iconWrap: {
    width: 52, height: 52, borderRadius: 16,
    backgroundColor: '#EFEBE0',
    justifyContent: 'center', alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 22,
  },

  title: {
    fontSize: 21, fontWeight: '800', color: '#0F172A',
    textAlign: 'center', marginBottom: 8,
  },
  subtitle: {
    fontSize: 13, color: '#8c98a8',
    textAlign: 'center', lineHeight: 19, marginBottom: 24,
  },

  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#EFEBE0',
    borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 13,
    marginBottom: 10,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 14, color: '#0F172A' },
  eyeBtn: { paddingLeft: 8 },

  forgotRow: { alignItems: 'flex-end', marginBottom: 18, marginTop: 2 },
  forgotText: { fontSize: 13, color: '#8c98a8', fontWeight: '500' },

  errorText: { color: '#EF4444', fontSize: 13, textAlign: 'center', marginBottom: 10 },

  btn: {
    backgroundColor: '#0F172A',
    borderRadius: 13, paddingVertical: 15,
    alignItems: 'center', marginBottom: 14,
    shadowColor: '#0a9165',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35, shadowRadius: 14,
    elevation: 6,
  },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '700', letterSpacing: 0.2 },

  toggleText: {
    color: '#8c98a8', textAlign: 'center',
    fontSize: 13, marginBottom: 22,
  },

  divider: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 18 },
  dividerLine:  { flex: 1, height: 1, backgroundColor: '#ECE8DC' },
  dividerLabel: { fontSize: 12, color: '#b0b8c1', fontWeight: '500' },

  socialRow: { flexDirection: 'row', justifyContent: 'center', gap: 14 },
  socialBtn: {
    width: 60, height: 48, borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 1, borderColor: '#ECE8DC',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  googleG: { fontSize: 17, fontWeight: '800', color: '#EA4335' },
});
