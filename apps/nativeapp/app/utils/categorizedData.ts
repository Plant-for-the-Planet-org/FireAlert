type ResStructure = {
  [n: string]: any;
};

type NewResStructure = {
  [n: string]: Array<object>;
};

export function categorizedRes(data: Array<ResStructure>, typeKey: string) {
  const newObj: NewResStructure = {};
  data
    .map(item => item[typeKey])
    .forEach(method => {
      const filteredData = data?.filter(item => item[typeKey] === method);
      newObj[String(method).toLowerCase()] = filteredData;
    });
  return newObj;
}
