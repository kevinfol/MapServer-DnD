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

    this.gridGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    this.gridGroup.setAttribute('id', 'grid-group');
    this.svgElement.appendChild(this.gridGroup);

    this.circleGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    this.circleGroup.setAttribute('id', 'circle-group');
    this.svgElement.appendChild(this.circleGroup);

    this.fade = document.getElementById('background-fade-range').value;
    this.setBackgroundFade(this.fade);
    this.setBackgroundImage('None');
    this.connectEvents();
  }
  updateGrid() {
    const gridSelect = document.getElementById('grid-lines-select');
    const gridColorSelect = document.getElementById('grid-line-color-select');
    const gridOpacitySelect = document.getElementById('grid-line-opacity-range');
    this.removeGrids();
    if (gridSelect.value !== 'none' && gridSelect.value.includes('hex-')) {
      this.drawHexGrid(+(gridSelect.value.split('-')[1]), gridColorSelect.value, +(gridOpacitySelect.value));
    }
    if (gridSelect.value !== 'none' && gridSelect.value.includes('square-')) {
      this.drawSquareGrid(+(gridSelect.value.split('-')[1]), gridColorSelect.value, +(gridOpacitySelect.value));
    }
  }
  connectEvents() {
    const scaleSelectElement = document.getElementById('output-scale-select');
    const gridSelect = document.getElementById('grid-lines-select');
    const gridColorSelect = document.getElementById('grid-line-color-select');
    const gridOpacitySelect = document.getElementById('grid-line-opacity-range');
    gridSelect.addEventListener('change', () => {
      this.updateGrid()

    });
    gridColorSelect.addEventListener('change', () => {
      this.updateGrid();
    });
    gridOpacitySelect.addEventListener('change', () => {
      this.updateGrid();
    });
    const zoomSelectElement = document.querySelector('zoom-select');
    scaleSelectElement.addEventListener('change', () => {
      zoomSelectElement.panzoomInstance.zoom(zoomSelectElement.panzoomInstance.getScale())
    })
    zoomSelectElement.querySelector('#panzoom-element').addEventListener('panzoomchange', (event) => {
      const { scale, x, y } = event.detail;
      const scale2 = scale * zoomSelectElement.initialScale * (+scaleSelectElement.value);
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
  removeGrids() {
    const grids = this.gridGroup.getElementsByTagName('g');
    for (const grid of grids) {
      this.gridGroup.removeChild(grid);
    }
  }
  drawHexGrid(scalePct, color, opacity) {
    const grid = document.createElementNS('http://www.w3.org/2000/svg', 'g');

    const stepX = externalScreen.devicePixelRatio * 96 * (scalePct / 100);
    const stepY = stepX//(Math.sqrt(3) / 2) * stepX;

    for (let y = -stepY; y <= this.clientHeight + stepY; y += stepY * (3 / 4)) {
      for (let x = -stepX; x <= this.clientWidth + stepX; x += stepX) {
        //const offsetX = (Math.floor(y / stepY) % 2) * (stepX / 2);
        const offsetX = (y / (stepY * (3 / 4)) % 2) * (stepX / 2);
        const hexagon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        const points = [
          [x + offsetX + stepX / 2, y],
          [x + offsetX + stepX, y + stepY / 4],
          [x + offsetX + stepX, y + (3 * stepY) / 4],
          [x + offsetX + stepX / 2, y + stepY],
          [x + offsetX, y + (3 * stepY) / 4],
          [x + offsetX, y + stepY / 4],
        ]
          .map((point) => point.join(','))
          .join(' ');
        hexagon.setAttribute('points', points);
        hexagon.setAttribute('stroke', color);
        hexagon.setAttribute('stroke-width', '2');
        hexagon.setAttribute('fill', 'none');
        hexagon.setAttribute('stroke-opacity', opacity / 100);
        grid.appendChild(hexagon);
      }
    }
    this.gridGroup.appendChild(grid);
  }
  drawSquareGrid(scalePct, color, opacity) {
    const grid = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    const stepX = externalScreen.devicePixelRatio * 96 * (scalePct / 100);
    const stepY = externalScreen.devicePixelRatio * 96 * (scalePct / 100);
    for (let x = 0; x <= this.clientWidth; x += stepX) {
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', x);
      line.setAttribute('y1', 0);
      line.setAttribute('x2', x);
      line.setAttribute('y2', this.clientHeight);
      line.setAttribute('stroke', color);
      line.setAttribute('stroke-width', '2');
      line.setAttribute('stroke-opacity', opacity / 100);
      grid.appendChild(line);
    }
    for (let y = 0; y <= this.clientHeight; y += stepY) {
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', 0);
      line.setAttribute('y1', y);
      line.setAttribute('x2', this.clientWidth);
      line.setAttribute('y2', y);
      line.setAttribute('stroke', color);
      line.setAttribute('stroke-width', '2');
      line.setAttribute('stroke-opacity', opacity / 100);
      grid.appendChild(line);
    }
    this.gridGroup.appendChild(grid);
  }
  addCircleOnClick(x, y) {
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', x);
    circle.setAttribute('cy', y);
    circle.setAttribute('r', this.circleRadius);
    circle.setAttribute('fill', 'rgba(255,0,0,0.5)');
    this.circleGroup.appendChild(circle);
  }
  removeCircleAtCoordinate(x, y) {
    const circles = this.circleGroup.getElementsByTagName('circle');
    for (const circle of circles) {
      const cx = parseFloat(circle.getAttribute('cx'));
      const cy = parseFloat(circle.getAttribute('cy'));
      const r = parseFloat(circle.getAttribute('r'));
      const distance = Math.sqrt((cx - x) ** 2 + (cy - y) ** 2);
      if (distance <= r) {
        this.circleGroup.removeChild(circle);
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
    while (this.circleGroup.firstChild) {
      this.circleGroup.removeChild(this.circleGroup.firstChild);
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
