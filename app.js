document.addEventListener('DOMContentLoaded', () => {
  const submitButton = document.getElementById('tu-boton-accion'); // Ajusta este ID según tu HTML
  
  const instagramOutput = document.getElementById('instagram-output');
  const tiktokOutput = document.getElementById('tiktok-output');
  const hashtagsOutput = document.getElementById('hashtags-output');
  const imageElement = document.getElementById('imagen-resultado');
  const imagePlaceholder = document.getElementById('image-placeholder');

  if (submitButton) {
    submitButton.addEventListener('click', async (e) => {
      e.preventDefault();

      const productName = document.getElementById('product-name')?.value;
      const mainBenefit = document.getElementById('key-benefit')?.value; // Asegúrate de que coincida con el nombre del input
      const background = document.getElementById('bg-option')?.value || 'madera clara';
      const imageInput = document.getElementById('product-image');
      const productFile = imageInput?.files[0];

      if (!productName || !mainBenefit || !productFile) {
        alert('Por favor completa el nombre, beneficio y asegúrate de subir una imagen.');
        return;
      }

      const originalText = submitButton.textContent;
      submitButton.textContent = 'Analizando pieza 3D y generando entorno...';
      submitButton.disabled = true;

      try {
        const formData = new FormData();
        formData.append('productName', productName);
        formData.append('mainBenefit', mainBenefit);
        formData.append('background', background);
        formData.append('image', productFile); 

        const response = await fetch('/api/generate', {
          method: 'POST',
          body: formData,
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Error al conectar con el servidor');
        }

        // Como ahora generamos variantes (arrays), puedes mostrar la variante 1 por defecto 
        // o mapearlas en tu UI como desees. Aquí mostramos la Variante 1:
        if (instagramOutput) instagramOutput.textContent = data.copys.instagram_copy[0];
        if (tiktokOutput) tiktokOutput.textContent = data.copys.tiktok_copy[0];
        if (hashtagsOutput) hashtagsOutput.textContent = data.copys.hashtags;

        if (imageElement && data.backgroundImageUrl) {
          imageElement.src = data.backgroundImageUrl;
          imageElement.style.display = 'block';
          if (imagePlaceholder) imagePlaceholder.style.display = 'none';
        }

      } catch (error) {
        console.error('Error detallado:', error);
        alert('Hubo un error: ' + error.message);
      } finally {
        submitButton.textContent = originalText;
        submitButton.disabled = false;
      }
    });
  }
});