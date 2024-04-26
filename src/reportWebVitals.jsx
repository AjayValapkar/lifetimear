import { useEffect } from 'react';

const reportWebVitals = (onPerfEntry) => {
  useEffect(() => {
    if (onPerfEntry && typeof onPerfEntry === 'function') {
      import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
        getCLS(onPerfEntry);
        getFID(onPerfEntry);
        getFCP(onPerfEntry);
        getLCP(onPerfEntry);
        getTTFB(onPerfEntry);
      });
    }
  }, [onPerfEntry]);
};

export default reportWebVitals;
