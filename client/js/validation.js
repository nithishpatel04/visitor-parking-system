function validateParkingForm(formData) {
  const errors = [];

  if (!formData.building) {
    errors.push('Please choose a building.');
  }
  if (!formData.unit) {
    errors.push('Please enter a unit.');
  }
  if (!formData.resident) {
    errors.push('Please enter the resident name.');
  }
  if (!formData.plate) {
    errors.push('Please enter the plate number.');
  }
  if (!formData.vehicle) {
    errors.push('Please enter the vehicle type.');
  }
  if (!formData.color) {
    errors.push('Please enter the vehicle color.');
  }
  if (formData.duration === undefined || formData.duration === null || formData.duration === '' || Number.isNaN(Number(formData.duration))) {
    errors.push('Please choose a duration.');
  }
  if (!formData.authorizedBy) {
    errors.push('Please enter who authorized the visit.');
  }

  return errors;
}
