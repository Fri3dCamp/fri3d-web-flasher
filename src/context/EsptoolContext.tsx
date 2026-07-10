import { ESPLoader, FlashOptions, Transport } from "esptool-js";
import { useState, createContext, useRef, useEffect } from "react";
import { parseUpload } from "../lib/parseUpload";
import { Firmware } from "../interfaces/Firmware";
import { toast } from "react-toastify";
import CryptoJS from "crypto-js";

const FIRMWARE_CACHE_NAME = "firmware-downloads";

// Parsed firmware cache for the current session, so re-flashing the same asset
// skips both the download and the unzip/parse step.
const parsedFirmwareCache = new Map<string, Firmware>();

// Downloads a firmware file, reusing a persistent copy from the browser's Cache
// Storage when available so re-flashing doesn't download it again.
async function fetchFirmwareCached(url: string): Promise<ArrayBuffer> {
  let cache: Cache | undefined;
  if (typeof caches !== "undefined") {
    try {
      cache = await caches.open(FIRMWARE_CACHE_NAME);
      const cached = await cache.match(url);
      if (cached) {
        return await cached.arrayBuffer();
      }
    } catch (error) {
      console.warn("Firmware cache unavailable, downloading directly", error);
      cache = undefined;
    }
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Download mislukt (HTTP ${response.status})`);
  }

  if (cache) {
    try {
      await cache.put(url, response.clone());
    } catch (error) {
      console.warn("Could not store firmware in cache", error);
    }
  }

  return await response.arrayBuffer();
}

interface EsptoolContextType {
  firmware: Firmware | null;
  uploadFirmware: (file: File) => Promise<void>;
  loadFirmwareFromUrl: (url: string, filename?: string) => Promise<Firmware | null>;
  clearFirmwareCache: () => Promise<void>;
  flash: (firmwareToFlash?: Firmware) => Promise<void>;
  logs: string[];
  connect: () => Promise<void>;
  disconnect: () => void;
  isConnected: boolean;
  isConnecting: boolean;
  isFlashing: boolean;
  updateProgress: (partitionIndex: number, progress: number) => void;
  eraseFlash: () => Promise<void>;
  deviceInfo: {
    chipName: string;
    mac: string;
    features: string;
    crystal: string;
  };
}

export const EsptoolContext = createContext<EsptoolContextType>({
  firmware: null,
  uploadFirmware: async () => {},
  loadFirmwareFromUrl: async () => null,
  clearFirmwareCache: async () => {},
  flash: async () => {},
  logs: [],
  connect: async () => {},
  disconnect: () => {},
  isConnected: false,
  isConnecting: false,
  isFlashing: false,
  updateProgress: () => {},
  eraseFlash: async () => {},
  deviceInfo: {
    chipName: "onbekend",
    mac: "onbekend",
    features: "onbekend",
    crystal: "onbekend",
  },
});

export function EsptoolContextProvider({ children }: { children: React.ReactNode }) {
  const [logs, setLogs] = useState<string[]>([]);
  const baudrate = 115200;
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isFlashing, setIsFlashing] = useState(false);

  const device = useRef<SerialPort | null>(null);
  const esploader = useRef<ESPLoader | null>(null);
  const transport = useRef<Transport | null>(null);
  const [firmware, setFirmware] = useState<Firmware | null>(null);

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
    chipName: "onbekend",
    mac: "onbekend",
    features: "onbekend",
    crystal: "onbekend",
  });
  // const [connected, setConnected] = useState(false);

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
      toast.error("Er is een fout opgetreden bij het verbinden met de badge");
      if (typeof error === "string") {
        espLoaderTerminal.writeLine(error);
      } else if (error instanceof Error) {
        espLoaderTerminal.writeLine(error.message);
      }
    }
  }

  async function flash(firmwareToFlash?: Firmware) {
    const fw = firmwareToFlash ?? firmware;
    if (!esploader.current) {
      // throw new Error("No device connected");
      await connect();
    }
    if (!esploader.current || !fw) {
      return;
    }
    setIsFlashing(true);
    const fileArray = fw.partitions.map(({ address, data }) => ({
      address,
      data,
    }));

    const flashOptions: FlashOptions = {
      fileArray: fileArray,
      flashSize: "16MB",
      flashMode: "dio",
      flashFreq: "80m",
      eraseAll: false,
      compress: true,
      reportProgress: (fileIndex, written, total) => {
        console.log("Progress", fileIndex, written, total);
        updateProgress(fileIndex, (written / total) * 100);
      },
      calculateMD5Hash: (image) => CryptoJS.MD5(CryptoJS.lib.WordArray.create(image)).toString(),
    };
    await esploader.current.writeFlash(flashOptions);
    // reset progress
    for (let index = 0; index < fw.partitions.length; index++) {
      updateProgress(index, 0);
    }

    setIsFlashing(false);
    toast.success("Firmware geflashed!", {
      autoClose: false,
    });
  }

  async function loadFirmwareFromUrl(url: string, filename?: string): Promise<Firmware | null> {
    try {
      const cacheKey = `${url}|${filename ?? ""}`;
      const cachedFirmware = parsedFirmwareCache.get(cacheKey);
      if (cachedFirmware) {
        setFirmware(cachedFirmware);
        return cachedFirmware;
      }

      const buffer = await fetchFirmwareCached(url);
      const parsed = await parseUpload(buffer, filename);
      parsedFirmwareCache.set(cacheKey, parsed);
      setFirmware(parsed);
      return parsed;
    } catch (error) {
      console.error(error);
      toast.error("Kon de firmware niet downloaden");
      return null;
    }
  }

  async function uploadFirmware(file: File) {
    try {
      const firmware = await parseUpload(file);
      setFirmware(firmware);
    } catch (error) {
      toast.error("Ongeldig zip bestand");
    }
  }

  async function clearFirmwareCache() {
    parsedFirmwareCache.clear();
    if (typeof caches === "undefined") {
      return;
    }
    try {
      await caches.delete(FIRMWARE_CACHE_NAME);
    } catch (error) {
      console.warn("Could not clear firmware cache", error);
    }
  }

  async function eraseFlash() {
    if (!esploader.current) {
      return;
    }
    await esploader.current.eraseFlash();
  }

  function updateProgress(partitionIndex: number, progress: number) {
    if (!firmware) {
      return;
    }
    setFirmware((previous) => {
      if (!previous) {
        return null;
      }
      const partitions = previous.partitions.map((partition, index) => {
        if (index === partitionIndex) {
          return { ...partition, progress };
        }
        return partition;
      });
      return { ...previous, partitions };
    });
  }

  return (
    <EsptoolContext.Provider
      value={{
        uploadFirmware,
        loadFirmwareFromUrl,
        clearFirmwareCache,
        firmware,
        flash,
        logs,
        connect,
        disconnect,
        updateProgress,
        eraseFlash,
        deviceInfo,
        isConnecting,
        isConnected,
        isFlashing,
      }}
    >
      {children}
    </EsptoolContext.Provider>
  );
}
