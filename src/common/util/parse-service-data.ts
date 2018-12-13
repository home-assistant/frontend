export const parseServiceData = (serviceData: string): object => {
  try {
    return serviceData ? JSON.parse(serviceData) : {};
  } catch (err) {
    return {};
  }
};
