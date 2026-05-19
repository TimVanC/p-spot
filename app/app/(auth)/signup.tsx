import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter, Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { colors, fontNames } from '../../constants/theme';

interface FormErrors {
  email?: string;
  password?: string;
  username?: string;
  dob?: string;
  ageCheck?: string;
  general?: string;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function isAtLeast18(dob: string): boolean {
  const parts = dob.split('/');
  if (parts.length !== 3) return false;
  const [month, day, year] = parts.map(Number);
  if (!month || !day || !year || year < 1900) return false;
  const birth = new Date(year, month - 1, day);
  const today = new Date();
  const cutoff = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
  return birth <= cutoff;
}

function formatDob(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

export default function SignupScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [dob, setDob] = useState('');
  const [ageChecked, setAgeChecked] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);

  const handleDobChange = (text: string) => {
    setDob(formatDob(text));
  };

  const validate = (): boolean => {
    const next: FormErrors = {};

    if (!email.trim()) {
      next.email = 'Email is required.';
    } else if (!isValidEmail(email)) {
      next.email = 'Enter a valid email address.';
    }

    if (!password) {
      next.password = 'Password is required.';
    } else if (password.length < 8) {
      next.password = 'Password must be at least 8 characters.';
    }

    if (!username.trim()) {
      next.username = 'Username is required.';
    } else if (username.trim().length < 3) {
      next.username = 'Username must be at least 3 characters.';
    }

    if (!dob) {
      next.dob = 'Date of birth is required.';
    } else if (!/^\d{2}\/\d{2}\/\d{4}$/.test(dob)) {
      next.dob = 'Enter date as MM/DD/YYYY.';
    } else if (!isAtLeast18(dob)) {
      next.dob = 'You must be 18 or older to use P Spot.';
    }

    if (!ageChecked) {
      next.ageCheck = 'You must confirm you are 18 or older.';
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSignup = async () => {
    if (!validate()) return;
    setLoading(true);
    setErrors({});

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });

      if (signUpError) {
        setErrors({ general: signUpError.message });
        return;
      }

      const user = data.user;
      if (!user) {
        setErrors({ general: 'Signup failed. Please try again.' });
        return;
      }

      const { error: profileError } = await supabase.from('profiles').insert({
        id: user.id,
        username: username.trim().toLowerCase(),
        level: 1,
        xp: 0,
        strikes: 0,
        is_banned: false,
      });

      if (profileError) {
        if (profileError.code === '23505') {
          setErrors({ username: 'That username is already taken.' });
        } else {
          setErrors({ general: profileError.message });
        }
        return;
      }

      router.replace('/(tabs)');
    } catch {
      setErrors({ general: 'Something went wrong. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.heading}>Create account.</Text>
          <Text style={styles.subheading}>Stay hydrated.</Text>

          {errors.general ? (
            <View style={styles.generalError}>
              <Text style={styles.generalErrorText}>{errors.general}</Text>
            </View>
          ) : null}

          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={[styles.input, errors.email ? styles.inputError : null]}
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={colors.deep}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {errors.email ? <Text style={styles.error}>{errors.email}</Text> : null}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={[styles.input, errors.password ? styles.inputError : null]}
              value={password}
              onChangeText={setPassword}
              placeholder="Min. 8 characters"
              placeholderTextColor={colors.deep}
              secureTextEntry
            />
            {errors.password ? <Text style={styles.error}>{errors.password}</Text> : null}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Username</Text>
            <TextInput
              style={[styles.input, errors.username ? styles.inputError : null]}
              value={username}
              onChangeText={setUsername}
              placeholder="your_handle"
              placeholderTextColor={colors.deep}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {errors.username ? <Text style={styles.error}>{errors.username}</Text> : null}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Date of birth</Text>
            <TextInput
              style={[styles.input, errors.dob ? styles.inputError : null]}
              value={dob}
              onChangeText={handleDobChange}
              placeholder="MM/DD/YYYY"
              placeholderTextColor={colors.deep}
              keyboardType="number-pad"
              maxLength={10}
            />
            {errors.dob ? <Text style={styles.error}>{errors.dob}</Text> : null}
          </View>

          <TouchableOpacity
            style={styles.checkboxRow}
            onPress={() => setAgeChecked((v) => !v)}
            activeOpacity={0.7}
          >
            <View style={[styles.checkbox, ageChecked && styles.checkboxChecked]}>
              {ageChecked ? <Text style={styles.checkmark}>✓</Text> : null}
            </View>
            <Text style={styles.checkboxLabel}>
              I confirm I am 18 years of age or older
            </Text>
          </TouchableOpacity>
          {errors.ageCheck ? <Text style={[styles.error, { marginTop: -8 }]}>{errors.ageCheck}</Text> : null}

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSignup}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color={colors.text} />
            ) : (
              <Text style={styles.buttonText}>Create account</Text>
            )}
          </TouchableOpacity>

          <View style={styles.linkRow}>
            <Text style={styles.linkText}>Already have an account? </Text>
            <Link href="/(auth)/login" asChild>
              <TouchableOpacity>
                <Text style={styles.link}>Log in</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.white,
  },
  keyboardAvoid: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 40,
  },
  heading: {
    fontFamily: fontNames.heading,
    fontSize: 34,
    color: colors.text,
    marginBottom: 4,
  },
  subheading: {
    fontFamily: fontNames.body,
    fontSize: 15,
    color: colors.deep,
    marginBottom: 32,
  },
  generalError: {
    backgroundColor: '#FDECEA',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  generalErrorText: {
    fontFamily: fontNames.body,
    fontSize: 13,
    color: colors.errorText,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontFamily: fontNames.medium,
    fontSize: 13,
    color: colors.text,
    marginBottom: 6,
  },
  input: {
    backgroundColor: colors.light,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 10,
    paddingHorizontal: 13,
    paddingVertical: 13,
    fontFamily: fontNames.body,
    fontSize: 14,
    color: colors.text,
  },
  inputError: {
    borderColor: colors.errorText,
  },
  error: {
    fontFamily: fontNames.body,
    fontSize: 12,
    color: colors.errorText,
    marginTop: 4,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    gap: 10,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.mid,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
    flexShrink: 0,
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.mid,
  },
  checkmark: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '700',
  },
  checkboxLabel: {
    fontFamily: fontNames.body,
    fontSize: 14,
    color: colors.text,
    flex: 1,
    lineHeight: 20,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontFamily: fontNames.heading,
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  linkRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  linkText: {
    fontFamily: fontNames.body,
    fontSize: 14,
    color: colors.text,
  },
  link: {
    fontFamily: fontNames.medium,
    fontSize: 14,
    color: colors.mid,
    textDecorationLine: 'underline',
  },
});
