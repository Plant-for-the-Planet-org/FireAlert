export function fileExtensionExtract(fileName: string) {
  const re = /(?:\.([^.]+))?$/;
  return re.exec(fileName)[1];
}
