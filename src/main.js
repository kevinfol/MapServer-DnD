import '@/style.css';
import { createIcons, icons } from 'lucide';
import { ZoomSelect } from '@/components/zoom-select.js';
import { PreviewScreen } from '@/components/preview-screen.js';

export let externalScreen;
export let externalWindow;
export let mapFileURL;

const BG_IMAGE_URLS = import.meta.glob('@/bg-images/*.{jpg,png,gif,jpeg}', {
  eager: true,
  query: '?url',
  import: 'default',
});

const grays = ['#e3e3e3', '#c4c4c4', '#b2b2b2', '#949494', '#7c7c7c'];

const mapCanvas = document.getElementById('map-canvas');
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
};

function connectEvents() {
  backgroundFadeRange.oninput = (event) => {
    const value = event.target.value;
    const previewScreenElement = document.querySelector('preview-screen');
    previewScreenElement.setBackgroundFade(value);
  };
  rotateMapButton.onclick = () => {
    const zoomSelectElement = document.querySelector('zoom-select');
    zoomSelectElement.rotateImage();
    const previewScreenElement = document.querySelector('preview-screen');
    previewScreenElement.rotateImage();
  };
  baseMapInput.onchange = (event) => {
    const file = event.target.files[0];
    if (file) {
      mapFileURL = URL.createObjectURL(file);
      console.log('Map file selected:', mapFileURL);
      const zoomSelectElement = document.querySelector('zoom-select');
      zoomSelectElement.setImageSource(mapFileURL);
      const previewScreenElement = document.querySelector('preview-screen');
      previewScreenElement.setImageSource(mapFileURL);
    }
  };
  document.getElementById('circle-radius').oninput = (event) => {
    const radius = event.target.value;
    const previewScreenElement = document.querySelector('preview-screen');
    previewScreenElement.setCircleRadius(radius);
  };
  backgroundSelect.onchange = (event) => {
    const url = event.target.value;
    const previewScreenElement = document.querySelector('preview-screen');
    previewScreenElement.setBackgroundImage(url);
  };
  document.getElementById('clear-svg-btn').onclick = () => {
    const previewScreenElement = document.querySelector('preview-screen');
    previewScreenElement.clearSvg();
  };
  openExternalButton.onclick = async () => {
    await getSecondaryScreen();
    if (externalScreen) {
      const ratio = externalScreen.availWidth / externalScreen.availHeight;
      // set the dimensions of the canvas to match the external screen
      if (externalScreen.availHeight >= externalScreen.availWidth) {
        mapCanvas.style.width = 500 + 'px';
        mapCanvas.style.height = 500 / ratio + 'px';
      } else {
        mapCanvas.style.width = 500 * ratio + 'px';
        mapCanvas.style.height = 500 + 'px';
      }
      mapCanvas.setNewDimensions();

      console.log(externalScreen);
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
      return;
    }
    document.head.querySelectorAll('link, style').forEach((htmlElement) => {
      externalWindow.document.head.appendChild(htmlElement.cloneNode(true));
    });
    const previewScreenElement = document.querySelector('preview-screen');
    while (externalWindow.document.body.firstChild) {
      externalWindow.document.body.removeChild(externalWindow.document.body.firstChild);
    }
    // Add the background div
    const bgDiv = document.createElement('img');
    bgDiv.id = 'background-div';
    bgDiv.style.position = 'absolute';
    bgDiv.style.top = '0';
    bgDiv.style.left = '0';
    bgDiv.style.objectFit = 'cover';
    bgDiv.style.width = '100%';
    bgDiv.style.height = '100%';
    bgDiv.style.zIndex = '0';
    bgDiv.src = previewScreenElement.bgImg.src;
    externalWindow.document.body.appendChild(bgDiv);

    // Add the map image
    const mapImg = document.createElement('img');
    mapImg.id = 'map-image';
    mapImg.src = previewScreenElement.mapImg.src;
    mapImg.style.position = 'absolute';

    const maskClasses = previewScreenElement.mapImg.className.split(' ').filter((cls) => cls.startsWith('mask-'));
    console.log('Mask Classes:', maskClasses, previewScreenElement.mapImg.className);
    mapImg.className = maskClasses ? maskClasses.join(' ') : '';
    mapImg.className += ' origin-center max-w-none max-h-none overflow-hidden';
    const translate = previewScreenElement.computeTranslatePercent();
    mapImg.style.top = `${translate[1]}%`;
    mapImg.style.left = `${translate[0]}%`;
    mapImg.style.height = `${previewScreenElement.computeHeightPercent()}%`;
    mapImg.style.width = `${previewScreenElement.computeWidthPercent()}%`;
    mapImg.style.zIndex = '1';
    const rotationMatch = previewScreenElement.mapImg.style.transform.match(/rotate\(([-\d.]+)deg\)/);
    const rotation = rotationMatch ? parseFloat(rotationMatch[1]) : 0;
    mapImg.style.transform = `translate(-50%, -50%) rotate(${rotation}deg)`;
    externalWindow.document.body.appendChild(mapImg);

    // add the svg element
    const svgElement = previewScreenElement.svgElement;
    const newSvgElement = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    newSvgElement.setAttribute('width', '100%');
    newSvgElement.setAttribute('height', '100%');
    newSvgElement.style.position = 'absolute';
    newSvgElement.style.top = '0';
    newSvgElement.style.left = '0';
    newSvgElement.style.zIndex = '2';
    newSvgElement.setAttribute('viewBox', svgElement.getAttribute('viewBox'));

    newSvgElement.innerHTML = `<defs>
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
  </defs>`;
    let i = 0;
    for (const child of svgElement.children) {
      const newNode = child.cloneNode(true);
      newNode.setAttribute('filter', 'url(#fogFilter)');
      newNode.setAttribute('fill', grays[i % grays.length] + 'f2');
      newSvgElement.appendChild(newNode);
      const newNode2 = child.cloneNode(true);
      newNode2.setAttribute('filter', 'url(#fogFilter)');
      newNode2.setAttribute('fill', `url(#diaHatch${i % 4})`);
      newSvgElement.appendChild(newNode2);
      i++;
    }

    externalWindow.document.body.appendChild(newSvgElement);
    const newScript = externalWindow.document.createElement('script');
    newScript.innerHTML = `
      
      window.onload = function() {
        window.frame_ = 0;
        animateFog();
      }
      function animateFog() {
        window.frame_ += 0.001; // speed of fog movement
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
