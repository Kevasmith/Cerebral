import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../api/client';

function Bubble({ item }) {
  const isUser = item.role === 'user';
  return (
    <View style={[styles.bubbleWrap, isUser ? styles.bubbleWrapUser : styles.bubbleWrapAssistant]}>
      {!isUser && (
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>C</Text>
        </View>
      )}
      <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAssistant]}>
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
  const [messages, setMessages] = useState([
    { id: 'intro', role: 'assistant', text: "Hey! I'm your Cerebral AI. Ask me anything about your spending, saving goals, or financial opportunities." },
  ]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const listRef = useRef(null);

  const send = async () => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    const userMsg = { id: Date.now().toString(), role: 'user', text: trimmed };
    setMessages((m) => [...m, userMsg]);
    setText('');
    setLoading(true);
    try {
      const res = await api.post('/chat', { message: trimmed });
      const reply = res.data?.reply || 'No response';
      setMessages((m) => [...m, { id: Date.now().toString() + '-r', role: 'assistant', text: reply }]);
    } catch {
      setMessages((m) => [...m, { id: Date.now().toString() + '-e', role: 'assistant', text: "Sorry, I couldn't reach the server. Try again." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Ask AI</Text>
        <Text style={styles.headerSub}>Powered by your financial data</Text>
      </View>

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(i) => i.id}
        renderItem={({ item }) => <Bubble item={item} />}
        contentContainerStyle={styles.list}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        ListFooterComponent={loading ? <TypingIndicator /> : null}
      />

      <View style={styles.inputRow}>
        <TextInput
          value={text}
          onChangeText={setText}
          style={styles.input}
          placeholder="Ask about your finances..."
          placeholderTextColor="#aaa"
          multiline
          maxLength={500}
          onSubmitEditing={send}
          returnKeyType="send"
          blurOnSubmit
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!text.trim() || loading) && styles.sendBtnDisabled]}
          onPress={send}
          disabled={!text.trim() || loading}
        >
          <Ionicons name="send" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  header: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0', backgroundColor: '#fff' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#1a1a2e' },
  headerSub: { fontSize: 12, color: '#aaa', marginTop: 2 },
  list: { padding: 16, paddingBottom: 8 },
  bubbleWrap: { flexDirection: 'row', marginBottom: 12, alignItems: 'flex-end' },
  bubbleWrapUser: { justifyContent: 'flex-end' },
  bubbleWrapAssistant: { justifyContent: 'flex-start' },
  avatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#1a1a2e', justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  avatarText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  bubble: { maxWidth: '78%', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleUser: { backgroundColor: '#1a1a2e', borderBottomRightRadius: 4 },
  bubbleAssistant: { backgroundColor: '#fff', borderBottomLeftRadius: 4, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  bubbleText: { fontSize: 15, color: '#1a1a2e', lineHeight: 21 },
  bubbleTextUser: { color: '#fff' },
  typingBubble: { paddingVertical: 12, paddingHorizontal: 16 },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', padding: 12, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#f0f0f0', gap: 8 },
  input: { flex: 1, backgroundColor: '#f2f2f2', borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, color: '#1a1a2e', maxHeight: 100 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#1a1a2e', justifyContent: 'center', alignItems: 'center' },
  sendBtnDisabled: { backgroundColor: '#ccc' },
});
