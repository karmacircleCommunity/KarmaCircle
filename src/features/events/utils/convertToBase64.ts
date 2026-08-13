import type { ChangeEvent } from "react";

/**
 * `converter(file)` wraps `FileReader.readAsDataURL` in a promise.
 * Latent bug, kept as-is (see SPEC.md): if `file` is falsy, it
 * `alert()`s but never calls `resolve()`/`reject()` — the promise
 * would hang forever. Not reachable today because the only call site
 * (`convertToBase64`, below) already guards against an empty
 * `FileList` before calling this.
 */
const converter = (file: File): Promise<string | ArrayBuffer | null> => {
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

const convertToBase64 = async (
  e: ChangeEvent<HTMLInputElement>,
): Promise<string | ArrayBuffer | null | undefined> => {
  if (!e.target.files || e.target.files.length === 0) return;

  const file = e.target.files[0];
  const base64 = await converter(file);
  // setevent((prevEvent) => ({ ...prevEvent, coverImage: base64 }));
  // e.target.value = "";

  return base64;
};

export default convertToBase64;
