// src/pages/_app.tsx
import type { AppProps } from 'next/app';
import { AuthProvider } from '../lib/context/AuthContext';
import '../app/globals.css';

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <AuthProvider>
      <Component {...pageProps} />
    </AuthProvider>
  );
}

export default MyApp;