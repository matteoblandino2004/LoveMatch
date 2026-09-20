import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.matteoblandino.wingman',
  appName: 'Wingman',
  webDir: 'dist',
  ios: {
    // The app paints its own dark background behind the safe areas.
    backgroundColor: '#100810',
    contentInset: 'never',
    limitsNavigationsToAppBoundDomains: true,
  },
  plugins: {
    Keyboard: {
      resize: 'native',
    },
  },
}

export default config
