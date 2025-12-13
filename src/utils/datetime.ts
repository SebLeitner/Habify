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

export const dateToISODate = (date: string) => `${date}T00:00:00.000Z`;

export const combineDateAndTimeToISO = (date: string, time: string) => {
  return new Date(`${date}T${time}`).toISOString();
};

export const formatDateForDisplay = (isoDate: string | null | undefined) => {
  if (!isoDate) {
    return '';
  }

  const [year, month, day] = isoDate.split('-');
  if (!year || !month || !day) {
    return '';
  }

  return `${day}.${month}.${year}`;
};

export const parseDisplayDateToISO = (displayValue: string) => {
  const trimmedValue = displayValue.trim();
  if (!trimmedValue) {
    return '';
  }

  const match = trimmedValue.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (!match) {
    return '';
  }

  const [, day, month, year] = match;
  const isoDate = `${year}-${month}-${day}`;
  const parsed = new Date(isoDate);

  if (Number.isNaN(parsed.getTime())) {
    return '';
  }

  return isoDate;
};

export const parseDisplayTimeToISO = (displayValue: string) => {
  const trimmedValue = displayValue.trim();
  if (!trimmedValue) {
    return '';
  }

  const match = trimmedValue.match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  if (!match) {
    return '';
  }

  const [, hours, minutes] = match;
  return `${hours}:${minutes}`;
};
