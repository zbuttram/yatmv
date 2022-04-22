import { ReactNode, useRef } from "react";
import classNames from "classnames";
import { useClickAway } from "react-use";

export type BaseModalProps = {
  children?: ReactNode;
  isOpen: boolean;
  close: () => void;
  className?: string;
};

export type ModalProps = Omit<BaseModalProps, "children">;

export function Modal({ children, isOpen, close, className }: BaseModalProps) {
  const ref = useRef<HTMLDivElement>(null);
  useClickAway(ref, () => {
    isOpen && close();
  });

  return (
    <div
      className={classNames(
        "z-30 w-2/3 bg-neutral-900 pointer-events-auto drop-shadow-xl modal",
        isOpen ? "" : "hidden",
        className
      )}
      ref={ref}
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
