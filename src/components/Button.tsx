import { Button as HUButton } from "@headlessui/react";
import clsx from "clsx";

export function Button({
  children,
  className,
  type = ButtonType.Regular,
  ...props
}: {
  children: React.ReactNode;
  className?: string;
  [key: string]: any;
}) {
  return (
    <HUButton
      className={clsx(
        "font-display shadow-hard-sm rounded-md border-4 border-black px-4 py-2 text-sm font-bold uppercase",
        "transition-transform enabled:active:translate-x-1 enabled:active:translate-y-1 enabled:active:shadow-none",
        "disabled:border-gray-300 disabled:bg-gray-200 disabled:text-gray-400 disabled:shadow-none",
        type === ButtonType.Regular && "bg-white text-black",
        type === ButtonType.Primary && "bg-fri3d-mint text-black",
        type === ButtonType.Danger && "bg-fri3d-red text-white",
        className,
      )}
      {...props}
    >
      {children}
    </HUButton>
  );
}

export enum ButtonType {
  Regular,
  Primary,
  Danger,
}
