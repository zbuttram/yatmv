import { ReactNode, useRef } from "react";
import classNames from "classnames";
import { useClickAway } from "react-use";
import { useSpring, animated } from "react-spring";

export type ModalName = null | "settings" | "twitch-browser" | "command-bar";
export type SetModalFunc = (name: ModalName) => void;

export type BaseModalProps = {
  children?: ReactNode;
  isOpen: boolean;
  close: () => void;
  className?: string;
  backdrop?: boolean;
  showCloseButton?: boolean;
  height?: number | string;
  width?: number | string;
};

export type ModalProps = Omit<BaseModalProps, "children">;

export function Modal({
  children,
  isOpen,
  close,
  className,
  backdrop = true,
  showCloseButton = true,
  height,
  width,
}: BaseModalProps) {
  const ref = useRef<HTMLDivElement>(null);
  useClickAway(ref, () => {
    isOpen && close();
  });

  const styles = useSpring({
    top: isOpen ? "0" : "-100%",
    config: {
      mass: 0.6,
      tension: 250,
    },
  });

  return (
    <animated.div
      style={styles}
      className={classNames(
        "fixed z-30 w-full h-screen flex justify-center pt-16",
        backdrop && "bg-neutral-500/50"
      )}
    >
      <div
        style={{ height, width }}
        className={classNames(
          "z-30 w-2/3 bg-neutral-900 drop-shadow-xl modal",
          className
        )}
        ref={ref}
      >
        {showCloseButton && (
          <div
            className="cursor-pointer font-bold text-3xl absolute top-1 right-2"
            onClick={close}
          >
            &times;
          </div>
        )}
        {children}
      </div>
    </animated.div>
  );
}
