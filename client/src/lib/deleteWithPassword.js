export function requestDeletePassword(itemLabel = "this item") {
  const shouldDelete = window.confirm(
    `Delete ${itemLabel}? You will need to enter your current password to continue.`
  );

  if (!shouldDelete) {
    return "";
  }

  const password = window.prompt("Enter your current password to confirm deletion:");
  if (password === null) {
    return "";
  }

  const trimmedPassword = String(password).trim();
  if (!trimmedPassword) {
    window.alert("Current password is required to delete this item.");
    return "";
  }

  return trimmedPassword;
}
