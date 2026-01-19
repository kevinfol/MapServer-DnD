import Panzoom from '@panzoom/panzoom';

export class ZoomSelect extends HTMLElement {
  constructor() {
    super();
    this.initialScale = 1;
  }
  connectedCallback() {
    this.className = 'relative w-full h-full bg-base-200 rounded-md overflow-hidden';
    // Parent container for panzoom
    const panzoomParent = document.createElement('div');
    panzoomParent.id = 'panzoom-parent';
    panzoomParent.className = 'overflow-hidden w-full h-full';

    // Acutal Panzoom
    const panzoomElement = document.createElement('div');
    panzoomElement.id = 'panzoom-element';
    const img = document.createElement('img');
    img.id = 'panzoom-image';
    img.className = 'origin-center';
    img.onload = () => {
      this.initializePanzoom();
      this.setInitalImgScale();
    };
    panzoomElement.appendChild(img);
    panzoomParent.appendChild(panzoomElement);

    // create a 1 in by 1 in box to calibrate the zoom level
    const calibrationBox = document.createElement('div');
    calibrationBox.className = 'absolute w-[1in] h-[1in] border-4 border-lime-400 border-dotted pointer-events-none';
    calibrationBox.style.top = 'calc(50% - 0.5in)';
    calibrationBox.style.left = 'calc(50% - 0.5in)';
    const calibrationBox2 = document.createElement('div');
    calibrationBox2.className =
      'absolute w-[1in] h-[1in] border-4 border-red-400 border-dotted pointer-events-none bg-lime-400/10';
    calibrationBox2.style.top = 'calc(50% - 0.49in)';
    calibrationBox2.style.left = 'calc(50% - 0.49in)';

    this.append(panzoomParent, calibrationBox, calibrationBox2);
  }
  setInitalImgScale() {
    const img = this.querySelector('#panzoom-image');
    const naturalWidth = img.naturalWidth;
    const naturalHeight = img.naturalHeight;
    const containerWidth = img.clientWidth;
    const containerHeight = img.clientHeight;
    const widthScale = containerWidth / naturalWidth;
    const heightScale = containerHeight / naturalHeight;
    this.initialScale = Math.min(widthScale, heightScale);
  }
  rotateImage() {
    const img = this.querySelector('#panzoom-image');
    const currentRotation = img.style.transform.match(/rotate\(([-\d.]+)deg\)/);
    let rotation = currentRotation ? parseFloat(currentRotation[1]) : 0;
    rotation = (rotation + 90) % 360;
    img.style.transform = `rotate(${rotation}deg)`;
  }

  setImageSource(src) {
    const img = this.querySelector('#panzoom-image');
    img.src = src;
  }
  initializePanzoom() {
    const panzoomElement = this.querySelector('#panzoom-element');
    this.panzoomInstance = Panzoom(panzoomElement, {
      maxScale: 25,
      minScale: 0.2,
    });
    panzoomElement.parentElement.addEventListener('wheel', (event) => {
      event.preventDefault();
      this.panzoomInstance.zoomWithWheel(event);
    });
  }
}
customElements.define('zoom-select', ZoomSelect);
