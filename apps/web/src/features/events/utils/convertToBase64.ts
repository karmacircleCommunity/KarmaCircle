/** Converts an uploaded image into the data URL accepted by event creation. */
const convertToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const fileReader = new FileReader();
    fileReader.readAsDataURL(file);
    fileReader.onload = () => {
      if (typeof fileReader.result === "string") resolve(fileReader.result);
      else reject(new Error("Could not read image as a data URL"));
    };
    fileReader.onerror = (error) => {
      reject(error);
    };
  });
};

export default convertToBase64;
