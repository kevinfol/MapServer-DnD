import { externalScreen } from '../main';
const GRAYS = [
  'rgb(220, 220, 220)',
  'rgb(200, 200, 200)',
  'rgb(180, 180, 180)',
  'rgb(160, 160, 160)',
  'rgb(140, 140, 140)',
  'rgb(120, 120, 120)',
  'rgb(100, 100, 100)',
  'rgb(80, 80, 80)',
];
export class PreviewScreen extends HTMLElement {
  constructor() {
    super();
    this.fade = null;
    this.scale = null;
    this.currentTranslate = [0, 0];
  }
  connectedCallback() {
    this.className = 'bg-base-200 rounded-md overflow-hidden relative';

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
      'origin-center mask-x-from-70% mask-x-from-80% mask-x-from-100% mask-x-from-90% mask-x-to-100% mask-y-from-70% mask-y-from-80% mask-y-from-100% mask-y-from-90% mask-y-to-100%';
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

    this.connectEvents();
    this.setBackgroundFade(this.fade);
    this.setBackgroundImage('None');
  }
  computeTranslatePercent() {
    const scaleMatch = this.mapImg.style.transform.match(/scale\(([\d.]+)\)/);
    const scale = scaleMatch ? parseFloat(scaleMatch[1]) : 1;
    const clientWidth = this.clientWidth;
    const clientHeight = this.clientHeight;
    const x = clientWidth / 2 + this.currentTranslate[0] * scale;
    const y = clientHeight / 2 + this.currentTranslate[1] * scale;

    const translateXPercent = (x / clientWidth) * 100;
    const translateYPercent = (y / clientHeight) * 100;
    console.log('Translate Percent:', translateXPercent, translateYPercent);
    return [translateXPercent, translateYPercent];
  }
  computeHeightPercent() {
    const scaleMatch = this.mapImg.style.transform.match(/scale\(([\d.]+)\)/);
    const scale = scaleMatch ? parseFloat(scaleMatch[1]) : 1;
    const clientHeight = this.clientHeight;
    const imgHeight = this.mapImg.clientHeight;
    const heightPercent = ((imgHeight * scale) / clientHeight) * 100;
    console.log('Height Percent:', heightPercent);
    return heightPercent;
  }
  computeWidthPercent() {
    const scaleMatch = this.mapImg.style.transform.match(/scale\(([\d.]+)\)/);
    const scale = scaleMatch ? parseFloat(scaleMatch[1]) : 1;
    const clientWidth = this.clientWidth;
    const imgWidth = this.mapImg.clientWidth;
    const widthPercent = ((imgWidth * scale) / clientWidth) * 100;
    console.log('Width Percent:', widthPercent);
    return widthPercent;
  }

  connectEvents() {
    const zoomSelectElement = document.querySelector('zoom-select');
    zoomSelectElement.querySelector('#panzoom-element').addEventListener('panzoomchange', (event) => {
      const { scale, x, y } = event.detail;
      const scale2 = scale * zoomSelectElement.initialScale;
      this.currentTranslate = [x, y];
      const currentRotationMatch = this.mapImg.style.transform.match(/rotate\(([-\d.]+)deg\)/);
      let rotation = 0;
      if (currentRotationMatch) {
        rotation = parseFloat(currentRotationMatch[1]);
      }

      this.mapImg.style.transform = `translate(-50%, -50%) scale(${scale * this.scale / this.screenScale}) translate(${this.currentTranslate[0]}px, ${this.currentTranslate[1]}px) rotate(${rotation}deg)`;
    });
    this.svgElement.addEventListener('click', (event) => {
      if (document.getElementById('enable-fog-drawing-checkbox').checked === false) {
        return;
      }
      const rect = this.svgElement.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      this.addCircleOnClick(x, y);
    });
    this.svgElement.addEventListener('contextmenu', (event) => {
      if (document.getElementById('enable-fog-drawing-checkbox').checked === false) {
        return;
      }
      event.preventDefault();
      const rect = this.svgElement.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      this.removeCircleAtCoordinate(x, y);
    });
  }
  setBackgroundImage(url) {
    this.bgImg.src =
      url === 'None' ? 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==' : url;
    this.style.backgroundImage = `url(${url})`;
  }
  setImageSource(src) {
    this.mapImg.src = src;
    this.mapImg.onload = () => {
      const naturalWidth = this.mapImg.naturalWidth;
      const naturalHeight = this.mapImg.naturalHeight;
      const containerWidth = this.clientWidth;
      const containerHeight = this.clientHeight;
      const widthScale = containerWidth / naturalWidth;
      const heightScale = containerHeight / naturalHeight;
      this.scale = Math.min(widthScale, heightScale);
    }
  }
  setNewDimensions() {
    const w = this.clientWidth;
    const h = this.clientHeight;
    const screenW = externalScreen.availWidth;
    const screenH = externalScreen.availHeight;
    this.screenScale = Math.min(screenW / w, screenH / h);
    this.svgElement.setAttribute('viewBox', `0 0 ${w} ${h}`);
    this.minRadius = Math.min(w, h) / 100;
    this.maxRadius = Math.min(w, h) / 5;
    this.setCircleRadius(document.getElementById('circle-radius').value);
  }
  clearSvg() {
    console.log('clearing svg');
    while (this.svgElement.firstChild) {
      this.svgElement.removeChild(this.svgElement.firstChild);
    }
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
customElements.define('preview-screen', PreviewScreen);
