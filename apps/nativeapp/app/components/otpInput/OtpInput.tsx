import React, {
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import {
  NativeSyntheticEvent,
  StyleSheet,
  TextInput,
  TextInputKeyPressEventData,
  View,
} from 'react-native';

import {Colors, Typography} from '../../styles';


const DEFAULT_PIN_COUNT = 5;

const toDigits = (value: string | undefined, count: number) => {
  const chars = String(value ?? '')
    .slice(0, count)
    .split('');
  return Array.from({length: count}, (_, i) => chars[i] ?? '');
};

interface IOtpInputProps {
  code?: string | undefined;
  pinCount?: number;
  onCodeFilled?: (code: string) => void;
  onCodeChanged?: (code: string) => void;
}

export interface OtpInputHandle {
  focusField: (index: number) => void;
  clear: () => void;
}

const OtpInput = React.forwardRef<OtpInputHandle, IOtpInputProps>(
  ({onCodeFilled, onCodeChanged, code, pinCount = DEFAULT_PIN_COUNT}, ref) => {
    const inputRefs = useRef<Array<TextInput | null>>([]);
    const [focusedIndex, setFocusedIndex] = useState<number>(-1);

    // Slot positions are the source of truth. `code` is a gapless string, so
    // deriving digits from it would collapse an emptied middle slot and shift
    // every later digit left. Re-derive only when the parent supplies a value
    // that is not our own echo, such as an external clear.
    const [digits, setDigits] = useState<string[]>(() =>
      toDigits(code, pinCount),
    );

    useEffect(() => {
      setDigits(prev =>
        prev.join('') === String(code ?? '') ? prev : toDigits(code, pinCount),
      );
    }, [code, pinCount]);

    const focusField = useCallback(
      (index: number) => {
        const clamped = Math.max(0, Math.min(index, pinCount - 1));
        inputRefs.current[clamped]?.focus();
      },
      [pinCount],
    );

    const commit = useCallback(
      (nextDigits: string[]) => {
        setDigits(nextDigits);
        const value = nextDigits.join('');
        onCodeChanged?.(value);
        if (value.length === pinCount) {
          onCodeFilled?.(value);
        }
      },
      [onCodeChanged, onCodeFilled, pinCount],
    );

    useImperativeHandle(
      ref,
      () => ({
        focusField,
        clear: () => {
          setDigits(toDigits('', pinCount));
          onCodeChanged?.('');
          focusField(0);
        },
      }),
      [focusField, onCodeChanged, pinCount],
    );

    useEffect(() => {
      const timer = setTimeout(() => focusField(0), 100);
      return () => clearTimeout(timer);
    }, [focusField]);

    const handleChangeText = (text: string, index: number) => {
      const sanitized = (text || '').replace(/\D/g, '');
      const current = digits[index];

      let incoming = sanitized;
      if (
        current &&
        sanitized.startsWith(current) &&
        sanitized.length > current.length
      ) {
        incoming = sanitized.slice(current.length);
      }

      const next = [...digits];
      if (!incoming) {
        next[index] = '';
        commit(next);
        return;
      }

      let cursor = index;
      for (const char of incoming) {
        if (cursor >= pinCount) break;
        next[cursor] = char;
        cursor += 1;
      }
      commit(next);
      focusField(cursor);
    };

    const handleKeyPress = (
      event: NativeSyntheticEvent<TextInputKeyPressEventData>,
      index: number,
    ) => {
      if (event.nativeEvent.key !== 'Backspace') return;
      if (digits[index] || index === 0) return;
      const next = [...digits];
      next[index - 1] = '';
      commit(next);
      focusField(index - 1);
    };

    return (
      <View style={styles.container}>
        {digits.map((digit, index) => (
          <TextInput
            key={`otp_${index}`}
            ref={el => {
              inputRefs.current[index] = el;
            }}
            value={digit}
            style={[
              styles.input,
              focusedIndex === index && styles.inputHighlighted,
            ]}
            keyboardType="number-pad"
            textContentType="oneTimeCode"
            autoComplete="sms-otp"
            selectTextOnFocus
            onFocus={() => setFocusedIndex(index)}
            onBlur={() => setFocusedIndex(-1)}
            onChangeText={text => handleChangeText(text, index)}
            onKeyPress={event => handleKeyPress(event, index)}
          />
        ))}
      </View>
    );
  },
);

export default OtpInput;

const styles = StyleSheet.create({
  container: {
    height: 80,
    width: '90%',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  input: {
    width: 45,
    height: 45,
    borderWidth: 1,
    borderRadius: 10,
    textAlign: 'center',
    padding: 0,
    color: Colors.TEXT_COLOR,
    borderColor: Colors.TEXT_COLOR + '80',
    fontSize: Typography.FONT_SIZE_18,
    fontFamily: Typography.FONT_FAMILY_BOLD,
  },
  inputHighlighted: {
    borderColor: Colors.GRADIENT_PRIMARY,
  },
});
