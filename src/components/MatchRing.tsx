import React from 'react';
import { Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { colors, matchColor } from '../lib/theme';

// The BeautyMatch signature: a quiet circular gauge showing how well
// a product matches the user's skin. One bold element; everything
// around it stays disciplined.
export function MatchRing({ score, size = 120, label }: { score: number; size?: number; label?: string }) {
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const dash = (clamped / 100) * c;
  const color = matchColor(clamped);

  return (
    <View style={{ width: size, alignItems: 'center' }}>
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.line} strokeWidth={stroke} fill="none" />
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={color}
            strokeWidth={stroke}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${c - dash}`}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </Svg>
        <View style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: size * 0.26, fontWeight: '800', color, letterSpacing: -1 }}>{clamped}</Text>
        </View>
      </View>
      {label ? (
        <Text style={{ fontSize: 12, color: colors.muted, marginTop: 6, textAlign: 'center' }}>{label}</Text>
      ) : null}
    </View>
  );
}
