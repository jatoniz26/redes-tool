document.addEventListener('DOMContentLoaded', () => {
  const actionButton = document.getElementById('actionButton');
  const result = document.getElementById('result');
  const form = document.getElementById('social-automation-form');

  if (actionButton && result) {
    actionButton.addEventListener('click', () => {
        result.textContent = '¡Diseño actualizado! Usa el formulario para generar tu publicación.';
      });
  }

  if (form && result) {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const productName = document.getElementById('productName').value.trim();
      const keyBenefit = document.getElementById('keyBenefit').value.trim();
      const selectedBackground = document.querySelector('input[name="bgOption"]:checked');
      const backgroundLabel = selectedBackground ? selectedBackground.parentElement.textContent.trim() : 'ninguno';

      result.textContent = productName && keyBenefit
        ? `Publicación lista: ${productName} — ${keyBenefit} / Fondo: ${backgroundLabel}`
        : 'Completa el nombre del producto y el beneficio para ver el resumen.';
    });
  }
});
document.getElementById('social-automation-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const fileInput = document.getElementById('productImage');
  const bgOption = document.querySelector('input[name="bgOption"]:checked').value;
  const productName = document.getElementById('productName').value;
  const keyBenefit = document.getElementById('keyBenefit').value;

  if (fileInput.files.length === 0) return alert("Sube una imagen primero");

  // Leer la imagen como Base64
  const reader = new FileReader();
  reader.readAsDataURL(fileInput.files[0]);
  
  reader.onload = async () => {
    const imageBase64 = reader.result.split(',')[1]; // Limpiar el string

    // Llamar a nuestra API de Vercel
    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64, bgOption, productName, keyBenefit })
    });

    const data = await response.json();
    
    if(data.success) {
      console.log("¡Éxito!", data);
      // Aquí puedes inyectar data.imageUrl, data.instagram y data.tiktok en tu HTML
    } else {
      alert("Error: " + data.error);
    }
  };
});