import { Input } from "@headlessui/react";
import clsx from "clsx";
import { useState, useContext } from "react";
import { EsptoolContext } from "../context/EsptoolContext";
import { Button, ButtonType } from "./Button";

export function SimpleUpload() {
  const [fileIncoming, setFileIncoming] = useState(false);

  const { flash, uploadFirmware, firmware, isFlashing } = useContext(EsptoolContext);

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    console.log("drop");
    event.preventDefault();
    console.log(event.dataTransfer.files);
    if (!event.dataTransfer.files) {
      return;
    }
    const file = event.dataTransfer.files[0];
    uploadFirmware(file);
    setFileIncoming(false);
  }

  function onFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files) {
      return;
    }
    const file = e.target.files[0];
    uploadFirmware(file);
  }

  return (
    <>
      <div
        className={clsx(
          "relative flex h-48 w-96 items-center justify-center rounded-md border-4 border-dashed shadow-hard-sm",
          !fileIncoming && "border-black bg-white",
          fileIncoming && "border-fri3d-mint-dark bg-fri3d-mint",
          "mb-4",
        )}
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault();
        }}
        onDragEnter={() => setFileIncoming(true)}
        onDragLeave={() => setFileIncoming(false)}
      >
        <p className="p-4 text-center font-display font-semibold">
          {fileIncoming && !firmware && "Laat het vallen alsof het warm is."}
          {!fileIncoming && !firmware && "Klik hier om een firmware bestand op te laden of sleep hem in dit vakje."}
          {firmware && firmware.filename}
        </p>
        <Input type="file" className="absolute inset-0 block opacity-0" disabled={isFlashing} onChange={onFileSelect} />
      </div>
      <Button type={ButtonType.Primary} onClick={flash} disabled={!firmware || isFlashing}>
        Begin met flashen
      </Button>
      {isFlashing && (
        <div className="mt-4 animate-pulse font-display text-4xl font-bold uppercase text-fri3d-red">
          Aan het flashen, niet uittrekken!
        </div>
      )}
    </>
  );
}
