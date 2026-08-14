import type { ReactNode } from "react";
import style from "./Modal.module.css";

interface ModalProps {
  children?: ReactNode;
  onClose?: () => void;
  className?: string;
}

const Modal = ({ children, onClose, className }: ModalProps) => {
  return (
    <div className={style.overlay}>
      <div className={`${style.modal} ${className}`}>
        <button
          type="button"
          className={`btn-close ${style.crossButton}`}
          aria-label="Close"
          onClick={onClose}
        ></button>
        {children}
      </div>
    </div>
  );
};

export default Modal;
