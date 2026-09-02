import React from "react";
import { View } from "react-native";
import Svg, {
  Circle,
  Ellipse,
  G,
  Path,
  Rect,
} from "react-native-svg";

type Props = {
  size?: number;
  withShades?: boolean;
  withShadow?: boolean;
  jumping?: boolean;
  bgColor?: string;
  bodyColor?: string;
  outlineColor?: string;
};

// Stylized geometric kangaroo mascot rendered as vector. Sits inside a
// solid-color square (brutalist plate) when bgColor is provided. Two poses:
// default (standing) and jumping (jumping=true) — same SVG, the wrapper
// animates translate.
export default function KangarooMascot({
  size = 96,
  withShades = true,
  withShadow = false,
  jumping = false,
  bgColor,
  bodyColor = "#121212",
  outlineColor = "#121212",
}: Props) {
  const VB = 120;
  const stroke = 3;
  // legs lifted slightly when jumping
  const legY = jumping ? 92 : 100;

  return (
    <View>
      <View
        style={{
          width: size,
          height: size,
          backgroundColor: bgColor,
          alignItems: "center",
          justifyContent: "center",
          borderWidth: bgColor ? 2 : 0,
          borderColor: outlineColor,
        }}
      >
        <Svg width={size * 0.86} height={size * 0.86} viewBox={`0 0 ${VB} ${VB}`}>
          <G>
            {/* Tail — curved counterweight behind body */}
            <Path
              d="M 18 88 Q 8 78 18 64 Q 26 60 32 70"
              fill="none"
              stroke={outlineColor}
              strokeWidth={stroke + 1}
              strokeLinecap="round"
            />

            {/* Hind leg (large pouch-side foot) */}
            <Path
              d={`M 30 ${legY - 4} Q 28 ${legY + 6} 44 ${legY + 8} L 60 ${legY + 8} Q 62 ${legY + 2} 56 ${legY - 4} Z`}
              fill={bodyColor}
              stroke={outlineColor}
              strokeWidth={stroke}
              strokeLinejoin="round"
            />

            {/* Body — rounded teardrop pointing up */}
            <Path
              d="M 36 86 Q 24 60 40 42 Q 58 24 76 38 Q 90 50 84 76 Q 78 92 60 92 Q 46 92 36 86 Z"
              fill={bodyColor}
              stroke={outlineColor}
              strokeWidth={stroke}
              strokeLinejoin="round"
            />

            {/* Pouch */}
            <Path
              d="M 50 70 Q 58 80 70 74"
              fill="none"
              stroke={outlineColor}
              strokeWidth={stroke - 0.5}
              strokeLinecap="round"
            />

            {/* Front (small) arm */}
            <Path
              d="M 70 60 Q 80 60 80 70 Q 78 76 72 74"
              fill={bodyColor}
              stroke={outlineColor}
              strokeWidth={stroke}
              strokeLinejoin="round"
            />

            {/* Head — egg shape attached to upper body */}
            <Ellipse
              cx={66}
              cy={32}
              rx={18}
              ry={16}
              fill={bodyColor}
              stroke={outlineColor}
              strokeWidth={stroke}
            />

            {/* Ears — two thin spikes */}
            <Path
              d="M 56 18 L 52 4 L 62 14 Z"
              fill={bodyColor}
              stroke={outlineColor}
              strokeWidth={stroke}
              strokeLinejoin="round"
            />
            <Path
              d="M 70 16 L 70 2 L 78 14 Z"
              fill={bodyColor}
              stroke={outlineColor}
              strokeWidth={stroke}
              strokeLinejoin="round"
            />

            {/* Snout */}
            <Path
              d="M 82 32 Q 92 34 88 42 Q 84 44 80 40 Z"
              fill={bodyColor}
              stroke={outlineColor}
              strokeWidth={stroke}
              strokeLinejoin="round"
            />

            {/* Nose dot */}
            <Circle cx={89} cy={36} r={1.5} fill="#FF5A00" />

            {/* Shades or eye */}
            {withShades ? (
              <G>
                {/* lens 1 */}
                <Rect
                  x={56}
                  y={26}
                  width={11}
                  height={7}
                  rx={1}
                  fill="#121212"
                  stroke={outlineColor}
                  strokeWidth={1.5}
                />
                {/* lens 2 */}
                <Rect
                  x={69}
                  y={26}
                  width={11}
                  height={7}
                  rx={1}
                  fill="#121212"
                  stroke={outlineColor}
                  strokeWidth={1.5}
                />
                {/* bridge */}
                <Path
                  d="M 67 29 L 69 29"
                  stroke={outlineColor}
                  strokeWidth={2}
                />
                {/* glare highlight */}
                <Rect x={58} y={27.5} width={3} height={1.6} fill="#FFFFFF" opacity={0.55} />
                <Rect x={71} y={27.5} width={3} height={1.6} fill="#FFFFFF" opacity={0.55} />
              </G>
            ) : (
              <Circle cx={66} cy={30} r={2.4} fill="#FFFFFF" />
            )}

            {/* Mouth */}
            <Path
              d="M 80 42 Q 76 46 73 44"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth={1.5}
              strokeLinecap="round"
            />

            {/* Toe nails on hind foot */}
            <Path
              d="M 46 102 L 46 108 M 52 102 L 52 108 M 58 102 L 58 108"
              stroke="#FFFFFF"
              strokeWidth={1.2}
              strokeLinecap="round"
            />
          </G>
        </Svg>
      </View>
      {withShadow && (
        <View
          style={{
            alignSelf: "center",
            marginTop: 6,
            width: size * 0.55,
            height: 8,
            backgroundColor: outlineColor,
            opacity: jumping ? 0.12 : 0.22,
            borderRadius: 4,
          }}
        />
      )}
    </View>
  );
}
