function collectSearchState() {
  return {
    plate: document.getElementById('plateSearch')?.value || '',
    building: document.getElementById('buildingFilter')?.value || '',
    unit: document.getElementById('unitSearch')?.value || '',
    from: document.getElementById('fromDate')?.value || '',
    to: document.getElementById('toDate')?.value || ''
  };
}

function clearSearchFields() {
  document.getElementById('plateSearch').value = '';
  document.getElementById('buildingFilter').value = '';
  document.getElementById('unitSearch').value = '';
  document.getElementById('fromDate').value = '';
  document.getElementById('toDate').value = '';
}
