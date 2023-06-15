import React, {createContext, useState, ReactNode} from 'react';

interface BottomBarContextProps {
  modalVisible: boolean;
  openModal: () => void;
  closeModal: () => void;
}

export const BottomBarContext = createContext<BottomBarContextProps>(
  {} as BottomBarContextProps,
);

interface BottomBarProviderProps {
  children: ReactNode;
}

export const BottomBarProvider: React.FC<BottomBarProviderProps> = ({
  children,
}) => {
  const [modalVisible, setModalVisible] = useState(false);

  const openModal = () => {
    setModalVisible(!modalVisible);
  };

  const closeModal = () => {
    setModalVisible(false);
  };

  return (
    <BottomBarContext.Provider value={{modalVisible, openModal, closeModal}}>
      {children}
    </BottomBarContext.Provider>
  );
};
