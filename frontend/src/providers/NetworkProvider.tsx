import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import NetInfo, { NetInfoState } from "@react-native-community/netinfo";

interface NetworkState {
  isConnected: boolean;
  isInternetReachable: boolean | null;
}

const NetworkContext = createContext<NetworkState>({
  isConnected: true,
  isInternetReachable: null,
});

export function NetworkProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<NetworkState>({
    isConnected: true,
    isInternetReachable: null,
  });

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((netState: NetInfoState) => {
      setState({
        isConnected: netState.isConnected ?? true,
        isInternetReachable: netState.isInternetReachable,
      });
    });
    return () => unsubscribe();
  }, []);

  return (
    <NetworkContext.Provider value={state}>{children}</NetworkContext.Provider>
  );
}

export function useNetwork(): NetworkState {
  return useContext(NetworkContext);
}
