function getAccuracyColors(accuracyInMeters: number) {
  const accuracyColor =
    accuracyInMeters < 10 && accuracyInMeters > 0
      ? '#1CE003'
      : accuracyInMeters < 30 && accuracyInMeters > 0
      ? '#FFC400'
      : '#FF0000';
  return accuracyColor;
}

export {getAccuracyColors};
