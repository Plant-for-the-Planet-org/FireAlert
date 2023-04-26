// From a string of Coordinates to a number[][] coordinates
export function makeCoordinates(str: string): number[][][] {
    const arr = str.split(',').map((val) => Number(val.trim()));
    const result: number[][] = [];

    for (let i = 0; i < arr.length; i += 2) {
        const group = [arr[i]!, arr[i + 1]!];
        if (group.every((val) => typeof val === 'number' && !isNaN(val))) {
            result.push(group);
        }
    }
    return [result];
}
