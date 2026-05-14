import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, SafeAreaView,
  Platform, TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../api/client';
import useAuthStore from '../store/authStore';

const IS_WEB = Platform.OS === 'web';
const WebView = Platform.OS !== 'web' ? require('react-native-webview').WebView : null;
const FLINKS_REDIRECT = 'https://cerebral.app/bank-connected';

// ─── Design tokens (cream-light theme) ────────────────────────────────────────
const BG       = '#F4F2EC';
const CARD     = '#FBF9F4';
const TEAL     = '#10C896';
const TEAL_DIM = 'rgba(16,200,150,0.10)';
const TEAL_BDR = 'rgba(16,200,150,0.30)';
const BORDER   = '#ECE8DC';
const TEXT     = '#0F172A';
const TEXT_DIM = 'rgba(15,23,42,0.55)';
const PILL_BG  = '#0F172A'; // black pill for primary CTAs
const PILL_FG  = '#FFFFFF'; // text/icon on black pill

// ─── Data ─────────────────────────────────────────────────────────────────────
const GOALS = [
  { key: 'save_for_house', label: 'Save for a house',    sub: 'Targeting property equity', icon: 'home-outline'     },
  { key: 'retire_early',   label: 'Retire early',         sub: 'Financial independence',   icon: 'leaf-outline'     },
  { key: 'optimize_taxes', label: 'Optimize taxes',       sub: 'Wealth preservation',      icon: 'business-outline' },
  { key: 'emergency_fund', label: 'Build emergency fund', sub: 'Liquidity and safety',     icon: 'shield-outline'   },
  { key: 'custom',         label: 'Custom Goal',          sub: null,                       icon: 'create-outline', isCustom: true },
];

const INTERESTS = [
  { key: 'investing',   label: 'Investing',   emoji: '📊' },
  { key: 'side_income', label: 'Side Income', emoji: '🚀' },
  { key: 'networking',  label: 'Networking',  emoji: '🤝' },
  { key: 'saving',      label: 'Saving',      emoji: '💡' },
];

const BANK_TILES = [
  { label: 'TD Bank',       mark: 'TD',  color: '#1A6137' },
  { label: 'RBC',           mark: 'RBC', color: '#005DAA' },
  { label: 'Scotiabank',    mark: 'S',   color: '#EC1C24' },
  { label: 'BMO',           mark: 'B',   color: '#0277BD' },
  { label: 'CIBC',          mark: 'C',   color: '#C41230' },
  { label: 'National Bank', mark: 'NB',  color: '#E2001A' },
];

const FILTER_CHIPS = [
  ['flash-outline', 'Recently used'],
  ['business-outline', 'Business'],
  ['trending-up-outline', 'Brokerage'],
  ['card-outline', 'Credit card'],
];

// ─── Shared: step progress bar ────────────────────────────────────────────────
function StepProgress({ step, total, label }) {
  return (
    <View style={s.stepProgress}>
      <View style={s.stepProgressRow}>
        <Ionicons name="radio-button-on" size={20} color={TEAL} />
        <Text style={s.stepProgressLabel}>STEP {step} OF {total}: {label}</Text>
      </View>
      <View style={s.progressBar}>
        {Array.from({ length: total }).map((_, i) => (
          <View key={i} style={[s.progressSeg, i < step && s.progressSegFilled]} />
        ))}
      </View>
    </View>
  );
}

// ─── Step 0: Connect Bank ─────────────────────────────────────────────────────
function ConnectBankStep({ onConnected, onSkip }) {
  const [showWebView,  setShowWebView]  = useState(false);
  const [connectUrl,   setConnectUrl]   = useState(null);
  const [urlLoading,   setUrlLoading]   = useState(false);
  const [webViewReady, setWebViewReady] = useState(false);
  const [syncing,      setSyncing]      = useState(false);
  const [connected,    setConnected]    = useState(false);
  const [error,        setError]        = useState('');
  const webViewRef = useRef(null);
  const insets     = useSafeAreaInsets();

  const openFlinks = useCallback(async () => {
    setError('');
    setUrlLoading(true);
    try {
      const res = await api.get('/accounts/connect-url');
      setConnectUrl(res.data.url);
      setShowWebView(true);
    } catch {
      setError('Could not load bank connection. Check your connection and try again.');
    } finally {
      setUrlLoading(false);
    }
  }, []);

  const handleNavChange = useCallback(async (navState) => {
    if (!navState.url.startsWith(FLINKS_REDIRECT)) return;
    const loginId = new URL(navState.url).searchParams.get('loginId');
    if (!loginId) return;
    setSyncing(true);
    setShowWebView(false);
    try {
      await api.post('/accounts/sync', { loginId });
      setConnected(true);
    } catch {
      setError("Bank connected but sync failed. We'll retry in the background.");
      setConnected(true);
    } finally {
      setSyncing(false);
    }
  }, []);

  if (syncing) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={TEAL} />
        <Text style={s.syncText}>Importing your accounts…</Text>
        <Text style={s.syncSub}>This takes a few seconds</Text>
      </View>
    );
  }

  if (showWebView && connectUrl) {
    return (
      <SafeAreaView style={s.wvContainer}>
        <View style={s.wvHeader}>
          <TouchableOpacity onPress={() => setShowWebView(false)} style={s.closeBtn}>
            <Ionicons name="close" size={22} color={TEXT} />
          </TouchableOpacity>
          <Text style={s.wvTitle}>Connect Your Bank</Text>
          <View style={{ width: 40 }} />
        </View>
        {!webViewReady && (
          <View style={s.wvLoader}>
            <ActivityIndicator size="large" color={TEAL} />
          </View>
        )}
        <WebView
          ref={webViewRef}
          source={{ uri: connectUrl }}
          style={[s.wv, !webViewReady && { opacity: 0 }]}
          onLoadEnd={() => setWebViewReady(true)}
          onShouldStartLoadWithRequest={(req) => {
            if (req.url.startsWith(FLINKS_REDIRECT)) { handleNavChange(req); return false; }
            return true;
          }}
          javaScriptEnabled
          domStorageEnabled
        />
      </SafeAreaView>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <View style={[s.bankHero, { paddingTop: insets.top + 20 }]}>
          <View style={s.encryptBadge}>
            <Ionicons name="shield-checkmark" size={13} color={TEAL} />
            <Text style={s.encryptText}>256-bit encryption</Text>
          </View>
          <Text style={s.bankTitle}>Connect your wealth</Text>
          <Text style={s.bankSubtitle}>End-to-end encrypted. We never store your credentials.</Text>
        </View>

        <View style={s.bankContent}>
          {connected && (
            <View style={s.successCard}>
              <Ionicons name="checkmark-circle" size={22} color={TEAL} />
              <Text style={s.successText}>Bank connected successfully!</Text>
            </View>
          )}
          {!!error && <Text style={s.errorText}>{error}</Text>}

          <View style={s.searchBar}>
            <Ionicons name="search-outline" size={17} color={TEXT_DIM} />
            <Text style={s.searchPlaceholder}>Search 12,000+ institutions</Text>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>
            {FILTER_CHIPS.map(([icon, label]) => (
              <View key={label} style={s.chip}>
                <Ionicons name={icon} size={12} color={TEAL} />
                <Text style={s.chipText}>{label}</Text>
              </View>
            ))}
          </ScrollView>

          <View style={s.sectionRow}>
            <Text style={s.sectionTitle}>Popular institutions</Text>
          </View>

          <View style={s.bankGrid}>
            {BANK_TILES.map((bank) => (
              <TouchableOpacity key={bank.label} style={s.bankTile} onPress={openFlinks} activeOpacity={0.7}>
                <View style={[s.bankMark, { backgroundColor: bank.color }]}>
                  <Text style={s.bankMarkText}>{bank.mark}</Text>
                </View>
                <Text style={s.bankTileLabel}>{bank.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={s.trustPanel}>
            <View style={s.trustRow}>
              <View style={[s.trustIcon, { backgroundColor: TEAL_DIM }]}>
                <Ionicons name="flash-outline" size={17} color={TEAL} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.trustTitle}>Instant sync</Text>
                <Text style={s.trustBody}>Balances and transactions update in real time once connected.</Text>
              </View>
            </View>
            <View style={[s.trustRow, { borderBottomWidth: 0 }]}>
              <View style={[s.trustIcon, { backgroundColor: 'rgba(124,58,237,0.12)' }]}>
                <Ionicons name="eye-off-outline" size={17} color="#7C3AED" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.trustTitle}>Read-only access</Text>
                <Text style={s.trustBody}>Cerebral cannot move funds without your explicit consent.</Text>
              </View>
            </View>
          </View>

          {connected ? (
            <TouchableOpacity style={s.nextBtn} onPress={onConnected}>
              <Text style={s.nextBtnText}>Continue  →</Text>
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity
                style={[s.nextBtn, urlLoading && s.nextBtnDisabled]}
                onPress={openFlinks}
                disabled={urlLoading}
              >
                {urlLoading
                  ? <ActivityIndicator color={BG} />
                  : <Text style={s.nextBtnText}>Connect Bank</Text>
                }
              </TouchableOpacity>
              <TouchableOpacity onPress={onSkip} style={s.skipBtn}>
                <Text style={s.skipText}>Skip for now</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Step 1 of 2: Goals ───────────────────────────────────────────────────────
function GoalStep({ onNext }) {
  const [selected,    setSelected]    = useState([]);
  const [customText,  setCustomText]  = useState('');
  const insets = useSafeAreaInsets();

  const toggle = (key) =>
    setSelected((prev) => prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]);

  const handleNext = () => {
    const primary = selected[0] || 'save_for_house';
    onNext(primary);
  };

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <ScrollView
        contentContainerStyle={[s.pageContent, { paddingTop: insets.top + 28 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Brand header */}
        <Text style={s.brandName}>Cerebral</Text>
        <Text style={s.brandAccent}>Intelligence</Text>
        <Text style={s.brandDesc}>Setting the foundation for your cognitive wealth strategy.</Text>

        <StepProgress step={1} total={3} label="GOALS" />

        {/* Goals card */}
        <View style={s.goalCard}>
          <Text style={s.goalCardHeading}>What are your primary{'\n'}financial goals?</Text>
          <Text style={s.goalCardSub}>Select all that apply to calibrate your intelligence engine.</Text>

          {GOALS.map((g) => {
            const active = selected.includes(g.key);
            return (
              <TouchableOpacity
                key={g.key}
                style={[s.goalRow, active && s.goalRowActive]}
                onPress={() => toggle(g.key)}
                activeOpacity={0.75}
              >
                <View style={[s.goalIcon, active && s.goalIconActive]}>
                  <Ionicons name={g.icon} size={17} color={active ? BG : TEXT_DIM} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.goalLabel}>{g.label}</Text>
                  {g.isCustom ? (
                    <TextInput
                      style={s.goalCustomInput}
                      placeholder="Enter your target..."
                      placeholderTextColor={TEXT_DIM}
                      value={customText}
                      onChangeText={setCustomText}
                      onFocus={() => !active && toggle(g.key)}
                    />
                  ) : (
                    <Text style={s.goalSub}>{g.sub}</Text>
                  )}
                </View>
                {active && (
                  <Ionicons name="checkmark-circle" size={22} color={TEAL} style={{ marginLeft: 8 }} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Fixed bottom bar */}
      <View style={[s.bottomBar, { paddingBottom: insets.bottom + 16 }]}>
        <View style={s.bottomDivider} />
        <View style={s.bottomRow}>
          <TouchableOpacity onPress={() => onNext('save_for_house')}>
            <Text style={s.skipText}>Skip for now</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.nextBtn, !selected.length && s.nextBtnDisabled]}
            onPress={handleNext}
          >
            <Text style={s.nextBtnText}>Next Step  →</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// ─── Plan data per goal ───────────────────────────────────────────────────────
const GOAL_LABELS = {
  save_for_house: 'Save for a House',
  retire_early:   'Retire Early',
  optimize_taxes: 'Optimize Taxes',
  emergency_fund: 'Build Emergency Fund',
  custom:         'Custom Goal',
};

const PLANS = {
  save_for_house: {
    savings: [
      { label: 'DOWN PAYMENT FUND', amount: '$800/mo',  icon: 'home-outline'        },
      { label: 'EMERGENCY FUND',    amount: '$300/mo',  icon: 'shield-outline'       },
    ],
    guardrail: { category: 'Dining & Entertainment', pct: 12, note: 'Suggested reduction based on peers with similar savings goals.' },
    years: '4.5', probability: 'HIGH PROBABILITY',
  },
  retire_early: {
    savings: [
      { label: 'INDEX FUNDS',    amount: '$1,200/mo', icon: 'trending-up-outline' },
      { label: 'EMERGENCY FUND', amount: '$300/mo',   icon: 'shield-outline'      },
    ],
    guardrail: { category: 'Dining & Entertainment', pct: 15, note: 'Suggested reduction based on peers with similar growth targets.' },
    years: '12.5', probability: 'HIGH PROBABILITY',
  },
  optimize_taxes: {
    savings: [
      { label: 'RRSP CONTRIBUTION', amount: '$900/mo',  icon: 'trending-up-outline' },
      { label: 'TFSA ALLOCATION',   amount: '$583/mo',  icon: 'shield-outline'      },
    ],
    guardrail: { category: 'Subscriptions & Services', pct: 20, note: 'Optimizing recurring expenses improves your taxable income position.' },
    years: '8.2', probability: 'HIGH PROBABILITY',
  },
  emergency_fund: {
    savings: [
      { label: 'EMERGENCY FUND',  amount: '$600/mo', icon: 'shield-outline'      },
      { label: 'SAVINGS BUFFER',  amount: '$200/mo', icon: 'wallet-outline'      },
    ],
    guardrail: { category: 'Subscriptions', pct: 18, note: 'Cutting recurring expenses accelerates your safety net.' },
    years: '1.2', probability: 'HIGH PROBABILITY',
  },
  custom: {
    savings: [
      { label: 'PRIMARY ALLOCATION', amount: '$700/mo', icon: 'trending-up-outline' },
      { label: 'EMERGENCY FUND',     amount: '$300/mo', icon: 'shield-outline'      },
    ],
    guardrail: { category: 'Dining & Entertainment', pct: 10, note: 'Suggested reduction to accelerate your custom goal timeline.' },
    years: '5.0', probability: 'MODERATE PROBABILITY',
  },
};

// ─── Step 2 of 3: Plan Creation ───────────────────────────────────────────────
function PlanCreationStep({ goal, onActivate, onBack }) {
  const insets = useSafeAreaInsets();
  const label  = GOAL_LABELS[goal] ?? 'Your Goal';

  const [plan,     setPlan]     = useState(null);   // null = loading
  const [bankName, setBankName] = useState(null);

  useEffect(() => {
    api.get(`/accounts/plan-preview?goal=${goal}`)
      .then(res => {
        setPlan(res.data);
        setBankName(res.data.bankName);
      })
      .catch(() => {
        // Fall back to goal-based defaults if the API fails (no bank connected, etc.)
        setPlan(PLANS[goal] ?? PLANS.retire_early);
      });
  }, [goal]);

  if (!plan) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={TEAL} />
        <Text style={s.syncText}>Building your plan…</Text>
        <Text style={s.syncSub}>Analysing your accounts</Text>
      </View>
    );
  }

  const guardrailFill = (100 - plan.guardrail.pct) / 100;

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      {/* Nav bar */}
      <View style={[s.planNav, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={onBack} style={s.planNavBack}>
          <Ionicons name="arrow-back" size={22} color={TEXT} />
        </TouchableOpacity>
        <Text style={s.planNavTitle}>Cerebral</Text>
        <View style={s.planNavBadge}>
          <Text style={s.planNavBadgeText}>ONBOARDING</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[s.planContent, { paddingBottom: 120 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Step progress */}
        <View style={s.planProgressRow}>
          <View style={s.planProgressLeft}>
            <Ionicons name="radio-button-on" size={16} color={TEAL} />
            <Text style={s.stepProgressLabel}>STEP 2 OF 3: PLAN CREATION</Text>
          </View>
          <Text style={s.planProgressPct}>66% complete</Text>
        </View>
        <View style={s.progressBar}>
          <View style={[s.progressSeg, s.progressSegFilled]} />
          <View style={[s.progressSeg, s.progressSegFilled]} />
          <View style={s.progressSeg} />
        </View>

        {/* Heading */}
        <Text style={s.planHeading}>Your Cerebral Strategy</Text>
        <Text style={s.planSubheading}>
          {'Based on your '}
          {bankName
            ? <Text style={{ color: TEXT, fontWeight: '700' }}>{bankName}</Text>
            : 'linked'}
          {' account and your goal: '}
          <Text style={{ color: TEAL, fontWeight: '700' }}>{label}</Text>
          {'.'}
        </Text>

        {/* Card 1: Monthly Savings */}
        <View style={s.planCard}>
          <View style={s.planCardHeader}>
            <View style={[s.planCardIcon, { backgroundColor: TEAL_DIM }]}>
              <Ionicons name="wallet-outline" size={18} color={TEAL} />
            </View>
            <Text style={s.planCardTitle}>Monthly Savings Allocation</Text>
          </View>
          {plan.savings.map((item) => (
            <View key={item.label} style={s.savingsRow}>
              <View style={s.savingsBar} />
              <View style={{ flex: 1 }}>
                <Text style={s.savingsLabel}>{item.label}</Text>
                <Text style={s.savingsAmount}>{item.amount}</Text>
              </View>
              <Ionicons name={item.icon} size={20} color={TEAL} />
            </View>
          ))}
        </View>

        {/* Card 2: Spending Guardrails */}
        <View style={s.planCard}>
          <View style={s.planCardHeader}>
            <View style={[s.planCardIcon, { backgroundColor: TEAL_DIM }]}>
              <Ionicons name="shield-outline" size={18} color={TEAL} />
            </View>
            <Text style={s.planCardTitle}>Spending Guardrails</Text>
          </View>
          <View style={s.guardrailRow}>
            <Text style={s.guardrailCategory}>{plan.guardrail.category}</Text>
            <Text style={s.guardrailPct}>-{plan.guardrail.pct}%</Text>
          </View>
          <View style={s.guardrailTrack}>
            <View style={[s.guardrailFill, { flex: guardrailFill }]} />
            <View style={{ flex: 1 - guardrailFill }} />
          </View>
          <Text style={s.guardrailNote}>{plan.guardrail.note}</Text>
        </View>

        {/* Card 3: Projected Milestone */}
        <View style={[s.planCard, { alignItems: 'center' }]}>
          <View style={s.planCardHeader}>
            <View style={[s.planCardIcon, { backgroundColor: TEAL_DIM }]}>
              <Ionicons name="sparkles-outline" size={18} color={TEAL} />
            </View>
            <Text style={s.planCardTitle}>Projected Milestone</Text>
          </View>
          <Text style={s.milestoneNumber}>{plan.years}</Text>
          <Text style={s.milestoneUnit}>years to goal</Text>
          <View style={s.probabilityBadge}>
            <Ionicons name="trending-up-outline" size={13} color={TEAL} />
            <Text style={s.probabilityText}>{plan.probability}</Text>
          </View>
        </View>

        {/* Card 4: Edit/Customize */}
        <TouchableOpacity style={s.editCard} activeOpacity={0.7}>
          <Ionicons name="pencil-outline" size={16} color={TEXT_DIM} />
          <Text style={s.editCardText}>Edit / Customize Strategy</Text>
        </TouchableOpacity>

        {/* AI banner */}
        <View style={s.aiBanner}>
          <View style={s.aiBannerInner}>
            <Ionicons name="hardware-chip-outline" size={18} color={TEAL} />
            <Text style={s.aiBannerText}>
              Cerebral Engine optimized for your risk tolerance.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Activate button */}
      <View style={[s.activateBar, { paddingBottom: insets.bottom + 20 }]}>
        <TouchableOpacity
          style={s.activateBtn}
          onPress={onActivate}
          activeOpacity={0.85}
        >
          <Text style={s.activateBtnText}>Activate Strategy</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Plan tiers ──────────────────────────────────────────────────────────────
// Mirrors the existing billingStore plan keys so the picker can update store
// state without translation. `free` is the entry tier; paid tiers can be
// activated immediately from Settings (or via Upgrade flow).
const PLAN_TIERS = [
  {
    key: 'free',
    name: 'Free',
    price: '$0',
    cadence: '/mo',
    tagline: 'Start aware. Upgrade anytime.',
    features: [
      'Connect one bank account',
      'Monthly insights & spending breakdown',
      'Cerebral Picks (basic)',
    ],
  },
  {
    key: 'growth',
    name: 'Growth',
    price: '$9',
    cadence: '/mo',
    tagline: 'For the financially aware.',
    features: [
      'Unlimited connected accounts',
      'Cerebral AI assistant',
      'Advanced patterns + low-balance forecasts',
      'Priority alerts & notifications',
    ],
    recommended: true,
  },
  {
    key: 'pro',
    name: 'Pro',
    price: '$19',
    cadence: '/mo',
    tagline: 'For the financially ambitious.',
    features: [
      'Everything in Growth',
      'Predictive cash flow + goal forecasts',
      'Tax-aware suggestions',
      'Priority human support',
    ],
  },
];

// ─── Step 3 of 3: Plan Picker ────────────────────────────────────────────────
function PlanPickerStep({ goal, onComplete }) {
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState('growth');

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <View style={[s.planNav, { paddingTop: insets.top + 10 }]}>
        <View style={{ width: 40 }} />
        <Text style={s.planNavTitle}>Cerebral</Text>
        <View style={s.planNavBadge}>
          <Text style={s.planNavBadgeText}>ONBOARDING</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[s.planContent, { paddingBottom: 140 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.planProgressRow}>
          <View style={s.planProgressLeft}>
            <Ionicons name="radio-button-on" size={16} color={TEAL} />
            <Text style={s.stepProgressLabel}>STEP 3 OF 3: PLAN</Text>
          </View>
          <Text style={s.planProgressPct}>100% complete</Text>
        </View>
        <View style={s.progressBar}>
          <View style={[s.progressSeg, s.progressSegFilled]} />
          <View style={[s.progressSeg, s.progressSegFilled]} />
          <View style={[s.progressSeg, s.progressSegFilled]} />
        </View>

        <Text style={s.planHeading}>Pick your plan</Text>
        <Text style={s.planSubheading}>
          Start free — you can upgrade or downgrade anytime in Settings.
        </Text>

        <View style={{ gap: 12 }}>
          {PLAN_TIERS.map((tier) => {
            const active = selected === tier.key;
            return (
              <TouchableOpacity
                key={tier.key}
                style={[tierStyles.card, active && tierStyles.cardActive]}
                onPress={() => setSelected(tier.key)}
                activeOpacity={0.85}
              >
                <View style={tierStyles.cardTop}>
                  <View style={{ flex: 1 }}>
                    <View style={tierStyles.nameRow}>
                      <Text style={tierStyles.name}>{tier.name}</Text>
                      {tier.recommended && (
                        <View style={tierStyles.recommendedBadge}>
                          <Text style={tierStyles.recommendedText}>RECOMMENDED</Text>
                        </View>
                      )}
                    </View>
                    <Text style={tierStyles.tagline}>{tier.tagline}</Text>
                  </View>
                  <View style={tierStyles.priceWrap}>
                    <Text style={tierStyles.price}>{tier.price}</Text>
                    <Text style={tierStyles.cadence}>{tier.cadence}</Text>
                  </View>
                </View>

                <View style={tierStyles.featureList}>
                  {tier.features.map((f) => (
                    <View key={f} style={tierStyles.featureRow}>
                      <Ionicons name="checkmark-circle" size={14} color={active ? TEAL : TEXT_DIM} />
                      <Text style={tierStyles.featureText}>{f}</Text>
                    </View>
                  ))}
                </View>

                {active && (
                  <View style={tierStyles.activeMark}>
                    <Ionicons name="checkmark-circle" size={22} color={TEAL} />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={tierStyles.fineprint}>
          Paid tiers can be activated from Settings. Cerebral never charges your card without your explicit confirmation.
        </Text>
      </ScrollView>

      <View style={[s.activateBar, { paddingBottom: insets.bottom + 20 }]}>
        <TouchableOpacity
          style={s.activateBtn}
          onPress={() => onComplete(selected)}
          activeOpacity={0.85}
        >
          <Text style={s.activateBtnText}>
            {selected === 'free' ? 'Continue with Free' : `Continue — upgrade later`}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Root Onboarding ──────────────────────────────────────────────────────────
export default function Onboarding({ navigation }) {
  const { savePreferences } = useAuthStore();
  const [step, setStep] = useState(IS_WEB ? 1 : 0);
  const [goal, setGoal] = useState(null);

  const finish = (tier) => {
    // Persist goal + interests. Picked tier is recorded locally for the demo;
    // real billing activation happens via Settings → Upgrade flow.
    savePreferences({ goal, interests: ['investing'] });
    if (tier && tier !== 'free') {
      // Land the user on the Upgrade screen so they can complete payment if
      // they want — they're still onboarded either way.
      setTimeout(() => navigation?.navigate?.('Upgrade'), 250);
    }
  };

  if (step === 0) return <ConnectBankStep onConnected={() => setStep(1)} onSkip={() => setStep(1)} />;
  if (step === 1) return <GoalStep onNext={(g) => { setGoal(g); setStep(2); }} />;
  if (step === 2) return <PlanCreationStep goal={goal} onActivate={() => setStep(3)} onBack={() => setStep(1)} />;
  return <PlanPickerStep goal={goal} onComplete={finish} />;
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  // ── Shared ──
  center:   { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: BG, padding: 24 },
  syncText: { fontSize: 17, fontWeight: '700', color: TEXT, marginTop: 20 },
  syncSub:  { fontSize: 14, color: TEXT_DIM, marginTop: 6 },
  errorText:{ color: '#F87171', fontSize: 13, marginBottom: 8, lineHeight: 18 },

  // ── Next / skip buttons ──
  nextBtn: {
    backgroundColor: TEAL, borderRadius: 50,
    paddingHorizontal: 24, paddingVertical: 14,
    alignItems: 'center',
  },
  nextBtnDisabled: { backgroundColor: 'rgba(16,200,150,0.25)' },
  nextBtnText: { color: BG, fontSize: 15, fontWeight: '800', letterSpacing: -0.2 },
  skipBtn:  { alignItems: 'center', paddingVertical: 10 },
  skipText: { color: TEXT_DIM, fontSize: 14 },

  // ── Bottom bar ──
  bottomBar:    { backgroundColor: BG, paddingHorizontal: 24, paddingTop: 4 },
  bottomDivider:{ height: 1, backgroundColor: BORDER, marginBottom: 16 },
  bottomRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },

  // ── Connect Bank ──
  bankHero:   { backgroundColor: BG, paddingHorizontal: 22, paddingBottom: 28 },
  encryptBadge:{
    flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start',
    paddingHorizontal: 11, paddingVertical: 5,
    backgroundColor: TEAL_DIM, borderWidth: 1, borderColor: TEAL_BDR,
    borderRadius: 20, marginBottom: 14,
  },
  encryptText: { fontSize: 10, fontWeight: '800', color: TEAL, textTransform: 'uppercase', letterSpacing: 1 },
  bankTitle:   { fontSize: 26, fontWeight: '800', color: TEXT, letterSpacing: -0.5, lineHeight: 32, marginBottom: 6 },
  bankSubtitle:{ fontSize: 13.5, color: TEXT_DIM, lineHeight: 20 },
  bankContent: { paddingHorizontal: 16, paddingTop: 20 },
  searchBar:   {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 13,
    backgroundColor: CARD, borderRadius: 14, borderWidth: 1, borderColor: BORDER, marginBottom: 12,
  },
  searchPlaceholder: { flex: 1, fontSize: 14, color: TEXT_DIM },
  chips:    { gap: 8, paddingBottom: 14 },
  chip:     {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 7,
    backgroundColor: TEAL_DIM, borderRadius: 20, borderWidth: 1, borderColor: TEAL_BDR,
  },
  chipText: { fontSize: 12, fontWeight: '600', color: TEAL },
  sectionRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle:  { fontSize: 14, fontWeight: '700', color: TEXT },
  bankGrid:      { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 18 },
  bankTile:      {
    width: '30.5%', backgroundColor: CARD, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: BORDER, alignItems: 'center', gap: 8,
  },
  bankMark:      { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  bankMarkText:  { fontSize: 12, fontWeight: '800', color: '#fff' },
  bankTileLabel: { fontSize: 11, fontWeight: '600', color: TEXT, textAlign: 'center', lineHeight: 15 },
  trustPanel:    { backgroundColor: CARD, borderRadius: 16, borderWidth: 1, borderColor: BORDER, overflow: 'hidden', marginBottom: 20 },
  trustRow:      { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 14, borderBottomWidth: 1, borderBottomColor: BORDER },
  trustIcon:     { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  trustTitle:    { fontSize: 14, fontWeight: '700', color: TEXT, marginBottom: 2 },
  trustBody:     { fontSize: 12, color: TEXT_DIM, lineHeight: 17 },
  successCard:   { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: TEAL_DIM, borderWidth: 1, borderColor: TEAL_BDR, borderRadius: 12, padding: 14, marginBottom: 16 },
  successText:   { fontSize: 14, fontWeight: '600', color: TEXT },

  // ── WebView ──
  wvContainer: { flex: 1, backgroundColor: BG },
  wvHeader:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: BORDER, backgroundColor: CARD },
  wvTitle:     { fontSize: 16, fontWeight: '700', color: TEXT },
  closeBtn:    { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  wv:          { flex: 1 },
  wvLoader:    { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: BG },

  // ── Goal / Interests pages ──
  pageContent: { flexGrow: 1, paddingHorizontal: 22, paddingBottom: 24 },

  brandName:   { fontSize: 32, fontWeight: '800', color: TEXT, letterSpacing: -0.8, lineHeight: 38 },
  brandAccent: { fontSize: 32, fontWeight: '800', color: TEAL, letterSpacing: -0.8, lineHeight: 38, marginBottom: 10 },
  brandDesc:   { fontSize: 14, color: TEXT_DIM, lineHeight: 21, marginBottom: 24 },

  // ── Step progress ──
  stepProgress:     { marginBottom: 24 },
  stepProgressRow:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  stepProgressLabel:{ fontSize: 11, fontWeight: '700', color: TEAL, letterSpacing: 1.2, textTransform: 'uppercase' },
  progressBar:      { flexDirection: 'row', gap: 6 },
  progressSeg:      { flex: 1, height: 4, borderRadius: 2, backgroundColor: BORDER },
  progressSegFilled:{ backgroundColor: TEAL },

  // ── Goal card ──
  goalCard:        { backgroundColor: CARD, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: BORDER },
  goalCardHeading: { fontSize: 22, fontWeight: '800', color: TEXT, letterSpacing: -0.5, lineHeight: 28, marginBottom: 6 },
  goalCardSub:     { fontSize: 13, color: TEXT_DIM, lineHeight: 19, marginBottom: 18 },

  goalRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingVertical: 14, paddingHorizontal: 14,
    backgroundColor: BG, borderRadius: 14,
    borderWidth: 1.5, borderColor: BORDER,
    marginBottom: 10,
  },
  goalRowActive:   { borderColor: TEAL, backgroundColor: 'rgba(16,200,150,0.06)' },
  goalIcon:        { width: 38, height: 38, borderRadius: 10, backgroundColor: '#F0EEE6', justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  goalIconActive:  { backgroundColor: TEAL },
  goalLabel:       { fontSize: 15, fontWeight: '700', color: TEXT, marginBottom: 2 },
  goalSub:         { fontSize: 12, color: TEXT_DIM },
  goalCustomInput: { fontSize: 12, color: TEXT, paddingVertical: 0, borderBottomWidth: 1, borderBottomColor: BORDER },

  // ── Plan Creation ──
  planNav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 12, backgroundColor: BG,
  },
  planNavBack:      { width: 40, height: 40, justifyContent: 'center' },
  planNavTitle:     { fontSize: 17, fontWeight: '700', color: TEXT },
  planNavBadge:     { backgroundColor: '#F0EEE6', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  planNavBadgeText: { fontSize: 10, fontWeight: '700', color: TEXT_DIM, letterSpacing: 1, textTransform: 'uppercase' },

  planContent:     { paddingHorizontal: 18 },
  planProgressRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  planProgressLeft:{ flexDirection: 'row', alignItems: 'center', gap: 6 },
  planProgressPct: { fontSize: 12, color: TEXT_DIM },

  planHeading:    { fontSize: 26, fontWeight: '800', color: TEXT, letterSpacing: -0.6, lineHeight: 32, marginTop: 22, marginBottom: 8 },
  planSubheading: { fontSize: 14, color: TEXT_DIM, lineHeight: 21, marginBottom: 20 },

  planCard: {
    backgroundColor: CARD, borderRadius: 18, padding: 18,
    borderWidth: 1, borderColor: BORDER, marginBottom: 14,
  },
  planCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  planCardIcon:   { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  planCardTitle:  { fontSize: 15, fontWeight: '700', color: TEXT },

  savingsRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: BG, borderRadius: 12, padding: 14, marginBottom: 8,
    borderWidth: 1, borderColor: BORDER,
  },
  savingsBar:    { width: 3, height: 36, borderRadius: 2, backgroundColor: TEAL },
  savingsLabel:  { fontSize: 10, fontWeight: '700', color: TEXT_DIM, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 3 },
  savingsAmount: { fontSize: 20, fontWeight: '800', color: TEXT, letterSpacing: -0.5 },

  guardrailRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  guardrailCategory:{ fontSize: 14, color: TEXT },
  guardrailPct:     { fontSize: 14, fontWeight: '700', color: '#EF4444' },
  guardrailTrack:   { flexDirection: 'row', height: 6, borderRadius: 3, backgroundColor: '#ECE9DF', overflow: 'hidden', marginBottom: 10 },
  guardrailFill:    { backgroundColor: TEAL, borderRadius: 3 },
  guardrailNote:    { fontSize: 12, color: TEXT_DIM, lineHeight: 17 },

  milestoneNumber: { fontSize: 52, fontWeight: '800', color: TEXT, letterSpacing: -2, marginTop: 4 },
  milestoneUnit:   { fontSize: 14, color: TEXT_DIM, marginBottom: 14 },
  probabilityBadge:{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: TEAL_DIM, borderWidth: 1, borderColor: TEAL_BDR, borderRadius: 30, paddingHorizontal: 14, paddingVertical: 8 },
  probabilityText: { fontSize: 11, fontWeight: '700', color: TEAL, letterSpacing: 1, textTransform: 'uppercase' },

  editCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: CARD, borderRadius: 16, padding: 18,
    borderWidth: 1, borderColor: BORDER, marginBottom: 14,
  },
  editCardText: { fontSize: 15, fontWeight: '600', color: TEXT },

  aiBanner: {
    backgroundColor: TEAL_DIM, borderRadius: 18, overflow: 'hidden',
    borderWidth: 1, borderColor: TEAL_BDR, marginBottom: 10,
  },
  aiBannerInner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 18,
  },
  aiBannerText: { flex: 1, fontSize: 13, fontStyle: 'italic', color: TEXT_DIM, lineHeight: 19 },

  activateBar: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 18, paddingTop: 12, backgroundColor: BG },
  activateBtn: {
    backgroundColor: PILL_BG, borderRadius: 999,
    paddingVertical: 17, alignItems: 'center',
    shadowColor: '#0F172A', shadowOpacity: 0.12, shadowRadius: 14, shadowOffset: { width: 0, height: 4 }, elevation: 4,
  },
  activateBtnText: { fontSize: 16, fontWeight: '700', color: PILL_FG, letterSpacing: -0.2 },
});

// ─── Plan picker styles ──────────────────────────────────────────────────────
const tierStyles = StyleSheet.create({
  card: {
    backgroundColor: CARD,
    borderRadius: 18, padding: 18,
    borderWidth: 1.5, borderColor: BORDER,
    position: 'relative',
  },
  cardActive: {
    borderColor: TEAL,
    backgroundColor: TEAL_DIM,
  },
  cardTop:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  nameRow:    { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  name:       { fontSize: 18, fontWeight: '800', color: TEXT, letterSpacing: -0.3 },
  tagline:    { fontSize: 13, color: TEXT_DIM, lineHeight: 19 },
  recommendedBadge: {
    backgroundColor: TEAL, borderRadius: 6,
    paddingHorizontal: 7, paddingVertical: 3,
  },
  recommendedText: { fontSize: 9, fontWeight: '800', color: BG, letterSpacing: 1 },
  priceWrap:  { flexDirection: 'row', alignItems: 'baseline', gap: 2, marginLeft: 12 },
  price:      { fontSize: 22, fontWeight: '900', color: TEXT, letterSpacing: -0.5 },
  cadence:    { fontSize: 13, color: TEXT_DIM, fontWeight: '600' },

  featureList:{ gap: 8 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  featureText:{ fontSize: 13, color: TEXT, flex: 1 },

  activeMark: { position: 'absolute', top: 14, right: 14 },

  fineprint:  { fontSize: 11, color: TEXT_DIM, lineHeight: 16, marginTop: 18, fontStyle: 'italic' },
});
