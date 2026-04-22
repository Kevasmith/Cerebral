import React, { useState } from 'react';
import { View, Text, TextInput, Button, FlatList, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { api } from '../api/client';

export default function Chat() {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);

  const send = async () => {
    if (!text.trim()) return;
    const userMsg = { id: Date.now().toString(), role: 'user', text: text.trim() };
    setMessages((m) => [userMsg, ...m]);
    setText('');
    setLoading(true);
    try {
      const res = await api.post('/chat', { message: userMsg.text });
      const reply = res.data?.reply || 'No response';
      setMessages((m) => [{ id: Date.now().toString() + '-r', role: 'assistant', text: reply }, ...m]);
    } catch (err) {
      setMessages((m) => [{ id: Date.now().toString() + '-r', role: 'assistant', text: 'Failed to get response' }, ...m]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.container}>
        <FlatList
          data={messages}
          inverted
          keyExtractor={(i) => i.id}
          renderItem={({ item }) => (
            <View style={[styles.bubble, item.role === 'assistant' ? styles.assistant : styles.user]}>
              <Text style={{ color: item.role === 'assistant' ? '#000' : '#fff' }}>{item.text}</Text>
            </View>
          )}
        />

        <View style={styles.inputRow}>
          <TextInput value={text} onChangeText={setText} style={styles.input} placeholder="Ask the assistant..." />
          <Button title={loading ? '...' : 'Send'} onPress={send} />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 12 },
  bubble: { padding: 12, borderRadius: 8, marginVertical: 6, maxWidth: '85%' },
  assistant: { alignSelf: 'flex-start', backgroundColor: '#eee' },
  user: { alignSelf: 'flex-end', backgroundColor: '#007bff' },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: { flex: 1, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, marginRight: 8 },
});
