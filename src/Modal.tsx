import { ReactNode } from "react";
import classNames from "classnames";

export type ModalProps = {
  children?: ReactNode;
  isOpen: boolean;
  close: () => void;
};

export function Modal({ children, isOpen, close }: ModalProps) {
  return (
    <div
      className={classNames(
        "z-30 w-2/3 bg-slate-800 p-4 relative pointer-events-auto",
        isOpen ? "" : "hidden"
      )}
    >
      <div
        className="cursor-pointer font-bold text-3xl absolute top-1 right-2"
        onClick={close}
      >
        &times;
      </div>
      {children}
    </div>
  );
}
