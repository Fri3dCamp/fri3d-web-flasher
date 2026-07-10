import { useEffect, useState } from "react";
import { useTranslation } from "../context/LanguageContext";

export function NoSerialOverlay() {
  const [hasSupportedTransport, setHasSupportedTransport] = useState(true);
  const { t } = useTranslation();

  useEffect(() => {
    const serialSupported = typeof navigator.serial !== "undefined";
    const usbSupported = typeof navigator.usb !== "undefined";
    setHasSupportedTransport(serialSupported || usbSupported);
  }, []);

  if (hasSupportedTransport) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-white p-6">
      <div className="bg-fri3d-red font-display shadow-hard max-w-md border-4 border-black p-8 font-semibold text-white">
        {t("app.noSerial")}
      </div>
    </div>
  );
}
