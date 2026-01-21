
import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				}
			},
			fontFamily: {
				sans: ['Manrope', 'Inter', 'sans-serif'],
				heading: ['Plus Jakarta Sans', 'sans-serif'],
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
			keyframes: {
				'accordion-down': {
					from: { height: '0' },
					to: { height: 'var(--radix-accordion-content-height)' }
				},
				'accordion-up': {
					from: { height: 'var(--radix-accordion-content-height)' },
					to: { height: '0' }
				},
				'fade-in': {
					from: { opacity: '0' },
					to: { opacity: '1' }
				},
				'fade-out': {
					from: { opacity: '1' },
					to: { opacity: '0' }
				},
				'slide-in': {
					from: { transform: 'translateY(10px)', opacity: '0' },
					to: { transform: 'translateY(0)', opacity: '1' }
				},
				'slide-out': {
					from: { transform: 'translateY(0)', opacity: '1' },
					to: { transform: 'translateY(10px)', opacity: '0' }
				},
				'credits-pop': {
					'0%': { transform: 'scale(1)' },
					'30%': { transform: 'scale(1.3)' },
					'50%': { transform: 'scale(0.95)' },
					'70%': { transform: 'scale(1.1)' },
					'100%': { transform: 'scale(1)' }
				},
				'float-up': {
					'0%': { opacity: '0', transform: 'translate(-50%, 0) scale(0.5)' },
					'20%': { opacity: '1', transform: 'translate(-50%, -4px) scale(1.1)' },
					'80%': { opacity: '1', transform: 'translate(-50%, -16px) scale(1)' },
					'100%': { opacity: '0', transform: 'translate(-50%, -24px) scale(0.9)' }
				},
				'particle-burst': {
					'0%': { 
						opacity: '1', 
						transform: 'translate(-50%, -50%) rotate(var(--particle-angle)) translateY(0) scale(1)' 
					},
					'100%': { 
						opacity: '0', 
						transform: 'translate(-50%, -50%) rotate(var(--particle-angle)) translateY(24px) scale(0)' 
					}
				},
				'sparkle': {
					'0%': { 
						opacity: '0', 
						transform: 'translate(-50%, -50%) rotate(var(--sparkle-angle)) translateY(0) scale(0)' 
					},
					'30%': { 
						opacity: '1', 
						transform: 'translate(-50%, -50%) rotate(var(--sparkle-angle)) translateY(12px) scale(1.2)' 
					},
					'100%': { 
						opacity: '0', 
						transform: 'translate(-50%, -50%) rotate(var(--sparkle-angle)) translateY(20px) scale(0)' 
					}
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				'fade-in': 'fade-in 0.3s ease-out',
				'fade-out': 'fade-out 0.2s ease-out',
				'slide-in': 'slide-in 0.3s ease-out',
				'slide-out': 'slide-out 0.2s ease-out',
				'credits-pop': 'credits-pop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
				'float-up': 'float-up 1.2s ease-out forwards',
				'particle-burst': 'particle-burst 0.7s ease-out forwards',
				'sparkle': 'sparkle 0.8s ease-out forwards'
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;
