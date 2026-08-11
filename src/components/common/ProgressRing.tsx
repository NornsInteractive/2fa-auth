import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

interface ProgressRingProps {
  remainingSeconds: number;
  period?: number;
  size?: number;
  strokeWidth?: number;
  showText?: boolean;
  primaryColor?: string;
  errorColor?: string;
  trackColor?: string;
  textColor?: string;
}

export const ProgressRing: React.FC<ProgressRingProps> = ({
  remainingSeconds,
  period = 30,
  size = 32,
  strokeWidth = 4,
  showText = false,
  primaryColor = '#004394',
  errorColor = '#ba1a1a',
  trackColor = '#e3e2e6',
  textColor = '#1a1c1e',
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const fraction = Math.max(0, Math.min(1, remainingSeconds / period));
  // As time counts down, strokeDashoffset increases
  const strokeDashoffset = circumference * (1 - fraction);
  const isDanger = remainingSeconds <= 5;
  const activeColor = isDanger ? errorColor : primaryColor;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} style={styles.svg}>
        {/* Background Track */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress Arc */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={activeColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
        />
      </Svg>
      {showText && (
        <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
          <View style={styles.textWrapper}>
            <Text
              style={[
                styles.timeText,
                {
                  color: isDanger ? errorColor : textColor,
                  fontSize: Math.max(10, size * 0.3),
                },
              ]}
            >
              {remainingSeconds}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  svg: {
    transform: [{ rotate: '-90deg' }],
  },
  textWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeText: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontWeight: '700',
    textAlign: 'center',
  },
});
