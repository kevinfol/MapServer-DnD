export let externalScreen;
export let externalWindow;
export let mapFileURL;
export let thisScreen;

import '@/style.css';
import { createIcons, icons } from 'lucide';
import { ZoomSelect } from '@/components/zoom-select.js';
import { PreviewScreen } from '@/components/preview-screen.js';
import { PreviewScreen2 } from '@/components/preview-screen-2.js';

const BG_IMAGE_URLS = import.meta.glob('@/bg-images/*.{jpg,png,gif,jpeg}', {
  eager: true,
  query: '?url',
  import: 'default',
});

const grays = ['#e3e3e3', '#c4c4c4', '#b2b2b2', '#949494', '#7c7c7c'];

let previewScreenElement = document.getElementById('map-canvas');
const baseMapInput = document.getElementById('base-map-input');
const backgroundSelect = document.getElementById('background-select');
const rotateMapButton = document.getElementById('rotate-btn');
const backgroundFadeRange = document.getElementById('background-fade-range');
const fogCheckbox = document.getElementById('enable-fog-drawing-checkbox');
const openExternalButton = document.getElementById('open-external-screen-btn');
const sendToExternalButton = document.getElementById('send-to-external-screen-btn');

window.onload = async () => {
  // Get the elements

  createIcons({ icons });
  // Populate background select
  for (const [path, url] of Object.entries(BG_IMAGE_URLS)) {
    const fileName = path.split('/').pop().split('.').shift();
    const option = document.createElement('option');
    option.value = url;
    option.textContent = fileName;
    backgroundSelect.appendChild(option);
  }
  connectEvents();
  openExternalButton.onclick();
};

function connectEvents() {
  backgroundFadeRange.oninput = (event) => {
    const value = event.target.value;
    previewScreenElement.setBackgroundFade(value);
  };
  rotateMapButton.onclick = () => {
    const zoomSelectElement = document.querySelector('zoom-select');
    zoomSelectElement.rotateImage();
    previewScreenElement.rotateImage();
  };
  baseMapInput.onchange = (event) => {
    const file = event.target.files[0];
    if (file) {
      mapFileURL = URL.createObjectURL(file);
      const zoomSelectElement = document.querySelector('zoom-select');
      zoomSelectElement.setImageSource(mapFileURL);
      previewScreenElement.setImageSource(mapFileURL);
    }
  };
  document.getElementById('circle-radius').oninput = (event) => {
    const radius = event.target.value;
    previewScreenElement.setCircleRadius(radius);
  };
  backgroundSelect.onchange = (event) => {
    const url = event.target.value;
    previewScreenElement.setBackgroundImage(url);
  };
  document.getElementById('clear-svg-btn').onclick = () => {
    previewScreenElement.clearSvg();
  };
  document.getElementById('clear-everything-btn').onclick = () => {
    backgroundSelect.selectedIndex = 0;
    baseMapInput.value = '';
    previewScreenElement.setBackgroundImage('None');
    const zoomSelectElement = document.querySelector('zoom-select');
    zoomSelectElement.setImageSource('');
    previewScreenElement.setImageSource('');
    previewScreenElement.clearSvg();
    sendToExternalButton.onclick();
  };
  openExternalButton.onclick = async () => {
    await getThisScreen();
    await getSecondaryScreen();
    if (externalScreen) {
      previewScreenElement.setDimensions();

      externalWindow = await window.open(
        '',
        '_about:blank',
        `left=${externalScreen.availLeft},top=${externalScreen.availTop},width=${externalScreen.availWidth},height=${externalScreen.availHeight},toolbar=no,menubar=no,location=no,resizable=yes,scrollbars=no,popup=yes,status=no`,
      );
      externalWindow.document.write(
        `<html><head><title>External Map Display</title></head><body class="overflow-hidden" style="background:black; position:relative; width:100%; height:100%; margin:0; padding:0;">
        <script>
        window.addEventListener('message', async (event) => {
        if (event.data.action === 'fullscreen') {
          try {
            // Request fullscreen on the document's root element
            await document.documentElement.requestFullscreen();
            console.log('Fullscreen activated.');
          } catch (err) {
            console.error('Fullscreen request failed:', err);
          }
        }
      });</script>
        </body></html>`,
      );
      externalWindow.document.close();
    } else {
      alert('No secondary screen detected.');
    }
  };
  sendToExternalButton.onclick = () => {
    if (!externalWindow || externalWindow.closed) {
      alert('External window is not open.');
      console.log('External window is not open.');
      return;
    }
    document.head.querySelectorAll('link, style').forEach((htmlElement) => {
      externalWindow.document.head.appendChild(htmlElement.cloneNode(true));
    });
    while (externalWindow.document.body.firstChild) {
      externalWindow.document.body.removeChild(externalWindow.document.body.firstChild);
    }

    const div = document.createElement('div');
    div.className = 'relative w-screen h-screen overflow-hidden bg-black';
    externalWindow.document.body.appendChild(div);

    const bg_image = document.createElement('img');
    bg_image.style.position = 'absolute';
    bg_image.style.top = '0';
    bg_image.style.left = '0';
    bg_image.style.width = '100%';
    bg_image.style.height = '100%';
    bg_image.style.objectFit = 'cover';
    bg_image.style.zIndex = '0';
    bg_image.className = 'bg-black';
    bg_image.src = previewScreenElement.bgImg.src;
    div.appendChild(bg_image);

    const map_image = document.createElement('img');
    map_image.id = 'map-image';
    map_image.className = previewScreenElement.mapImg.className;
    map_image.style.position = 'absolute';
    map_image.style.top = '50%';
    map_image.style.left = '50%';
    map_image.style.zIndex = '1';
    map_image.style.transform = previewScreenElement.mapImg.style.transform;
    map_image.src = previewScreenElement.mapImg.src;
    div.appendChild(map_image);

    const svgElement = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svgElement.setAttribute('width', '100%');
    svgElement.setAttribute('height', '100%');
    svgElement.style.position = 'absolute';
    svgElement.style.top = '0';
    svgElement.style.left = '0';
    svgElement.style.zIndex = '2';
    svgElement.setAttribute('viewBox', `0 0 ${previewScreenElement.clientWidth} ${previewScreenElement.clientHeight}`);
    svgElement.innerHTML = previewScreenElement.svgElement.innerHTML;
    div.appendChild(svgElement);

    let i = 0;
    for (const circle of svgElement.querySelectorAll('circle')) {
      circle.setAttribute('filter', 'url(#fogFilter)');
      circle.setAttribute('fill', grays[i % grays.length] + 'f2');
      i++;
      const newCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      newCircle.setAttribute('cx', circle.getAttribute('cx'));
      newCircle.setAttribute('cy', circle.getAttribute('cy'));
      newCircle.setAttribute('r', circle.getAttribute('r'));
      newCircle.setAttribute('filter', 'url(#fogFilter)');
      newCircle.setAttribute('fill', 'url(#diaHatch' + (i % 4) + ')');
      svgElement.appendChild(newCircle);
    }

    const defElement = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    defElement.innerHTML = `
      <pattern id="diaHatch0" width="1" height="13" patternUnits="userSpaceOnUse" patternTransform="rotate(44)">
        <rect x1="0" width="1" y1="0" height="100%" fill="none"/>
        <line x1="0" x2="100%" y1="0" y2="0" stroke-width="4" stroke="#6d6d6d26" />
      </pattern>
      <pattern id="diaHatch1" width="1" height="13" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)">
        <rect x1="0" width="1" y1="0" height="100%" fill="none"/>
        <line x1="0" x2="100%" y1="0" y2="0" stroke-width="4" stroke="#6d6d6d26" />
      </pattern>
      <pattern id="diaHatch2" width="1" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(-15)">
        <rect x1="0" width="1" y1="0" height="100%" fill="none"/>
        <line x1="0" x2="100%" y1="0" y2="0" stroke-width="4" stroke="#6d6d6d26" />
      </pattern>
      <pattern id="diaHatch3" width="1" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(15)">
        <rect x1="0" width="1" y1="0" height="100%" fill="none"/>
        <line x1="0" x2="100%" y1="0" y2="0" stroke-width="4" stroke="#6d6d6d26" />
      </pattern>
      <!-- Fog filter -->
      <filter id="fogFilter">
        <!-- Generate noise -->
        <feTurbulence id="turbulence" type="fractalNoise" baseFrequency="0.04 0.05" numOctaves="3" seed="2" />
        <!-- Smooth the noise -->
        <feDisplacementMap in="SourceGraphic" scale="50" />
      </filter>
    `;
    svgElement.insertBefore(defElement, svgElement.firstChild);
    //externalWindow.document.body.appendChild(previewClone);

    const newScript = externalWindow.document.createElement('script');
    newScript.innerHTML = `
      
      window.onload = function() {
        window.frame_ = 0;
        animateFog();
      }
      function animateFog() {
        window.frame_ += 0.0007; // speed of fog movement
        const freqX = 0.01 + Math.sin(window.frame_) * 0.002;
        const freqY = 0.02 + Math.cos(window.frame_) * 0.002;
        const turb = document.getElementById('turbulence')
        if (turb) {
          turb.setAttribute('baseFrequency', freqX + ' ' + freqY);
        }
        requestAnimationFrame(animateFog);
      }
    `;
    externalWindow.document.body.appendChild(newScript);
    externalWindow.onload();
  };
}
async function getThisScreen() {
  const screenDetails = await window.getScreenDetails();
  if (screenDetails && screenDetails.screens.length > 0) {
    // look for the primary screen
    for (const screen of screenDetails.screens) {
      if (screen.isPrimary) {
        thisScreen = screen;
        return;
      }
    }
    // if no primary screen found, return the first one
    thisScreen = screenDetails.screens[0];
  } else {
    thisScreen = null;
  }
}
async function getSecondaryScreen() {
  const screenDetails = await window.getScreenDetails();
  if (screenDetails && screenDetails.screens.length > 1) {
    // look for a non-primary screen
    for (const screen of screenDetails.screens) {
      if (!screen.isPrimary) {
        externalScreen = screen;
        return;
      }
    }
    // if all screens are primary, return the second one
    externalScreen = screenDetails.screens[1];
  } else {
    externalScreen = null;
  }
}
