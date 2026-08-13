const converter = (file) => {
  return new Promise((resolve, reject) => {
    const fileReader = new FileReader();
    if (!file) {
      alert("Please select an image");
    } else {
      fileReader.readAsDataURL(file);
      fileReader.onload = () => {
        resolve(fileReader.result);
      };
    }
    fileReader.onerror = (error) => {
      reject(error);
    };
  });
};

const convertToBase64 = async (e) => {
  if (!e.target.files || e.target.files.length === 0) return;

  const file = e.target.files[0];
  const base64 = await converter(file);
  // setevent((prevEvent) => ({ ...prevEvent, coverImage: base64 }));
  // e.target.value = "";

  return base64;
};

export default convertToBase64;
