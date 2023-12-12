export function getSlice(latitude: number) {
    if(latitude >= -90 && latitude < -30) {
        return '1';
    } else if (latitude >= -30 && latitude < -15) {
        return '2';
    } else if (latitude >= -15 && latitude < 0) {
        return '3';
    } else if (latitude >= 0 && latitude < 15) {
        return '4';
    } else if (latitude >= 15 && latitude < 30) {
        return '5';
    } else if (latitude >= 30 && latitude < 45) {
        return '6';
    } else if (latitude >= 45 && latitude < 60) {
        return '7';
    } else if (latitude >= 60 && latitude <= 90) {
        return '8';
    } else {
        return '0';
    }
}
