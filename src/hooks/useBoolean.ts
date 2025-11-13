import { useCallback, useState } from 'react';

const useBoolean = (initial = false) => {
  const [value, setValue] = useState(initial);

  const setTrue = useCallback(() => setValue(true), []);
  const setFalse = useCallback(() => setValue(false), []);
  const toggle = useCallback(() => setValue((prev) => !prev), []);

  return { value, setTrue, setFalse, toggle } as const;
};

export default useBoolean;
