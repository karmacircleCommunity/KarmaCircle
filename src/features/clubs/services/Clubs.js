import { apiConnector } from "@services/ApiConnector.js";
import { clubEndpoints } from "@services/ApiEndpoints.js";

// get clubs
export const getClubs = async () => {
  const getClubsData = await apiConnector("GET", `${clubEndpoints.all}`);

  if (getClubsData.status !== 200) {
    throw new Error("Could not get Clubs");
  }

  return getClubsData.data;
};
