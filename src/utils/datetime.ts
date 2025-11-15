const toLocalDate = (date: Date) => {
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000);
};

export const toLocalDateInput = (isoDate: string) => {
  const date = toLocalDate(new Date(isoDate));
  return date.toISOString().slice(0, 10);
};

export const toLocalTimeInput = (isoDate: string) => {
  const date = toLocalDate(new Date(isoDate));
  return date.toISOString().slice(11, 16);
};

export const currentLocalDate = () => {
  const now = toLocalDate(new Date());
  return now.toISOString().slice(0, 10);
};

export const currentLocalTime = () => {
  const now = toLocalDate(new Date());
  return now.toISOString().slice(11, 16);
};

export const combineDateAndTimeToISO = (date: string, time: string) => {
  return new Date(`${date}T${time}`).toISOString();
};
