import axios from "axios";

const fetcher = async <T = unknown>(url: string): Promise<T> => {
  const data = await axios
    .get(url, {
      withCredentials: true,
    })
    .then((res) => res.data);
  return data;
};

export default fetcher;
