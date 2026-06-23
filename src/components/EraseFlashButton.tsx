import { Dialog, DialogPanel, DialogTitle, Description, DialogBackdrop } from "@headlessui/react";
import { Button, ButtonType } from "./Button";
import { useContext, useState } from "react";
import { EsptoolContext } from "../context/EsptoolContext";
import { toast } from "react-toastify";

function Spinner() {
  return <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-4 border-fri3d-purple" />;
}

export function EraseFlashButton() {
  const [showDialog, setShowDialog] = useState(false);
  const [isErasing, setIsErasing] = useState(false);

  const { isConnected, eraseFlash, isFlashing } = useContext(EsptoolContext);

  async function startErase() {
    setIsErasing(true);
    try {
      await eraseFlash();
    } catch (error) {
      console.error("Failed to erase flash memory", error);
      toast.error("Er is een fout opgetreden bij het wissen van het flash geheugen");
    } finally {
      setIsErasing(false);
      setShowDialog(false);
      toast.success("Flash geheugen gewist");
    }
  }

  function closeDialog() {
    if (isErasing) {
      return;
    }
    setShowDialog(false);
  }

  return (
    <>
      <Button onClick={() => setShowDialog(true)} disabled={!isConnected || isFlashing}>
        Flash geheugen wissen
      </Button>
      <Dialog open={showDialog} onClose={closeDialog}>
        <DialogBackdrop className="fixed inset-0 bg-black/40 backdrop-blur-xs" />
        <div className="fixed inset-0 flex w-screen items-center justify-center p-4">
          <DialogPanel className="max-w-lg space-y-4 rounded-md border-4 border-black bg-white p-12 text-black shadow-hard">
            <DialogTitle className="font-display text-xl font-bold uppercase">Badge wissen</DialogTitle>

            {isErasing && <Spinner />}
            {!isErasing && (
              <>
                <Description>
                  Dit zal <strong>alle gegevens</strong> op de badge wissen.
                </Description>
                <p>Weet je zeker dat je de badge wilt wissen? Dit kan niet ongedaan worden gemaakt.</p>
              </>
            )}
            {!isErasing && (
              <div className="flex justify-between">
                <Button onClick={() => setShowDialog(false)}>Annuleren</Button>
                <Button onClick={startErase} type={ButtonType.Danger}>
                  Flash geheugen wissen
                </Button>
              </div>
            )}
          </DialogPanel>
        </div>
      </Dialog>
    </>
  );
}
