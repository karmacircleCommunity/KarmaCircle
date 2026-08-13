import axios from "axios";
export const axiosInstance = axios.create({});

export const apiConnector = async (method, url, bodyData, headers, params) => {
  try {
    const response = await axiosInstance({
      method,
      url,
      data: bodyData ? bodyData : null,
      headers: headers ? headers : null,
      params: params ? params : null,
      crossOrigin: true,
      allowCredentials: true,
    });

    if (response.status === 400) {
      console.error("Logout triggered due to status 600 response");
    }

    return response;
  } catch (error) {
    console.error("API request error:", error);
    throw error;
  }
};
