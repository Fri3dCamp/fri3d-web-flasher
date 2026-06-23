import { useEffect, useState } from "react";
import { Field, Label, Switch } from "@headlessui/react";
import { SimpleUpload } from "./components/SimpleUpload";
import { ToastContainer } from "./components/ToastContainer";
import { AdvancedUpload } from "./components/AdvancedUpload";
import { NoSerialOverlay } from "./components/NoSerialOverlay";

export function App() {
  const [advancedMode, setAdvancedMode] = useState(false);

  useEffect(() => {
    // get advancedMdoe from local storage
    const advancedMode = localStorage.getItem("advancedMode");
    if (advancedMode) {
      setAdvancedMode(advancedMode === "true");
    }
  }, []);

  useEffect(() => {
    // save advancedMode to local storage
    localStorage.setItem("advancedMode", advancedMode.toString());
  }, [advancedMode]);

  return (
    <>
      <NoSerialOverlay />
      <ToastContainer />
      <div className="grid min-h-screen grid-rows-[auto_1fr] bg-white text-black">
        <header className="flex items-center justify-between bg-black text-white">
          <div className="font-display flex items-center gap-3 px-4 py-3 text-xl font-bold uppercase">
            <img src="/fri3d-logo-white.svg" alt="Fri3d" className="h-8 w-auto" />
            <span className="text-fri3d-mint">Flasher</span>
          </div>

          <Field className="flex items-center gap-3 px-4">
            <Label className="font-display text-xs font-bold tracking-wide uppercase select-none">Geavanceerde modus</Label>
            <Switch
              checked={advancedMode}
              onChange={setAdvancedMode}
              className="group bg-fri3d-darkgrey data-checked:bg-fri3d-mint-dark inline-flex h-7 w-12 items-center rounded-full border-4 border-white transition"
            >
              <span className="size-3 translate-x-1 rounded-full bg-white transition group-data-checked:translate-x-6" />
            </Switch>
          </Field>
        </header>

        <main className="flex items-center justify-center p-6">
          <div className="flex flex-col items-center">
            {advancedMode && <AdvancedUpload />}
            {!advancedMode && <SimpleUpload />}
          </div>
        </main>
      </div>
    </>
  );
}
