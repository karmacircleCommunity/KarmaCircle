import axios from "axios";
import type { AxiosRequestConfig, Method } from "axios";

export const axiosInstance = axios.create({});

type ApiConnectorConfig = AxiosRequestConfig & {
  crossOrigin?: boolean;
  allowCredentials?: boolean;
};

// Default generic preserves this function's previous fully-untyped
// (implicit `any`) return shape for callers that don't pass an explicit `<T>`.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const apiConnector = async <T = any>(
  method: Method,
  url: string,
  bodyData?: unknown,
  headers?: Record<string, string>,
  params?: Record<string, unknown>,
) => {
  try {
    const config: ApiConnectorConfig = {
      method,
      url,
      data: bodyData ? bodyData : null,
      headers: headers ? headers : undefined,
      params: params ? params : null,
      crossOrigin: true,
      allowCredentials: true,
    };

    const response = await axiosInstance<T>(config);

    if (response.status === 400) {
      console.error("Logout triggered due to status 600 response");
    }

    return response;
  } catch (error) {
    console.error("API request error:", error);
    throw error;
  }
};
