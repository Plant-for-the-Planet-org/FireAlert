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

export function groupSitesAsProject(data: Array<ResStructure>) {
  const newObj: ResStructure = {};
  let arr: Array<ResStructure> = [];
  let newArr: Array<ResStructure> = [];
  data
    .sort((a, b) => a.name.localeCompare(b.name))
    .filter(site => site !== null);
  for (const key in data) {
    if (data[key]?.project) arr.push(data[key]);
  }
  arr.forEach(method => {
    const filteredData = arr?.filter(
      item => item?.project?.id === method?.project?.id,
    );
    newObj[String(method?.project?.id).toLowerCase()] = filteredData;
  });
  for (const key in newObj) {
    newArr.push({
      name: newObj[key][0]?.project?.name,
      id: newObj[key][0]?.project?.id,
      sites: newObj[key],
    });
  }

  return newArr;
}
