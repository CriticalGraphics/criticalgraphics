// Switch to 'Soft' lighting preset instantly on menu load
window.addEventListener('DOMContentLoaded', function() {
  const softBtn = document.getElementById('lightPreset2');
  if (softBtn) {
    softBtn.click();
  }
});
