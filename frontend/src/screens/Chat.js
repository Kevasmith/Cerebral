import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../api/client';

const IS_WEB = Platform.OS === 'web';
const WEB_GRADIENT = IS_WEB
  ? { backgroundImage: 'linear-gradient(145deg, #0F172A 0%, #0b2018 40%, #085c3a 75%, #0a9165 100%)' }
  : {};

const QUICK_PROMPTS = [
  { label: '💸 Where is my money going?',  text: "Where is most of my money going this month?" },
  { label: '💰 How can I save more?',       text: "Give me 3 practical ways I can save more money this month." },
  { label: "📈 What's a TFSA?",             text: "Explain what a TFSA is and how I should use one." },
  { label: '🚀 Side hustle ideas?',         text: "What are some side hustles I can start with no experience?" },
  { label: '🏦 Invest my savings?',         text: "I have $1,500 in savings sitting in a regular account. What should I do with it?" },
  { label: '🎯 Am I on track?',             text: "Am I spending too much this month? Give me an honest assessment." },
];

function Bubble({ item }) {
  const isUser = item.role === 'user';
  return (
    <View style={[styles.bubbleWrap, isUser ? styles.bubbleWrapUser : styles.bubbleWrapAssistant]}>
      {!isUser && (
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>C</Text>
        </View>
      )}
      <View style={[
        styles.bubble,
        isUser ? styles.bubbleUser : styles.bubbleAssistant,
        IS_WEB && styles.bubbleWeb,
      ]}>
        <Text style={[styles.bubbleText, isUser && styles.bubbleTextUser]}>{item.text}</Text>
      </View>
    </View>
  );
}

function TypingIndicator() {
  return (
    <View style={[styles.bubbleWrap, styles.bubbleWrapAssistant]}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>C</Text>
      </View>
      <View style={[styles.bubble, styles.bubbleAssistant, styles.typingBubble]}>
        <ActivityIndicator size="small" color="#888" />
      </View>
    </View>
  );
}

export default function Chat() {
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState([
    { id: 'intro', role: 'assistant', text: "Hey! I'm your Cerebral AI. Ask me anything about your spending, saving goals, or financial opportunities. Try one of the suggestions below!" },
  ]);
  const [text, setText]                     = useState('');
  const [loading, setLoading]               = useState(false);
  const [promptsVisible, setPromptsVisible] = useState(true);
  const listRef = useRef(null);

  const send = async (message) => {
    const trimmed = (message ?? text).trim();
    if (!trimmed || loading) return;
    setPromptsVisible(false);
    const userMsg = { id: Date.now().toString(), role: 'user', text: trimmed };
    setMessages((m) => [...m, userMsg]);
    setText('');
    setLoading(true);
    try {
      const res   = await api.post('/chat', { message: trimmed }, { timeout: 30000 });
      const reply = res.data?.reply || 'No response';
      setMessages((m) => [...m, { id: Date.now().toString() + '-r', role: 'assistant', text: reply }]);
    } catch {
      setMessages((m) => [...m, { id: Date.now().toString() + '-e', role: 'assistant', text: "Sorry, I couldn't reach the server. Try again in a moment." }]);
    } finally {
      setLoading(false);
    }
  };

  const showPrompts = promptsVisible && messages.length <= 1;

  return (
    <KeyboardAvoidingView
      style={[styles.container, WEB_GRADIENT]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
    >
      {!IS_WEB && (
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <Text style={styles.headerTitle}>Ask AI</Text>
          <Text style={styles.headerSub}>Powered by your financial data</Text>
        </View>
      )}

      <View style={styles.chatArea}>
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(i) => i.id}
          renderItem={({ item }) => <Bubble item={item} />}
          contentContainerStyle={[styles.list, IS_WEB && styles.listWeb]}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          ListFooterComponent={
            <>
              {loading && <TypingIndicator />}
              {showPrompts && (
                <View style={[styles.promptsContainer, IS_WEB && styles.promptsContainerWeb]}>
                  <Text style={styles.promptsLabel}>Suggested questions</Text>
                  <View style={styles.promptsGrid}>
                    {QUICK_PROMPTS.map((p) => (
                      <TouchableOpacity
                        key={p.text}
                        style={styles.promptChip}
                        onPress={() => send(p.text)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.promptChipText}>{p.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
            </>
          }
        />
      </View>

      <View style={[styles.inputRow, IS_WEB && styles.inputRowWeb]}>
        <View style={IS_WEB ? styles.inputInner : { flex: 1, flexDirection: 'row', gap: 8 }}>
          <TextInput
            value={text}
            onChangeText={setText}
            style={styles.input}
            placeholder="Ask about your finances..."
            placeholderTextColor="rgba(255,255,255,0.4)"
            multiline
            maxLength={500}
            onSubmitEditing={() => send()}
            returnKeyType="send"
            blurOnSubmit
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!text.trim() || loading) && styles.sendBtnDisabled]}
            onPress={() => send()}
            disabled={!text.trim() || loading}
          >
            <Ionicons name="send" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },

  header: {
    paddingHorizontal: 20,
    paddingTop:        20,
    paddingBottom:     16,
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#fff' },
  headerSub:   { fontSize: 12, color: 'rgba(255,255,255,0.55)', marginTop: 2 },

  chatArea: {
    flex: 1,
    backgroundColor: '#F4F2EC',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
  },

  list:    { padding: 16, paddingBottom: 8 },
  listWeb: { paddingHorizontal: 24 },

  bubbleWrap:          { flexDirection: 'row', marginBottom: 12, alignItems: 'flex-end' },
  bubbleWrapUser:      { justifyContent: 'flex-end' },
  bubbleWrapAssistant: { justifyContent: 'flex-start' },

  avatar:     { width: 28, height: 28, borderRadius: 14, backgroundColor: '#7C3AED', justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  avatarText: { color: '#fff', fontSize: 12, fontWeight: '800' },

  bubble:          { maxWidth: '78%', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleWeb:       { maxWidth: 520 },
  bubbleUser:      { backgroundColor: '#0a9165', borderBottomRightRadius: 4 },
  bubbleAssistant: { backgroundColor: '#FBF9F4', borderBottomLeftRadius: 4, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  bubbleText:      { fontSize: 15, color: '#0F172A', lineHeight: 21 },
  bubbleTextUser:  { color: '#fff' },
  typingBubble:    { paddingVertical: 12, paddingHorizontal: 16 },

  inputRow: {
    flexDirection:   'row',
    alignItems:      'flex-end',
    padding:         12,
    backgroundColor: '#0F172A',
    gap:             8,
  },
  inputRowWeb: {
    justifyContent:  'center',
    paddingHorizontal: 16,
  },
  inputInner: {
    flexDirection: 'row',
    alignItems:    'flex-end',
    gap:           8,
    width:         '100%',
    maxWidth:      700,
  },

  input: {
    flex:             1,
    backgroundColor:  'rgba(255,255,255,0.1)',
    borderRadius:     22,
    paddingHorizontal:16,
    paddingVertical:  10,
    fontSize:         15,
    color:            '#fff',
    maxHeight:        100,
  },
  sendBtn:         { width: 40, height: 40, borderRadius: 20, backgroundColor: '#0a9165', justifyContent: 'center', alignItems: 'center' },
  sendBtnDisabled: { backgroundColor: 'rgba(255,255,255,0.15)' },

  promptsContainer:    { paddingHorizontal: 4, paddingTop: 16, paddingBottom: 8 },
  promptsContainerWeb: { paddingHorizontal: 0 },
  promptsLabel:        { fontSize: 12, fontWeight: '700', color: '#aaa', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10 },
  promptsGrid:         { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  promptChip:          { backgroundColor: '#FBF9F4', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 9, borderWidth: 1.5, borderColor: '#e0e0e0', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 3, elevation: 1 },
  promptChipText:      { fontSize: 13, color: '#0F172A', fontWeight: '600' },
});
