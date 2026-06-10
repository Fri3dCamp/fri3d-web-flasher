import { useEffect, useState } from "react";

export function NoSerialOverlay() {
  const [hasSerialSupport, setHasSerialSupport] = useState(true);

  useEffect(() => {
    if (!navigator.serial) {
      setHasSerialSupport(false);
    }
  }, []);

  if (hasSerialSupport) {
    return null;
  }

  return (
    <div className="absolute z-10 flex h-screen w-screen items-center justify-center bg-white">
      <div>
        Je hebt een browser nodig die WebSerial ondersteunt, zoals Google Chrome, Brave, Opera of een heel recente
        Firefox.
      </div>
    </div>
  );
}
