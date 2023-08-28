export const setFlag = (
  flag: number,
  offset: number,
  value: boolean
): number => {
  if (offset >= 8) {
    throw "offset must be lesser than 8";
  }

  return value ? flag | (1 << offset) : flag & (255 - (1 << offset));
};

export const getFlag = (flag: number, offset: number): boolean => {
  if (offset >= 8) {
    throw "offset must be lesser than 8";
  }

  return (flag & (1 << offset)) !== 0;
};
