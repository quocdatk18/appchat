'use client';

import { Provider as ReduxProvider } from 'react-redux';
import { store } from '@/lib/store';
import { useSocketListener } from '@/hooks/hookCustoms';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ReduxProvider store={store}>
      <SocketListenerWrapper>{children}</SocketListenerWrapper>
    </ReduxProvider>
  );
}

function SocketListenerWrapper({ children }: { children: React.ReactNode }) {
  useSocketListener();
  return <>{children}</>;
}
