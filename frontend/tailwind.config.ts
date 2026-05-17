import type { Config } from "tailwindcss";

export default {
    darkMode: ["class"],
    content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
  	extend: {
  		fontFamily: {
  			sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
  			mono: ['var(--font-jetbrains)', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
  			jetbrains: ['var(--font-jetbrains)', 'DM Mono', 'ui-monospace', 'monospace'],
  			playfair: ['var(--font-playfair)', 'Playfair Display', 'Georgia', 'serif'],
  		},
  		colors: {
  			lv: {
  				black: '#080705',
  				surface: '#161410',
  				rust: '#d44d1f',
  				cream: {
  					DEFAULT: '#f0e8d8',
  					dim: '#a09080',
  				},
  				rule: 'rgba(240, 232, 216, 0.1)',
  			},
  			lc: {
  				bg: '#1a1a1a',
  				surface: '#282828',
  				elevated: '#303030',
  				border: '#3e3e3e',
  				divider: 'rgba(255,255,255,0.08)',
  				text: '#eff2f6',
  				muted: '#b3b3b3',
  				dim: '#808080',
  				orange: '#ffa116',
  				orangeHover: '#ffb13a',
  				easy: '#00b8a3',
  				medium: '#ffc01e',
  				hard: '#ef4743',
  				blue: '#4dabf7',
  				header: '#0f0f0f',
  				/** Prep-notes tier accents (left border + row arrows) */
  				notesProject: '#F97316',
  				notesDomain: '#3B82F6',
  				notesWeak: '#EF4444',
  				notesResearch: '#8B5CF6',
  			},
  			col1: '#244855',
  			col2: '#E64833',
  			col3: '#874F41',
  			col4: '#90AEAD',
  			col5: '#FBE9D0',
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			}
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
