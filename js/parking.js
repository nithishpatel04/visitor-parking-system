document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('parkingForm');
  const message = document.getElementById('formMessage');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = Object.fromEntries(new FormData(form).entries());
    formData.duration = Number(formData.duration);

    const errors = validateParkingForm(formData);
    if (errors.length) {
      setStatusMessage(message, errors[0], true);
      return;
    }

    try {
      const result = await createPass(formData);
      setStatusMessage(message, result.message || 'Parking pass created.', false);
      
      // Store the pass in localStorage and redirect to print page
      if (result.pass) {
        localStorage.setItem('printPass', JSON.stringify(result.pass));
        setTimeout(() => {
          window.location.href = 'print.html';
        }, 500);
      }
      
      form.reset();
    } catch (error) {
      setStatusMessage(message, error.message || 'Failed to create parking pass.', true);
      console.error('Error details:', error);
    }
  });

  // Handle logout button
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', logout);
  }
});
