import NetInfo from '@react-native-community/netinfo';
import { Platform } from 'react-native';

export type ConnectivityCallback = (isConnected: boolean) => void;

class ConnectivityService {
  private listeners: Set<ConnectivityCallback> = new Set();
  private isConnected: boolean = true;
  private unsubscribeNetInfo: (() => void) | null = null;

  constructor() {
    const isSSR = Platform.OS === 'web' && typeof window === 'undefined';

    if (!isSSR) {
      // Initialize connection state
      NetInfo.fetch().then((state) => {
        this.updateState(state.isConnected ?? false);
      });

      // Subscribe to state change events
      this.unsubscribeNetInfo = NetInfo.addEventListener((state) => {
        this.updateState(state.isConnected ?? false);
      });
    }
  }

  private updateState(connected: boolean) {
    if (this.isConnected !== connected) {
      this.isConnected = connected;
      for (const callback of this.listeners) {
        try {
          callback(connected);
        } catch (e) {
          console.error('Error in connectivity listener callback:', e);
        }
      }
    }
  }

  public getIsConnected(): boolean {
    return this.isConnected;
  }

  public forceConnected(connected: boolean): void {
    this.updateState(connected);
  }

  public subscribe(callback: ConnectivityCallback): () => void {
    this.listeners.add(callback);
    // Call back immediately with current state
    callback(this.isConnected);

    return () => {
      this.listeners.delete(callback);
    };
  }

  public destroy() {
    if (this.unsubscribeNetInfo) {
      this.unsubscribeNetInfo();
      this.unsubscribeNetInfo = null;
    }
    this.listeners.clear();
  }
}

export const connectivityService = new ConnectivityService();
