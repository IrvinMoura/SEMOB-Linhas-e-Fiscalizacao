import type { Metadata, Viewport } from 'next';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: 'SEMOB - Linhas',
  description: 'Portal de Consulta de Finais de Linha, Horários e Itinerários de Ônibus da Secretaria de Mobilidade Urbana de Feira de Santana. Projetado para otimizar o trabalho de fiscais e o acesso público.',
  keywords: 'SEMOB, Feira de Santana, ônibus, horários, itinerários, finais de linha, transporte público, trânsito',
  authors: [{ name: 'Secretaria de Mobilidade Urbana de Feira de Santana' }],
  manifest: '/manifest.json',
  icons: {
    icon: '/assets/logofeira.ico',
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#2563eb' },
    { media: '(prefers-color-scheme: dark)', color: '#0b0f19' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>
        <main>{children}</main>
      </body>
    </html>
  );
}
