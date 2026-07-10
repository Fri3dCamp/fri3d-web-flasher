import { ESPLoader, FlashOptions, Transport } from "esptool-js";
import { useState, createContext, useRef, useEffect } from "react";
import { Firmware } from "../interfaces/Firmware";
import { useTranslation } from "./LanguageContext";
import { toast } from "react-toastify";
import CryptoJS from "crypto-js";

interface EsptoolContextType {
  flash: (firmware: Firmware) => Promise<void>;
  logs: string[];
  connect: () => Promise<void>;
  disconnect: () => void;
  isConnected: boolean;
  isConnecting: boolean;
  isFlashing: boolean;
  flashProgress: number;
  eraseFlash: () => Promise<void>;
  deviceInfo: {
    chipName: string;
    mac: string;
    features: string;
    crystal: string;
  };
}

export const EsptoolContext = createContext<EsptoolContextType>({
  flash: async () => {},
  logs: [],
  connect: async () => {},
  disconnect: () => {},
  isConnected: false,
  isConnecting: false,
  isFlashing: false,
  flashProgress: 0,
  eraseFlash: async () => {},
  deviceInfo: {
    chipName: "",
    mac: "",
    features: "",
    crystal: "",
  },
});

export function EsptoolContextProvider({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const [logs, setLogs] = useState<string[]>([]);
  const baudrate = 115200;
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isFlashing, setIsFlashing] = useState(false);
  const [flashProgress, setFlashProgress] = useState(0);

  const device = useRef<SerialPort | null>(null);
  const esploader = useRef<ESPLoader | null>(null);
  const transport = useRef<Transport | null>(null);

  // Warn the user before they close/reload the tab while flashing is in
  // progress, since interrupting it can leave the badge in a broken state.
  useEffect(() => {
    if (!isFlashing) {
      return;
    }
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      // Required for the native confirmation dialog in some browsers.
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isFlashing]);

  const [deviceInfo, setDeviceInfo] = useState<{
    chipName: string;
    mac: string;
    features: string;
    crystal: string;
  }>({
    chipName: "",
    mac: "",
    features: "",
    crystal: "",
  });

  function captureInfo(data: string) {
    const entries = [
      {
        key: "Chip is ",
        value: "chipName",
      },
      {
        key: "MAC: ",
        value: "mac",
      },
      {
        key: "Features: ",
        value: "features",
      },
      {
        key: "Crystal is ",
        value: "crystal",
      },
    ];
    for (const entry of entries) {
      if (data.startsWith(entry.key)) {
        setDeviceInfo((previous) => ({
          ...previous,
          [entry.value]: data.replace(entry.key, "").replace("\r", "").trim(),
        }));
        return;
      }
    }
  }

  const espLoaderTerminal = {
    clean() {
      setLogs([]);
    },
    writeLine(data: string) {
      captureInfo(data);
      console.log(data);
      setLogs((prev) => {
        return [...prev, data];
      });
    },
    write(data: string) {
      console.log(data);
      setLogs((prev) => {
        const lastLine = prev?.[prev.length - 1];
        if (lastLine) {
          return [...prev.slice(0, prev.length - 1), lastLine + data];
        }
        return [data];
      });
    },
  };

  function disconnect() {
    device.current = null;
    transport.current = null;
    esploader.current = null;
    setIsConnected(false);
  }

  async function connect() {
    if (isConnecting) {
      return;
    }
    setIsConnecting(true);
    device.current = await navigator.serial.requestPort();
    transport.current = new Transport(device.current, false);

    try {
      const flashOptions = {
        transport: transport.current,
        baudrate,
        romBaudrate: baudrate,
        terminal: espLoaderTerminal,
      };
      esploader.current = new ESPLoader(flashOptions);

      await esploader.current.main();
      setIsConnecting(false);
      setIsConnected(true);
    } catch (error) {
      toast.error(t("connect.error"));
      if (typeof error === "string") {
        espLoaderTerminal.writeLine(error);
      } else if (error instanceof Error) {
        espLoaderTerminal.writeLine(error.message);
      }
    }
  }

  async function flash(firmware: Firmware) {
    if (!esploader.current) {
      await connect();
    }
    if (!esploader.current) {
      return;
    }
    setIsFlashing(true);
    setFlashProgress(0);
    try {
      const flashOptions: FlashOptions = {
        fileArray: [{ address: 0, data: firmware.data }],
        flashSize: "16MB",
        flashMode: "dio",
        flashFreq: "80m",
        eraseAll: false,
        compress: true,
        reportProgress: (_fileIndex, written, total) => {
          setFlashProgress((written / total) * 100);
        },
        calculateMD5Hash: (image) => CryptoJS.MD5(CryptoJS.lib.WordArray.create(image)).toString(),
      };
      await esploader.current.writeFlash(flashOptions);
      toast.success(t("flash.success"), {
        autoClose: false,
      });
    } finally {
      setIsFlashing(false);
      setFlashProgress(0);
    }
  }

  async function eraseFlash() {
    if (!esploader.current) {
      return;
    }
    await esploader.current.eraseFlash();
  }

  return (
    <EsptoolContext.Provider
      value={{
        flash,
        logs,
        connect,
        disconnect,
        eraseFlash,
        deviceInfo,
        isConnecting,
        isConnected,
        isFlashing,
        flashProgress,
      }}
    >
      {children}
    </EsptoolContext.Provider>
  );
}
