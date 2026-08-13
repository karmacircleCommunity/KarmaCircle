import { apiConnector } from "@services/ApiConnector.js";
import { eventEndpoints } from "@services/ApiEndpoints.js";

// get clubs
export const getEvents = async () => {
  const getEventsData = await apiConnector("GET", `${eventEndpoints.all}`);

  if (getEventsData.status !== 200) {
    throw new Error("Could not get Events");
  }

  return getEventsData.data;
};
