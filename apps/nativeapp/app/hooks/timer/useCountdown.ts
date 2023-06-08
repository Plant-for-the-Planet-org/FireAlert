import {useEffect, useState} from 'react';

const useCountdown = (time: number) => {
  const [timeout, setTimeout] = useState<number>(time);
  const timer = () => setTimeout(prevState => prevState - 1);
  useEffect(() => {
    if (timeout <= 0) {
      return;
    }
    const id = setInterval(timer, 1000);
    return () => clearInterval(id);
  }, [timeout]);
  return [timeout, setTimeout];
};

export default useCountdown;
