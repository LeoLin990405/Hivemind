import type { DialogProps } from '@/renderer/components/ui/dialog';
import React, { useMemo, useState } from 'react';

type TUseModalReturn<Props extends Record<string, any> = {}> = [
  {
    open(params?: Partial<Props>): void;
    close(): void;
  },
  React.ReactNode,
];
const ModalHOC = <Props extends Record<string, any> = {}>(
  ModalBodyComponent: React.FC<
    Props & {
      modalCtrl: {
        close(): void;
      };
      modalProps: Partial<DialogProps> & { open?: boolean };
    }
  >,
  defaultModalProps?: Partial<DialogProps> & { open?: boolean }
) => {
  const ModalComponent: React.FC<
    Props & {
      modalProps: Partial<DialogProps> & { open?: boolean };
      modalCtrl: {
        close(): void;
      };
    }
  > & {
    useModal: (props: Props) => TUseModalReturn<Props>;
  } = ({ modalProps, modalCtrl, ...props }) => {
    const mergeModalProps = useMemo(() => {
      return {
        onOpenChange: (open: boolean) => {
          if (!open) modalCtrl.close();
        },
        ...(defaultModalProps || {}),
        ...modalProps,
      };
    }, [defaultModalProps, modalProps, modalCtrl]);
    return <ModalBodyComponent {...(props as unknown as Props)} modalCtrl={modalCtrl} modalProps={mergeModalProps}></ModalBodyComponent>;
  };

  const useModal = (props: Props): TUseModalReturn<Props> => {
    const [visible, setVisible] = useState(false);
    const [modalProps, setModalProps] = useState<Partial<Props>>({});

    const ctrl = useMemo(() => {
      return {
        open(params?: Partial<Props>) {
          setVisible(true);
          if (params) setModalProps(params);
        },
        close() {
          setVisible(false);
        },
      };
    }, [setVisible, setModalProps]);

    const modalCtrl = useMemo(() => {
      return {
        close() {
          setVisible(false);
        },
      };
    }, [setVisible]);

    return [ctrl, <ModalComponent {...props} {...modalProps} modalProps={{ open: visible }} modalCtrl={modalCtrl}></ModalComponent>];
  };
  ModalComponent.useModal = useModal;
  return ModalComponent;
};

ModalHOC.Extra = <Props extends Record<string, any> = {}>(defaultModalProps?: Partial<DialogProps> & { open?: boolean }) => {
  return (
    ModalBodyComponent: React.FC<
      Props & {
        modalProps: Partial<DialogProps> & { open?: boolean };
        modalCtrl: {
          close(): void;
        };
      }
    >
  ) => {
    return ModalHOC<Props>(ModalBodyComponent, defaultModalProps);
  };
};

export default ModalHOC;
