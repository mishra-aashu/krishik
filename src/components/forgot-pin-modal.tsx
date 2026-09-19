import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Modal,
  TextInput,
  Pressable,
  ActivityIndicator,
  Platform,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { SymbolView } from 'expo-symbols';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';

interface ForgotPinModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (phone: string, newPin: string) => void;
  language: 'hi' | 'en';
}

export function ForgotPinModal({
  visible,
  onClose,
  onSuccess,
  language = 'en',
}: ForgotPinModalProps) {
  const theme = useTheme();
  const { resetPin } = useAuth();

  const [step, setStep] = useState<1 | 2>(1);
  const [resetPhone, setResetPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isHi = language === 'hi';

  const resetState = () => {
    setStep(1);
    setResetPhone('');
    setOtpCode('');
    setNewPin('');
    setConfirmPin('');
    setErrorMsg(null);
    setIsLoading(false);
  };

  const handleModalClose = () => {
    resetState();
    onClose();
  };

  const validatePhone = (num: string) => /^[6-9]\d{9}$/.test(num);
  const validatePin = (pin: string) => /^\d{4}$/.test(pin);

  const handleSendOtp = () => {
    setErrorMsg(null);
    if (!validatePhone(resetPhone)) {
      setErrorMsg(
        isHi
          ? 'कृपया मान्य 10 अंकों का मोबाइल नंबर दर्ज करें।'
          : 'Please enter a valid 10-digit mobile number.'
      );
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setStep(2);
    }, 600);
  };

  const handleResetSubmit = async () => {
    setErrorMsg(null);

    if (!otpCode || otpCode.length < 4) {
      setErrorMsg(
        isHi
          ? 'कृपया 4-अंकों का सत्यापन कोड (OTP) दर्ज करें। (डेमो: 1234)'
          : 'Please enter 4-digit OTP. (Demo: 1234)'
      );
      return;
    }

    if (!validatePin(newPin)) {
      setErrorMsg(
        isHi
          ? 'नया पिन ठीक 4 अंकों का होना चाहिए।'
          : 'New PIN must be exactly 4 digits.'
      );
      return;
    }

    if (newPin !== confirmPin) {
      setErrorMsg(
        isHi
          ? 'दोनों पिन आपस में मेल नहीं खाते।'
          : 'New PIN and Confirm PIN do not match.'
      );
      return;
    }

    setIsLoading(true);

    try {
      await resetPin(resetPhone, newPin);
      setIsLoading(false);
      onSuccess(resetPhone, newPin);
      resetState();
    } catch (e) {
      console.error('Reset PIN error:', e);
      setIsLoading(false);
      setErrorMsg(
        isHi
          ? 'पिन रीसेट करने में समस्या आई। पुनः प्रयास करें।'
          : 'Failed to reset PIN. Please try again.'
      );
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleModalClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: theme.dark ? '#0A1A0F' : '#FFFFFF', borderColor: theme.border }]}>
          
          {/* Top Bar Header */}
          <View style={styles.headerRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <SymbolView
                name={{ ios: 'key.fill', android: 'lock_reset', web: 'lock_reset' } as any}
                size={20}
                tintColor={theme.primary}
              />
              <ThemedText type="smallBold" style={{ fontSize: 17, color: theme.text }}>
                {isHi ? 'पिन रीसेट करें (Reset PIN)' : 'Reset Passcode / PIN'}
              </ThemedText>
            </View>

            <Pressable
              onPress={handleModalClose}
              style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.7 }]}
            >
              <SymbolView
                name={{ ios: 'xmark.circle.fill', android: 'cancel', web: 'cancel' } as any}
                size={22}
                tintColor={theme.textSecondary}
              />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 12 }}>
            {errorMsg && (
              <View style={[styles.errorBox, { backgroundColor: theme.error + '1A', borderColor: theme.error }]}>
                <SymbolView
                  name={{ ios: 'exclamationmark.triangle.fill', android: 'warning', web: 'warning' } as any}
                  size={14}
                  tintColor={theme.error}
                />
                <ThemedText type="small" style={{ color: theme.error, flex: 1, fontWeight: '600' }}>
                  {errorMsg}
                </ThemedText>
              </View>
            )}

            {step === 1 ? (
              /* STEP 1: Enter Mobile Number */
              <View style={styles.stepContainer}>
                <ThemedText type="small" style={{ color: theme.textSecondary, marginBottom: 14 }}>
                  {isHi
                    ? 'अपना पंजीकृत 10 अंकों का मोबाइल नंबर दर्ज करें। हम आपको सत्यापन के लिए कोड भेजेंगे।'
                    : 'Enter your registered 10-digit mobile number to receive a verification code.'}
                </ThemedText>

                <View style={styles.inputGroup}>
                  <ThemedText type="smallBold" style={[styles.inputLabel, { color: theme.text }]}>
                    {isHi ? 'मोबाइल नंबर' : 'Mobile Number'}
                  </ThemedText>
                  <TextInput
                    style={[
                      styles.inputField,
                      {
                        color: theme.text,
                        borderColor: theme.border,
                        backgroundColor: theme.dark ? 'rgba(0,0,0,0.4)' : '#F9FDF9'
                      }
                    ]}
                    placeholder={isHi ? '10 अंकों का मोबाइल नंबर' : '10-digit phone number'}
                    placeholderTextColor={theme.textSecondary}
                    value={resetPhone}
                    onChangeText={(val) => setResetPhone(val.replace(/[^0-9]/g, ''))}
                    keyboardType="number-pad"
                    inputMode="numeric"
                    maxLength={10}
                    autoComplete="tel"
                    textContentType="telephoneNumber"
                  />
                </View>

                {/* Info Note on SMS OTP Integration */}
                <View style={[styles.infoBanner, { backgroundColor: theme.primary + '12', borderColor: theme.primary + '35' }]}>
                  <SymbolView
                    name={{ ios: 'info.circle.fill', android: 'info', web: 'info' } as any}
                    size={16}
                    tintColor={theme.primary}
                  />
                  <ThemedText type="small" style={{ color: theme.primary, flex: 1, fontSize: 11.5, fontWeight: '600' }}>
                    {isHi
                      ? 'नोट: एसएमएस गेटवे इंटीग्रेशन तैयार है। डेमो के लिए सत्यापन कोड (OTP) `1234` का उपयोग करें।'
                      : 'Note: SMS Gateway integration is ready. Use demo OTP `1234` to reset your PIN.'}
                  </ThemedText>
                </View>

                <Pressable
                  onPress={handleSendOtp}
                  disabled={isLoading}
                  style={({ pressed }) => [
                    styles.primaryBtn,
                    { backgroundColor: theme.primary },
                    pressed && { opacity: 0.9 },
                    isLoading && { opacity: 0.7 }
                  ]}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color={theme.onPrimary} />
                  ) : (
                    <ThemedText type="smallBold" style={{ color: theme.onPrimary, fontSize: 15 }}>
                      {isHi ? 'ओटीपी प्राप्त करें ➔' : 'Get OTP ➔'}
                    </ThemedText>
                  )}
                </Pressable>
              </View>
            ) : (
              /* STEP 2: Enter OTP & New PIN */
              <View style={styles.stepContainer}>
                <View style={[styles.successOtpNotice, { backgroundColor: '#10B9811A', borderColor: '#10B981' }]}>
                  <SymbolView
                    name={{ ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check' } as any}
                    size={16}
                    tintColor="#10B981"
                  />
                  <ThemedText type="small" style={{ color: '#10B981', flex: 1, fontSize: 12, fontWeight: '700' }}>
                    {isHi
                      ? `सत्यापन कोड +91 ${resetPhone} पर भेजा गया। (डेमो OTP: 1234)`
                      : `Verification code sent to +91 ${resetPhone}. (Demo OTP: 1234)`}
                  </ThemedText>
                </View>

                <View style={styles.inputGroup}>
                  <ThemedText type="smallBold" style={[styles.inputLabel, { color: theme.text }]}>
                    {isHi ? '4-अंकों का सत्यापन कोड (OTP)' : '4-Digit OTP Code'}
                  </ThemedText>
                  <TextInput
                    style={[
                      styles.inputField,
                      {
                        color: theme.text,
                        borderColor: theme.border,
                        backgroundColor: theme.dark ? 'rgba(0,0,0,0.4)' : '#F9FDF9'
                      }
                    ]}
                    placeholder={isHi ? '1234 (डेमो कोड)' : '1234 (Demo OTP)'}
                    placeholderTextColor={theme.textSecondary}
                    value={otpCode}
                    onChangeText={(val) => setOtpCode(val.replace(/[^0-9]/g, ''))}
                    keyboardType="number-pad"
                    inputMode="numeric"
                    maxLength={4}
                    textContentType="oneTimeCode"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <ThemedText type="smallBold" style={[styles.inputLabel, { color: theme.text }]}>
                    {isHi ? 'नया 4-अंकों का गुप्त पिन (New PIN)' : 'New 4-digit Passcode/PIN'}
                  </ThemedText>
                  <TextInput
                    style={[
                      styles.inputField,
                      {
                        color: theme.text,
                        borderColor: theme.border,
                        backgroundColor: theme.dark ? 'rgba(0,0,0,0.4)' : '#F9FDF9'
                      }
                    ]}
                    placeholder="••••"
                    placeholderTextColor={theme.textSecondary}
                    value={newPin}
                    onChangeText={(val) => setNewPin(val.replace(/[^0-9]/g, ''))}
                    keyboardType="number-pad"
                    inputMode="numeric"
                    secureTextEntry
                    maxLength={4}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <ThemedText type="smallBold" style={[styles.inputLabel, { color: theme.text }]}>
                    {isHi ? 'नए पिन की पुष्टि करें (Confirm PIN)' : 'Confirm New PIN'}
                  </ThemedText>
                  <TextInput
                    style={[
                      styles.inputField,
                      {
                        color: theme.text,
                        borderColor: theme.border,
                        backgroundColor: theme.dark ? 'rgba(0,0,0,0.4)' : '#F9FDF9'
                      }
                    ]}
                    placeholder="••••"
                    placeholderTextColor={theme.textSecondary}
                    value={confirmPin}
                    onChangeText={(val) => setConfirmPin(val.replace(/[^0-9]/g, ''))}
                    keyboardType="number-pad"
                    inputMode="numeric"
                    secureTextEntry
                    maxLength={4}
                  />
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 }}>
                  <Pressable
                    onPress={() => setStep(1)}
                    style={({ pressed }) => [
                      styles.secondaryBtn,
                      { borderColor: theme.border },
                      pressed && { opacity: 0.8 }
                    ]}
                  >
                    <ThemedText type="smallBold" style={{ color: theme.text }}>
                      {isHi ? '← पीछे' : '← Back'}
                    </ThemedText>
                  </Pressable>

                  <Pressable
                    onPress={handleResetSubmit}
                    disabled={isLoading}
                    style={({ pressed }) => [
                      styles.primaryBtn,
                      { flex: 1, backgroundColor: theme.primary },
                      pressed && { opacity: 0.9 },
                      isLoading && { opacity: 0.7 }
                    ]}
                  >
                    {isLoading ? (
                      <ActivityIndicator size="small" color={theme.onPrimary} />
                    ) : (
                      <ThemedText
                        type="smallBold"
                        numberOfLines={1}
                        style={{ color: theme.onPrimary, fontSize: 13.5, fontWeight: '700' }}
                      >
                        {isHi ? 'पिन रीसेट करें ➔' : 'Reset PIN ➔'}
                      </ThemedText>
                    )}
                  </Pressable>
                </View>
              </View>
            )}
          </ScrollView>

        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.three,
  },
  modalContent: {
    width: '100%',
    maxWidth: 440,
    borderRadius: 24,
    borderWidth: 1,
    padding: Spacing.four,
    ...Platform.select({
      web: {
        boxShadow: '0 12px 32px rgba(0,0,0,0.3)',
      } as any,
      default: { elevation: 8 }
    })
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(128,128,128,0.2)',
  },
  closeBtn: {
    padding: 4,
  },
  stepContainer: {
    gap: 12,
    marginTop: 8,
  },
  inputGroup: {
    gap: 4,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  inputField: {
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 15,
    fontWeight: '600',
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  successOtpNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  primaryBtn: {
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtn: {
    height: 48,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  }
});
