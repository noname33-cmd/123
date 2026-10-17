import React from 'react';
import {Pressable, StyleSheet, Text, type ButtonProps} from 'react-native';
import {colors} from './theme';

type Props = ButtonProps & {variant?: 'primary' | 'secondary' | 'choice'};
export function ActionButton({title, disabled, onPress, accessibilityState, variant = 'secondary',
  accessibilityLabel, testID}: Props) {
  const selected = accessibilityState?.selected === true;
  return <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? title}
    accessibilityState={{...accessibilityState, disabled: !!disabled}} disabled={disabled}
    onPress={onPress} testID={testID}
    style={({pressed}) => [styles.button, variant === 'primary' && styles.primary,
      selected && styles.selected, disabled && styles.disabled, pressed && !disabled && styles.pressed]}>
    <Text style={[styles.label, variant === 'primary' && styles.primaryLabel,
      selected && styles.selectedLabel, disabled && styles.disabledLabel]}>{title}</Text>
  </Pressable>;
}
const styles = StyleSheet.create({
  button: {minHeight: 48, borderRadius: 11, borderWidth: 1, borderColor: colors.line,
    backgroundColor: colors.paper, paddingHorizontal: 14, paddingVertical: 13, justifyContent: 'center'},
  primary: {backgroundColor: colors.green, borderColor: colors.green},
  selected: {backgroundColor: colors.soft, borderColor: colors.green},
  disabled: {backgroundColor: colors.disabled, borderColor: colors.disabled},
  pressed: {opacity: 0.75}, label: {color: colors.ink, fontSize: 14, fontWeight: '600', textAlign: 'center'},
  primaryLabel: {color: colors.paper}, selectedLabel: {color: colors.green},
  disabledLabel: {color: colors.muted},
});
