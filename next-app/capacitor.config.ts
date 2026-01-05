import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
    appId: 'com.nkr.complements',
    appName: 'NKR Complements',
    webDir: 'out',
    server: {
        url: 'https://nkr-complements.vercel.app', // TODO: Update this to your Vercel URL
        cleartext: true,
    }
};

export default config;
