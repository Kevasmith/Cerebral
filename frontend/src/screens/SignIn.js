import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert, Modal, Linking, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useAuthStore from '../store/authStore';

let AppleAuthentication = null;
try {
  if (Platform.OS === 'ios') {
    AppleAuthentication = require('expo-apple-authentication');
  }
} catch {}

const IS_WEB = Platform.OS === 'web';

function ForgotModal({ visible, onClose }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const { sendPasswordReset } = useAuthStore();

  const send = async () => {
    if (!email.trim()) { setError('Enter your email address.'); return; }
    setError('');
    setLoading(true);
    try {
      await sendPasswordReset(email.trim());
      setSent(true);
    } catch (e) {
      setError(e.message || 'Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const close = () => { setEmail(''); setSent(false); setError(''); onClose(); };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <View style={fStyles.overlay}>
        <View style={fStyles.card}>
          <Text style={fStyles.title}>Reset Password</Text>
          {sent ? (
            <>
              <View style={fStyles.sentIcon}>
                <Ionicons name="checkmark-circle" size={44} color="#0a9165" />
              </View>
              <Text style={fStyles.sentMsg}>Check your inbox — we've sent a password reset link to {email.trim()}.</Text>
              <TouchableOpacity style={fStyles.doneBtn} onPress={close}>
                <Text style={fStyles.doneBtnText}>Done</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={fStyles.sub}>Enter your email and we'll send you a reset link.</Text>
              <View style={fStyles.inputRow}>
                <Ionicons name="mail-outline" size={15} color="#b0b8c1" style={{ marginRight: 10 }} />
                <TextInput
                  style={[fStyles.input, IS_WEB && { outlineStyle: 'none' }]}
                  placeholder="Email"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholderTextColor="#c4cdd6"
                  autoFocus
                />
              </View>
              {!!error && <Text style={fStyles.error}>{error}</Text>}
              <View style={fStyles.btnRow}>
                <TouchableOpacity style={fStyles.cancelBtn} onPress={close}>
                  <Text style={fStyles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={fStyles.sendBtn} onPress={send} disabled={loading}>
                  {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={fStyles.sendText}>Send Link</Text>}
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

export default function SignIn() {
  const [mode, setMode]               = useState('signin');
  const [email, setEmail]             = useState('');
  const [password, setPassword]       = useState('');
  const [name, setName]               = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');
  const [forgotVisible, setForgotVisible] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);

  const { signIn, signUp, signInWithApple } = useAuthStore();

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
      <ForgotModal visible={forgotVisible} onClose={() => setForgotVisible(false)} />

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
        <Image
          source={require('../../assets/logo-mark.png')}
          style={styles.logoImg}
          resizeMode="contain"
        />
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
              onPress={() => setForgotVisible(true)}
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

            {/* Sign in with Apple — iOS only */}
            {Platform.OS === 'ios' && AppleAuthentication?.AppleAuthenticationButton && (
              <>
                <AppleAuthentication.AppleAuthenticationButton
                  buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                  buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                  cornerRadius={13}
                  style={styles.appleBtn}
                  onPress={async () => {
                    setAppleLoading(true);
                    setError('');
                    try {
                      const credential = await AppleAuthentication.signInAsync({
                        requestedScopes: [
                          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
                          AppleAuthentication.AppleAuthenticationScope.EMAIL,
                        ],
                      });
                      await signInWithApple(credential.identityToken, credential.fullName);
                    } catch (e) {
                      if (e.code !== 'ERR_REQUEST_CANCELED') {
                        setError(e.message || 'Apple sign in failed.');
                      }
                    } finally {
                      setAppleLoading(false);
                    }
                  }}
                />
                {appleLoading && <ActivityIndicator color="#0F172A" style={{ marginTop: 8 }} />}
              </>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Privacy + Terms — visible before sign-up, required by Apple */}
      <View style={styles.legalRow}>
        <Text style={styles.legalText}>By continuing you agree to our </Text>
        <TouchableOpacity onPress={() => Linking.openURL('https://cerebralwealth.app/terms.html')}>
          <Text style={styles.legalLink}>Terms</Text>
        </TouchableOpacity>
        <Text style={styles.legalText}> and </Text>
        <TouchableOpacity onPress={() => Linking.openURL('https://cerebralwealth.app/privacy.html')}>
          <Text style={styles.legalLink}>Privacy Policy</Text>
        </TouchableOpacity>
      </View>
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
  logoImg: { width: 36, height: 36, borderRadius: 18 },
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

  appleBtn: { width: '100%', height: 50, marginTop: 4 },

  legalRow: {
    position: 'absolute', bottom: 24, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap',
    paddingHorizontal: 20,
  },
  legalText: { fontSize: 11, color: 'rgba(255,255,255,0.45)' },
  legalLink: { fontSize: 11, color: 'rgba(255,255,255,0.75)', fontWeight: '600', textDecorationLine: 'underline' },
});

const fStyles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24,
  },
  card: {
    backgroundColor: '#fff', borderRadius: 20, padding: 24, width: '100%', maxWidth: 360,
    shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 24, elevation: 12,
  },
  title: { fontSize: 18, fontWeight: '800', color: '#0F172A', marginBottom: 8 },
  sub:   { fontSize: 13, color: '#8c98a8', marginBottom: 20, lineHeight: 18 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#EFEBE0', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 13, marginBottom: 10,
  },
  input:  { flex: 1, fontSize: 14, color: '#0F172A' },
  error:  { color: '#EF4444', fontSize: 13, marginBottom: 10 },
  btnRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  cancelBtn:  { flex: 1, padding: 13, borderRadius: 10, borderWidth: 1, borderColor: '#ECE8DC', alignItems: 'center' },
  cancelText: { fontSize: 15, color: '#666', fontWeight: '600' },
  sendBtn:    { flex: 1, padding: 13, borderRadius: 10, backgroundColor: '#0F172A', alignItems: 'center' },
  sendText:   { fontSize: 15, color: '#fff', fontWeight: '700' },
  sentIcon:   { alignItems: 'center', marginBottom: 14 },
  sentMsg:    { fontSize: 14, color: '#555', lineHeight: 20, textAlign: 'center', marginBottom: 20 },
  doneBtn:    { backgroundColor: '#0F172A', borderRadius: 10, padding: 14, alignItems: 'center' },
  doneBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
