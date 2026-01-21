import { thisScreen, externalScreen } from '../main';

export class PreviewScreen2 extends HTMLElement {
  constructor() {
    super();
    this.bgImg = null;
    this.mapImg = null;
    this.svgElement = null;
    this.fade = null;
    this.currentTranslate = [0, 0];
    this.minRadius = 5;
    this.maxRadius = 100;
    this.circleRadius = 20;
  }
  connectedCallback() {
    this.className = 'bg-base-200 rounded-md overflow-hidden relative';
    try {
      this.setDimensions();
    } catch (error) {
      console.error('Error setting dimensions:', error);
    }

    this.bgImg = document.createElement('img');
    this.bgImg.style.position = 'absolute';
    this.bgImg.style.top = '0';
    this.bgImg.style.left = '0';
    this.bgImg.style.width = '100%';
    this.bgImg.style.height = '100%';
    this.bgImg.style.objectFit = 'cover';
    this.bgImg.style.zIndex = '0';
    this.bgImg.className = 'bg-black';
    this.appendChild(this.bgImg);

    this.mapImg = document.createElement('img');
    this.mapImg.id = 'map-image';
    this.mapImg.className =
      'block max-w-none max-h-none origin-center mask-x-from-70% mask-x-from-80% mask-x-from-100% mask-x-from-90% mask-x-to-100% mask-y-from-70% mask-y-from-80% mask-y-from-100% mask-y-from-90% mask-y-to-100%';
    this.mapImg.style.position = 'absolute';
    this.mapImg.style.top = '50%';
    this.mapImg.style.left = '50%';
    this.mapImg.style.zIndex = '1';
    this.appendChild(this.mapImg);

    this.svgElement = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.svgElement.setAttribute('width', '100%');
    this.svgElement.setAttribute('height', '100%');
    this.svgElement.style.position = 'absolute';
    this.svgElement.style.top = '0';
    this.svgElement.style.left = '0';
    this.svgElement.style.zIndex = '2';
    this.svgElement.setAttribute('viewBox', `0 0 ${this.clientWidth} ${this.clientHeight}`);
    this.appendChild(this.svgElement);

    this.fade = document.getElementById('background-fade-range').value;
    this.setBackgroundFade(this.fade);
    this.setBackgroundImage('None');
    this.connectEvents();
  }
  connectEvents() {
    const zoomSelectElement = document.querySelector('zoom-select');
    zoomSelectElement.querySelector('#panzoom-element').addEventListener('panzoomchange', (event) => {
      const { scale, x, y } = event.detail;
      console.log(scale, zoomSelectElement.initialScale);
      const scale2 = scale * zoomSelectElement.initialScale;
      const thisScale = this.computeScaleTo500px();
      this.currentTranslate = [x / thisScale, y / thisScale];
      const currentRotationMatch = this.mapImg.style.transform.match(/rotate\(([-\d.]+)deg\)/);
      let rotation = 0;
      if (currentRotationMatch) {
        rotation = parseFloat(currentRotationMatch[1]);
      }
      this.mapImg.style.transform = `translate(-50%, -50%) scale(${scale2}) translate(${this.currentTranslate[0]}px, ${this.currentTranslate[1]}px) rotate(${rotation}deg)`;
    });
    this.svgElement.addEventListener('click', (event) => {
      const thisScale = this.computeScaleTo500px();
      if (document.getElementById('enable-fog-drawing-checkbox').checked === false) {
        return;
      }
      const rect = this.svgElement.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      this.addCircleOnClick(x / thisScale, y / thisScale);
    });
    this.svgElement.addEventListener('contextmenu', (event) => {
      const thisScale = this.computeScaleTo500px();
      if (document.getElementById('enable-fog-drawing-checkbox').checked === false) {
        return;
      }
      event.preventDefault();
      const rect = this.svgElement.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      this.removeCircleAtCoordinate(x / thisScale, y / thisScale);
    });
  }
  addCircleOnClick(x, y) {
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', x);
    circle.setAttribute('cy', y);
    circle.setAttribute('r', this.circleRadius);
    circle.setAttribute('fill', 'rgba(255,0,0,0.5)');
    this.svgElement.appendChild(circle);
  }
  removeCircleAtCoordinate(x, y) {
    const circles = this.svgElement.getElementsByTagName('circle');
    for (const circle of circles) {
      const cx = parseFloat(circle.getAttribute('cx'));
      const cy = parseFloat(circle.getAttribute('cy'));
      const r = parseFloat(circle.getAttribute('r'));
      const distance = Math.sqrt((cx - x) ** 2 + (cy - y) ** 2);
      if (distance <= r) {
        this.svgElement.removeChild(circle);
        break;
      }
    }
  }
  setCircleRadius(radius) {
    this.circleRadius = this.minRadius + (this.maxRadius - this.minRadius) * (radius / 100);
  }
  computeScaleTo500px() {
    if (externalScreen.availHeight >= externalScreen.availWidth) {
      return 500 / externalScreen.availWidth;
    } else {
      return 500 / externalScreen.availHeight;
    }
  }
  setImageSource(src) {
    this.mapImg.src = src == '' ? 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==' : src;
    this.mapImg.onload = () => {
      this.mapImg.width = this.mapImg.naturalWidth;
      this.mapImg.height = this.mapImg.naturalHeight;
    };
  }
  setBackgroundImage(src) {
    this.bgImg.src =
      src === 'None' ? 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==' : src;
  }
  rotateImage() {
    const currentRotation = this.mapImg.style.transform.match(/rotate\(([-\d.]+)deg\)/);
    const currentScaleMatch = this.mapImg.style.transform.match(/scale\(([\d.]+)\)/);
    const currentTranslateMatch = this.mapImg.style.transform.match(/translate\(([-\d.]+)px,\s*([-\\d.]+)px\)/);
    let scale = 1;
    let translateX = 0;
    let translateY = 0;
    if (currentScaleMatch) {
      scale = parseFloat(currentScaleMatch[1]);
    }
    if (currentTranslateMatch) {
      translateX = parseFloat(currentTranslateMatch[1]);
      translateY = parseFloat(currentTranslateMatch[2]);
    }
    let rotation = currentRotation ? parseFloat(currentRotation[1]) : 0;
    rotation = (rotation + 90) % 360;
    this.mapImg.style.transform = `translate(-50%, -50%) scale(${scale}) translate(${translateX}px, ${translateY}px) rotate(${rotation}deg)`;
  }
  setDimensions() {
    if (externalScreen) {
      this.style.width = `${externalScreen.availWidth}px`;
      this.style.height = `${externalScreen.availHeight}px`;
      this.style.transform = `scale(${this.computeScaleTo500px()})`;
      this.style.transformOrigin = 'top left';
    } else {
      this.style.width = '500px';
      this.style.height = '500px';
    }
    this.minRadius = Math.min(externalScreen.availWidth, externalScreen.availHeight) / 100;
    this.maxRadius = Math.min(externalScreen.availWidth, externalScreen.availHeight) / 5;
    this.setCircleRadius(document.getElementById('circle-radius').value);
    if (this.svgElement) {
      this.svgElement.setAttribute('viewBox', `0 0 ${this.clientWidth} ${this.clientHeight}`);
    }
  }
  clearSvg() {
    while (this.svgElement.firstChild) {
      this.svgElement.removeChild(this.svgElement.firstChild);
    }
  }
  setBackgroundFade(value) {
    this.fade = value;
    if (value === '70') {
      this.mapImg.classList.remove(
        'mask-x-from-80%',
        'mask-x-from-90%',
        'mask-y-from-80%',
        'mask-y-from-90%',
        'mask-x-from-100%',
        'mask-y-from-100%',
      );
      this.mapImg.classList.add('mask-x-from-70%', 'mask-y-from-70%');
    } else if (value === '80') {
      this.mapImg.classList.add('mask-x-from-80%', 'mask-y-from-80%');
      this.mapImg.classList.remove(
        'mask-x-from-70%',
        'mask-x-from-90%',
        'mask-y-from-70%',
        'mask-y-from-90%',
        'mask-x-from-100%',
        'mask-y-from-100%',
      );
    } else if (value === '90') {
      this.mapImg.classList.add('mask-x-from-90%', 'mask-y-from-90%');
      this.mapImg.classList.remove(
        'mask-x-from-70%',
        'mask-x-from-80%',
        'mask-y-from-70%',
        'mask-y-from-80%',
        'mask-x-from-100%',
        'mask-y-from-100%',
      );
    } else if (value === '100') {
      this.mapImg.classList.remove(
        'mask-x-from-70%',
        'mask-x-from-80%',
        'mask-x-from-90%',
        'mask-y-from-70%',
        'mask-y-from-80%',
        'mask-y-from-90%',
      );
      this.mapImg.classList.add('mask-x-from-100%', 'mask-y-from-100%');
    }
  }
}
customElements.define('preview-screen-2', PreviewScreen2);
