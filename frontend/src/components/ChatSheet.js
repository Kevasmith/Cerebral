import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator,
  Modal, Animated, Dimensions, TouchableWithoutFeedback,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../api/client';

const IS_WEB  = Platform.OS === 'web';
const { height: SCREEN_H } = Dimensions.get('window');

const C = {
  bg:         '#080E14',
  card:       '#0D1520',
  teal:       '#10C896',
  tealDim:    'rgba(16,200,150,0.12)',
  tealBorder: 'rgba(16,200,150,0.3)',
  white:      '#FFFFFF',
  muted:      'rgba(255,255,255,0.55)',
  faint:      'rgba(255,255,255,0.2)',
  border:     'rgba(255,255,255,0.07)',
  userBubble: '#10C896',
  aiBubble:   '#0D1520',
};

// Context-aware greeting + prompts per screen
const CONTEXTS = {
  snapshot: {
    greeting: "Hey! I can see your financial snapshot. What would you like to dig into?",
    prompts: [
      { label: 'Am I on track?',       text: "Based on my finances this month, am I on track?" },
      { label: 'Improve health',        text: "What's the one thing I should do to improve my financial health?" },
      { label: 'Grow net worth',        text: "Give me 3 practical ways to grow my net worth faster." },
      { label: 'Monthly breakdown',     text: "Give me a plain-English breakdown of my finances this month." },
    ],
  },
  spending: {
    greeting: "I can see your spending data. Want me to break it down or find savings?",
    prompts: [
      { label: 'Why so much?',          text: "Why am I spending so much this month? Be honest." },
      { label: 'Where to cut back?',    text: "Where should I realistically cut back on spending?" },
      { label: 'Stick to a budget',     text: "Give me a simple budget I can actually stick to." },
      { label: 'Recurring charges',     text: "How do I find and cancel subscriptions I forgot about?" },
    ],
  },
  savings: {
    greeting: "Let's talk about growing your money. What's on your mind?",
    prompts: [
      { label: 'Save more each month',  text: "How can I realistically save more money every month?" },
      { label: 'TFSA vs RRSP',          text: "Should I prioritize my TFSA or RRSP right now?" },
      { label: 'Invest $1,000',         text: "I have $1,000 to invest as a Canadian. What should I do with it?" },
      { label: 'Emergency fund',        text: "How big should my emergency fund be and how do I build it fast?" },
    ],
  },
  accounts: {
    greeting: "I can see your connected accounts. What do you want to know?",
    prompts: [
      { label: 'Best savings rate',     text: "Which Canadian bank has the best savings rate right now?" },
      { label: 'Improve credit score',  text: "How do I improve my credit score in Canada?" },
      { label: 'Too many accounts?',    text: "Do I have too many bank accounts? What's optimal?" },
      { label: 'Calculate net worth',   text: "How do I calculate my true net worth?" },
    ],
  },
  default: {
    greeting: "Hey! I'm your Cerebral AI. Ask me anything about your money.",
    prompts: [
      { label: 'Where is my money going?', text: "Where is most of my money going this month?" },
      { label: 'Save more',                text: "Give me 3 practical ways I can save more money." },
      { label: "What's a TFSA?",           text: "Explain what a TFSA is and how I should use one as a young Canadian." },
      { label: 'Side hustle ideas',        text: "What are some side hustles I can start with no experience?" },
    ],
  },
};

function Bubble({ item }) {
  const isUser = item.role === 'user';
  return (
    <View style={[s.bubbleRow, isUser ? s.bubbleRowUser : s.bubbleRowAI]}>
      {!isUser && (
        <View style={s.aiBadge}>
          <Text style={s.aiBadgeText}>C</Text>
        </View>
      )}
      <View style={[s.bubble, isUser ? s.bubbleUser : s.bubbleAI]}>
        <Text style={[s.bubbleText, isUser && s.bubbleTextUser]}>{item.text}</Text>
      </View>
    </View>
  );
}

function TypingDots() {
  const op = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(op, { toValue: 1,   duration: 500, useNativeDriver: true }),
        Animated.timing(op, { toValue: 0.4, duration: 500, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return (
    <View style={s.bubbleRow}>
      <View style={s.aiBadge}>
        <Text style={s.aiBadgeText}>C</Text>
      </View>
      <View style={[s.bubble, s.bubbleAI, { paddingVertical: 14, paddingHorizontal: 18 }]}>
        <Animated.View style={{ opacity: op, flexDirection: 'row', gap: 4 }}>
          {[0,1,2].map(i => (
            <View key={i} style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: C.teal }} />
          ))}
        </Animated.View>
      </View>
    </View>
  );
}

export default function ChatSheet({ visible, onClose, screenKey = 'default' }) {
  const insets = useSafeAreaInsets();
  const ctx    = CONTEXTS[screenKey] ?? CONTEXTS.default;

  const [messages, setMessages] = useState([
    { id: 'intro', role: 'assistant', text: ctx.greeting },
  ]);
  const [input,   setInput]   = useState('');
  const [loading, setLoading] = useState(false);
  const [showPrompts, setShowPrompts] = useState(true);
  const listRef = useRef(null);

  // Reset chat when sheet opens on a new screen
  useEffect(() => {
    if (visible) {
      setMessages([{ id: 'intro', role: 'assistant', text: ctx.greeting }]);
      setInput('');
      setLoading(false);
      setShowPrompts(true);
    }
  }, [visible, screenKey]);

  const send = async (override) => {
    const msg = (override ?? input).trim();
    if (!msg || loading) return;
    setShowPrompts(false);
    setMessages(m => [...m, { id: Date.now().toString(), role: 'user', text: msg }]);
    setInput('');
    setLoading(true);
    try {
      const res = await api.post('/chat', { message: msg }, { timeout: 30000 });
      setMessages(m => [...m, { id: Date.now() + '-r', role: 'assistant', text: res.data?.reply || 'No response.' }]);
    } catch {
      setMessages(m => [...m, { id: Date.now() + '-e', role: 'assistant', text: "Couldn't reach Cerebral AI. Check your connection and try again." }]);
    } finally {
      setLoading(false);
    }
  };

  const content = (
    <View style={[s.sheet, { paddingBottom: insets.bottom + 8 }]}>
      {/* Handle bar */}
      <View style={s.handleWrap}>
        <View style={s.handle} />
      </View>

      {/* Header */}
      <View style={s.sheetHeader}>
        <View style={s.sheetHeaderLeft}>
          <View style={s.cerebralBadge}>
            <Text style={s.cerebralBadgeText}>C</Text>
          </View>
          <View>
            <Text style={s.sheetTitle}>Cerebral AI</Text>
            <View style={s.onlineRow}>
              <View style={s.onlineDot} />
              <Text style={s.onlineText}>Online · Financial Intelligence</Text>
            </View>
          </View>
        </View>
        <TouchableOpacity style={s.closeBtn} onPress={onClose} activeOpacity={0.7}>
          <Ionicons name="close" size={18} color={C.muted} />
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={20}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={i => i.id}
          renderItem={({ item }) => <Bubble item={item} />}
          contentContainerStyle={s.list}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={
            <>
              {loading && <TypingDots />}
              {showPrompts && messages.length <= 1 && (
                <View style={s.prompts}>
                  <Text style={s.promptsLabel}>Suggested</Text>
                  <View style={s.promptsGrid}>
                    {ctx.prompts.map(p => (
                      <TouchableOpacity
                        key={p.text}
                        style={s.chip}
                        onPress={() => send(p.text)}
                        activeOpacity={0.75}
                      >
                        <Text style={s.chipText}>{p.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
            </>
          }
        />

        {/* Disclaimer */}
        <Text style={s.disclaimer}>
          Cerebral provides financial awareness, not financial advice.
        </Text>

        {/* Input */}
        <View style={s.inputRow}>
          <TextInput
            style={[s.input, IS_WEB && { outlineStyle: 'none' }]}
            value={input}
            onChangeText={setInput}
            placeholder="Ask anything about your money..."
            placeholderTextColor={C.faint}
            multiline
            maxLength={500}
            returnKeyType="send"
            blurOnSubmit
            onSubmitEditing={() => send()}
          />
          <TouchableOpacity
            style={[s.sendBtn, (!input.trim() || loading) && s.sendBtnOff]}
            onPress={() => send()}
            disabled={!input.trim() || loading}
            activeOpacity={0.8}
          >
            <Ionicons name="send" size={16} color={C.bg} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );

  if (IS_WEB) {
    if (!visible) return null;
    return (
      <View style={s.webOverlay}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={s.webBackdrop} />
        </TouchableWithoutFeedback>
        {content}
      </View>
    );
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={s.backdrop} />
      </TouchableWithoutFeedback>
      {content}
    </Modal>
  );
}

const SHEET_H = SCREEN_H * 0.78;

const s = StyleSheet.create({
  // Overlay / backdrop
  backdrop:    { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)' },
  webOverlay:  { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999, justifyContent: 'flex-end' },
  webBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)' },

  // Sheet
  sheet: {
    position:             'absolute',
    bottom:               0, left: 0, right: 0,
    height:               SHEET_H,
    backgroundColor:      C.bg,
    borderTopLeftRadius:  28,
    borderTopRightRadius: 28,
    borderTopWidth:       1,
    borderColor:          C.border,
    overflow:             'hidden',
  },

  // Handle
  handleWrap: { alignItems: 'center', paddingTop: 12, paddingBottom: 4 },
  handle:     { width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.2)' },

  // Sheet header
  sheetHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  sheetHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cerebralBadge: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: C.tealDim,
    borderWidth: 1.5, borderColor: C.tealBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  cerebralBadgeText: { fontSize: 17, fontWeight: '900', color: C.teal },
  sheetTitle:        { fontSize: 15, fontWeight: '800', color: C.white },
  onlineRow:         { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  onlineDot:         { width: 6, height: 6, borderRadius: 3, backgroundColor: C.teal },
  onlineText:        { fontSize: 11, color: C.teal, fontWeight: '600' },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.07)',
    alignItems: 'center', justifyContent: 'center',
  },

  // Messages
  list: { padding: 16, paddingBottom: 8, flexGrow: 1 },
  bubbleRow:     { flexDirection: 'row', marginBottom: 12, alignItems: 'flex-end' },
  bubbleRowUser: { justifyContent: 'flex-end' },
  bubbleRowAI:   { justifyContent: 'flex-start' },
  aiBadge: {
    width: 26, height: 26, borderRadius: 8,
    backgroundColor: C.tealDim,
    borderWidth: 1, borderColor: C.tealBorder,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 8, flexShrink: 0,
  },
  aiBadgeText: { fontSize: 11, fontWeight: '900', color: C.teal },
  bubble:         { maxWidth: '80%', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleUser:     { backgroundColor: C.teal, borderBottomRightRadius: 4 },
  bubbleAI:       { backgroundColor: C.card, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: C.border },
  bubbleText:     { fontSize: 14, color: C.white, lineHeight: 20 },
  bubbleTextUser: { color: C.bg, fontWeight: '600' },

  // Quick prompts
  prompts:      { paddingTop: 12, paddingBottom: 4 },
  promptsLabel: { fontSize: 11, fontWeight: '700', color: C.muted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 },
  promptsGrid:  { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    backgroundColor: C.card,
    borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9,
    borderWidth: 1, borderColor: C.border,
  },
  chipText: { fontSize: 13, color: C.white, fontWeight: '600' },

  // Disclaimer
  disclaimer: {
    fontSize: 10, color: 'rgba(255,255,255,0.2)',
    textAlign: 'center', fontStyle: 'italic',
    paddingHorizontal: 16, paddingVertical: 6,
  },

  // Input
  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end',
    paddingHorizontal: 12, paddingTop: 8, paddingBottom: 4,
    gap: 8,
    borderTopWidth: 1, borderTopColor: C.border,
  },
  input: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 22, borderWidth: 1, borderColor: C.border,
    paddingHorizontal: 16, paddingVertical: 10,
    fontSize: 14, color: C.white, maxHeight: 100,
  },
  sendBtn:    { width: 40, height: 40, borderRadius: 20, backgroundColor: C.teal, alignItems: 'center', justifyContent: 'center' },
  sendBtnOff: { backgroundColor: 'rgba(255,255,255,0.1)' },
});
