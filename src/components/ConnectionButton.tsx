import { useContext } from "react";
import { EsptoolContext } from "../context/EsptoolContext";
import { useTranslation } from "../context/LanguageContext";
import { Button } from "./Button";

export function ConnectionButton() {
  const { isConnected, isConnecting, connect, disconnect, isFlashing } = useContext(EsptoolContext);
  const { t } = useTranslation();

  if (isConnecting) {
    return <Button disabled={true}>{t("connect.connecting")}</Button>;
  }

  if (isConnected) {
    return (
      <Button onClick={disconnect} disabled={isFlashing}>
        {t("connect.disconnect")}
      </Button>
    );
  }

  return (
    <Button onClick={connect} disabled={isFlashing}>
      {t("connect.connect")}
    </Button>
  );
}
