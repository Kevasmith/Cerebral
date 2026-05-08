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
                <Ionicons name="mail-outline" size={15} color="rgba(255,255,255,0.35)" style={{ marginRight: 10 }} />
                <TextInput
                  style={[fStyles.input, IS_WEB && { outlineStyle: 'none' }]}
                  placeholder="Email"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholderTextColor="rgba(255,255,255,0.3)"
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

      {/* Background */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: '#080E14' }]} />
      {IS_WEB && (
        <View
          style={[StyleSheet.absoluteFill, {
            backgroundImage:
              'radial-gradient(ellipse 70% 50% at 50% 0%, rgba(16,200,150,0.12) 0%, transparent 60%)',
          }]}
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
        <View style={styles.cardBorder}>
          <View style={[styles.card, IS_WEB && { backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }]}>
            {/* Icon */}
            <View style={styles.iconWrap}>
              <Ionicons name="log-in-outline" size={22} color="#10C896" />
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
                <Ionicons name="person-outline" size={15} color="rgba(255,255,255,0.35)" style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, IS_WEB && { outlineStyle: 'none' }]}
                  placeholder="Your name"
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                />
              </View>
            )}

            {/* Email */}
            <View style={styles.inputRow}>
              <Ionicons name="mail-outline" size={15} color="rgba(255,255,255,0.35)" style={styles.inputIcon} />
              <TextInput
                style={[styles.input, IS_WEB && { outlineStyle: 'none' }]}
                placeholder="Email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholderTextColor="rgba(255,255,255,0.3)"
              />
            </View>

            {/* Password */}
            <View style={styles.inputRow}>
              <Ionicons name="lock-closed-outline" size={15} color="rgba(255,255,255,0.35)" style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { flex: 1 }, IS_WEB && { outlineStyle: 'none' }]}
                placeholder="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                placeholderTextColor="rgba(255,255,255,0.3)"
              />
              <TouchableOpacity onPress={() => setShowPassword((v) => !v)} style={styles.eyeBtn}>
                <Ionicons
                  name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                  size={16}
                  color="rgba(255,255,255,0.35)"
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
                {appleLoading && <ActivityIndicator color="#10C896" style={{ marginTop: 8 }} />}
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
    backgroundColor: '#080E14',
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
    borderWidth: 1,
    borderColor: 'rgba(16,200,150,0.18)',
  },

  card: {
    backgroundColor: '#0D1520',
    borderRadius: 25,
    paddingHorizontal: 28,
    paddingTop: 32,
    paddingBottom: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.5,
    shadowRadius: 48,
    elevation: 14,
  },

  iconWrap: {
    width: 52, height: 52, borderRadius: 16,
    backgroundColor: 'rgba(16,200,150,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16,200,150,0.22)',
    justifyContent: 'center', alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 22,
  },

  title: {
    fontSize: 21, fontWeight: '800', color: '#FFFFFF',
    textAlign: 'center', marginBottom: 8,
  },
  subtitle: {
    fontSize: 13, color: 'rgba(255,255,255,0.45)',
    textAlign: 'center', lineHeight: 19, marginBottom: 24,
  },

  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 13,
    marginBottom: 10,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 14, color: '#FFFFFF' },
  eyeBtn: { paddingLeft: 8 },

  forgotRow: { alignItems: 'flex-end', marginBottom: 18, marginTop: 2 },
  forgotText: { fontSize: 13, color: 'rgba(255,255,255,0.4)', fontWeight: '500' },

  errorText: { color: '#EF4444', fontSize: 13, textAlign: 'center', marginBottom: 10 },

  btn: {
    backgroundColor: '#10C896',
    borderRadius: 13, paddingVertical: 15,
    alignItems: 'center', marginBottom: 14,
    shadowColor: '#10C896',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3, shadowRadius: 14,
    elevation: 6,
  },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '700', letterSpacing: 0.2 },

  toggleText: {
    color: 'rgba(255,255,255,0.4)', textAlign: 'center',
    fontSize: 13, marginBottom: 22,
  },

  divider: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 18 },
  dividerLine:  { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.08)' },
  dividerLabel: { fontSize: 12, color: 'rgba(255,255,255,0.3)', fontWeight: '500' },

  appleBtn: { width: '100%', height: 50, marginTop: 4 },

  legalRow: {
    position: 'absolute', bottom: 24, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap',
    paddingHorizontal: 20,
  },
  legalText: { fontSize: 11, color: 'rgba(255,255,255,0.35)' },
  legalLink: { fontSize: 11, color: 'rgba(255,255,255,0.65)', fontWeight: '600', textDecorationLine: 'underline' },
});

const fStyles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24,
  },
  card: {
    backgroundColor: '#0D1520', borderRadius: 20, padding: 24, width: '100%', maxWidth: 360,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.4, shadowRadius: 24, elevation: 12,
  },
  title: { fontSize: 18, fontWeight: '800', color: '#FFFFFF', marginBottom: 8 },
  sub:   { fontSize: 13, color: 'rgba(255,255,255,0.45)', marginBottom: 20, lineHeight: 18 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 14, paddingVertical: 13, marginBottom: 10,
  },
  input:  { flex: 1, fontSize: 14, color: '#FFFFFF' },
  error:  { color: '#EF4444', fontSize: 13, marginBottom: 10 },
  btnRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  cancelBtn:  { flex: 1, padding: 13, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center' },
  cancelText: { fontSize: 15, color: 'rgba(255,255,255,0.5)', fontWeight: '600' },
  sendBtn:    { flex: 1, padding: 13, borderRadius: 10, backgroundColor: '#10C896', alignItems: 'center' },
  sendText:   { fontSize: 15, color: '#fff', fontWeight: '700' },
  sentIcon:   { alignItems: 'center', marginBottom: 14 },
  sentMsg:    { fontSize: 14, color: 'rgba(255,255,255,0.6)', lineHeight: 20, textAlign: 'center', marginBottom: 20 },
  doneBtn:    { backgroundColor: '#10C896', borderRadius: 10, padding: 14, alignItems: 'center' },
  doneBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
