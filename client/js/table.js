function renderPassTable(passes, target, usageMap = new Map()) {
  if (!target) return;
  target.innerHTML = '';

  if (!passes.length) {
    target.innerHTML = '<tr><td colspan="11">No parking passes matched your search.</td></tr>';
    return;
  }

  const fragment = document.createDocumentFragment();
  passes.forEach((pass) => {
    const key = `${pass.building}::${pass.unit}`;
    const usageCount = usageMap.get(key) || 0;
    const status = new Date(pass.endDate) < new Date() ? 'Expired' : 'Active';
    const usageValue = pass.duration === 0 ? 'Day-time' : `${usageCount} / 10`;
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${pass.building}</td>
      <td>${pass.unit}</td>
      <td>${pass.resident}</td>
      <td>${pass.plate}</td>
      <td>${pass.vehicle}</td>
      <td>${pass.color}</td>
      <td>${usageValue}</td>
      <td>${formatDate(pass.endDate)}</td>
      <td><span class="badge">${status}</span></td>
      <td>${pass.authorizedBy}</td>
      <td class="actions">
        <button class="secondary-btn" data-action="print" data-id="${pass.id}">Print</button>
        <button class="secondary-btn" data-action="delete" data-id="${pass.id}">Delete</button>
      </td>
    `;
    fragment.appendChild(row);
  });

  target.appendChild(fragment);
}
