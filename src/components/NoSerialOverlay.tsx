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
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-white p-6">
      <div className="max-w-md border-4 border-black bg-fri3d-red p-8 font-display font-semibold text-white shadow-hard">
        Je hebt een browser nodig die WebSerial ondersteunt, zoals Google Chrome, Brave, Opera of een heel recente
        Firefox.
      </div>
    </div>
  );
}
