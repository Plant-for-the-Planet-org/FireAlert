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

export function groupSitesAsProject(
  data: Array<ResStructure>,
  typeKey: string,
) {
  const newObj: ResStructure = {};
  let arr: Array<ResStructure> = [];
  data
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(item => item[typeKey])
    .filter(site => site !== null)
    .forEach(method => {
      const filteredData = data?.filter(item => item[typeKey] === method);
      newObj[String(method).toLowerCase()] = filteredData;
    });
  for (const key in newObj) {
    arr.push({
      name: newObj[key][0]?.projectName,
      id: newObj[key][0]?.projectId,
      sites: newObj[key],
    });
  }
  return arr;
}
