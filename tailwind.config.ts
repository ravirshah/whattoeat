import type { Config } from 'tailwindcss';
import animate from 'tailwindcss-animate';

/** Wraps a CSS variable name so Tailwind can compose opacity modifiers.
 *  cssVar('surface') -> 'rgb(var(--surface) / <alpha-value>)' */
function cssVar(name: string) {
  return `rgb(var(--${name}) / <alpha-value>)`;
}

const config: Config = {
  darkMode: ['class'],

  content: ['./src/app/**/*.{ts,tsx}', './src/components/**/*.{ts,tsx}', './src/styles/**/*.css'],

  theme: {
    extend: {
      /* ── Font families ─────────────────────────────────── */
      fontFamily: {
        sans: ['Geist Sans', 'system-ui', 'sans-serif'],
        mono: ['Geist Mono', 'ui-monospace', 'monospace'],
      },

      /* ── Colors (token-mapped) ─────────────────────────── */
      colors: {
        surface: {
          DEFAULT: cssVar('surface'),
          elevated: cssVar('surface-elevated'),
          overlay: cssVar('surface-overlay'),
        },
        text: {
          DEFAULT: cssVar('text'),
          muted: cssVar('text-muted'),
          placeholder: cssVar('text-placeholder'),
        },
        accent: {
          DEFAULT: cssVar('accent'),
          fg: cssVar('accent-fg'),
          hover: cssVar('accent-hover'),
        },
        warm: { DEFAULT: cssVar('warm'), fg: cssVar('warm-fg'), subtle: cssVar('warm-subtle') },
        cool: { DEFAULT: cssVar('cool'), fg: cssVar('cool-fg'), subtle: cssVar('cool-subtle') },
        ok: { DEFAULT: cssVar('ok'), fg: cssVar('ok-fg') },
        warn: { DEFAULT: cssVar('warn'), fg: cssVar('warn-fg') },
        err: { DEFAULT: cssVar('err'), fg: cssVar('err-fg') },
        border: cssVar('border'),
        ring: cssVar('ring'),
        cat: {
          protein: cssVar('cat-protein'),
          produce: cssVar('cat-produce'),
          grain: cssVar('cat-grain'),
          dairy: cssVar('cat-dairy'),
          pantry: cssVar('cat-pantry'),
          other: cssVar('cat-other'),
        },
      },

      /* ── Border radius (token-mapped) ─────────────────── */
      borderRadius: {
        sm: 'var(--r-sm)',
        md: 'var(--r-md)',
        lg: 'var(--r-lg)',
        xl: 'var(--r-xl)',
        '2xl': 'var(--r-2xl)',
      },

      /* ── Box shadows (token-mapped) ───────────────────── */
      boxShadow: {
        1: 'var(--shadow-1)',
        2: 'var(--shadow-2)',
        3: 'var(--shadow-3)',
      },

      /* ── Transition timing ────────────────────────────── */
      transitionTimingFunction: {
        spring: 'var(--ease-spring)',
        out: 'var(--ease-out)',
      },
      transitionDuration: {
        snap: 'var(--dur-snap)',
        base: 'var(--dur-base)',
        expand: 'var(--dur-expand)',
      },

      /* ── Animation (tailwindcss-animate pass-through) ─── */
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'fade-out': { from: { opacity: '1' }, to: { opacity: '0' } },
        'slide-in-from-bottom': {
          from: { transform: 'translateY(100%)' },
          to: { transform: 'translateY(0)' },
        },
        'slide-out-to-bottom': {
          from: { transform: 'translateY(0)' },
          to: { transform: 'translateY(100%)' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down var(--dur-base) var(--ease-out)',
        'accordion-up': 'accordion-up var(--dur-base) var(--ease-out)',
        'fade-in': 'fade-in var(--dur-base) var(--ease-out)',
        'fade-out': 'fade-out var(--dur-snap) var(--ease-out)',
        'slide-in': 'slide-in-from-bottom var(--dur-expand) var(--ease-spring)',
        'slide-out': 'slide-out-to-bottom var(--dur-base) var(--ease-out)',
      },
    },
  },

  plugins: [animate],
};

export default config;
