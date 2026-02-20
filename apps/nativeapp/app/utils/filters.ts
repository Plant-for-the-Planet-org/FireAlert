type ResStructure = {
  [n: string]: any;
};

type NewResStructure = {
  [n: string]: Array<object>;
};

/**
 * Categorizes an array of objects by a specified key
 * Groups items with the same value for the given key into separate arrays
 *
 * @param {Array<ResStructure>} data - Array of objects to categorize
 * @param {string} typeKey - The key to use for categorization
 * @returns {NewResStructure} Object with lowercase keys mapping to arrays of matching items
 *
 * @example
 * const alertMethods = [
 *   { id: '1', method: 'EMAIL', destination: 'user@example.com' },
 *   { id: '2', method: 'SMS', destination: '+1234567890' },
 *   { id: '3', method: 'EMAIL', destination: 'admin@example.com' }
 * ];
 * const categorized = categorizedRes(alertMethods, 'method');
 * // Returns: {
 * //   email: [{ id: '1', method: 'EMAIL', ... }, { id: '3', method: 'EMAIL', ... }],
 * //   sms: [{ id: '2', method: 'SMS', ... }]
 * // }
 */
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

/**
 * Groups sites by their associated project
 * Filters sites that have a project association and groups them by project ID
 * Returns an array of project objects with their associated sites
 *
 * @param {Array<ResStructure>} data - Array of site objects to group
 * @returns {Array<ResStructure>} Array of project objects with grouped sites, sorted alphabetically by project name
 *
 * @example
 * const sites = [
 *   { id: '1', name: 'Site A', project: { id: 'proj1', name: 'Forest Project' } },
 *   { id: '2', name: 'Site B', project: { id: 'proj1', name: 'Forest Project' } },
 *   { id: '3', name: 'Site C', project: { id: 'proj2', name: 'Ocean Project' } },
 *   { id: '4', name: 'Site D', project: null }
 * ];
 * const grouped = groupSitesAsProject(sites);
 * // Returns: [
 * //   { id: 'proj1', name: 'Forest Project', sites: [Site A, Site B] },
 * //   { id: 'proj2', name: 'Ocean Project', sites: [Site C] }
 * // ]
 * // Note: Site D is excluded because it has no project
 */
export function groupSitesAsProject(data: Array<ResStructure>) {
  const newObj: ResStructure = {};
  let arr: Array<ResStructure> = [];
  let newArr: Array<ResStructure> = [];
  // Sort sites alphabetically and filter out null entries
  data
    .sort((a, b) => a.name.localeCompare(b.name))
    .filter(site => site !== null);
  // Collect only sites that have a project association
  for (const key in data) {
    if (data[key]?.project) {
      arr.push(data[key]);
    }
  }
  // Group sites by project ID
  arr.forEach(method => {
    const filteredData = arr?.filter(
      item => item?.project?.id === method?.project?.id,
    );
    newObj[String(method?.project?.id).toLowerCase()] = filteredData;
  });
  // Transform grouped data into array of project objects
  for (const key in newObj) {
    newArr.push({
      name: newObj[key][0]?.project?.name,
      id: newObj[key][0]?.project?.id,
      sites: newObj[key],
    });
  }
  // Sort projects alphabetically by name
  newArr.sort((a, b) => a.name.localeCompare(b.name));
  return newArr;
}
