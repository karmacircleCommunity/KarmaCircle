import type { ReactNode } from "react";

interface ModalProps {
  children?: ReactNode;
  onClose?: () => void;
  className?: string;
}

const Modal = ({ children, onClose, className }: ModalProps) => {
  return (
    <div className="fixed inset-0 z-20 flex h-full w-full items-center justify-center bg-black/80">
      <div
        className={`relative h-fit w-[30vw] min-w-[500px] rounded-2xl bg-white p-4 text-black max-[525px]:w-[89vw] max-[525px]:min-w-[220px] max-[525px]:text-center ${className}`}
      >
        <button
          type="button"
          className="btn-close absolute top-[7px] right-[12px] m-0 border-0 p-0 text-sm shadow-none"
          aria-label="Close"
          onClick={onClose}
        ></button>
        {children}
      </div>
    </div>
  );
};

export default Modal;
