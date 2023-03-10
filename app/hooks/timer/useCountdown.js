import {useEffect, useState} from 'react';

const useCountdown = time => {
  const [timeout, setTimeout] = useState(time);
  const timer = () => setTimeout(prevState => prevState - 1);
  useEffect(() => {
    if (timeout <= 0) {
      return;
    }
    const id = setInterval(timer, 1000);
    return () => clearInterval(id);
  }, [timeout]);
  return timeout;
};

export default useCountdown;
