/**
 * Q 版曹操小人：SVG 建模 + 多动作动画
 * 形象参考：大头身小、金冠、黑须、褐红袍、持剑、一手做手势
 */
import { useState, useCallback } from 'react';

export type ChibiAction = 'idle' | 'wave' | 'sword' | 'speak';

const ACTIONS: { key: ChibiAction; label: string }[] = [
  { key: 'idle', label: '待机' },
  { key: 'wave', label: '招手' },
  { key: 'sword', label: '举剑' },
  { key: 'speak', label: '讲解' },
];

export interface CaoCaoChibiProps {
  width?: number;
  height?: number;
  action?: ChibiAction;
  onActionChange?: (action: ChibiAction) => void;
  showControls?: boolean;
  className?: string;
}

export function CaoCaoChibi({
  width = 200,
  height = 280,
  action: controlledAction,
  onActionChange,
  showControls = true,
  className = '',
}: CaoCaoChibiProps) {
  const [internalAction, setInternalAction] = useState<ChibiAction>('idle');
  const action = controlledAction ?? internalAction;
  const setAction = useCallback(
    (a: ChibiAction) => {
      if (controlledAction === undefined) setInternalAction(a);
      onActionChange?.(a);
    },
    [controlledAction, onActionChange]
  );

  return (
    <div className={`inline-flex flex-col items-center gap-2 ${className}`}>
      <svg
        viewBox="0 0 200 280"
        width={width}
        height={height}
        className="overflow-visible"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <linearGradient id="crownGold" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#f5d76e" />
            <stop offset="50%" stopColor="#d4a84b" />
            <stop offset="100%" stopColor="#b8860b" />
          </linearGradient>
          <linearGradient id="robeMaroon" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#8b3a3a" />
            <stop offset="100%" stopColor="#5c2525" />
          </linearGradient>
          <linearGradient id="collarLight" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#c4956a" />
            <stop offset="100%" stopColor="#a67c52" />
          </linearGradient>
          <linearGradient id="scabbard" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#6b4423" />
            <stop offset="100%" stopColor="#4a2f18" />
          </linearGradient>
        </defs>

        {/* 整体：待机时轻微上下呼吸 */}
        <g
          style={
            action === 'idle'
              ? {
                  animation: 'chibi-idle 2.5s ease-in-out infinite',
                }
              : undefined
          }
        >
          {/* 脚/鞋 */}
          <ellipse cx="85" cy="268" rx="18" ry="8" fill="#1a1a1a" />
          <ellipse cx="115" cy="268" rx="18" ry="8" fill="#1a1a1a" />

          {/* 袍子下摆 */}
          <path
            d="M 45 260 Q 50 272 65 272 L 135 272 Q 150 272 155 260 L 160 200 Q 200 210 200 140 L 200 120 Q 200 115 195 115 L 5 115 Q 0 115 0 120 L 0 140 Q 0 210 40 200 Z"
            fill="url(#robeMaroon)"
            stroke="#4a2525"
            strokeWidth="1"
          />
          {/* 腰带/横条 */}
          <rect x="55" y="195" width="90" height="10" rx="2" fill="#1e4d5c" />
          <rect x="58" y="178" width="84" height="6" rx="1" fill="#2a5f6f" />
          {/* 内衬领 */}
          <path
            d="M 70 118 L 70 200 L 130 200 L 130 118 Q 100 135 70 118 Z"
            fill="url(#collarLight)"
            stroke="#8b6914"
            strokeWidth="0.8"
          />

          {/* 左臂 + 手（手势/招手） */}
          <g
            style={{
              transformOrigin: '72px 120px',
              animation:
                action === 'wave'
                  ? 'chibi-wave 0.6s ease-in-out infinite'
                  : action === 'speak'
                    ? 'chibi-speak 1.5s ease-in-out infinite'
                    : undefined,
            }}
          >
            {/* 袖子 */}
            <path
              d="M 55 118 Q 45 140 50 165 L 68 162 Q 65 138 72 120 Z"
              fill="url(#robeMaroon)"
              stroke="#4a2525"
              strokeWidth="1"
            />
            {/* 手（张开） */}
            <ellipse cx="60" cy="172" rx="14" ry="10" fill="#e8c4a0" stroke="#c9a882" strokeWidth="0.8" />
            <path d="M 55 168 L 52 162 M 60 166 L 60 158 M 65 168 L 68 162 M 58 172 L 55 178 M 62 172 L 65 178" stroke="#c9a882" strokeWidth="1" fill="none" />
          </g>

          {/* 右臂 + 剑 */}
          <g
            style={{
              transformOrigin: '128px 120px',
              animation: action === 'sword' ? 'chibi-sword 1.2s ease-in-out infinite' : undefined,
            }}
          >
            <path
              d="M 145 118 Q 155 135 152 165 L 132 162 Q 136 135 128 120 Z"
              fill="url(#robeMaroon)"
              stroke="#4a2525"
              strokeWidth="1"
            />
            {/* 剑鞘 */}
            <rect x="148" y="125" width="8" height="72" rx="2" fill="url(#scabbard)" stroke="#3d2812" strokeWidth="0.6" />
            <rect x="146" y="122" width="12" height="6" rx="1" fill="#d4a84b" stroke="#b8860b" strokeWidth="0.5" />
            <circle cx="152" cy="198" r="3" fill="#d4a84b" />
          </g>

          {/* 头 */}
          <g>
            {/* 脸/头 */}
            <ellipse cx="100" cy="92" rx="48" ry="52" fill="#f0d5c4" stroke="#d4b8a0" strokeWidth="1.2" />
            {/* 胡子 */}
            <path
              d="M 65 98 Q 75 118 85 108 Q 95 120 100 115 Q 105 120 115 108 Q 125 118 135 98 Q 130 130 100 132 Q 70 130 65 98 Z"
              fill="#2d2d2d"
              stroke="#1a1a1a"
              strokeWidth="0.5"
            />
            {/* 眉毛 */}
            <path d="M 72 78 Q 88 72 100 76" stroke="#2d2d2d" strokeWidth="3" fill="none" strokeLinecap="round" />
            <path d="M 128 78 Q 112 72 100 76" stroke="#2d2d2d" strokeWidth="3" fill="none" strokeLinecap="round" />
            {/* 眼睛 */}
            <ellipse cx="82" cy="88" rx="8" ry="10" fill="#1a1a1a" />
            <circle cx="84" cy="86" r="2" fill="white" />
            <ellipse cx="118" cy="88" rx="8" ry="10" fill="#1a1a1a" />
            <circle cx="120" cy="86" r="2" fill="white" />
            {/* 嘴（微笑） */}
            <path d="M 92 108 Q 100 116 108 108" stroke="#8b6914" strokeWidth="1.2" fill="none" strokeLinecap="round" />
            {/* 头发（冠下） */}
            <path d="M 58 55 Q 55 75 62 88 L 138 88 Q 145 75 142 55 Z" fill="#1a1a1a" />
            {/* 金冠 */}
            <path
              d="M 52 42 L 68 28 L 85 38 L 100 22 L 115 38 L 132 28 L 148 42 L 142 55 L 58 55 Z"
              fill="url(#crownGold)"
              stroke="#b8860b"
              strokeWidth="1"
            />
            <path d="M 75 35 L 100 18 L 125 35" stroke="#f5d76e" strokeWidth="1.5" fill="none" opacity="0.8" />
          </g>
        </g>
      </svg>

      {showControls && (
        <div className="flex flex-wrap justify-center gap-1.5">
          {ACTIONS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setAction(key)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                action === key
                  ? 'bg-amber-700 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      <style>{`
        @keyframes chibi-idle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
        @keyframes chibi-wave {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(28deg); }
        }
        @keyframes chibi-sword {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(-28deg); }
        }
        @keyframes chibi-speak {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(15deg); }
          50% { transform: rotate(-6deg); }
          75% { transform: rotate(10deg); }
        }
      `}</style>
    </div>
  );
}
