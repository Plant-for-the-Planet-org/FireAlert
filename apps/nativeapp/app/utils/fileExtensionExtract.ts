export function fileExtensionExtract(fileName: string): string {
  const re = /(?:\.([^.]+))?$/;
  const match = re.exec(fileName);
  return match ? match[1] : '';
}

export function fileNameExtract(fileName: string) {
  const lastDotIndex = fileName.lastIndexOf('.');
  if (lastDotIndex !== -1) {
    return fileName.substring(0, lastDotIndex);
  } else {
    return fileName; // If there's no dot, return the whole file name
  }
}
