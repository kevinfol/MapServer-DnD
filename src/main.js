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
        `left=${externalScreen.availLeft},top=${externalScreen.availTop},width=${externalScreen.availWidth},height=${externalScreen.availHeight},toolbar=no,menubar=no,location=no,resizable=yes,scrollbars=no,popup=yes,status=no,fullscreen=yes`,
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
    externalWindow.document.head.innerHTML = '<title>External Map Display</title>';
    document.head.querySelectorAll('link, style').forEach((htmlElement) => {
      externalWindow.document.head.appendChild(htmlElement.cloneNode(true));
    });
    while (externalWindow.document.body.firstChild) {
      externalWindow.document.body.removeChild(externalWindow.document.body.firstChild);
    }

    const div = document.createElement('div');
    div.className = `relative overflow-hidden bg-black`
    div.style.width = '100%';
    div.style.height = '100%';
    div.style.transformOrigin = 'center';
    div.style.transform = 'scale(1)'
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
    svgElement.setAttribute('viewBox', `0 0 ${div.clientWidth} ${div.clientHeight}`);
    svgElement.innerHTML = previewScreenElement.svgElement.innerHTML;
    div.appendChild(svgElement);

    let i = 0;
    for (const circle of svgElement.querySelectorAll('circle')) {
      const bgCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      bgCircle.setAttribute('cx', circle.getAttribute('cx'));
      bgCircle.setAttribute('cy', circle.getAttribute('cy'));
      bgCircle.setAttribute('r', circle.getAttribute('r'));
      bgCircle.setAttribute('fill', grays[i % grays.length] + 'f2');
      bgCircle.setAttribute('filter', 'url(#fogFilter)');
      bgCircle.setAttribute('mask', 'url(#mapMask)');
      svgElement.insertBefore(bgCircle, circle);

      circle.setAttribute('filter', 'url(#fogFilter)');
      circle.setAttribute('fill', 'url(#fogGradient' + (i % 4) + ')');
      circle.setAttribute('mask', 'url(#mapMask)');
      i++;
      const newCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      newCircle.setAttribute('cx', circle.getAttribute('cx'));
      newCircle.setAttribute('cy', circle.getAttribute('cy'));
      newCircle.setAttribute('r', circle.getAttribute('r'));
      newCircle.setAttribute('filter', 'url(#fogFilter)');
      newCircle.setAttribute('fill', 'url(#diaHatch' + (i % 4) + ')');
      newCircle.setAttribute('mask', 'url(#mapMask)');

      circle.after(newCircle);
    }
    map_image.onload = () => {



      const svgMask = document.createElementNS('http://www.w3.org/2000/svg', 'mask');
      svgMask.setAttribute('id', 'mapMask');

      const map_imageRect = map_image.getBoundingClientRect();
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');


      rect.setAttribute('x', map_imageRect.left);
      rect.setAttribute('y', map_imageRect.top);;
      rect.setAttribute('width', map_imageRect.width);
      rect.setAttribute('height', map_imageRect.height);
      const mapImgMaskClasses = previewScreenElement.mapImg.className.split(' ').filter((cn) => cn.startsWith('mask-'));
      if (mapImgMaskClasses.length > 0) {
        rect.setAttribute('class', mapImgMaskClasses.join(' '));
      };

      rect.setAttribute('fill', 'white');
      svgMask.appendChild(rect);
      svgElement.appendChild(svgMask);
    }


    const defElement = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    defElement.innerHTML = `
      <!-- gradients for fog effect -->
      <linearGradient id="fogGradient0" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" style="stop-color:white; stop-opacity:0.1" />
        <stop offset="50%" style="stop-color:white; stop-opacity:0.3" />
        <stop offset="100%" style="stop-color:white; stop-opacity:0.1" />
      </linearGradient>
      <linearGradient id="fogGradient1" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" style="stop-color:white; stop-opacity:0.3" />
        <stop offset="50%" style="stop-color:white; stop-opacity:0.5" />
        <stop offset="100%" style="stop-color:white; stop-opacity:0.3" />
      </linearGradient>
      <linearGradient id="fogGradient2" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:white; stop-opacity:0.2" />
        <stop offset="50%" style="stop-color:white; stop-opacity:0.4" />
        <stop offset="100%" style="stop-color:white; stop-opacity:0.2" />
      </linearGradient>
      <linearGradient id="fogGradient3" x1="100%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" style="stop-color:white; stop-opacity:0.6" />
        <stop offset="50%" style="stop-color:white; stop-opacity:0.8" />
        <stop offset="100%" style="stop-color:white; stop-opacity:0.6" />
      </linearGradient>

      <!-- Diagonal hatch patterns -->
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
function convertCSSTransformToSVGMatrix(cssTransform, w, h) {
  const translateMatch = cssTransform.match(/translate\(\s*([-.\d]+)px,\s*([-.\d]+)px\)/);
  const scaleMatch = cssTransform.match(/scale\(\s*([-.\d]+)(?:,\s*([-.\d]+))?\s*\)/);
  const rotateMatch = cssTransform.match(/rotate\(\s*([-.\d]+)deg\)/);
  let result = ''
  if (translateMatch) {
    const tx = parseFloat(translateMatch[1]) - w / 2;
    const ty = parseFloat(translateMatch[2]) - h / 2;
    result += `translate(${tx}, ${ty}) `;
  }
  if (scaleMatch) {
    const sx = parseFloat(scaleMatch[1]);
    const sy = scaleMatch[2] ? parseFloat(scaleMatch[2]) : sx;
    //result += `scale(${sx}, ${sy}) `;

  }
  if (rotateMatch) {
    const angle = parseFloat(rotateMatch[1]);
    result += `rotate(${angle}, 0,0) `;
  }
  console.log('Converted SVG Transform:', result.trim());
  return result.trim();
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
