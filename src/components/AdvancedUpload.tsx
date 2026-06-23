import { Input } from "@headlessui/react";
import clsx from "clsx";
import { useContext } from "react";
import { EsptoolContext } from "../context/EsptoolContext";
import { Button, ButtonType } from "./Button";
import { ConnectionButton } from "./ConnectionButton";
import { EraseFlashButton } from "./EraseFlashButton";

function TH({ children }: { children: React.ReactNode }) {
  return <th className="border-2 border-black px-4 py-2 font-display uppercase">{children}</th>;
}

function TD({ children }: { children: React.ReactNode }) {
  return <td className="border-2 border-black px-4 py-2">{children}</td>;
}

export function AdvancedUpload() {
  const { uploadFirmware, firmware, deviceInfo, isConnected, flash, isFlashing } = useContext(EsptoolContext);

  function onFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files) {
      return;
    }
    const file = e.target.files[0];
    uploadFirmware(file);
  }

  return (
    <>
      <ConnectionButton />
      <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2">
        <div>Chip: {deviceInfo.chipName}</div>
        <div>MAC adres: {deviceInfo.mac}</div>
        <div>
          Features:
          <ul>
            {deviceInfo.features.split(",").map((feature) => (
              <li className="ml-8 list-disc" key={feature}>
                {feature}
              </li>
            ))}
          </ul>
        </div>
        <div>Kristal: {deviceInfo.crystal}</div>
      </div>
      <table className="mt-2 table-auto border-collapse">
        <thead>
          <tr className="bg-fri3d-orange text-black">
            <TH>Adres</TH>
            <TH>Lengte</TH>
            <TH>Naam</TH>
            <TH>Vooruitgang</TH>
          </tr>
        </thead>
        <tbody className="font-mono">
          {firmware &&
            firmware.partitions.map((partition) => (
              <tr key={partition.address + partition.name}>
                <TD>0x{partition.address.toString(16)}</TD>
                <TD>{partition.data.length}</TD>
                <TD>{partition.name}</TD>
                <TD>
                  <progress value={partition.progress} max="100" className="w-full" />
                </TD>
              </tr>
            ))}
        </tbody>
      </table>
      <div className="my-2 flex gap-4">
        <div
          className={clsx(
            "relative rounded-md border-4 border-black bg-white px-4 py-2 font-display text-sm font-bold uppercase text-black shadow-hard-sm",
          )}
        >
          Selecteer firmware
          <Input type="file" className="absolute inset-0 block opacity-0" onChange={onFileSelect} disabled={isFlashing} />
        </div>
        <Button type={ButtonType.Primary} onClick={flash} disabled={!firmware || !isConnected || isFlashing}>
          Begin met flashen
        </Button>
      </div>
      <EraseFlashButton />
      {isFlashing && (
        <div className="mt-4 animate-pulse font-display text-4xl font-bold uppercase text-fri3d-red">
          Aan het flashen, niet uittrekken!
        </div>
      )}
    </>
  );
}
