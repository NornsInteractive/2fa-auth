import React from 'react';
import { Text, View, StyleSheet, TextStyle } from 'react-native';

interface IconProps {
  name: string;
  size?: number;
  color?: string;
  fill?: boolean;
  style?: TextStyle;
}

// Universal Material Symbols Web / Text Icon Component
export const Icon: React.FC<IconProps> = ({
  name,
  size = 24,
  color = 'currentColor',
  fill = false,
  style,
}) => {
  return (
    <Text
      style={[
        {
          fontFamily: 'Material Symbols Outlined, Material Icons, system-ui',
          fontSize: size,
          lineHeight: size,
          color: color,
          userSelect: 'none',
          fontStyle: 'normal',
          fontWeight: 'normal',
          textAlign: 'center',
          fontVariant: ['tabular-nums'],
          includeFontPadding: false,
          // @ts-ignore
          fontVariationSettings: fill ? "'FILL' 1, 'wght' 400" : "'FILL' 0, 'wght' 400",
        },
        style,
      ]}
    >
      {name}
    </Text>
  );
};
