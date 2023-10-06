import React, {createContext, useState, ReactNode} from 'react';

interface BottomBarContextProps {
  mapInfo: any;
  selected: number;
  modalVisible: boolean;
  openModal: () => void;
  closeModal: () => void;
  selectedSiteBar: boolean;
  passMapInfo: (param: any) => void;
  setSelected: (param: number) => void;
  setSelectedSiteBar: (param: boolean) => void;
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
  const [selectedSiteBar, setSelectedSiteBar] = useState(false);
  const [selected, setSelected] = useState(0);
  const [mapInfo, setMapInfo] = useState({});

  const openModal = () => {
    setModalVisible(!modalVisible);
  };

  const closeModal = () => {
    setModalVisible(false);
  };

  const passMapInfo = (payload: any) => setMapInfo(payload);

  return (
    <BottomBarContext.Provider
      value={{
        mapInfo,
        selected,
        openModal,
        closeModal,
        setSelected,
        passMapInfo,
        modalVisible,
        selectedSiteBar,
        setSelectedSiteBar,
      }}>
      {children}
    </BottomBarContext.Provider>
  );
};
